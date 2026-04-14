import { pgTable, serial, integer, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const conversationStatusEnum = pgEnum("conversation_status", [
  "open",
  "closed",
]);

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  status: conversationStatusEnum("status").notNull().default("open"),
  subject: text("subject"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("conversations_user_status_idx").on(table.userId, table.status),
  index("conversations_updated_at_idx").on(table.updatedAt),
]);

export type Conversation = typeof conversationsTable.$inferSelect;
