import { pgTable, text, serial, numeric, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const paymentIntentStatusEnum = pgEnum("payment_intent_status", [
  "pending",
  "processed",
  "failed",
  "cancelled",
]);

export const paymentIntentTypeEnum = pgEnum("payment_intent_type", [
  "wallet_topup",
  "bundle_purchase",
]);

export const paymentIntentsTable = pgTable("payment_intents", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  userId: integer("user_id").notNull(),
  type: paymentIntentTypeEnum("type").notNull(),
  amountGHS: numeric("amount_ghs", { precision: 12, scale: 2 }).notNull(),
  bundleId: integer("bundle_id"),
  phoneNumber: text("phone_number"),
  status: paymentIntentStatusEnum("status").notNull().default("pending"),
  processedAt: timestamp("processed_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PaymentIntent = typeof paymentIntentsTable.$inferSelect;
