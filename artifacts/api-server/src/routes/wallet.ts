import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { walletsTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

// ── Paystack: verify payment and credit wallet ─────────────────────────────
router.post("/topup/verify", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "auth_error", message: "Not authenticated" });

    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: "validation_error", message: "Payment reference is required" });

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return res.status(500).json({ error: "config_error", message: "Payment not configured" });

    // Verify with Paystack
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const paystackData = await paystackRes.json() as any;

    if (!paystackData.status || paystackData.data?.status !== "success") {
      const txStatus = paystackData.data?.status;
      const isCancelled = txStatus === "abandoned";
      return res.status(400).json({
        error: isCancelled ? "payment_cancelled" : "payment_failed",
        message: isCancelled ? "Payment was cancelled" : "Payment was not successful",
      });
    }

    // Amount from Paystack is in pesewas (1 GHS = 100 pesewas)
    const amountGHS = paystackData.data.amount / 100;

    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallet) return res.status(404).json({ error: "not_found", message: "Wallet not found" });

    const newBalance = parseFloat(wallet.balance) + amountGHS;
    const [updated] = await db.update(walletsTable)
      .set({ balance: String(newBalance) })
      .where(eq(walletsTable.id, wallet.id))
      .returning();

    await db.insert(transactionsTable).values({
      walletId: wallet.id,
      type: "credit",
      amount: String(amountGHS),
      description: `Top up via Paystack (${reference})`,
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
    req.log.error(err, "paystack verify error");
    return res.status(500).json({ error: "internal_error", message: "Payment verification failed" });
  }
});

export default router;
