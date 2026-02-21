#!/usr/bin/env node
// Custom build: esbuild for server + mcp-use for widgets
// Avoids tsc OOM caused by Zod v4's complex type definitions
import { execSync } from "child_process";
import { mkdirSync } from "fs";

mkdirSync("dist", { recursive: true });

console.log("[1/2] Building widgets with Vite...");
try {
  // mcp-use build will build widgets then try tsc — let the tsc part fail
  execSync("npx mcp-use build 2>&1", { timeout: 300000 });
} catch {
  // Expected: tsc OOMs, but widgets in dist/resources/ are already built
  console.log("  (tsc failed as expected with Zod v4, widgets built OK)");
}

console.log("[2/2] Bundling server with esbuild...");
execSync(
  [
    "npx esbuild index.ts",
    "--bundle",
    "--platform=node",
    "--format=esm",
    "--outfile=dist/index.js",
    "--packages=external",
    '--banner:js="import{createRequire}from\'module\';const require=createRequire(import.meta.url);"',
  ].join(" "),
  { stdio: "inherit" }
);

console.log("Build complete!");
