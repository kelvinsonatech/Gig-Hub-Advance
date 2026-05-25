import { Router, type IRouter } from "express";
import crypto from "crypto";
import { handleJesscoWebhook, getJesscoWebhookSecret } from "../lib/jessco";
import { handleXpressGhWebhook, getXpressGhWebhookSecret } from "../lib/xpress-gh";
import { verifyAndProcessIntent } from "../lib/payment-reconciler";

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

// Xpress-gh fulfillment webhook. Requires XPRESS_GH_WEBHOOK_SECRET env var.
// Without it set we refuse all webhooks — Xpress-gh's dashboard lets you
// configure a shared secret that they send back as the X-Webhook-Secret header
// (also accepted: X-Xpress-Secret, X-Signature). We also require the
// X-Xpress-Event header and a recognised event name to reject random POSTs.
const ALLOWED_XPRESS_EVENTS = new Set([
  "order.updated",
  "item.completed",
  "item.failed",
  "item.refunded",
]);

router.post("/xpress-gh", async (req, res) => {
  const secret = getXpressGhWebhookSecret();
  if (!secret) {
    console.warn("[Xpress-gh Webhook] XPRESS_GH_WEBHOOK_SECRET not configured — refusing webhook");
    return res.status(503).json({ error: "Webhook secret not configured" });
  }

  const provided =
    (req.headers["x-webhook-secret"] ??
      req.headers["x-xpress-secret"] ??
      req.headers["x-signature"] ??
      "") as string;
  if (!provided || provided !== secret) {
    console.warn("[Xpress-gh Webhook] Invalid or missing webhook secret");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const event = (req.headers["x-xpress-event"] as string) ?? "";
  if (!event || !ALLOWED_XPRESS_EVENTS.has(event)) {
    console.warn(`[Xpress-gh Webhook] Rejected: unknown event "${event}"`);
    return res.status(400).json({ error: "Unknown event" });
  }

  res.status(200).json({ received: true });

  try {
    await handleXpressGhWebhook({ ...req.body, event });
  } catch (err) {
    console.error("[Xpress-gh Webhook] Error:", err);
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

  // Acknowledge receipt to Paystack immediately so they don't retry on us
  res.status(200).json({ received: true });

  const event = req.body;
  console.log(`[Paystack Webhook] Event: ${event.event}`);

  if (event.event !== "charge.success") return;

  const reference = event.data?.reference;
  if (!reference) {
    console.warn("[Paystack Webhook] No reference in charge.success event");
    return;
  }

  // Delegate to the shared verify-and-process pipeline. This is the same
  // function used by the frontend post-redirect handler and the background
  // reconciler poller, so all three paths behave identically and idempotently.
  try {
    const result = await verifyAndProcessIntent(reference, "webhook");
    console.log(
      `[Paystack Webhook] Reference ${reference} → ${result.status}: ${result.message}`
    );
  } catch (err) {
    console.error("[Paystack Webhook] Error processing:", err);
  }
});

export default router;
