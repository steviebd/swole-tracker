#!/bin/bash

# Wrapper script for development with local D1 support
# Now uses .env.local directly instead of Infisical

set -e

ENV_FILE=".env.local"
FLAG="USE_LOCAL_D1=true"

# Check if local D1 is configured
if [ -f "$ENV_FILE" ] && grep -q "^$FLAG" "$ENV_FILE"; then
    echo "Detected local D1 configuration. Starting with .env.local..."
    # Export variables from .env.local first (these will take precedence)
    set -a  # automatically export all variables
    source "$ENV_FILE"
    set +a  # stop automatically exporting
    
    # Run Next.js dev server directly
    exec bunx next dev
else
    echo "No local D1 configuration found. Starting without .env.local..."
    exec bunx next dev
fi