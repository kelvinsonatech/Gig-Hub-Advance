import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { bundlesTable, servicesTable, networksTable, ordersTable, usersTable, notificationsTable, deviceTokensTable, walletsTable, transactionsTable, paymentIntentsTable } from "@workspace/db";
import { eq, count, inArray, gte, lt, lte, sql, desc, isNull, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { sendPushToTokens } from "../lib/fcm";
import { pushEventToUser, pushEventToAdmins, addAdminSseClient, removeAdminSseClient } from "../lib/sse";
import { getFulfillmentMode, setFulfillmentMode, type FulfillmentMode } from "../lib/settings";
import { fulfillBundle } from "../lib/jessco";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "gigshub-secret-key-change-in-production";

const router: IRouter = Router();

// ── Admin real-time SSE stream ────────────────────────────────────────────────
// Must be registered BEFORE requireAdmin middleware so it can authenticate via
// query-param token (EventSource cannot set custom headers).
router.get("/stream", async (req, res) => {
  const token = req.query.token as string | undefined;
  if (!token) return res.status(401).json({ error: "auth_error", message: "Missing token" });

  let userId: number;
  let role: string;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    userId = decoded.userId;
    role = decoded.role;
  } catch {
    return res.status(401).json({ error: "auth_error", message: "Invalid token" });
  }

  if (role !== "admin") {
    return res.status(403).json({ error: "forbidden", message: "Admin access required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(": connected\n\n");
  addAdminSseClient(res);

  const heartbeat = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { /* client gone */ }
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeAdminSseClient(res);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

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

// ── Sales Stats ──────────────────────────────────────────────────────────────
router.get("/sales-stats", async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const notArchived = isNull(ordersTable.archivedAt);
    const completedOrProcessing = sql`${ordersTable.status} IN ('completed', 'processing')`;
    const baseWhere = and(notArchived, completedOrProcessing);

    const [
      [todayRows],
      [yesterdayRows],
      [weekRows],
      [monthRows],
      [allTimeRows],
      [pendingRows],
      [failedTodayRows],
      recentOrders,
    ] = await Promise.all([
      db.select({
        count: count(),
        revenue: sql<string>`COALESCE(SUM(${ordersTable.amount}), 0)`,
      }).from(ordersTable).where(and(baseWhere, gte(ordersTable.createdAt, todayStart))),

      db.select({
        count: count(),
        revenue: sql<string>`COALESCE(SUM(${ordersTable.amount}), 0)`,
      }).from(ordersTable).where(and(baseWhere, gte(ordersTable.createdAt, yesterdayStart), lt(ordersTable.createdAt, todayStart))),

      db.select({
        count: count(),
        revenue: sql<string>`COALESCE(SUM(${ordersTable.amount}), 0)`,
      }).from(ordersTable).where(and(baseWhere, gte(ordersTable.createdAt, weekStart))),

      db.select({
        count: count(),
        revenue: sql<string>`COALESCE(SUM(${ordersTable.amount}), 0)`,
      }).from(ordersTable).where(and(baseWhere, gte(ordersTable.createdAt, monthStart))),

      db.select({
        count: count(),
        revenue: sql<string>`COALESCE(SUM(${ordersTable.amount}), 0)`,
      }).from(ordersTable).where(baseWhere),

      db.select({ count: count() }).from(ordersTable)
        .where(and(notArchived, sql`${ordersTable.status} = 'pending'`)),

      db.select({ count: count() }).from(ordersTable)
        .where(and(notArchived, gte(ordersTable.createdAt, todayStart), sql`${ordersTable.status} = 'failed'`)),

      db.select({
        id: ordersTable.id,
        type: ordersTable.type,
        status: ordersTable.status,
        amount: ordersTable.amount,
        details: ordersTable.details,
        createdAt: ordersTable.createdAt,
        userName: usersTable.name,
      })
        .from(ordersTable)
        .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
        .where(notArchived)
        .orderBy(desc(ordersTable.createdAt))
        .limit(10),
    ]);

    return res.json({
      today: { count: Number(todayRows.count), revenue: Number(todayRows.revenue) },
      yesterday: { count: Number(yesterdayRows.count), revenue: Number(yesterdayRows.revenue) },
      thisWeek: { count: Number(weekRows.count), revenue: Number(weekRows.revenue) },
      thisMonth: { count: Number(monthRows.count), revenue: Number(monthRows.revenue) },
      allTime: { count: Number(allTimeRows.count), revenue: Number(allTimeRows.revenue) },
      pendingCount: Number(pendingRows.count),
      failedTodayCount: Number(failedTodayRows.count),
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        type: o.type,
        status: o.status,
        amount: Number(o.amount),
        details: o.details,
        createdAt: o.createdAt,
        userName: o.userName,
      })),
    });
  } catch (err) {
    req.log.error(err, "admin sales-stats error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get sales stats" });
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
    sortOrder: n.sortOrder,
  };
}

