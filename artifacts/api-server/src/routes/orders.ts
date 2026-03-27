import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { ordersTable, walletsTable, transactionsTable, bundlesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "gigshub-secret-key-change-in-production";

function getUserId(req: any): number | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as { userId: number };
    return decoded.userId;
  } catch {
    return null;
  }
}

router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "auth_error", message: "Not authenticated" });
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, userId));
    return res.json(orders.map(o => ({
      id: String(o.id),
      userId: String(o.userId),
      type: o.type,
      status: o.status,
      amount: parseFloat(o.amount),
      details: o.details,
      createdAt: o.createdAt.toISOString(),
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  } catch (err) {
    req.log.error(err, "get orders error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get orders" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "auth_error", message: "Not authenticated" });
    const { type, bundleId, phoneNumber, serviceId, details } = req.body;
    if (!type || !phoneNumber) {
      return res.status(400).json({ error: "validation_error", message: "type and phoneNumber are required" });
    }
    let amount = 0;
    let orderDetails: any = { phoneNumber, ...details };
    if (type === "bundle" && bundleId) {
      const [bundle] = await db.select().from(bundlesTable).where(eq(bundlesTable.id, parseInt(bundleId))).limit(1);
      if (!bundle) return res.status(404).json({ error: "not_found", message: "Bundle not found" });
      amount = parseFloat(bundle.price);
      orderDetails = { ...orderDetails, bundleId, bundleName: bundle.name, data: bundle.data, networkName: bundle.networkName };
    } else if (type === "afa_registration") {
      amount = 20;
    } else if (type === "agent_registration") {
      amount = 50;
    }
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallet) return res.status(404).json({ error: "not_found", message: "Wallet not found" });
    if (parseFloat(wallet.balance) < amount) {
      return res.status(400).json({ error: "insufficient_funds", message: "Insufficient wallet balance" });
    }
    const newBalance = parseFloat(wallet.balance) - amount;
    await db.update(walletsTable).set({ balance: String(newBalance) }).where(eq(walletsTable.id, wallet.id));
    await db.insert(transactionsTable).values({
      walletId: wallet.id,
      type: "debit",
      amount: String(amount),
      description: `${type === "bundle" ? `Data bundle - ${orderDetails.bundleName || ""}` : type === "afa_registration" ? "AFA Registration" : "Agent Registration"} for ${phoneNumber}`,
    });
    const [order] = await db.insert(ordersTable).values({
      userId,
      type,
      status: "processing",
      amount: String(amount),
      details: orderDetails,
    }).returning();
    return res.status(201).json({
      id: String(order.id),
      userId: String(order.userId),
      type: order.type,
      status: order.status,
      amount: parseFloat(order.amount),
      details: order.details,
      createdAt: order.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "create order error");
    return res.status(500).json({ error: "internal_error", message: "Failed to create order" });
  }
});

export default router;
