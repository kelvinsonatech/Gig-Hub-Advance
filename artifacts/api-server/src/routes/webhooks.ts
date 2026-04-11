import { Router, type IRouter } from "express";
import { handleJesscoWebhook, getJesscoWebhookSecret } from "../lib/jessco";

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

export default router;
