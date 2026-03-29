/**
 * Master Vercel build script using the Build Output API v3.
 * Creates the .vercel/output/ directory structure that Vercel deploys directly.
 *
 * Output structure:
 *   .vercel/output/
 *     config.json              — routing rules
 *     static/                  — static frontend assets
 *     functions/
 *       api/
 *         handler.func/
 *           index.js           — bundled Express API
 *           .vc-config.json    — function runtime metadata
 */
import { execSync } from "node:child_process";
import { mkdirSync, cpSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(root, ".vercel/output");

// ── 1. Clean previous output ──────────────────────────────────────────────────
rmSync(outputDir, { recursive: true, force: true });

// ── 2. Build frontend ─────────────────────────────────────────────────────────
console.log("\n▶ Building frontend...");
execSync("pnpm --filter @workspace/gigshub build", {
  stdio: "inherit",
  cwd: root,
  env: { ...process.env, BASE_PATH: "/", NODE_ENV: "production" },
});

// ── 3. Build API bundle ───────────────────────────────────────────────────────
console.log("\n▶ Building API bundle...");
execSync("pnpm --filter @workspace/api-server run build:vercel", {
  stdio: "inherit",
  cwd: root,
  env: { ...process.env, NODE_ENV: "production" },
});

// ── 4. Copy static files → .vercel/output/static/ ────────────────────────────
console.log("\n▶ Staging static files...");
const staticDir = path.join(outputDir, "static");
mkdirSync(staticDir, { recursive: true });
cpSync(path.join(root, "artifacts/gigshub/dist/public"), staticDir, {
  recursive: true,
});

// ── 5. Place API function → .vercel/output/functions/api/handler.func/ ────────
console.log("\n▶ Staging API function...");
const funcDir = path.join(outputDir, "functions/api/handler.func");
mkdirSync(funcDir, { recursive: true });
cpSync(path.join(root, "api/handler.js"), path.join(funcDir, "index.js"));

// Function runtime metadata
writeFileSync(
  path.join(funcDir, ".vc-config.json"),
  JSON.stringify({ runtime: "nodejs22.x", handler: "index.js", launcherType: "Nodejs" }, null, 2),
);

// ── 6. Write routing config ───────────────────────────────────────────────────
console.log("\n▶ Writing routing config...");
writeFileSync(
  path.join(outputDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Long-lived cache headers for hashed static assets
        {
          src: "/assets/(.+)",
          headers: { "Cache-Control": "public, max-age=31536000, immutable" },
          continue: true,
        },
        // API → serverless function
        { src: "/api/(.*)", dest: "/api/handler" },
        // Let the filesystem serve any static file that exists
        { handle: "filesystem" },
        // SPA fallback — everything else → index.html
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

console.log("\n✓ Vercel build output ready at .vercel/output/\n");
