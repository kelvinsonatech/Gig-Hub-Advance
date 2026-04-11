import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { ordersTable, walletsTable, transactionsTable, bundlesTable, paymentIntentsTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { addSseClient, removeSseClient, pushEventToAdmins } from "../lib/sse";
import { sendOrderNotification } from "../lib/telegram";
import { getFulfillmentMode } from "../lib/settings";
import { fulfillBundle } from "../lib/jessco";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "gigshub-secret-key-change-in-production";

async function tryAutoFulfill(order: typeof ordersTable.$inferSelect) {
  try {
    if (order.type !== "bundle") return;
    const mode = await getFulfillmentMode();
    if (mode !== "api") return;

    console.log(`[AutoFulfill] API mode active — sending order ${order.id} to JessCo`);
    const result = await fulfillBundle({
      id: order.id,
      userId: order.userId,
      details: order.details,
      amount: order.amount,
    });

    if (result.success) {
      console.log(`[AutoFulfill] Order ${order.id} sent successfully, ref: ${result.providerRef}`);
    } else {
      console.warn(`[AutoFulfill] Order ${order.id} failed: ${result.message}`);
    }
  } catch (err) {
    console.error(`[AutoFulfill] Error for order ${order.id}:`, err);
  }
}

function getUserId(req: any): number | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as { userId: number };
    return decoded.userId;
  } catch {
    return null;
  }
}

function isValidReference(ref: string): boolean {
  return /^[a-zA-Z0-9_\-]{5,100}$/.test(ref);
}

// Fetch user info, push a new_order event to admin SSE clients, and notify Telegram
async function notifyAdminsNewOrder(order: typeof ordersTable.$inferSelect) {
  try {
    const [user] = await db
      .select({ name: usersTable.name, email: usersTable.email, phone: usersTable.phone })
      .from(usersTable)
      .where(eq(usersTable.id, order.userId))
      .limit(1);

    const userPayload = user
      ? { name: user.name, email: user.email, phone: user.phone ?? "" }
      : { name: "Unknown", email: "", phone: "" };

    const orderPayload = {
      id: String(order.id),
      type: order.type,
      status: order.status,
      amount: parseFloat(order.amount),
      details: (order.details ?? {}) as Record<string, any>,
      createdAt: order.createdAt.toISOString(),
      user: userPayload,
    };

    // Real-time admin panel update via SSE
    pushEventToAdmins("new_order", orderPayload);

    // Telegram bot notification
    await sendOrderNotification(orderPayload);
  } catch (err) {
    console.error("[notifyAdminsNewOrder] error:", err);
  }
}

