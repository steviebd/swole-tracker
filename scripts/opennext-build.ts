#!/usr/bin/env bun
import { existsSync, statSync, readdirSync, rmSync, writeFileSync } from "fs";
import { join, sep } from "path";
import { spawn } from "child_process";

const ROOT_DIR = join(import.meta.dirname!, "..");

console.log("Cleaning build directories");
// Don't clean .open-next if config files exist (workaround for OpenNext bug)
if (existsSync(join(ROOT_DIR, ".open-next/.build/open-next.config.edge.mjs"))) {
  rmSync(join(ROOT_DIR, ".next"), { recursive: true, force: true });
} else {
  rmSync(join(ROOT_DIR, ".open-next"), { recursive: true, force: true });
  rmSync(join(ROOT_DIR, ".next"), { recursive: true, force: true });
}

const OUTPUT_FILE = join(ROOT_DIR, ".open-next/worker.js");
const NEXT_BIN = join(ROOT_DIR, "node_modules/.bin/next");

function runNextBuild() {
  if (!existsSync(NEXT_BIN)) {
    console.error(`Next.js CLI not found at ${NEXT_BIN}`);
    process.exit(1);
  }
  console.log("OpenNext — running Next.js build");
  const proc = spawn(NEXT_BIN, ["build"], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });
  return new Promise<void>((resolve, reject) => {
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Next build failed with code ${code}`));
    });
  });
}

if (process.env.OPENNEXT_CHILD_BUILD === "1") {
  await runNextBuild();
  process.exit(0);
}

function getLatestSource(root: string): number {
  const inputs = ["src", "public", "next.config.js", "open-next.config.ts", "package.json", "tsconfig.json"];
  let latest = 0;
  const ignoreDirs = new Set([
    join(root, ".open-next"),
    join(root, "node_modules"),
    join(root, ".wrangler"),
  ]);

  function scan(target: string) {
    if (!existsSync(target)) return;
    const stats = statSync(target);
    if (stats.isDirectory()) {
      if ([...ignoreDirs].some((ignored) => target === ignored || target.startsWith(ignored + sep))) {
        return;
      }
      for (const entry of readdirSync(target, { withFileTypes: true })) {
        scan(join(target, entry.name));
      }
    } else if (stats.isFile()) {
      if (stats.mtimeMs > latest) {
        latest = stats.mtimeMs;
      }
    }
  }

  for (const input of inputs) {
    scan(join(root, input));
  }

  return Math.floor(latest);
}

const LATEST_SOURCE = getLatestSource(ROOT_DIR);

function getBuildTimestamp(file: string): number {
  if (!existsSync(file)) {
    return 0;
  }
  return Math.floor(statSync(file).mtimeMs);
}

const BUILD_TIMESTAMP = getBuildTimestamp(OUTPUT_FILE);

async function runOpenNextPackager() {
  console.log("OpenNext — packaging Cloudflare worker");
  // Workaround: Generate config files first
  console.log("OpenNext — generating config files");
  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("npx", ["--yes", "@opennextjs/cloudflare", "build", "--skipBuild"], {
        stdio: "ignore",
        env: { ...process.env, OPENNEXT_CHILD_BUILD: "1" },
      });
      proc.on("close", (code) => {
        if (code === 0 || code === null) resolve();
        else reject(new Error(`Config generation failed with code ${code}`));
      });
    });
  } catch {
    // Ignore errors as per original
  }
  // Then run the full build
  const proc = spawn("npx", ["--yes", "@opennextjs/cloudflare", "build"], {
    stdio: "inherit",
    env: { ...process.env, OPENNEXT_CHILD_BUILD: "1" },
  });
  return new Promise<void>((resolve, reject) => {
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`OpenNext build failed with code ${code}`));
    });
  });
}

if (!existsSync(OUTPUT_FILE)) {
  console.log("OpenNext — initial build");
  await runOpenNextPackager();
}

if (LATEST_SOURCE <= BUILD_TIMESTAMP) {
  console.log("OpenNext — skipping rebuild (artifacts are up to date)");
  process.exit(0);
}

console.log("OpenNext — rebuilding Next.js app");
await runOpenNextPackager();