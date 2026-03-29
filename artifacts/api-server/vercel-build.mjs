/**
 * Vercel API build script
 * Bundles the Express app into api/handler.js (CommonJS)
 * so Vercel can execute it as a serverless function.
 *
 * Run via: pnpm --filter @workspace/api-server run build:vercel
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(artifactDir, "../..");
const outfile = path.join(root, "api", "handler.js");

await build({
  entryPoints: [path.join(artifactDir, "src/app.ts")],
  bundle: true,
  format: "cjs",          // CommonJS — widest Vercel runtime support
  platform: "node",
  target: "node22",
  outfile,
  // Only skip true native addons that cannot be bundled
  external: [
    "*.node",
    "pg-native",
    "sharp",
    "fsevents",
    // pino-pretty is only used in dev; production pino skips it
    "pino-pretty",
  ],
  // Normalise the export so Vercel can detect the handler:
  // esbuild CJS wraps `export default app` as `exports.default = app`
  // This footer promotes it to `module.exports` directly.
  footer: {
    js: "module.exports = module.exports.default ?? module.exports;",
  },
  sourcemap: "inline",
  logLevel: "info",
});

console.log(`✓ API bundled → ${outfile}`);
