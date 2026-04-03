import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
// Accept JSON body regardless of Content-Type (handles cases where proxies
// or fetch interceptors strip the header before reaching Express)
app.use(express.json({ type: "*/*" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", (req, res, next) => {
  if (!db) {
    return res.status(503).json({
      error: "service_unavailable",
      message: "Database not configured. Set SUPABASE_DATABASE_URL or DATABASE_URL in environment variables.",
    });
  }
  next();
});

app.use("/api", router);

export default app;
