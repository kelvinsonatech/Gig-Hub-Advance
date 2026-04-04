import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import networksRouter from "./networks";
import bundlesRouter from "./bundles";
import servicesRouter from "./services";
import ordersRouter from "./orders";
import walletRouter from "./wallet";
import adminRouter from "./admin";
import notificationsRouter from "./notifications";
import utilsRouter from "./utils";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/networks", networksRouter);
router.use("/bundles", bundlesRouter);
router.use("/services", servicesRouter);
router.use("/orders", ordersRouter);
router.use("/wallet", walletRouter);
router.use("/admin", adminRouter);
router.use("/notifications", notificationsRouter);
router.use("/utils", utilsRouter);
router.use("/payments", paymentsRouter);

export default router;
