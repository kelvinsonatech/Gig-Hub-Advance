import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";

const app: Express = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // API server — no HTML to protect
  }),
);

// ── CORS — allow Replit preview domains, localhost, and any ALLOWED_ORIGINS ──
const extraOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

const allowedPatterns = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https:\/\/[\w-]+\.replit\.dev$/,
  /^https:\/\/[\w-]+\.replit\.app$/,
  /^https:\/\/[\w.-]+\.repl\.co$/,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // No origin = same-origin request or non-browser client (curl, server)
      if (!origin) return callback(null, true);
      if (extraOrigins.includes(origin)) return callback(null, true);
      if (allowedPatterns.some(p => p.test(origin))) return callback(null, true);
      return callback(new Error(`CORS: origin '${origin}' not allowed`), false);
    },
    credentials: true,
  }),
);

// ── Rate limiters ────────────────────────────────────────────────────────────
// Strict limit on login/register — prevents password brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limit", message: "Too many attempts. Please try again in 15 minutes." },
  skip: req => req.method === "GET", // only rate-limit mutations
});

// Moderate limit on admin routes — slows enumeration/scraping
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limit", message: "Too many requests. Please slow down." },
});

// ── Logging ──────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── Body parsing (capped at 1 MB to prevent payload attacks) ─────────────────
app.use(express.json({ type: "application/json", limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Apply rate limiters before routes ────────────────────────────────────────
app.use("/api/auth", authLimiter);
app.use("/api/admin", adminLimiter);

// ── Global API middleware ─────────────────────────────────────────────────────
app.use("/api", (req, res, next) => {
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
