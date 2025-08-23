#!/bin/bash
set -euo pipefail

echo "🔐 Installing Infisical CLI..."

# Check if infisical is already installed
if command -v infisical &> /dev/null; then
    echo "✅ Infisical CLI already installed"
    infisical --version
    exit 0
fi

# Detect OS and install accordingly
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "📦 Detected Linux, installing via package manager..."
    
    # Try different package managers
    if command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash
        sudo apt-get update && sudo apt-get install -y infisical
    elif command -v yum &> /dev/null; then
        # RHEL/CentOS/Amazon Linux
        curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.rpm.sh' | sudo -E bash
        sudo yum install -y infisical
    elif command -v apk &> /dev/null; then
        # Alpine Linux
        curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | sudo -E bash
        sudo apk add infisical
    else
        echo "⚠️ No supported package manager found, installing manually..."
        # Download binary directly
        ARCH=$(uname -m)
        if [[ "$ARCH" == "x86_64" ]]; then
            ARCH="amd64"
        elif [[ "$ARCH" == "aarch64" ]]; then
            ARCH="arm64"
        fi
        
        curl -L "https://github.com/Infisical/infisical/releases/latest/download/infisical_linux_${ARCH}.tar.gz" -o infisical.tar.gz
        tar -xzf infisical.tar.gz
        sudo mv infisical /usr/local/bin/
        rm infisical.tar.gz
    fi
else
    echo "⚠️ Unsupported OS: $OSTYPE"
    echo "Installing via direct download..."
    
    # Fallback: direct download
    ARCH=$(uname -m)
    if [[ "$ARCH" == "x86_64" ]]; then
        ARCH="amd64"
    elif [[ "$ARCH" == "aarch64" ]] || [[ "$ARCH" == "arm64" ]]; then
        ARCH="arm64"
    fi
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        curl -L "https://github.com/Infisical/infisical/releases/latest/download/infisical_darwin_${ARCH}.tar.gz" -o infisical.tar.gz
    else
        curl -L "https://github.com/Infisical/infisical/releases/latest/download/infisical_linux_${ARCH}.tar.gz" -o infisical.tar.gz
    fi
    
    tar -xzf infisical.tar.gz
    sudo mv infisical /usr/local/bin/ 2>/dev/null || mv infisical /usr/local/bin/
    rm infisical.tar.gz
fi

echo "✅ Infisical CLI installed successfully"
infisical --version