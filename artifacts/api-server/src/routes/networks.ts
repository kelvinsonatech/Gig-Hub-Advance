import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { networksTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const networks = await db.select().from(networksTable).orderBy(networksTable.sortOrder);
    return res.json(networks.map(n => ({
      id: String(n.id),
      name: n.name,
      code: n.code,
      color: n.color,
      logoUrl: n.logoUrl,
      tagline: n.tagline,
    })));
  } catch (err) {
    req.log.error(err, "get networks error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get networks" });
  }
});

export default router;
