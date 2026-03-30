import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db";
import { eq, or, isNull, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(or(eq(notificationsTable.userId, userId), isNull(notificationsTable.userId)))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
    return res.json(rows.map(n => ({
      id: String(n.id),
      title: n.title,
      message: n.message,
      imageUrl: n.imageUrl ?? null,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err, "get notifications error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get notifications" });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err, "mark read error");
    return res.status(500).json({ error: "internal_error", message: "Failed to mark as read" });
  }
});

router.patch("/read-all", async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(or(eq(notificationsTable.userId, userId), isNull(notificationsTable.userId)));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err, "mark all read error");
    return res.status(500).json({ error: "internal_error", message: "Failed to mark all as read" });
  }
});

export default router;
