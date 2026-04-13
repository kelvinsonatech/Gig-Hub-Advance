import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { walletsTable, transactionsTable, paymentIntentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

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

router.post("/topup", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "auth_error", message: "Not authenticated" });
    const { amount, paymentMethod } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ error: "validation_error", message: "Invalid amount" });
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallet) return res.status(404).json({ error: "not_found", message: "Wallet not found" });
    const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
    const [updated] = await db.update(walletsTable).set({ balance: String(newBalance) }).where(eq(walletsTable.id, wallet.id)).returning();
    await db.insert(transactionsTable).values({
      walletId: wallet.id,
      type: "credit",
      amount: String(amount),
      description: `Top up via ${paymentMethod || "MoMo"}`,
    });
    const transactions = await db.select().from(transactionsTable).where(eq(transactionsTable.walletId, wallet.id));
    return res.json({
      id: String(updated.id),
      userId: String(updated.userId),
      balance: parseFloat(updated.balance),
      currency: updated.currency,
      transactions: transactions.map(t => ({
        id: String(t.id),
        type: t.type,
        amount: parseFloat(t.amount),
        description: t.description,
        createdAt: t.createdAt.toISOString(),
      })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    });
  } catch (err) {
    req.log.error(err, "topup error");
    return res.status(500).json({ error: "internal_error", message: "Top up failed" });
  }
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

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return res.status(500).json({ error: "config_error", message: "Payment not configured" });

    // ── Load and validate the server-side intent ────────────────────────────
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

    // Idempotency: already successfully processed
    if (intent.status === "processed") {
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
    }

    if (intent.status !== "pending") {
      return res.status(400).json({ error: "payment_failed", message: "This payment was not completed" });
    }

    // Expiry check
    if (new Date() > intent.expiresAt) {
      await db.update(paymentIntentsTable)
        .set({ status: "cancelled" })
        .where(eq(paymentIntentsTable.reference, reference));
      return res.status(400).json({ error: "payment_expired", message: "Payment session expired. Please try again." });
    }

    // ── Verify with Paystack ─────────────────────────────────────────────────
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const paystackData = await paystackRes.json() as any;

    if (!paystackData.status || paystackData.data?.status !== "success") {
      const txStatus = paystackData.data?.status;
      const isCancelled = txStatus === "abandoned";
      await db.update(paymentIntentsTable)
        .set({ status: isCancelled ? "cancelled" : "failed" })
        .where(eq(paymentIntentsTable.reference, reference));
      return res.status(400).json({
        error: isCancelled ? "payment_cancelled" : "payment_failed",
        message: isCancelled ? "Payment was cancelled" : "Payment was not successful",
      });
    }

    // ── Amount integrity check ───────────────────────────────────────────────
    // Paystack may add processing fees (typically ~1.95% + flat), so the paid
    // amount can exceed the requested top-up amount.  We only reject when
    // underpaid by >GHS 0.50 OR overpaid by >5%+GHS 1.
    const paidGHS = paystackData.data.amount / 100;
    const expectedGHS = parseFloat(intent.amountGHS);
    const maxOverpay = expectedGHS * 0.05;
    if (paidGHS < expectedGHS - 0.5 || paidGHS > expectedGHS + maxOverpay + 1) {
      req.log.warn({ paidGHS, expectedGHS, reference, userId }, "Amount mismatch on wallet topup");
      await db.update(paymentIntentsTable)
        .set({ status: "failed" })
        .where(eq(paymentIntentsTable.reference, reference));
      return res.status(400).json({ error: "amount_mismatch", message: "Payment amount does not match expected amount" });
    }

    // ── Credit the wallet ────────────────────────────────────────────────────
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallet) return res.status(404).json({ error: "not_found", message: "Wallet not found" });

    const newBalance = parseFloat(wallet.balance) + paidGHS;
    const [updated] = await db.update(walletsTable)
      .set({ balance: newBalance.toFixed(2) })
      .where(eq(walletsTable.id, wallet.id))
      .returning();

    await db.insert(transactionsTable).values({
      walletId: wallet.id,
      type: "credit",
      amount: paidGHS.toFixed(2),
      description: `Top up via Paystack (${reference})`,
    });

    // Mark intent as processed (idempotency lock)
    await db.update(paymentIntentsTable)
      .set({ status: "processed", processedAt: new Date() })
      .where(eq(paymentIntentsTable.reference, reference));

    const transactions = await db.select().from(transactionsTable).where(eq(transactionsTable.walletId, wallet.id));
    return res.json({
      id: String(updated.id),
      userId: String(updated.userId),
      balance: parseFloat(updated.balance),
      currency: updated.currency,
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
