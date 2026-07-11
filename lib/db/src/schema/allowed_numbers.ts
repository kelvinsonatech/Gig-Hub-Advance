import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const allowedNumbersTable = pgTable("allowed_numbers", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  addedBy: text("added_by").notNull().default("system"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AllowedNumber = typeof allowedNumbersTable.$inferSelect;