// ── Real-time SSE stream ──────────────────────────────────────────────────────
// EventSource can't send custom headers, so the JWT is passed as ?token=...
router.get("/stream", (req, res) => {
  const token = req.query.token as string | undefined;
  if (!token) return res.status(401).json({ error: "auth_error", message: "Missing token" });

  let userId: number;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: "auth_error", message: "Invalid token" });
  }

  // Establish SSE connection
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering if present
  res.flushHeaders();

  // Send an initial ping so the client knows the connection is live
  res.write(": connected\n\n");

  addSseClient(userId, res);

  // Heartbeat every 25s to prevent proxy/browser from closing idle connections
  const heartbeat = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { /* client gone */ }
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeSseClient(userId, res);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "auth_error", message: "Not authenticated" });
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, userId))
      .orderBy(desc(ordersTable.createdAt));
    return res.json(orders.map(o => ({
      id: String(o.id),
      userId: String(o.userId),
      type: o.type,
      status: o.status,
      amount: parseFloat(o.amount),
      details: o.details,
      createdAt: o.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err, "get orders error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get orders" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "auth_error", message: "Not authenticated" });

    const { type, bundleId, phoneNumber, serviceId, paymentMethod: pmTopLevel, details } = req.body;
    const paymentMethod: string = pmTopLevel ?? details?.paymentMethod ?? "momo";

    // ── Paystack / MoMo redirect flow ────────────────────────────────────────
    // The client sends only the Paystack reference; all intent details come from
    // the server-side payment_intents table — the client cannot tamper with them.
    const { paystackReference } = req.body;

    if (paystackReference) {
      if (!isValidReference(paystackReference)) {
        return res.status(400).json({ error: "validation_error", message: "Invalid payment reference format" });
      }

      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey) return res.status(500).json({ error: "config_error", message: "Payment not configured" });

      // ── Load and validate server-side intent ─────────────────────────────
      const [intent] = await db
        .select()
        .from(paymentIntentsTable)
        .where(
          and(
            eq(paymentIntentsTable.reference, paystackReference),
            eq(paymentIntentsTable.userId, userId),
            eq(paymentIntentsTable.type, "bundle_purchase"),
          )
        )
        .limit(1);

      if (!intent) {
        return res.status(404).json({
          error: "not_found",
          message: "Payment intent not found or does not belong to your account",
        });
      }

      // Idempotency: if already processed, return the existing order
      if (intent.status === "processed") {
        const orders = await db
          .select()
          .from(ordersTable)
          .where(eq(ordersTable.userId, userId))
          .orderBy(desc(ordersTable.createdAt));
        const existing = orders.find(o =>
          (o.details as any)?.paystackReference === paystackReference
        );
        if (existing) {
          return res.json({
            id: String(existing.id),
            userId: String(existing.userId),
            type: existing.type,
            status: existing.status,
            amount: parseFloat(existing.amount),
            details: existing.details,
            createdAt: existing.createdAt.toISOString(),
          });
        }
      }

      if (intent.status !== "pending") {
        return res.status(400).json({ error: "payment_failed", message: "This payment was not completed" });
      }

      // Expiry check
      if (new Date() > intent.expiresAt) {
        await db.update(paymentIntentsTable)
          .set({ status: "cancelled" })
          .where(eq(paymentIntentsTable.reference, paystackReference));
        return res.status(400).json({ error: "payment_expired", message: "Payment session expired. Please try again." });
      }

      // ── Verify with Paystack ────────────────────────────────────────────
      const psRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(paystackReference)}`,
        { headers: { Authorization: `Bearer ${secretKey}` } }
      );
      const psData = await psRes.json() as any;

      if (!psData.status || psData.data?.status !== "success") {
        const txStatus = psData.data?.status;
        const isCancelled = txStatus === "abandoned";
        await db.update(paymentIntentsTable)
          .set({ status: isCancelled ? "cancelled" : "failed" })
          .where(eq(paymentIntentsTable.reference, paystackReference));
        return res.status(400).json({
          error: isCancelled ? "payment_cancelled" : "payment_failed",
          message: isCancelled ? "Payment was cancelled" : "Paystack payment was not successful",
        });
      }

      // ── Amount integrity check (server-stored price vs what Paystack charged) ─
      const paidGHS = psData.data.amount / 100;
      const expectedGHS = parseFloat(intent.amountGHS);
      if (Math.abs(paidGHS - expectedGHS) > 0.5) {
        req.log.warn({ paidGHS, expectedGHS, paystackReference, userId }, "Amount mismatch on bundle order");
        await db.update(paymentIntentsTable)
          .set({ status: "failed" })
          .where(eq(paymentIntentsTable.reference, paystackReference));
        return res.status(400).json({ error: "amount_mismatch", message: "Payment amount does not match bundle price" });
      }

      // ── Fetch bundle details from DB using the server-stored bundleId ───
      if (!intent.bundleId) {
        return res.status(400).json({ error: "validation_error", message: "No bundle associated with this payment" });
      }
      const [bundle] = await db.select().from(bundlesTable).where(eq(bundlesTable.id, intent.bundleId)).limit(1);
      if (!bundle) return res.status(404).json({ error: "not_found", message: "Bundle not found" });

      const orderDetails = {
        phoneNumber: intent.phoneNumber || phoneNumber,
        paymentMethod: "momo",
        paystackReference,
        bundleId: String(intent.bundleId),
        bundleName: bundle.name,
        data: bundle.data,
        networkName: bundle.networkName,
      };

      const [order] = await db.insert(ordersTable).values({
        userId,
        type: "bundle",
        status: "processing",
        amount: expectedGHS.toFixed(2),
        details: orderDetails,
      }).returning();

      // Mark intent as processed
      await db.update(paymentIntentsTable)
        .set({ status: "processed", processedAt: new Date() })
        .where(eq(paymentIntentsTable.reference, paystackReference));

      // Notify admin panel in real-time (fire-and-forget)
      notifyAdminsNewOrder(order);

      // Auto-fulfill via JessCo if API mode is active (fire-and-forget)
      tryAutoFulfill(order);

      return res.status(201).json({
        id: String(order.id),
        userId: String(order.userId),
        type: order.type,
        status: order.status,
        amount: parseFloat(order.amount),
        details: order.details,
        createdAt: order.createdAt.toISOString(),
      });
    }

    // ── Wallet payment: deduct balance immediately ───────────────────────────
    if (!type || !phoneNumber) {
      return res.status(400).json({ error: "validation_error", message: "type and phoneNumber are required" });
    }

    let amount = 0;
    let orderDetails: any = { phoneNumber, paymentMethod, ...details };

    if (type === "bundle" && bundleId) {
      const [bundle] = await db.select().from(bundlesTable).where(eq(bundlesTable.id, parseInt(bundleId))).limit(1);
      if (!bundle) return res.status(404).json({ error: "not_found", message: "Bundle not found" });
      amount = parseFloat(bundle.price);
      orderDetails = {
        ...orderDetails,
        bundleId,
        bundleName: bundle.name,
        data: bundle.data,
        networkName: bundle.networkName,
      };
    } else if (type === "afa_registration") {
      amount = 20;
    } else if (type === "agent_registration") {
      amount = 50;
    }

    if (paymentMethod === "wallet") {
      const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
      if (!wallet) return res.status(404).json({ error: "not_found", message: "Wallet not found" });

      if (parseFloat(wallet.balance) < amount) {
        return res.status(400).json({ error: "insufficient_funds", message: "Insufficient wallet balance" });
      }

      const newBalance = (parseFloat(wallet.balance) - amount).toFixed(2);
      await db.update(walletsTable).set({ balance: newBalance }).where(eq(walletsTable.id, wallet.id));

      const description =
        type === "bundle"
          ? `Data bundle (${orderDetails.bundleName || ""} ${orderDetails.data || ""}) for ${phoneNumber}`
          : type === "afa_registration"
          ? `AFA Registration for ${phoneNumber}`
          : `Agent Registration for ${phoneNumber}`;

      await db.insert(transactionsTable).values({
        walletId: wallet.id,
        type: "debit",
        amount: String(amount),
        description,
      });

      const [order] = await db.insert(ordersTable).values({
        userId,
        type,
        status: "processing",
        amount: String(amount),
        details: orderDetails,
      }).returning();

      // Notify admin panel in real-time (fire-and-forget)
      notifyAdminsNewOrder(order);

      // Auto-fulfill via JessCo if API mode is active (fire-and-forget)
      tryAutoFulfill(order);

      return res.status(201).json({
        id: String(order.id),
        userId: String(order.userId),
        type: order.type,
        status: order.status,
        amount: parseFloat(order.amount),
        details: order.details,
        createdAt: order.createdAt.toISOString(),
      });
    }

    return res.status(400).json({ error: "validation_error", message: "Invalid payment method" });
  } catch (err) {
    req.log.error(err, "create order error");
    return res.status(500).json({ error: "internal_error", message: "Failed to create order" });
  }
});

export default router;
