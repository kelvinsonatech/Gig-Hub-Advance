import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { pushEventToUser } from "../lib/sse";

const router: IRouter = Router();

// ── JessCo delivery webhook ────────────────────────────────────────────────
// JessCo calls this URL when a bundle delivery status changes.
// We log the full payload on every call so we can inspect the exact format
// once the API key is approved and first deliveries come through.
//
// Expected (common pattern for Ghanaian VTU APIs):
//   { reference, status, phone, message, ... }
//
// The `reference` field should match the orderId we send when placing orders.
router.post("/jessco", async (req, res) => {
  const payload = req.body;

  // Always log the full payload so we can inspect JessCo's exact format
  console.log("[JessCo Webhook] Received:", JSON.stringify(payload, null, 2));

  // Acknowledge immediately — JessCo expects a 200 quickly
  res.status(200).json({ received: true });

  // Try to map the webhook to one of our orders and update its status
  try {
    // Common field names used by VTU APIs — we check all variants
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

    // Map JessCo status → our order status
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

    // Find the order by its JessCo reference stored in details
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

    // Push real-time update to the customer
    pushEventToUser(order.userId, "order_update", {
      id: String(order.id),
      status: newStatus,
    });
  } catch (err) {
    console.error("[JessCo Webhook] Error processing payload:", err);
  }
});

export default router;
