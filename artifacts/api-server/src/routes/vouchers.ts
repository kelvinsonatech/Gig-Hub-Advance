import { Router } from "express";
import { db } from "@workspace/db";
import { vouchersTable, voucherRedemptionsTable, walletsTable, transactionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import type { AuthPayload } from "../middleware/auth";

const router = Router();

router.post("/redeem", requireAuth, async (req, res) => {
  try {
    const { userId } = (req as any).auth as AuthPayload;
    const { code } = req.body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ error: "validation_error", message: "Voucher code is required" });
    }

    const normalizedCode = code.trim().toUpperCase();

    const result = await db.transaction(async (tx) => {
      const [voucher] = await tx
        .select()
        .from(vouchersTable)
        .where(eq(vouchersTable.code, normalizedCode))
        .limit(1);

      if (!voucher) return { error: "not_found", status: 404, message: "Invalid voucher code" };
      if (!voucher.isActive) return { error: "expired", status: 400, message: "This voucher has expired" };
      if (voucher.currentRedemptions >= voucher.maxRedemptions) return { error: "exhausted", status: 400, message: "This voucher has been fully redeemed" };

      const [existing] = await tx
        .select()
        .from(voucherRedemptionsTable)
        .where(and(
          eq(voucherRedemptionsTable.voucherId, voucher.id),
          eq(voucherRedemptionsTable.userId, userId),
        ))
        .limit(1);

      if (existing) return { error: "already_redeemed", status: 400, message: "You have already redeemed this voucher" };

      const amount = parseFloat(voucher.amount);

      const [wallet] = await tx
        .select()
        .from(walletsTable)
        .where(eq(walletsTable.userId, userId))
        .limit(1);

      if (!wallet) return { error: "not_found", status: 404, message: "Wallet not found" };

      const [updated] = await tx.update(vouchersTable)
        .set({ currentRedemptions: sql`${vouchersTable.currentRedemptions} + 1` })
        .where(and(
          eq(vouchersTable.id, voucher.id),
          eq(vouchersTable.isActive, true),
          sql`${vouchersTable.currentRedemptions} < ${vouchersTable.maxRedemptions}`,
        ))
        .returning();

      if (!updated) return { error: "exhausted", status: 400, message: "This voucher has been fully redeemed" };

      await tx.update(walletsTable)
        .set({ balance: sql`${walletsTable.balance} + ${amount}` })
        .where(eq(walletsTable.userId, userId));

      await tx.insert(transactionsTable).values({
        walletId: wallet.id,
        type: "credit",
        amount: amount.toFixed(2),
        description: `Voucher redeemed: ${normalizedCode}`,
      });

      await tx.insert(voucherRedemptionsTable).values({
        voucherId: voucher.id,
        userId,
        amount: amount.toFixed(2),
      });

      return { success: true, amount, message: `GHS ${amount.toFixed(2)} has been added to your wallet!` };
    });

    if ("error" in result) {
      return res.status(result.status).json({ error: result.error, message: result.message });
    }

    return res.json(result);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(400).json({ error: "already_redeemed", message: "You have already redeemed this voucher" });
    }
    req.log.error(err, "voucher redeem error");
    return res.status(500).json({ error: "internal_error", message: "Failed to redeem voucher" });
  }
});

export default router;
