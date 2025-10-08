#!/bin/bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
OUTPUT_FILE="$ROOT_DIR/.open-next/worker.js"

LATEST_SOURCE=$(node - <<'NODE' "$ROOT_DIR"
import fs from "fs";
import path from "path";

const root = process.argv[2];
const inputs = [
  "src",
  "public",
  "next.config.js",
  "open-next.config.ts",
  "package.json",
  "tsconfig.json",
];

let latest = 0;
const ignoreDirs = new Set([
  path.join(root, ".open-next"),
  path.join(root, "node_modules"),
  path.join(root, ".wrangler"),
]);

function scan(target) {
  if (!fs.existsSync(target)) return;
  const stats = fs.statSync(target);
  if (stats.isDirectory()) {
    if ([...ignoreDirs].some((ignored) => target === ignored || target.startsWith(ignored + path.sep))) {
      return;
    }
    for (const entry of fs.readdirSync(target)) {
      scan(path.join(target, entry));
    }
  } else if (stats.isFile()) {
    if (stats.mtimeMs > latest) {
      latest = stats.mtimeMs;
    }
  }
}

for (const input of inputs) {
  scan(path.join(root, input));
}

console.log(Math.floor(latest));
NODE
)

BUILD_TIMESTAMP=$(node - <<'NODE' "$OUTPUT_FILE"
import fs from "fs";
const file = process.argv[2];
if (!fs.existsSync(file)) {
  console.log(0);
} else {
  console.log(Math.floor(fs.statSync(file).mtimeMs));
}
NODE
)

if [ ! -f "$OUTPUT_FILE" ]; then
  echo "OpenNext — initial build"
  exec npx --yes @opennextjs/cloudflare build
fi

if [ "$LATEST_SOURCE" -le "$BUILD_TIMESTAMP" ]; then
  echo "OpenNext — skipping rebuild (artifacts are up to date)"
  exit 0
fi

echo "OpenNext — rebuilding Next.js app"
exec npx --yes @opennextjs/cloudflare build
