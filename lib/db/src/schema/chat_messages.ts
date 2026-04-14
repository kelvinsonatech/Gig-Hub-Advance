import { pgTable, serial, integer, text, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { conversationsTable } from "./conversations";

export const chatSenderTypeEnum = pgEnum("chat_sender_type", [
  "user",
  "admin",
]);

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id),
  senderType: chatSenderTypeEnum("sender_type").notNull(),
  senderId: integer("sender_id").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("chat_messages_conversation_idx").on(table.conversationId),
  index("chat_messages_unread_idx").on(table.conversationId, table.senderType, table.isRead),
]);

export type ChatMessage = typeof chatMessagesTable.$inferSelect;
