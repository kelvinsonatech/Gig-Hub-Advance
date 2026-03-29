/**
 * Vercel API build script
 * Bundles the Express API into a single ESM file (api/handler.mjs)
 * that Vercel can run as a serverless function.
 *
 * Invoked via the api-server package so esbuild is resolved correctly:
 *   pnpm --filter @workspace/api-server exec node ../../api/build.mjs
 * (see vercel.json buildCommand)
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

globalThis.require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

await build({
  entryPoints: [path.join(root, "artifacts/api-server/src/app.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  outfile: path.join(__dirname, "handler.mjs"),
  // Externalize native addons and optional/dev-only deps
  external: [
    "*.node",
    "pg-native",
    "pino-pretty",
    "thread-stream",
    "sharp",
    "fsevents",
  ],
  // Allow CJS packages (express, pg, etc.) inside the ESM bundle
  banner: {
    js: [
      `import { createRequire as __crReq } from "node:module";`,
      `import __path from "node:path";`,
      `import __url from "node:url";`,
      `globalThis.require = __crReq(import.meta.url);`,
      `globalThis.__filename = __url.fileURLToPath(import.meta.url);`,
      `globalThis.__dirname = __path.dirname(globalThis.__filename);`,
    ].join("\n"),
  },
  sourcemap: "inline",
  logLevel: "info",
});

console.log("✓ API bundled → api/handler.mjs");
