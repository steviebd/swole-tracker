#!/bin/bash

# Database Setup Script for Swole Tracker
# Usage: ./scripts/setup-database.sh [environment]
# Environments: dev, staging, production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment configuration
ENV=${1:-dev}

# Database names mapping
declare -A DB_NAMES=(
    ["dev"]="swole-tracker-dev"
    ["staging"]="swole-tracker-staging"
    ["production"]="swole-tracker-prod"
)

# Check if environment is valid
if [[ ! ${DB_NAMES[$ENV]+_} ]]; then
    echo -e "${RED}❌ Invalid environment: $ENV${NC}"
    echo -e "${YELLOW}Valid environments: dev, staging, production${NC}"
    exit 1
fi

DB_NAME=${DB_NAMES[$ENV]}

echo -e "${BLUE}🚀 Setting up database for ${ENV} environment${NC}"
echo -e "${BLUE}📊 Database: $DB_NAME${NC}"
echo

# Step 1: List existing databases
echo -e "${YELLOW}📋 Listing existing databases...${NC}"
npx wrangler d1 list

echo

# Step 2: Check if database exists
echo -e "${YELLOW}🔍 Checking if database '$DB_NAME' exists...${NC}"

if npx wrangler d1 list | grep -q "$DB_NAME"; then
    echo -e "${GREEN}✅ Database '$DB_NAME' found${NC}"
    
    # Get database ID
    DB_ID=$(npx wrangler d1 list | grep "$DB_NAME" | awk '{print $1}')
    echo -e "${BLUE}🆔 Database ID: $DB_ID${NC}"
    
    # Check current table count
    echo -e "${YELLOW}📊 Checking current schema...${NC}"
    
    if [[ $ENV == "dev" ]]; then
        # For dev, use local database
        TABLE_COUNT=$(npx wrangler d1 execute $DB_NAME --command="SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name LIKE 'swole-tracker_%';" --json | jq -r '.[0].results[0].count')
        echo -e "${BLUE}📈 Current tables: $TABLE_COUNT${NC}"
        
        if [[ $TABLE_COUNT -eq 0 ]]; then
            echo -e "${YELLOW}⚡ Applying migrations to local database...${NC}"
            npx wrangler d1 migrations apply $DB_NAME
            echo -e "${GREEN}✅ Local migrations applied${NC}"
        else
            echo -e "${GREEN}✅ Local database already has schema${NC}"
        fi
    else
        # For staging/production, use remote database
        ENV_FLAG=""
        if [[ $ENV != "dev" ]]; then
            ENV_FLAG="--env $ENV"
        fi
        
        TABLE_COUNT=$(npx wrangler d1 execute $DB_NAME $ENV_FLAG --remote --command="SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name LIKE 'swole-tracker_%';" --json | jq -r '.[0].results[0].count')
        echo -e "${BLUE}📈 Current tables: $TABLE_COUNT${NC}"
        
        if [[ $TABLE_COUNT -eq 0 ]]; then
            echo -e "${YELLOW}⚡ Applying migrations to remote database...${NC}"
            npx wrangler d1 migrations apply $DB_NAME $ENV_FLAG --remote
            echo -e "${GREEN}✅ Remote migrations applied${NC}"
        else
            echo -e "${GREEN}✅ Remote database already has schema${NC}"
        fi
    fi
    
    echo
    echo -e "${GREEN}🎉 Database setup complete for ${ENV} environment!${NC}"
    
    # Show next steps
    echo
    echo -e "${BLUE}📝 Next steps:${NC}"
    echo -e "${YELLOW}1. Update your environment variables in .env.local:${NC}"
    echo "   CLOUDFLARE_${ENV^^}_D1_DATABASE_ID=$DB_ID"
    echo
    echo -e "${YELLOW}2. For ${ENV} environment, update wrangler.toml if needed${NC}"
    echo
    echo -e "${YELLOW}3. Verify database connection:${NC}"
    if [[ $ENV == "dev" ]]; then
        echo "   npx wrangler d1 execute $DB_NAME --command=\"SELECT COUNT(*) FROM sqlite_master WHERE type='table';\""
    else
        echo "   npx wrangler d1 execute $DB_NAME --env $ENV --remote --command=\"SELECT COUNT(*) FROM sqlite_master WHERE type='table';\""
    fi
    
else
    echo -e "${RED}❌ Database '$DB_NAME' not found${NC}"
    echo -e "${YELLOW}💡 Create the database first using Cloudflare Dashboard or:${NC}"
    echo "   npx wrangler d1 create $DB_NAME"
    exit 1
fi