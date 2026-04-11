import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { ordersTable, paymentIntentsTable, bundlesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { handleJesscoWebhook, getJesscoWebhookSecret, fulfillBundle } from "../lib/jessco";
import { pushEventToAdmins, pushEventToUser } from "../lib/sse";
import { sendOrderNotification, sendFulfillmentAlert } from "../lib/telegram";
import { getFulfillmentMode } from "../lib/settings";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";

const router: IRouter = Router();

router.post("/jessco", async (req, res) => {
  const payload = req.body;

  const secret = getJesscoWebhookSecret();
  if (secret) {
    const provided =
      (req.headers["x-webhook-secret"] ?? req.headers["x-signature"] ?? "") as string;
    if (!provided || provided !== secret) {
      console.warn("[JessCo Webhook] Missing or invalid webhook secret");
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  res.status(200).json({ received: true });

  try {
    await handleJesscoWebhook(payload);
  } catch (err) {
    console.error("[JessCo Webhook] Error:", err);
  }
});

router.post("/paystack", async (req, res) => {
  const rawBody = JSON.stringify(req.body);
  const signature = req.headers["x-paystack-signature"] as string;

  if (!PAYSTACK_SECRET) {
    console.warn("[Paystack Webhook] PAYSTACK_SECRET_KEY not configured");
    return res.status(500).json({ error: "Not configured" });
  }

  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (hash !== signature) {
    console.warn("[Paystack Webhook] Invalid signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  res.status(200).json({ received: true });

  const event = req.body;
  console.log(`[Paystack Webhook] Event: ${event.event}`);

  if (event.event !== "charge.success") return;

  const txData = event.data;
  const reference = txData?.reference;
  if (!reference) {
    console.warn("[Paystack Webhook] No reference in charge.success event");
    return;
  }

  try {
    const [intent] = await db
      .select()
      .from(paymentIntentsTable)
      .where(
        and(
          eq(paymentIntentsTable.reference, reference),
          eq(paymentIntentsTable.status, "pending")
        )
      )
      .limit(1);

    if (!intent) {
      console.log(`[Paystack Webhook] No pending intent for ref ${reference} (may already be processed)`);
      return;
    }

    if (intent.type === "bundle_purchase" && intent.bundleId) {
      const [bundle] = await db
        .select()
        .from(bundlesTable)
        .where(eq(bundlesTable.id, intent.bundleId))
        .limit(1);

      if (!bundle) {
        console.warn(`[Paystack Webhook] Bundle ${intent.bundleId} not found for ref ${reference}`);
        return;
      }

      const paidGHS = txData.amount / 100;
      const expectedGHS = parseFloat(intent.amountGHS);
      if (Math.abs(paidGHS - expectedGHS) > 0.5) {
        console.warn(`[Paystack Webhook] Amount mismatch: paid ${paidGHS}, expected ${expectedGHS}`);
        await db.update(paymentIntentsTable)
          .set({ status: "failed" })
          .where(eq(paymentIntentsTable.reference, reference));
        return;
      }

      const mode = await getFulfillmentMode();
      const initialStatus = mode === "api" ? "processing" : "pending";

      const orderDetails = {
        phoneNumber: intent.phoneNumber,
        paymentMethod: "momo",
        paystackReference: reference,
        bundleId: String(intent.bundleId),
        bundleName: bundle.name,
        data: bundle.data,
        networkName: bundle.networkName,
        createdVia: "paystack_webhook",
      };

      const [order] = await db.insert(ordersTable).values({
        userId: intent.userId,
        type: "bundle",
        status: initialStatus,
        amount: expectedGHS.toFixed(2),
        details: orderDetails,
      }).returning();

      await db.update(paymentIntentsTable)
        .set({ status: "processed", processedAt: new Date() })
        .where(eq(paymentIntentsTable.reference, reference));

      console.log(`[Paystack Webhook] Created order ${order.id} from webhook for ref ${reference}`);

      notifyAdminsNewOrder(order);
      tryAutoFulfill(order);

    } else if (intent.type === "wallet_topup") {
      console.log(`[Paystack Webhook] Wallet topup for ref ${reference} — user should complete in-app`);
    }
  } catch (err) {
    console.error("[Paystack Webhook] Error processing:", err);
  }
});

async function notifyAdminsNewOrder(order: typeof ordersTable.$inferSelect) {
  try {
    const [user] = await db
      .select({ name: usersTable.name, email: usersTable.email, phone: usersTable.phone })
      .from(usersTable)
      .where(eq(usersTable.id, order.userId))
      .limit(1);

    const userPayload = user
      ? { name: user.name, email: user.email, phone: user.phone }
      : { name: "Unknown", email: "", phone: "" };

    pushEventToAdmins("new_order", {
      id: String(order.id),
      userId: String(order.userId),
      type: order.type,
      status: order.status,
      amount: parseFloat(order.amount),
      details: order.details,
      user: userPayload,
      createdAt: order.createdAt.toISOString(),
    });

    sendOrderNotification(order, userPayload).catch(() => {});
  } catch (err) {
    console.error("[Paystack Webhook] Error notifying admins:", err);
  }
}

async function tryAutoFulfill(order: typeof ordersTable.$inferSelect) {
  try {
    if (order.type !== "bundle") return;
    const mode = await getFulfillmentMode();
    if (mode !== "api") return;

    console.log(`[AutoFulfill] API mode active — sending order ${order.id} to JessCo (via webhook)`);
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

export default router;
