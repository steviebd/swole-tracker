#!/bin/bash

# Synchronise wrangler.toml with the current Infisical session so `wrangler`
# commands see the same secrets that the Next.js worker expects.

set -euo pipefail

TARGET_ENV="${1:-dev}"

case "$TARGET_ENV" in
  dev|staging|production|preview) ;;
  *)
    echo "❌ Error: Unknown environment '$TARGET_ENV'. Use one of dev, staging, production, preview."
    exit 1
    ;;
esac

CONFIG_FILE="wrangler.toml"
TEMPLATE_FILE="wrangler.template.toml"
BACKUP_FILE="${CONFIG_FILE}.backup"

if [ ! -f "$CONFIG_FILE" ]; then
  if [ -f "$TEMPLATE_FILE" ]; then
    cp "$TEMPLATE_FILE" "$CONFIG_FILE"
    echo "🆕 Seeded $CONFIG_FILE from $TEMPLATE_FILE"
  else
    echo "❌ Error: neither $CONFIG_FILE nor $TEMPLATE_FILE found"
    exit 1
  fi
fi

echo "🔄 Updating $CONFIG_FILE for env '$TARGET_ENV' with Infisical secrets…"

# Prefer an already-provided D1 ID – avoids launching a nested Infisical process.
DB_ID="${D1_DB_ID:-}"

if [ -z "$DB_ID" ]; then
  DB_ID=$(infisical run --env "$TARGET_ENV" --command "echo \$D1_DB_ID" 2>/dev/null || true)
fi

if [ -z "$DB_ID" ]; then
  echo "❌ Error: Could not retrieve D1_DB_ID from Infisical for '$TARGET_ENV'"
  exit 1
fi

if [[ ! $DB_ID =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
  echo "❌ Error: D1_DB_ID from Infisical doesn't look valid: $DB_ID"
  exit 1
fi

cp "$CONFIG_FILE" "$BACKUP_FILE"

python3 - "$CONFIG_FILE" "$TARGET_ENV" "$DB_ID" <<'PY'
import json
import os
import re
import sys

config_path, target_env, db_id = sys.argv[1:4]

with open(config_path, "r", encoding="utf-8") as handle:
    content = handle.read()

placeholder_pattern = re.compile(r"\{\{\s*([A-Z0-9_]+)\s*\}\}")

missing_placeholders = set()

def replace_placeholder(match: re.Match[str]) -> str:
    key = match.group(1)
    value = os.environ.get(key)
    if value is None:
        missing_placeholders.add(key)
        return match.group(0)
    return value

content = placeholder_pattern.sub(replace_placeholder, content)

pattern = re.compile(rf'(\[\[env\.{re.escape(target_env)}\.d1_databases\]\][^\[]*?database_id\s*=\s*")([^"]*)(")', re.DOTALL)

if not pattern.search(content):
    raise SystemExit(f"❌ Could not locate env.{target_env} D1 configuration in {config_path}")

content = pattern.sub(lambda match: f"{match.group(1)}{db_id}{match.group(3)}", content)

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

vars_header = f"  [env.{target_env}.vars]"
start = content.find(vars_header)

if start != -1:
    next_env_section = content.find("[env.", start + 1)
    next_db_section = content.find("[[env.", start + 1)

    candidates = [pos for pos in (next_env_section, next_db_section) if pos != -1]
    anchor = min(candidates) if candidates else len(content)

    block_lines = [vars_header]
    for name in var_names:
        value = os.environ.get(name, "")
        block_lines.append(f"  {name} = {json.dumps(value)}")
    block_lines.append("")
    block = "\n".join(block_lines)

    content = content[:start] + block + content[anchor:]

with open(config_path, "w", encoding="utf-8") as handle:
    handle.write(content)

if missing_placeholders:
    unresolved = ", ".join(sorted(missing_placeholders))
    print(f"⚠️  Warning: No environment values found for placeholders: {unresolved}")
PY

echo "✅ env.$TARGET_ENV.database_id -> $DB_ID"
if [ "$TARGET_ENV" = "dev" ]; then
  echo "✅ env.dev.vars refreshed from current Infisical session"
fi
echo "   Backup saved as $BACKUP_FILE"
