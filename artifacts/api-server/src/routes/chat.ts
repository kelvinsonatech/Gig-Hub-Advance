import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, chatMessagesTable, usersTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import type { AuthPayload } from "../middleware/auth";
import { encrypt, decrypt } from "../lib/crypto";

const router = Router();

async function getOrCreateConversation(userId: number) {
  let [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(and(
      eq(conversationsTable.userId, userId),
      eq(conversationsTable.status, "open"),
    ))
    .orderBy(desc(conversationsTable.updatedAt))
    .limit(1);

  if (!conversation) {
    const [created] = await db
      .insert(conversationsTable)
      .values({ userId, subject: "Support Chat" })
      .onConflictDoNothing()
      .returning();
    if (created) {
      conversation = created;
    } else {
      [conversation] = await db
        .select()
        .from(conversationsTable)
        .where(and(
          eq(conversationsTable.userId, userId),
          eq(conversationsTable.status, "open"),
        ))
        .orderBy(desc(conversationsTable.updatedAt))
        .limit(1);
    }
  }
  return conversation;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { userId } = (req as any).auth as AuthPayload;

    const [conversation] = await db
      .select()
      .from(conversationsTable)
      .where(and(
        eq(conversationsTable.userId, userId),
        eq(conversationsTable.status, "open"),
      ))
      .orderBy(desc(conversationsTable.updatedAt))
      .limit(1);

    const [admin] = await db
      .select({ name: usersTable.name, email: usersTable.email, avatarStyle: usersTable.avatarStyle })
      .from(usersTable)
      .where(eq(usersTable.role, "admin"))
      .limit(1);

    if (!conversation) {
      return res.json({
        conversationId: null,
        status: "open",
        admin: admin ? { name: admin.name, avatarStyle: admin.avatarStyle, seed: admin.email } : null,
        messages: [],
      });
    }

    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.conversationId, conversation.id))
      .orderBy(chatMessagesTable.createdAt);

    await db.update(chatMessagesTable)
      .set({ isRead: true })
      .where(and(
        eq(chatMessagesTable.conversationId, conversation.id),
        eq(chatMessagesTable.senderType, "admin"),
        eq(chatMessagesTable.isRead, false),
      ));

    return res.json({
      conversationId: conversation.id,
      status: conversation.status,
      admin: admin ? { name: admin.name, avatarStyle: admin.avatarStyle, seed: admin.email } : null,
      messages: messages.map(m => ({
        id: m.id,
        senderType: m.senderType,
        message: decrypt(m.message),
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error(err, "chat get error");
    return res.status(500).json({ error: "internal_error", message: "Failed to load chat" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { userId } = (req as any).auth as AuthPayload;
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "validation_error", message: "Message is required" });
    }

    const conversation = await getOrCreateConversation(userId);
    if (!conversation) {
      return res.status(500).json({ error: "internal_error", message: "Failed to create conversation" });
    }

    const plaintext = message.trim();
    const [msg] = await db.insert(chatMessagesTable).values({
      conversationId: conversation.id,
      senderType: "user",
      senderId: userId,
      message: encrypt(plaintext),
    }).returning();

    await db.update(conversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(conversationsTable.id, conversation.id));

    return res.status(201).json({
      id: msg.id,
      senderType: msg.senderType,
      message: plaintext,
      createdAt: msg.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "chat send error");
    return res.status(500).json({ error: "internal_error", message: "Failed to send message" });
  }
});

router.get("/unread", requireAuth, async (req, res) => {
  try {
    const { userId } = (req as any).auth as AuthPayload;

    const [conversation] = await db
      .select()
      .from(conversationsTable)
      .where(and(
        eq(conversationsTable.userId, userId),
        eq(conversationsTable.status, "open"),
      ))
      .orderBy(desc(conversationsTable.updatedAt))
      .limit(1);

    if (!conversation) {
      return res.json({ unreadCount: 0 });
    }

    const unread = await db
      .select()
      .from(chatMessagesTable)
      .where(and(
        eq(chatMessagesTable.conversationId, conversation.id),
        eq(chatMessagesTable.senderType, "admin"),
        eq(chatMessagesTable.isRead, false),
      ));

    return res.json({ unreadCount: unread.length });
  } catch (err) {
    req.log.error(err, "chat unread error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get unread count" });
  }
});

export default router;
