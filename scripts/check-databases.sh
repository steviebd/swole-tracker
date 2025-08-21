#!/bin/bash

# Database Status Checker for Swole Tracker
# Usage: ./scripts/check-databases.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Checking Swole Tracker Database Status${NC}"
echo "================================================"

# Check all databases
echo -e "${YELLOW}📋 All D1 Databases:${NC}"
npx wrangler d1 list

echo
echo -e "${YELLOW}🏗️ Database Schema Status:${NC}"
echo

# Function to check database schema
check_database() {
    local db_name=$1
    local env=$2
    local remote_flag=$3
    
    echo -e "${BLUE}📊 $db_name ($env):${NC}"
    
    if npx wrangler d1 list | grep -q "$db_name"; then
        local cmd="npx wrangler d1 execute $db_name"
        if [[ $env != "dev" ]]; then
            cmd="$cmd --env $env"
        fi
        if [[ $remote_flag == "true" ]]; then
            cmd="$cmd --remote"
        fi
        cmd="$cmd --command=\"SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name LIKE 'swole-tracker_%';\""
        
        local table_count=$(eval $cmd --json 2>/dev/null | jq -r '.[0].results[0].count' 2>/dev/null || echo "0")
        
        if [[ $table_count -gt 0 ]]; then
            echo -e "   ${GREEN}✅ Schema applied ($table_count tables)${NC}"
        else
            echo -e "   ${RED}❌ No schema applied${NC}"
        fi
    else
        echo -e "   ${RED}❌ Database not found${NC}"
    fi
    echo
}

# Check each environment
check_database "swole-tracker-dev" "dev" "false"
check_database "swole-tracker-staging" "staging" "true"
check_database "swole-tracker-prod" "production" "true"

echo -e "${BLUE}💡 To set up a database:${NC}"
echo -e "${YELLOW}   ./scripts/setup-database.sh [dev|staging|production]${NC}"
echo
echo -e "${BLUE}📚 Migration commands:${NC}"
echo -e "${YELLOW}   # Development${NC}"
echo "   npx wrangler d1 migrations apply swole-tracker-dev"
echo
echo -e "${YELLOW}   # Staging${NC}"
echo "   npx wrangler d1 migrations apply swole-tracker-staging --env staging --remote"
echo
echo -e "${YELLOW}   # Production${NC}"
echo "   npx wrangler d1 migrations apply swole-tracker-prod --env production --remote"