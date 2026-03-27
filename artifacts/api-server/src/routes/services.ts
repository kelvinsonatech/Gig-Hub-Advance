import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { servicesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const services = await db.select().from(servicesTable);
    return res.json(services.map(s => ({
      id: String(s.id),
      name: s.name,
      description: s.description,
      category: s.category,
      price: parseFloat(s.price),
      iconUrl: s.iconUrl,
    })));
  } catch (err) {
    req.log.error(err, "get services error");
    return res.status(500).json({ error: "internal_error", message: "Failed to get services" });
  }
});

export default router;
