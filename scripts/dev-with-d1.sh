#!/bin/bash

# Wrapper script for development with local D1 support
# Handles conditional Infisical injection based on local D1 configuration

set -e

ENV_FILE=".env.local"
FLAG="USE_LOCAL_D1=true"

# Check if local D1 is configured
if [ -f "$ENV_FILE" ] && grep -q "^$FLAG" "$ENV_FILE"; then
    echo "Detected local D1 configuration. Starting with local overrides + Infisical secrets..."
    # Export variables from .env.local first (these will take precedence)
    set -a  # automatically export all variables
    source "$ENV_FILE"
    set +a  # stop automatically exporting
    
    # Then run Infisical (it won't override already-set environment variables)
    exec infisical run -- bunx next dev
else
    echo "No local D1 configuration found. Starting with standard Infisical injection..."
    exec infisical run -- bunx next dev
fi