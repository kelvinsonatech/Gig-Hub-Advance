import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bundlesTable, servicesTable, networksTable, ordersTable, usersTable, notificationsTable, deviceTokensTable } from "@workspace/db";
import { eq, count, inArray, gte, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { sendPushToTokens } from "../lib/fcm";

const router: IRouter = Router();

router.use(requireAuth, requireAdmin);

// ── Chart Data ─────────────────────────────────────────────────────────────────
router.get("/chart-data", async (req, res) => {
  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [orderRows, userRows] = await Promise.all([
      db.select({
        month: sql<number>`EXTRACT(MONTH FROM ${ordersTable.createdAt})::int`,
        count: count(),
      }).from(ordersTable).where(gte(ordersTable.createdAt, startOfYear)).groupBy(sql`EXTRACT(MONTH FROM ${ordersTable.createdAt})`),

      db.select({
        month: sql<number>`EXTRACT(MONTH FROM ${usersTable.createdAt})::int`,
        count: count(),
      }).from(usersTable).where(gte(usersTable.createdAt, startOfYear)).groupBy(sql`EXTRACT(MONTH FROM ${usersTable.createdAt})`),
    ]);

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const data = months.map((name, idx) => {
      const m = idx + 1;
      const orders = orderRows.find(r => r.month === m)?.count ?? 0;
      const users = userRows.find(r => r.month === m)?.count ?? 0;
      return { name, orders: Number(orders), users: Number(users) };
    });

    return res.json(data);
  } catch (err) {
    req.log.error(err, "admin chart data error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get chart data" });
  }
});

// ── Stats ──────────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [bundleCount] = await db.select({ count: count() }).from(bundlesTable);
    const [serviceCount] = await db.select({ count: count() }).from(servicesTable);
    const [orderCount] = await db.select({ count: count() }).from(ordersTable);
    const [userCount] = await db.select({ count: count() }).from(usersTable);
    return res.json({
      bundles: Number(bundleCount.count),
      services: Number(serviceCount.count),
      orders: Number(orderCount.count),
      users: Number(userCount.count),
    });
  } catch (err) {
    req.log.error(err, "admin stats error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get stats" });
  }
});

// ── Bundles ────────────────────────────────────────────────────────────────────
router.get("/bundles", async (req, res) => {
  try {
    const bundles = await db.select().from(bundlesTable).orderBy(bundlesTable.networkId, bundlesTable.id);
    return res.json(bundles.map(b => ({
      id: String(b.id),
      networkId: String(b.networkId),
      networkName: b.networkName,
      name: b.name,
      data: b.data,
      validity: b.validity,
      price: parseFloat(b.price),
      type: b.type,
      popular: b.popular,
    })));
  } catch (err) {
    req.log.error(err, "admin get bundles error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get bundles" });
  }
});

router.post("/bundles", async (req, res) => {
  try {
    const { networkId, networkName, name, data, validity, price, type, popular } = req.body;
    if (!networkId || !networkName || !name || !data || !validity || !price || !type) {
      return res.status(400).json({ error: "validation_error", message: "All fields are required" });
    }
    const [bundle] = await db.insert(bundlesTable).values({
      networkId: parseInt(networkId),
      networkName,
      name,
      data,
      validity,
      price: String(price),
      type,
      popular: popular ?? false,
    }).returning();
    return res.status(201).json({
      id: String(bundle.id),
      networkId: String(bundle.networkId),
      networkName: bundle.networkName,
      name: bundle.name,
      data: bundle.data,
      validity: bundle.validity,
      price: parseFloat(bundle.price),
      type: bundle.type,
      popular: bundle.popular,
    });
  } catch (err) {
    req.log.error(err, "admin create bundle error");
    return res.status(500).json({ error: "internal_error", message: "Failed to create bundle" });
  }
});

router.put("/bundles/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { networkId, networkName, name, data, validity, price, type, popular } = req.body;
    const [bundle] = await db.update(bundlesTable).set({
      networkId: networkId ? parseInt(networkId) : undefined,
      networkName,
      name,
      data,
      validity,
      price: price ? String(price) : undefined,
      type,
      popular,
    }).where(eq(bundlesTable.id, id)).returning();
    if (!bundle) return res.status(404).json({ error: "not_found", message: "Bundle not found" });
    return res.json({
      id: String(bundle.id),
      networkId: String(bundle.networkId),
      networkName: bundle.networkName,
      name: bundle.name,
      data: bundle.data,
      validity: bundle.validity,
      price: parseFloat(bundle.price),
      type: bundle.type,
      popular: bundle.popular,
    });
  } catch (err) {
    req.log.error(err, "admin update bundle error");
    return res.status(500).json({ error: "internal_error", message: "Failed to update bundle" });
  }
});

router.delete("/bundles/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(bundlesTable).where(eq(bundlesTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err, "admin delete bundle error");
    return res.status(500).json({ error: "internal_error", message: "Failed to delete bundle" });
  }
});

// ── Services ───────────────────────────────────────────────────────────────────
router.get("/services", async (req, res) => {
  try {
    const services = await db.select().from(servicesTable).orderBy(servicesTable.id);
    return res.json(services.map(s => ({
      id: String(s.id),
      name: s.name,
      description: s.description,
      category: s.category,
      price: parseFloat(s.price),
      iconUrl: s.iconUrl,
      brandColor: s.brandColor,
    })));
  } catch (err) {
    req.log.error(err, "admin get services error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get services" });
  }
});