router.get("/networks", async (req, res) => {
  try {
    const networks = await db.select().from(networksTable).orderBy(networksTable.sortOrder);
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
    const [maxRow] = await db.select({ max: sql<number>`max(sort_order)` }).from(networksTable);
    const nextOrder = (maxRow?.max ?? 0) + 1;
    const [network] = await db.insert(networksTable).values({ name, code: code.toUpperCase(), color, logoUrl, tagline, sortOrder: nextOrder }).returning();
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

router.patch("/networks/reorder", async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids)) return res.status(400).json({ error: "validation_error", message: "ids must be an array" });
    await Promise.all(ids.map((id, index) =>
      db.update(networksTable).set({ sortOrder: index + 1 }).where(eq(networksTable.id, parseInt(id)))
    ));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err, "admin reorder networks error");
    return res.status(500).json({ error: "internal_error", message: "Failed to reorder networks" });
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
    const { title, message, type, userId, imageUrl } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "validation_error", message: "Title and message are required" });
    }
    const targetUserId = userId ? parseInt(userId) : null;

    const [notification] = await db.insert(notificationsTable).values({
      title,
      message,
      type: type || "info",
      imageUrl: imageUrl || null,
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
        const { failedTokens } = await sendPushToTokens(tokens, title, message, imageUrl || undefined);
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

// ── Users ──────────────────────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    const wallets = await db.select().from(walletsTable);
    const walletMap = Object.fromEntries(wallets.map(w => [w.userId, parseFloat(w.balance)]));

    return res.json(users.map(u => ({
      id: String(u.id),
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      balance: walletMap[u.id] ?? 0,
      createdAt: u.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err, "admin get users error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get users" });
  }
});

router.post("/users/:id/wallet/adjust", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { type, amount, note } = req.body;

    if (!["credit", "debit"].includes(type)) {
      return res.status(400).json({ error: "validation_error", message: "type must be credit or debit" });
    }
    const amt = parseFloat(amount);
    if (!isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: "validation_error", message: "amount must be a positive number" });
    }

    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallet) return res.status(404).json({ error: "not_found", message: "Wallet not found" });

    const current = parseFloat(wallet.balance);
    if (type === "debit" && current < amt) {
      return res.status(400).json({ error: "insufficient_funds", message: `User only has GHS ${current.toFixed(2)}` });
    }

    const newBalance = type === "credit" ? current + amt : current - amt;
    const [updated] = await db
      .update(walletsTable)
      .set({ balance: newBalance.toFixed(2) })
      .where(eq(walletsTable.id, wallet.id))
      .returning();

    await db.insert(transactionsTable).values({
      walletId: wallet.id,
      type,
      amount: amt.toFixed(2),
      description: note?.trim() ? `Admin adjustment: ${note.trim()}` : `Admin ${type}`,
    });

    return res.json({ balance: parseFloat(updated.balance) });
  } catch (err) {
    req.log.error(err, "admin wallet adjust error");
    return res.status(500).json({ error: "internal_error", message: "Failed to adjust wallet" });
  }
});

