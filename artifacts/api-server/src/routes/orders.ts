import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { ordersTable, walletsTable, transactionsTable, bundlesTable, paymentIntentsTable, usersTable } from "@workspace/db";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import { addSseClient, removeSseClient, pushEventToAdmins } from "../lib/sse";
import { sendOrderNotification, sendFulfillmentAlert } from "../lib/telegram";
import { getFulfillmentMode } from "../lib/settings";
import { fulfillBundle } from "../lib/jessco";
import { verifyAndProcessIntent } from "../lib/payment-reconciler";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "gigshub-secret-key-change-in-production";


async function tryAutoFulfill(order: typeof ordersTable.$inferSelect) {
  try {
    if (order.type !== "bundle") return;
    const mode = await getFulfillmentMode();
    if (mode !== "api") return;

    await db.update(ordersTable)
      .set({ status: "processing" })
      .where(eq(ordersTable.id, order.id));

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
      console.warn(`[AutoFulfill] Order ${order.id} could not auto-fulfill: ${result.message}`);
      console.log(`[AutoFulfill] Order ${order.id} stays in "processing" — needs manual delivery`);
      sendFulfillmentAlert(order, result.message || "Unknown error").catch(() => {});
    }
  } catch (err) {
    console.error(`[AutoFulfill] Error for order ${order.id}:`, err);
    sendFulfillmentAlert(order, "Unexpected error during auto-fulfillment").catch(() => {});
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

      // Ownership check — make sure this reference belongs to the requesting user
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

      // Delegate to the shared verify-and-process pipeline. This is the same
      // function used by the Paystack webhook and the background reconciler.
      // The transactional intent → order flip in there protects against double
      // creation if the webhook fires at the same moment as this call.
      const result = await verifyAndProcessIntent(paystackReference, "frontend_callback");

      if (!result.ok) {
        const errorMap: Record<string, { http: number; error: string }> = {
          intent_not_found: { http: 404, error: "not_found" },
          intent_failed: { http: 400, error: "payment_failed" },
          intent_expired: { http: 400, error: "payment_expired" },
          payment_pending: { http: 202, error: "payment_pending" },
          payment_failed: { http: 400, error: "payment_failed" },
          payment_cancelled: { http: 400, error: "payment_cancelled" },
          amount_mismatch: { http: 400, error: "amount_mismatch" },
          bundle_not_found: { http: 404, error: "not_found" },
          paystack_error: { http: 502, error: "paystack_error" },
          internal_error: { http: 500, error: "internal_error" },
        };
        const mapped = errorMap[result.status] ?? { http: 400, error: "payment_failed" };
        return res.status(mapped.http).json({ error: mapped.error, message: result.message });
      }

      // Success — fetch the order to return to the client
      if (!result.orderId) {
        return res.status(500).json({ error: "internal_error", message: "Order id missing after verify" });
      }
      const [order] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, result.orderId))
        .limit(1);
      if (!order) {
        return res.status(500).json({ error: "internal_error", message: "Order not found after creation" });
      }

      const httpStatus = result.status === "order_already_exists" ? 200 : 201;
      return res.status(httpStatus).json({
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

      const [updated] = await db.update(walletsTable)
        .set({ balance: sql`${walletsTable.balance} - ${amount}` })
        .where(and(eq(walletsTable.id, wallet.id), gte(walletsTable.balance, String(amount))))
        .returning();

      if (!updated) {
        return res.status(400).json({ error: "insufficient_funds", message: "Insufficient wallet balance" });
      }

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

      const fulfillmentMode = await getFulfillmentMode();
      const initialStatus = fulfillmentMode === "api" ? "processing" : "pending";
      orderDetails.fulfillmentMode = fulfillmentMode;

      const [order] = await db.insert(ordersTable).values({
        userId,
        type,
        status: initialStatus,
        amount: String(amount),
        details: orderDetails,
      }).returning();

      notifyAdminsNewOrder(order);

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
