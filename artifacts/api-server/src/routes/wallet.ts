import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { walletsTable, transactionsTable, paymentIntentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { verifyAndProcessIntent } from "../lib/payment-reconciler";

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

function isValidReference(ref: string): boolean {
  return /^[a-zA-Z0-9_\-]{5,100}$/.test(ref);
}

router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "auth_error", message: "Not authenticated" });
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallet) return res.status(404).json({ error: "not_found", message: "Wallet not found" });
    const transactions = await db.select().from(transactionsTable).where(eq(transactionsTable.walletId, wallet.id));
    return res.json({
      id: String(wallet.id),
      userId: String(wallet.userId),
      balance: parseFloat(wallet.balance),
      currency: wallet.currency,
      transactions: transactions.map(t => ({
        id: String(t.id),
        type: t.type,
        amount: parseFloat(t.amount),
        description: t.description,
        createdAt: t.createdAt.toISOString(),
      })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    });
  } catch (err) {
    req.log.error(err, "get wallet error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get wallet" });
  }
});

// REMOVED: The legacy /topup endpoint that credited the wallet without any
// payment verification. It allowed any authenticated user to mint balance.
// All wallet top-ups must now go through:
//   1. POST /api/payments/initialize  (creates a Paystack session + intent)
//   2. POST /api/wallet/topup/verify  (delegates to verifyAndProcessIntent)
router.post("/topup", async (_req, res) => {
  return res.status(410).json({
    error: "deprecated",
    message:
      "Direct top-up has been removed. Use /api/payments/initialize then /api/wallet/topup/verify.",
  });
});

/**
 * POST /api/wallet/topup/verify
 * Verifies a Paystack payment and credits the wallet.
 * Secured by:
 *  - Server-side intent lookup (no client-supplied amounts)
 *  - Ownership check (intent must belong to the requesting user)
 *  - Idempotency (already-processed references return early, no double-credit)
 *  - Expiry check (intents expire after 30 min)
 *  - Amount cross-check (Paystack amount must match the DB-stored expected amount)
 */
router.post("/topup/verify", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "auth_error", message: "Not authenticated" });

    const { reference } = req.body;
    if (!reference || typeof reference !== "string") {
      return res.status(400).json({ error: "validation_error", message: "Payment reference is required" });
    }
    if (!isValidReference(reference)) {
      return res.status(400).json({ error: "validation_error", message: "Invalid payment reference format" });
    }

    // Ownership check
    const [intent] = await db
      .select()
      .from(paymentIntentsTable)
      .where(
        and(
          eq(paymentIntentsTable.reference, reference),
          eq(paymentIntentsTable.userId, userId),
          eq(paymentIntentsTable.type, "wallet_topup"),
        )
      )
      .limit(1);

    if (!intent) {
      return res.status(404).json({ error: "not_found", message: "Payment intent not found or does not belong to your account" });
    }

    // Delegate to shared verify-and-process pipeline (transactional, idempotent)
    const result = await verifyAndProcessIntent(reference, "frontend_callback");

    if (!result.ok) {
      const errorMap: Record<string, { http: number; error: string }> = {
        intent_not_found: { http: 404, error: "not_found" },
        intent_failed: { http: 400, error: "payment_failed" },
        intent_expired: { http: 400, error: "payment_expired" },
        payment_pending: { http: 202, error: "payment_pending" },
        payment_failed: { http: 400, error: "payment_failed" },
        payment_cancelled: { http: 400, error: "payment_cancelled" },
        amount_mismatch: { http: 400, error: "amount_mismatch" },
        paystack_error: { http: 502, error: "paystack_error" },
        internal_error: { http: 500, error: "internal_error" },
      };
      const mapped = errorMap[result.status] ?? { http: 400, error: "payment_failed" };
      return res.status(mapped.http).json({ error: mapped.error, message: result.message });
    }

    // Success — return updated wallet snapshot
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallet) return res.status(404).json({ error: "not_found", message: "Wallet not found" });
    const transactions = await db.select().from(transactionsTable).where(eq(transactionsTable.walletId, wallet.id));
    return res.json({
      id: String(wallet.id),
      userId: String(wallet.userId),
      balance: parseFloat(wallet.balance),
      currency: wallet.currency,
      transactions: transactions
        .map(t => ({ id: String(t.id), type: t.type, amount: parseFloat(t.amount), description: t.description, createdAt: t.createdAt.toISOString() }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    });
  } catch (err) {
    req.log.error(err, "paystack verify error");
    return res.status(500).json({ error: "internal_error", message: "Payment verification failed" });
  }
});

export default router;
