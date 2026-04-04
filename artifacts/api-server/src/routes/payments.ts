import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "gigshub-secret-key-change-in-production";

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

router.post("/initialize", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "auth_error", message: "Not authenticated" });

    const { amount, email, callbackUrl, metadata } = req.body;
    if (!amount || !email || !callbackUrl) {
      return res.status(400).json({ error: "validation_error", message: "amount, email, and callbackUrl are required" });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return res.status(500).json({ error: "config_error", message: "Payment not configured" });

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        email,
        currency: "GHS",
        callback_url: callbackUrl,
        metadata: metadata || {},
      }),
    });

    const data = await paystackRes.json() as any;
    if (!data.status) {
      return res.status(400).json({ error: "paystack_error", message: data.message || "Failed to initialize payment" });
    }

    return res.json({
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (err) {
    req.log.error(err, "payment initialize error");
    return res.status(500).json({ error: "internal_error", message: "Failed to initialize payment" });
  }
});

export default router;
