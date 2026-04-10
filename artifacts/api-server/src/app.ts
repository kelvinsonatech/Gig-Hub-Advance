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
const ALLOWED_ORIGINS = [
  "https://turboghana.com",
  "https://www.turboghana.com",
  // Vercel preview / older deployment URLs
  /\.vercel\.app$/,
  // Replit dev previews
  /\.replit\.dev$/,
  /\.picard\.replit\.dev$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no Origin header) and JessCo webhooks
    if (!origin) return callback(null, true);
    const allowed = ALLOWED_ORIGINS.some((o) =>
      typeof o === "string" ? o === origin : o.test(origin)
    );
    callback(null, allowed);
  },
  credentials: true,
}));
// Accept JSON body regardless of Content-Type (handles cases where proxies
// or fetch interceptors strip the header before reaching Express)
app.use(express.json({ type: "*/*" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", (req, res, next) => {
  // Prevent browsers from caching authenticated API responses so balance/wallet
  // changes made by admins are always reflected immediately after login.
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

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
