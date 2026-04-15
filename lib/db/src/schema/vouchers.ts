import { pgTable, text, serial, numeric, integer, timestamp, boolean, unique } from "drizzle-orm/pg-core";

export const vouchersTable = pgTable("vouchers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  maxRedemptions: integer("max_redemptions").notNull().default(1),
  currentRedemptions: integer("current_redemptions").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const voucherRedemptionsTable = pgTable("voucher_redemptions", {
  id: serial("id").primaryKey(),
  voucherId: integer("voucher_id").notNull(),
  userId: integer("user_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
}, (t) => [
  unique("uq_voucher_user").on(t.voucherId, t.userId),
]);