router.post("/services", async (req, res) => {
  try {
    const { name, description, category, price, iconUrl, brandColor } = req.body;
    if (!name || !description || !category || !price) {
      return res.status(400).json({ error: "validation_error", message: "name, description, category and price are required" });
    }
    const [service] = await db.insert(servicesTable).values({
      name, description, category, price: String(price), iconUrl, brandColor,
    }).returning();
    return res.status(201).json({
      id: String(service.id),
      name: service.name,
      description: service.description,
      category: service.category,
      price: parseFloat(service.price),
      iconUrl: service.iconUrl,
      brandColor: service.brandColor,
    });
  } catch (err) {
    req.log.error(err, "admin create service error");
    return res.status(500).json({ error: "internal_error", message: "Failed to create service" });
  }
});

router.put("/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, category, price, iconUrl, brandColor } = req.body;
    const [service] = await db.update(servicesTable).set({
      name, description, category,
      price: price ? String(price) : undefined,
      iconUrl, brandColor,
    }).where(eq(servicesTable.id, id)).returning();
    if (!service) return res.status(404).json({ error: "not_found", message: "Service not found" });
    return res.json({
      id: String(service.id),
      name: service.name,
      description: service.description,
      category: service.category,
      price: parseFloat(service.price),
      iconUrl: service.iconUrl,
      brandColor: service.brandColor,
    });
  } catch (err) {
    req.log.error(err, "admin update service error");
    return res.status(500).json({ error: "internal_error", message: "Failed to update service" });
  }
});

router.delete("/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(servicesTable).where(eq(servicesTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err, "admin delete service error");
    return res.status(500).json({ error: "internal_error", message: "Failed to delete service" });
  }
});

// ── Networks ───────────────────────────────────────────────────────────────────
function serializeNetwork(n: typeof networksTable.$inferSelect) {
  return {
    id: String(n.id),
    name: n.name,
    code: n.code,
    color: n.color,
    logoUrl: n.logoUrl,
    tagline: n.tagline,
  };
}

router.get("/networks", async (req, res) => {
  try {
    const networks = await db.select().from(networksTable).orderBy(networksTable.id);
    return res.json(networks.map(serializeNetwork));
  } catch (err) {
    req.log.error(err, "admin get networks error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get networks" });
  }
});

router.post("/networks", async (req, res) => {
  try {
    const { name, code, color, logoUrl, tagline } = req.body;
    if (!name || !code || !color) {
      return res.status(400).json({ error: "validation_error", message: "name, code and color are required" });
    }
    const [network] = await db.insert(networksTable).values({ name, code: code.toUpperCase(), color, logoUrl, tagline }).returning();
    return res.status(201).json(serializeNetwork(network));
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "conflict", message: "A network with that code already exists" });
    req.log.error(err, "admin create network error");
    return res.status(500).json({ error: "internal_error", message: "Failed to create network" });
  }
});

router.put("/networks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, code, color, logoUrl, tagline } = req.body;
    const [network] = await db.update(networksTable).set({
      name, code: code ? code.toUpperCase() : undefined, color, logoUrl, tagline,
    }).where(eq(networksTable.id, id)).returning();
    if (!network) return res.status(404).json({ error: "not_found", message: "Network not found" });
    return res.json(serializeNetwork(network));
  } catch (err) {
    req.log.error(err, "admin update network error");
    return res.status(500).json({ error: "internal_error", message: "Failed to update network" });
  }
});

router.delete("/networks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(networksTable).where(eq(networksTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err, "admin delete network error");
    return res.status(500).json({ error: "internal_error", message: "Failed to delete network" });
  }
});

// ── Notifications ──────────────────────────────────────────────────────────────
router.post("/notifications", async (req, res) => {
  try {
    const { title, message, type, userId } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "validation_error", message: "Title and message are required" });
    }
    const targetUserId = userId ? parseInt(userId) : null;

    const [notification] = await db.insert(notificationsTable).values({
      title,
      message,
      type: type || "info",
      imageUrl: req.body.imageUrl || null,
      userId: targetUserId,
    }).returning();

    // Send FCM push notification
    try {
      let tokenRows: { token: string; id: number }[] = [];
      if (targetUserId) {
        tokenRows = await db
          .select({ token: deviceTokensTable.token, id: deviceTokensTable.id })
          .from(deviceTokensTable)
          .where(eq(deviceTokensTable.userId, targetUserId));
      } else {
        tokenRows = await db
          .select({ token: deviceTokensTable.token, id: deviceTokensTable.id })
          .from(deviceTokensTable);
      }

      if (tokenRows.length > 0) {
        const tokens = tokenRows.map(r => r.token);
        const { failedTokens } = await sendPushToTokens(tokens, title, message, undefined);
        if (failedTokens.length > 0) {
          await db.delete(deviceTokensTable).where(inArray(deviceTokensTable.token, failedTokens));
        }
      }
    } catch (fcmErr) {
      req.log.warn(fcmErr, "FCM push failed (notification still saved)");
    }

    return res.status(201).json({
      id: String(notification.id),
      title: notification.title,
      message: notification.message,
      imageUrl: notification.imageUrl ?? null,
      type: notification.type,
      isRead: notification.read,
      broadcast: notification.broadcast,
      createdAt: notification.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "admin send notification error");
    return res.status(500).json({ error: "internal_error", message: "Failed to send notification" });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const rows = await db.select().from(notificationsTable).orderBy(notificationsTable.id);
    return res.json(rows.map(n => ({
      id: String(n.id),
      title: n.title,
      message: n.message,
      imageUrl: n.imageUrl ?? null,
      type: n.type,
      isRead: n.read,
      broadcast: n.broadcast,
      userId: n.userId ? String(n.userId) : null,
      createdAt: n.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err, "admin get notifications error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get notifications" });
  }
});

router.delete("/notifications/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err, "admin delete notification error");
    return res.status(500).json({ error: "internal_error", message: "Failed to delete notification" });
  }
});

export default router;
