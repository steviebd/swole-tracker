#!/bin/bash

# Wrapper script for development with local D1 support
# Creates local SQLite database and applies schema following Cloudflare D1 best practices

set -e

ENV_FILE=".env.local"
WRANGLER_STATE_DIR=".wrangler/state"
DB_FILE="$WRANGLER_STATE_DIR/swole-tracker-dev.db"
MIGRATIONS_DIR="drizzle"

echo "🚀 Starting Swole Tracker with Local D1 Development Setup"
echo "========================================================="

# Create .wrangler/state directory if it doesn't exist
if [ ! -d "$WRANGLER_STATE_DIR" ]; then
    echo "📁 Creating Wrangler state directory..."
    mkdir -p "$WRANGLER_STATE_DIR"
fi

# Check if database file exists
DB_EXISTS=false
if [ -f "$DB_FILE" ]; then
    DB_EXISTS=true
    echo "✅ Found existing local database: $DB_FILE"
else
    echo "📊 Creating new local SQLite database: $DB_FILE"
    # Create empty SQLite database
    sqlite3 "$DB_FILE" "SELECT 1;" > /dev/null 2>&1
fi

# Check if we need to initialize the schema
NEEDS_SCHEMA_INIT=false

# Check if database has any tables
TABLE_COUNT=0
if [ -f "$DB_FILE" ]; then
    TABLE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
fi

# If database is new, empty, or migrations directory doesn't exist, we need to initialize
if [ "$DB_EXISTS" = false ] || [ "$TABLE_COUNT" -eq 0 ] || [ ! -d "$MIGRATIONS_DIR" ] || [ -z "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
    NEEDS_SCHEMA_INIT=true
fi

# Initialize schema if needed
if [ "$NEEDS_SCHEMA_INIT" = true ]; then
    echo "🔧 Initializing database schema..."
    echo "🗄️  Pushing schema to local database..."
    # Use drizzle-kit push for local development (simpler than migrations)
    bun run db:push
else
    echo "✅ Database schema appears to be initialized"
fi

# Configure .env.local for local D1 development
echo "⚙️  Configuring environment for local D1..."

# Create .env.local if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    echo "📄 Creating .env.local from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example "$ENV_FILE"
    else
        touch "$ENV_FILE"
    fi
fi

# Update or add local D1 configuration
configure_env_var() {
    local key="$1"
    local value="$2"
    local file="$3"
    
    if grep -q "^${key}=" "$file"; then
        # Update existing value
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
        else
            sed -i "s|^${key}=.*|${key}=${value}|" "$file"
        fi
    else
        # Add new value
        echo "${key}=${value}" >> "$file"
    fi
}

# Set local D1 configuration
configure_env_var "USE_LOCAL_D1" "true" "$ENV_FILE"
configure_env_var "DATABASE_URL" "sqlite:.wrangler/state/swole-tracker-dev.db" "$ENV_FILE"
configure_env_var "CLOUDFLARE_D1_DATABASE_ID" "local-swole-tracker-dev" "$ENV_FILE"

echo "✅ Environment configured for local D1 development"

# Export variables from .env.local
echo "🔧 Loading environment variables..."
set -a  # automatically export all variables
if [ -f "$ENV_FILE" ]; then
    # Load .env.local while preserving existing environment variables
    while IFS='=' read -r key value; do
        # Skip empty lines and comments
        [[ -z "$key" || "$key" =~ ^#.*$ ]] && continue
        # Only set if not already set in environment
        if [ -z "${!key}" ]; then
            export "$key"="$value"
        fi
    done < <(grep -E "^[A-Za-z_][A-Za-z0-9_]*=" "$ENV_FILE")
fi
set +a  # stop automatically exporting

# Start Next.js development server
echo "🚀 Starting Next.js development server..."
echo "📊 Using local SQLite database: $DB_FILE"
echo "🌐 Server will be available at: http://localhost:3000"
echo ""

exec bunx next dev