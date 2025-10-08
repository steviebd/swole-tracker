#!/bin/bash

# Script to set up separate D1 databases for each environment
# Run this after creating databases in Cloudflare dashboard

set -e

echo "🔧 Setting up D1 databases for all environments..."
echo ""
echo "Prerequisites:"
echo "1. Create separate D1 databases in Cloudflare dashboard:"
echo "   - swole-tracker-dev"
echo "   - swole-tracker-staging"
echo "   - swole-tracker-prod"
echo "2. Get the database IDs from Cloudflare dashboard"
echo "3. Set D1_DB_ID_* environment variables in Infisical for each environment"
echo ""
echo "Environment variables needed in Infisical:"
echo "- dev: D1_DB_ID"
echo "- staging: D1_DB_ID"
echo "- production: D1_DB_ID"
echo "(Each environment should have its own D1_DB_ID value)"
echo ""

read -p "Do you have the database IDs ready? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please create the databases first and get their IDs."
    exit 1
fi

# Get database IDs from Infisical
echo "🔍 Getting database IDs from Infisical..."

DEV_DB_ID=$(infisical run --env dev --command "echo \$D1_DB_ID" 2>/dev/null || echo "")
STAGING_DB_ID=$(infisical run --env staging --command "echo \$D1_DB_ID" 2>/dev/null || echo "")
PROD_DB_ID=$(infisical run --env production --command "echo \$D1_DB_ID" 2>/dev/null || echo "")

if [ -z "$DEV_DB_ID" ] || [ -z "$STAGING_DB_ID" ] || [ -z "$PROD_DB_ID" ]; then
    echo "❌ Error: Could not retrieve all database IDs from Infisical"
    echo "Make sure D1_DB_ID is set in dev, staging, and production environments"
    echo ""
    echo "Current values:"
    echo "  Dev D1_DB_ID: ${DEV_DB_ID:-NOT_SET}"
    echo "  Staging D1_DB_ID: ${STAGING_DB_ID:-NOT_SET}"
    echo "  Prod D1_DB_ID: ${PROD_DB_ID:-NOT_SET}"
    exit 1
fi

echo "✅ Retrieved database IDs:"
echo "  Dev: $DEV_DB_ID"
echo "  Staging: $STAGING_DB_ID"
echo "  Prod: $PROD_DB_ID"

# Update wrangler.toml
echo ""
echo "🔄 Updating wrangler.toml..."

# Backup current config
cp wrangler.toml wrangler.toml.bak

# Update staging database ID
sed -i.bak "s/\[env\.staging\]/&\n  database_id = \"$STAGING_DB_ID\"/" wrangler.toml
sed -i.bak "s/database_id = \"df72a743-bd0c-4015-806f-b12e13f14eb3\"/\n  database_id = \"$STAGING_DB_ID\"/" wrangler.toml

# Update production database ID
sed -i.bak "s/\[env\.production\]/&\n  database_id = \"$PROD_DB_ID\"/" wrangler.toml
sed -i.bak "s/database_id = \"df72a743-bd0c-4015-806f-b12e13f14eb3\"/\n  database_id = \"$PROD_DB_ID\"/" wrangler.toml

# Update preview database ID (using staging for preview)
sed -i.bak "s/\[env\.preview\]/&\n  database_id = \"$STAGING_DB_ID\"/" wrangler.toml

rm wrangler.toml.bak

echo "✅ Updated wrangler.toml with separate database IDs"
echo ""
echo "🎉 Setup complete! You can now use:"
echo "  bun run db:push:dev     - Push to dev database"
echo "  bun run db:push:staging - Push to staging database"
echo "  bun run db:push:prod    - Push to production database"
echo "  bun run db:push:all     - Push to all databases"
echo ""
echo "Note: Make sure your Infisical environments have the correct D1_DB_ID_* variables set."