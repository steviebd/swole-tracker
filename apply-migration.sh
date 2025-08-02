#!/usr/bin/env bash
# Script to apply linkingRejected migration to production database

set -e

echo "🚀 Applying linkingRejected migration to production database..."

# Check if PRODUCTION_DATABASE_URL is set
if [ -z "$PRODUCTION_DATABASE_URL" ]; then
    echo "❌ Error: PRODUCTION_DATABASE_URL environment variable is not set"
    echo "Please set it with: export PRODUCTION_DATABASE_URL='your-production-db-url'"
    exit 1
fi

# Verify the migration file exists
if [ ! -f "migration_add_linking_rejected.sql" ]; then
    echo "❌ Error: migration_add_linking_rejected.sql file not found"
    exit 1
fi

echo "📋 Migration SQL:"
echo "----------------------------------------"
cat migration_add_linking_rejected.sql
echo "----------------------------------------"

# Confirm before proceeding
read -p "⚠️  Are you sure you want to apply this migration to PRODUCTION? [y/N]: " -r REPLY
if ! [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql is not installed. Please install PostgreSQL client tools"
    echo "On macOS: brew install postgresql"
    echo "On Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

# Test connection first
echo "🔍 Testing database connection..."
if ! psql "$PRODUCTION_DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Error: Could not connect to production database"
    echo "Please verify your PRODUCTION_DATABASE_URL is correct"
    exit 1
fi

# Check if column already exists
echo "🔍 Checking if linkingRejected column already exists..."
COLUMN_EXISTS=$(psql "$PRODUCTION_DATABASE_URL" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='swole-tracker_template_exercise' AND column_name='linkingRejected');" | xargs)

if [ "$COLUMN_EXISTS" = "t" ]; then
    echo "✅ Column 'linkingRejected' already exists in production database"
    echo "Migration appears to have been applied already"
    exit 0
fi

# Apply the migration
echo "⚡ Applying migration..."
if psql "$PRODUCTION_DATABASE_URL" -f migration_add_linking_rejected.sql; then
    echo "✅ Migration applied successfully!"
    
    # Verify the column was added
    VERIFICATION=$(psql "$PRODUCTION_DATABASE_URL" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='swole-tracker_template_exercise' AND column_name='linkingRejected');" | xargs)
    
    if [ "$VERIFICATION" = "t" ]; then
        echo "✅ Verification successful: linkingRejected column exists"
    else
        echo "❌ Verification failed: linkingRejected column not found after migration"
        exit 1
    fi
else
    echo "❌ Migration failed!"
    exit 1
fi

echo "🎉 Production database migration completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Deploy the updated application code to production"
echo "2. Test template creation functionality"
