import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const deviceTokensTable = pgTable("device_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DeviceToken = typeof deviceTokensTable.$inferSelect;
