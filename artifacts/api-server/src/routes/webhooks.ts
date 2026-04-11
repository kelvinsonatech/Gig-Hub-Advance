import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { pushEventToUser } from "../lib/sse";
import { handleXpresportalWebhook } from "../lib/xpresportal";

const XPRESPORTAL_WEBHOOK_SECRET = process.env.XPRESPORTAL_WEBHOOK_SECRET || "";

const router: IRouter = Router();

router.post("/jessco", async (req, res) => {
  const payload = req.body;
  console.log("[JessCo Webhook] Received:", JSON.stringify(payload, null, 2));
  res.status(200).json({ received: true });

  try {
    const reference =
      payload.reference   ??
      payload.order_id    ??
      payload.orderId     ??
      payload.order_ref   ??
      payload.transaction_id ??
      null;

    const rawStatus: string =
      (payload.status ?? payload.delivery_status ?? payload.state ?? "")
        .toString()
        .toLowerCase();

    if (!reference) {
      console.warn("[JessCo Webhook] No reference field found in payload — cannot update order");
      return;
    }

    let newStatus: "processing" | "completed" | "failed" | null = null;
    if (["success", "successful", "delivered", "completed"].includes(rawStatus)) {
      newStatus = "completed";
    } else if (["failed", "failure", "error", "rejected"].includes(rawStatus)) {
      newStatus = "failed";
    }

    if (!newStatus) {
      console.log(`[JessCo Webhook] Unrecognised status "${rawStatus}" — no order update`);
      return;
    }

    const allOrders = await db.select().from(ordersTable);
    const order = allOrders.find(
      (o) => String(o.id) === String(reference) ||
             (o.details as any)?.jesscoReference === String(reference)
    );

    if (!order) {
      console.warn(`[JessCo Webhook] No order found for reference "${reference}"`);
      return;
    }

    await db.update(ordersTable)
      .set({ status: newStatus })
      .where(eq(ordersTable.id, order.id));

    console.log(`[JessCo Webhook] Order ${order.id} → ${newStatus}`);

    pushEventToUser(order.userId, "order_update", {
      id: String(order.id),
      status: newStatus,
    });
  } catch (err) {
    console.error("[JessCo Webhook] Error processing payload:", err);
  }
});

router.post("/xpresportal", async (req, res) => {
  const payload = req.body;

  if (XPRESPORTAL_WEBHOOK_SECRET) {
    const provided =
      (req.headers["x-webhook-secret"] ?? req.headers["x-signature"] ?? "") as string;
    if (!provided || provided !== XPRESPORTAL_WEBHOOK_SECRET) {
      console.warn("[JessCo Webhook] Missing or invalid webhook secret");
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  res.status(200).json({ received: true });

  try {
    await handleXpresportalWebhook(payload);
  } catch (err) {
    console.error("[JessCo Webhook] Error:", err);
  }
});

export default router;