// ── Orders ─────────────────────────────────────────────────────────────────────
router.get("/orders", async (req, res) => {
  try {
    const [rows, networks] = await Promise.all([
      db
        .select({
          id: ordersTable.id,
          type: ordersTable.type,
          status: ordersTable.status,
          amount: ordersTable.amount,
          details: ordersTable.details,
          createdAt: ordersTable.createdAt,
          userName: usersTable.name,
          userEmail: usersTable.email,
          userPhone: usersTable.phone,
        })
        .from(ordersTable)
        .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
        // Exclude soft-archived orders from the admin panel view.
        // Archived orders remain untouched in the DB so users still see their history.
        .where(isNull(ordersTable.archivedAt))
        .orderBy(desc(ordersTable.createdAt)),
      db.select({ name: networksTable.name, logoUrl: networksTable.logoUrl, color: networksTable.color }).from(networksTable),
    ]);

    const networkMap = Object.fromEntries(networks.map(n => [n.name, { logoUrl: n.logoUrl, color: n.color }]));

    const orderItems = rows.map(o => {
      const det = (o.details ?? {}) as Record<string, unknown>;
      const net = det.networkName ? networkMap[det.networkName as string] : null;
      return {
        id: String(o.id),
        type: o.type,
        status: o.status,
        amount: parseFloat(o.amount),
        details: {
          ...det,
          networkLogoUrl: net?.logoUrl ?? null,
          networkColor: net?.color ?? null,
        },
        createdAt: o.createdAt.toISOString(),
        user: { name: o.userName, email: o.userEmail, phone: o.userPhone },
      };
    });

    const failedIntents = await db
      .select({
        id: paymentIntentsTable.id,
        reference: paymentIntentsTable.reference,
        type: paymentIntentsTable.type,
        amountGhs: paymentIntentsTable.amountGHS,
        phoneNumber: paymentIntentsTable.phoneNumber,
        createdAt: paymentIntentsTable.createdAt,
        bundleName: bundlesTable.name,
        bundleData: bundlesTable.data,
        bundlePrice: bundlesTable.price,
        networkName: networksTable.name,
        networkLogoUrl: networksTable.logoUrl,
        networkColor: networksTable.color,
        userName: usersTable.name,
        userEmail: usersTable.email,
        userPhone: usersTable.phone,
      })
      .from(paymentIntentsTable)
      .innerJoin(usersTable, eq(paymentIntentsTable.userId, usersTable.id))
      .leftJoin(bundlesTable, eq(paymentIntentsTable.bundleId, bundlesTable.id))
      .leftJoin(networksTable, eq(bundlesTable.networkId, networksTable.id))
      .where(eq(paymentIntentsTable.status, "failed"))
      .orderBy(desc(paymentIntentsTable.createdAt));

    const failedItems = failedIntents.map(fi => ({
      id: `pi-${fi.id}`,
      type: fi.type === "wallet_topup" ? "wallet_topup" as const : "bundle" as const,
      status: "payment_failed" as const,
      amount: parseFloat(fi.amountGhs),
      details: {
        phoneNumber: fi.phoneNumber,
        bundleName: fi.bundleName,
        data: fi.bundleData,
        networkName: fi.networkName,
        networkLogoUrl: fi.networkLogoUrl ?? null,
        networkColor: fi.networkColor ?? null,
        paystackReference: fi.reference,
        bundlePrice: fi.bundlePrice ? parseFloat(fi.bundlePrice) : null,
      },
      createdAt: fi.createdAt.toISOString(),
      user: { name: fi.userName, email: fi.userEmail, phone: fi.userPhone },
    }));

    const allItems = [...orderItems, ...failedItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.json(allItems);
  } catch (err) {
    req.log.error(err, "admin get orders error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get orders" });
  }
});

// ── Archive (clear) delivered orders by time range ─────────────────────────
// Soft-archive: sets archivedAt timestamp on matching rows so they vanish
// from the admin panel. The rows are NOT deleted, so users still see their
// full order history on their side.
//
// Query param: range = "today" | "yesterday" | "7days" | "30days" | "all"
router.delete("/orders/completed", async (req, res) => {
  try {
    const range = (req.query.range as string) || "all";

    // Build date window in UTC
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
    const sevenDaysAgo  = new Date(todayStart.getTime() - 7  * 86_400_000);
    const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 86_400_000);

    type WhereExpr = ReturnType<typeof eq>;
    const baseConditions: WhereExpr[] = [
      eq(ordersTable.status, "completed"),
      isNull(ordersTable.archivedAt) as unknown as WhereExpr,
    ];

    switch (range) {
      case "today":
        baseConditions.push(gte(ordersTable.createdAt, todayStart) as unknown as WhereExpr);
        break;
      case "yesterday":
        baseConditions.push(gte(ordersTable.createdAt, yesterdayStart) as unknown as WhereExpr);
        baseConditions.push(lt(ordersTable.createdAt, todayStart) as unknown as WhereExpr);
        break;
      case "7days":
        baseConditions.push(gte(ordersTable.createdAt, sevenDaysAgo) as unknown as WhereExpr);
        break;
      case "30days":
        baseConditions.push(gte(ordersTable.createdAt, thirtyDaysAgo) as unknown as WhereExpr);
        break;
      // "all" — no extra date condition
    }

    const toArchive = await db
      .select({ id: ordersTable.id, userId: ordersTable.userId, amount: ordersTable.amount })
      .from(ordersTable)
      .where(and(...baseConditions));

    if (toArchive.length === 0) {
      return res.json({ cleared: 0, usersAffected: 0, totalValue: 0 });
    }

    const ids          = toArchive.map(o => o.id);
    const uniqueUsers  = new Set(toArchive.map(o => o.userId)).size;
    const totalValue   = toArchive.reduce((sum, o) => sum + parseFloat(o.amount), 0);

    await db
      .update(ordersTable)
      .set({ archivedAt: now })
      .where(inArray(ordersTable.id, ids));

    return res.json({ cleared: toArchive.length, usersAffected: uniqueUsers, totalValue });
  } catch (err) {
    req.log.error(err, "admin archive delivered orders error");
    return res.status(500).json({ error: "internal_error", message: "Failed to archive delivered orders" });
  }
});

