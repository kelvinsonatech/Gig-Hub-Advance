import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable, bundlesTable, paymentIntentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "gigshub-secret-key-change-in-production";

const MIN_AMOUNT_GHS = 1;
const MAX_AMOUNT_GHS = 10_000;
const INTENT_TTL_MS = 30 * 60 * 1000; // 30 minutes

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

// Validate that a Paystack reference looks plausible (alphanumeric + hyphens/underscores, 5-100 chars)
function isValidReference(ref: string): boolean {
  return /^[a-zA-Z0-9_\-]{5,100}$/.test(ref);
}

/**
 * POST /api/payments/initialize
 * Creates a Paystack payment session server-side and stores the intent in the DB.
 * Body: { amount, type, bundleId?, phoneNumber?, callbackUrl }
 */
router.post("/initialize", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "auth_error", message: "Not authenticated" });

    const { amount, type, bundleId, phoneNumber, callbackUrl } = req.body;

    if (!callbackUrl || typeof callbackUrl !== "string") {
      return res.status(400).json({ error: "validation_error", message: "callbackUrl is required" });
    }
    if (!type || !["wallet_topup", "bundle_purchase"].includes(type)) {
      return res.status(400).json({ error: "validation_error", message: "type must be wallet_topup or bundle_purchase" });
    }

    // Fetch user email from DB — never trust the client for email
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "not_found", message: "User not found" });

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return res.status(500).json({ error: "config_error", message: "Payment not configured" });

    let amountGHS: number;
    let intentBundleId: number | null = null;

    if (type === "wallet_topup") {
      amountGHS = parseFloat(amount);
      if (!isFinite(amountGHS) || amountGHS < MIN_AMOUNT_GHS || amountGHS > MAX_AMOUNT_GHS) {
        return res.status(400).json({
          error: "validation_error",
          message: `Amount must be between GHS ${MIN_AMOUNT_GHS} and GHS ${MAX_AMOUNT_GHS.toLocaleString()}`,
        });
      }
    } else {
      // bundle_purchase — look up the real price from DB, never trust the client
      if (!bundleId || !phoneNumber) {
        return res.status(400).json({ error: "validation_error", message: "bundleId and phoneNumber are required for bundle purchases" });
      }
      const [bundle] = await db.select().from(bundlesTable).where(eq(bundlesTable.id, parseInt(bundleId))).limit(1);
      if (!bundle) return res.status(404).json({ error: "not_found", message: "Bundle not found" });
      amountGHS = parseFloat(bundle.price);
      intentBundleId = bundle.id;
    }

    // Initialize with Paystack
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amountGHS * 100), // pesewas
        email: user.email,
        currency: "GHS",
        callback_url: callbackUrl,
        channels: ["mobile_money", "card"],
        metadata: {
          userId: userId,
          type,
          custom_fields: [
            { display_name: "User ID", variable_name: "user_id", value: String(userId) },
            { display_name: "Type", variable_name: "type", value: type },
          ],
        },
      }),
    });

    const data = await paystackRes.json() as any;
    if (!data.status) {
      return res.status(400).json({ error: "paystack_error", message: data.message || "Failed to initialize payment" });
    }

    const reference: string = data.data.reference;

    // Store intent in DB so verify endpoints can cross-check without trusting the client
    await db.insert(paymentIntentsTable).values({
      reference,
      userId,
      type: type as "wallet_topup" | "bundle_purchase",
      amountGHS: String(amountGHS),
      bundleId: intentBundleId,
      phoneNumber: phoneNumber || null,
      status: "pending",
      expiresAt: new Date(Date.now() + INTENT_TTL_MS),
    });

    return res.json({
      authorizationUrl: data.data.authorization_url,
      reference,
    });
  } catch (err) {
    req.log.error(err, "payment initialize error");
    return res.status(500).json({ error: "internal_error", message: "Failed to initialize payment" });
  }
});

export default router;
