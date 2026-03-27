import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bundlesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { networkId, type } = req.query as { networkId?: string; type?: string };
    let query = db.select().from(bundlesTable);
    const conditions = [];
    if (networkId) conditions.push(eq(bundlesTable.networkId, parseInt(networkId)));
    if (type && ["daily", "weekly", "monthly", "special"].includes(type)) {
      conditions.push(eq(bundlesTable.type, type as any));
    }
    const bundles = conditions.length > 0
      ? await db.select().from(bundlesTable).where(conditions[0])
      : await db.select().from(bundlesTable);
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
    req.log.error(err, "get bundles error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get bundles" });
  }
});

export default router;