router.patch("/orders/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const valid = ["pending", "processing", "completed", "failed"];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: "validation_error", message: "Invalid status" });
    }
    const [order] = await db
      .update(ordersTable)
      .set({ status })
      .where(eq(ordersTable.id, id))
      .returning();
    if (!order) return res.status(404).json({ error: "not_found", message: "Order not found" });

    // Push real-time updates to the customer and to all connected admin sessions
    pushEventToUser(order.userId, "order_status_updated", {
      id: String(order.id),
      status: order.status,
    });
    pushEventToAdmins("order_status_updated", {
      id: String(order.id),
      status: order.status,
    });

    return res.json({ id: String(order.id), status: order.status });
  } catch (err) {
    req.log.error(err, "admin update order status error");
    return res.status(500).json({ error: "internal_error", message: "Failed to update order status" });
  }
});

// ── Admin reset a user's password ───────────────────────────────────────────
router.post("/users/:userId/reset-password", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({ error: "validation_error", message: "Password must be at least 8 characters" });
    }

    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "not_found", message: "User not found" });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(usersTable)
      .set({ passwordHash: newHash })
      .where(eq(usersTable.id, userId));

    return res.json({ success: true });
  } catch (err) {
    req.log.error(err, "admin reset user password error");
    return res.status(500).json({ error: "internal_error", message: "Failed to reset password" });
  }
});

// ── Admin change password ───────────────────────────────────────────────────
router.post("/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const auth = (req as any).auth as { userId: number };

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "validation_error", message: "Both current and new password are required" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({ error: "validation_error", message: "New password must be at least 8 characters" });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: "validation_error", message: "New password must differ from the current password" });
    }

    const [user] = await db
      .select({ id: usersTable.id, passwordHash: usersTable.passwordHash })
      .from(usersTable)
      .where(eq(usersTable.id, auth.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "not_found", message: "User not found" });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "invalid_password", message: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(usersTable)
      .set({ passwordHash: newHash })
      .where(eq(usersTable.id, user.id));

    return res.json({ success: true });
  } catch (err) {
    req.log.error(err, "admin change password error");
    return res.status(500).json({ error: "internal_error", message: "Failed to change password" });
  }
});

// ── Fulfillment Settings ─────────────────────────────────────────────────────
router.get("/settings/fulfillment", async (req, res) => {
  try {
    const mode = await getFulfillmentMode();
    return res.json({ mode });
  } catch (err) {
    req.log.error(err, "get fulfillment mode error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get settings" });
  }
});

router.put("/settings/fulfillment", async (req, res) => {
  try {
    const { mode } = req.body;
    if (mode !== "manual" && mode !== "api") {
      return res.status(400).json({ error: "validation_error", message: "Mode must be 'manual' or 'api'" });
    }
    await setFulfillmentMode(mode as FulfillmentMode);
    console.log(`[Settings] Fulfillment mode changed to: ${mode}`);
    return res.json({ mode, success: true });
  } catch (err) {
    req.log.error(err, "set fulfillment mode error");
    return res.status(500).json({ error: "internal_error", message: "Failed to update settings" });
  }
});

router.post("/orders/:id/retry-fulfillment", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: "not_found", message: "Order not found" });
    }

    if (order.type !== "bundle") {
      return res.status(400).json({ error: "validation_error", message: "Only bundle orders can be auto-fulfilled" });
    }

    const result = await fulfillBundle({
      id: order.id,
      userId: order.userId,
      details: order.details,
      amount: order.amount,
    });

    return res.json({ success: result.success, message: result.message, providerRef: result.providerRef });
  } catch (err) {
    req.log.error(err, "retry fulfillment error");
    return res.status(500).json({ error: "internal_error", message: "Failed to retry fulfillment" });
  }
});

export default router;
