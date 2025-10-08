#!/bin/bash

# Synchronise wrangler.toml with the current Infisical session so `wrangler dev`
# sees the same secrets that the Next.js worker expects.

set -e

CONFIG_FILE="wrangler.toml"
BACKUP_FILE="${CONFIG_FILE}.backup"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Error: $CONFIG_FILE not found"
  exit 1
fi

echo "🔄 Updating $CONFIG_FILE with Infisical secrets…"

# Prefer an already-provided D1 ID – avoids launching a nested Infisical process.
DB_ID="${D1_DB_ID:-}"

if [ -z "$DB_ID" ]; then
  DB_ID=$(infisical run --command "echo \$D1_DB_ID" 2>/dev/null)
fi

if [ -z "$DB_ID" ]; then
  echo "❌ Error: Could not retrieve D1_DB_ID from Infisical"
  exit 1
fi

if [[ ! $DB_ID =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
  echo "❌ Error: D1_DB_ID from Infisical doesn't look valid: $DB_ID"
  exit 1
fi

cp "$CONFIG_FILE" "$BACKUP_FILE"

CURRENT_ID=$(grep -m1 'database_id = "' "$CONFIG_FILE" | sed -E 's/.*"([^"]+)".*/\1/')
if [ "$CURRENT_ID" != "$DB_ID" ]; then
  sed -i.bak "0,/database_id = \"[^\"]*\"/s//database_id = \"$DB_ID\"/" "$CONFIG_FILE"
  rm "$CONFIG_FILE".bak
  echo "✅ Updated D1 database_id to $DB_ID"
else
  echo "ℹ️  D1 database_id already set to $DB_ID"
fi

python3 - "$CONFIG_FILE" <<'PY'
import json
import os
import sys

config_path = sys.argv[1]

with open(config_path, "r", encoding="utf-8") as handle:
    content = handle.read()

start_marker = "  [env.dev.vars]"
anchor_token = "[[env.dev.d1_databases]]"

start = content.find(start_marker)
if start == -1:
    raise SystemExit("❌ Could not locate [env.dev.vars] block in wrangler.toml")

anchor = content.find(anchor_token, start)
if anchor == -1:
    raise SystemExit("❌ Could not locate env.dev D1 configuration in wrangler.toml")

var_names = [
    "WORKOS_API_KEY",
    "WORKOS_CLIENT_ID",
    "WORKOS_REDIRECT_URI",
    "WORKOS_COOKIE_PASSWORD",
    "WORKER_SESSION_SECRET",
    "ENCRYPTION_MASTER_KEY",
    "WHOOP_CLIENT_ID",
    "WHOOP_CLIENT_SECRET",
    "WHOOP_REDIRECT_URI",
    "WHOOP_WEBHOOK_SECRET",
    "WHOOP_SYNC_RATE_LIMIT_PER_HOUR",
    "AI_GATEWAY_API_KEY",
    "AI_GATEWAY_MODEL",
    "AI_GATEWAY_PROMPT",
    "AI_GATEWAY_JOKE_MEMORY_NUMBER",
    "AI_GATEWAY_MODEL_HEALTH",
    "AI_DEBRIEF_MODEL",
    "AI_DEBRIEF_TEMPERATURE",
    "VERCEL_AI_GATEWAY_API_KEY",
    "NEXT_PUBLIC_POSTHOG_KEY",
    "NEXT_PUBLIC_POSTHOG_HOST",
    "NEXT_PUBLIC_SITE_URL",
    "RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR",
    "RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR",
    "RATE_LIMIT_API_CALLS_PER_MINUTE",
    "RATE_LIMIT_ENABLED",
]

block_lines = ["  [env.dev.vars]"]
for name in var_names:
    value = os.environ.get(name, "")
    block_lines.append(f"  {name} = {json.dumps(value)}")
block_lines.append("")
block = "\n".join(block_lines)

updated = content[:start] + block + content[anchor:]

with open(config_path, "w", encoding="utf-8") as handle:
    handle.write(updated)
PY

echo "✅ Injected env.dev.vars from current Infisical session"
echo "   Backup saved as $BACKUP_FILE"
