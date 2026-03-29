/**
 * Vercel API build script
 * Bundles the Express app into api/handler.mjs
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
const outfile = path.join(root, "api", "handler.mjs");

await build({
  entryPoints: [path.join(artifactDir, "src/app.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  outfile,
  // Only skip true native addons that cannot be bundled
  external: [
    "*.node",
    "pg-native",
    "sharp",
    "fsevents",
    // pino-pretty is only used in dev; production pino uses no transport
    "pino-pretty",
  ],
  // Shim require/filename/dirname for CJS packages inside the ESM bundle
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

console.log(`✓ API bundled → ${outfile}`);
