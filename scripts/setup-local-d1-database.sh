#!/bin/bash

# Script to set up local D1 database for development
# This creates a local SQLite database and updates .env.local with overrides

set -e

DB_NAME="swole-tracker-dev"
ENV_FILE=".env.local"
FLAG="USE_LOCAL_D1=true"

echo "Setting up local D1 database..."

# Check if Wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Error: Wrangler CLI is not installed. Please install it with 'npm install -g wrangler'"
    exit 1
fi

# Note: Local D1 databases are created automatically when using --local flag
# We don't need to explicitly create them with wrangler d1 create
echo "Local D1 database will be created automatically when needed"

# Apply migrations
echo "Applying database migrations..."
wrangler d1 migrations apply "$DB_NAME" --local

# Update .env.local with local overrides
echo "Updating $ENV_FILE with local D1 overrides..."

# Create .env.local if it doesn't exist
touch "$ENV_FILE"

# Add or update the local D1 flag and overrides
if ! grep -q "^$FLAG" "$ENV_FILE"; then
    echo "" >> "$ENV_FILE"
    echo "# Local D1 Development Overrides" >> "$ENV_FILE"
    echo "$FLAG" >> "$ENV_FILE"
    echo "CLOUDFLARE_D1_DATABASE_ID=local-$DB_NAME" >> "$ENV_FILE"
    echo "DATABASE_URL=sqlite:.wrangler/state/$DB_NAME.db" >> "$ENV_FILE"
    echo "# Add other local overrides as needed" >> "$ENV_FILE"
else
    echo "$ENV_FILE already contains local D1 configuration"
fi

# Validate setup
echo "Validating setup..."
if wrangler d1 execute "$DB_NAME" --local --command="SELECT 1" &> /dev/null; then
    echo "✅ Local D1 database is working correctly"
else
    echo "❌ Error: Local D1 database validation failed"
    exit 1
fi

echo ""
echo "🎉 Local D1 setup complete!"
echo "📁 Data will persist in .wrangler/state/$DB_NAME.db"
echo "🚀 Run 'bun run dev' or 'bun run dev:local' to start development with local D1"
echo "🔄 Use 'bun run dev:remote' for remote Cloudflare D1 development"
echo ""
echo "To reset local database:"
echo "  wrangler d1 delete $DB_NAME --local"
echo "  rm -rf .wrangler/state/$DB_NAME.db"