#!/bin/bash

# Wrapper script for development with local D1 support
# Handles conditional Infisical injection based on local D1 configuration

set -e

ENV_FILE=".env.local"
FLAG="USE_LOCAL_D1=true"

# Check if local D1 is configured
if [ -f "$ENV_FILE" ] && grep -q "^$FLAG" "$ENV_FILE"; then
    echo "Detected local D1 configuration. Starting with local overrides..."
    # Use Infisical with .env.local for overrides, injecting non-conflicting values
    exec infisical run --env-file .env.local -- bunx next dev
else
    echo "No local D1 configuration found. Starting with standard Infisical injection..."
    exec infisical run -- bunx next dev
fi