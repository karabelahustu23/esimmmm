import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, mkdir } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildVercel() {
  const outDir = path.resolve(artifactDir, "dist/vercel");
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/handler.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outdir: outDir,
    outExtension: { ".js": ".js" },
    logLevel: "info",
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
    ],
    sourcemap: false,
    plugins: [
      esbuildPluginPino({ transports: [] }),
    ],
    banner: {
      js: `const { createRequire: __bannerCrReq } = require('node:module');
const __bannerPath = require('node:path');
const __bannerUrl = require('node:url');
globalThis.require = globalThis.require || __bannerCrReq(__filename);
globalThis.__filename = globalThis.__filename || __filename;
globalThis.__dirname = globalThis.__dirname || __dirname;
`,
    },
  });

  console.log("Vercel bundle built to dist/vercel/handler.js");
}

buildVercel().catch((err) => {
  console.error(err);
  process.exit(1);
});
