import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, usersTable } from "@workspace/db";
import { eq, and, gte, desc, inArray } from "drizzle-orm";

const router: IRouter = Router();

router.get("/live", async (_req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const orders = await db
      .select({
        type: ordersTable.type,
        details: ordersTable.details,
        createdAt: ordersTable.createdAt,
        userName: usersTable.name,
        avatarStyle: usersTable.avatarStyle,
      })
      .from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .where(
        and(
          eq(ordersTable.type, "bundle"),
          inArray(ordersTable.status, ["processing", "completed"]),
          gte(ordersTable.createdAt, todayStart)
        )
      )
      .orderBy(desc(ordersTable.createdAt))
      .limit(30);

    const feed = orders.map((o) => {
      const d = (o.details ?? {}) as Record<string, any>;
      const fullName = o.userName || "Customer";
      const firstName = fullName.split(" ")[0];
      return {
        firstName,
        avatarStyle: o.avatarStyle || "adventurer",
        bundleName: d.bundleName || "",
        data: d.data || "",
        networkName: d.networkName || "",
        createdAt: o.createdAt.toISOString(),
      };
    });

    return res.json(feed);
  } catch (err) {
    console.error("[purchases/live] error:", err);
    return res.status(500).json([]);
  }
});

export default router;
