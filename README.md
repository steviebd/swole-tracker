# Swole Tracker - Complete DevOps & Development Guide

> **Production-ready fitness tracking application** with Cloudflare Workers CI/CD Builds and native deployment.

## 📋 Table of Contents

- [🎯 DevOps Overview](#-devops-overview)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [🔧 Development Environment](#-development-environment)
- [🌐 Staging Environment](#-staging-environment)
- [🏭 Production Environment](#-production-environment)
- [⚙️ Environment Variables](#️-environment-variables)
- [🔑 API Token Setup](#-api-token-setup)
- [📦 Deployment Methods](#-deployment-methods)
- [🔍 Troubleshooting](#-troubleshooting)

## 🎯 DevOps Overview

**This application uses Cloudflare Workers CI/CD Builds** with automatic branch-based deployments directly from GitHub:

| Branch Pattern | Environment | Worker Name | Database | Deployment | URL |
|----------------|-------------|-------------|----------|------------|-----|
| `main` | **Production** | `swole-tracker-production` | `swole-tracker-prod` | 🔄 **Automatic** | `https://swole-tracker.workers.dev` |
| `feature/*` | **Staging** | `swole-tracker-staging` | `swole-tracker-staging` | 🔄 **Automatic** | `https://staging.swole-tracker.workers.dev` |
| Local dev | **Development** | Local worker | `swole-tracker-dev` | 🔧 **Manual** | `http://localhost:3000` |

**✅ Setup once → Deploy forever:** Configure Cloudflare Projects once, then every git push automatically builds and deploys to the correct environment using Cloudflare's native CI/CD.

## 🏗️ Architecture

### Stack
- **Framework**: Next.js 15 + React 19 + TypeScript
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Auth**: WorkOS (enterprise-grade authentication)
- **Deployment**: Cloudflare Workers + Cloudflare CI/CD Builds
- **Storage**: Cloudflare KV (rate limiting & caching)
- **Analytics**: PostHog (optional)
- **Integrations**: WHOOP fitness tracking (optional)

### Environment Isolation
Each environment has completely isolated resources:
- **Separate D1 databases** for data isolation
- **Separate KV namespaces** for caching and rate limiting
- **Environment-specific configuration** via Cloudflare Project settings
- **Branch-based automatic deployments** via Cloudflare CI/CD Builds

## 🚀 Quick Start

### Prerequisites

1. **GitHub Repository** connected to Cloudflare Workers
2. **Cloudflare Account** with Workers plan 
3. **Admin access** to Cloudflare account for project configuration
4. **Node.js 20.19.4** and **bun** package manager
5. **Cloudflare CLI**: `npm install -g wrangler` (for local development)

### 1. Fork/Clone Repository

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/swole-tracker.git
cd swole-tracker

# Install dependencies
bun install
```

### 2. Authenticate with Cloudflare

```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

### 3. Create All Cloudflare Resources

```bash
# Development environment (local dev)
wrangler d1 create swole-tracker-dev
wrangler kv namespace create "RATE_LIMIT_KV"
wrangler kv namespace create "CACHE_KV"

# Staging environment
wrangler d1 create swole-tracker-staging
wrangler kv namespace create "RATE_LIMIT_KV" --env staging
wrangler kv namespace create "CACHE_KV" --env staging

# Production environment
wrangler d1 create swole-tracker-prod
wrangler kv namespace create "RATE_LIMIT_KV" --env production
wrangler kv namespace create "CACHE_KV" --env production
```

**💡 Save all resource IDs** - you'll need them for local setup and GitHub Secrets.

### 4. Configure Cloudflare Projects

Create two separate Workers Projects in your Cloudflare dashboard:

#### **Step 4a: Create Staging Project**
1. Go to **Cloudflare Dashboard → Workers & Pages → Create**
2. Select **"Connect to Git"** → Choose your GitHub repository
3. Configure project:
   - **Project name**: `swole-tracker-staging`
   - **Production branch**: Leave empty (we'll use build branches)
   - **Build branches**: Enable and set pattern: `feature/*,feat/*`
   - **Build command**: `bun install && bun run build:cloudflare`
   - **Deploy command**: `npx wrangler deploy --env staging`

#### **Step 4b: Create Production Project**
1. Go to **Cloudflare Dashboard → Workers & Pages → Create**
2. Select **"Connect to Git"** → Choose your GitHub repository  
3. Configure project:
   - **Project name**: `swole-tracker-production`
   - **Production branch**: `main`
   - **Build command**: `bun install && bun run build:cloudflare`
   - **Deploy command**: `npx wrangler deploy --env production`

#### **Step 4c: Configure Environment Variables**
For **both projects**, add these environment variables in **Settings → Environment Variables**:

**Build Variables:**
```bash
# Cloudflare Resources (use appropriate staging/production IDs)
CLOUDFLARE_STAGING_D1_DATABASE_ID=your_staging_database_id  # staging project only
CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID=your_staging_rate_limit_kv_id  # staging project only
CLOUDFLARE_STAGING_CACHE_KV_ID=your_staging_cache_kv_id  # staging project only

CLOUDFLARE_PROD_D1_DATABASE_ID=your_prod_database_id  # production project only
CLOUDFLARE_PROD_RATE_LIMIT_KV_ID=your_prod_rate_limit_kv_id  # production project only
CLOUDFLARE_PROD_CACHE_KV_ID=your_prod_cache_kv_id  # production project only

# Authentication (both projects)
WORKOS_CLIENT_ID=your_workos_client_id
WORKOS_API_KEY=your_workos_api_key

# Analytics (both projects)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**Runtime Secrets** (for sensitive values):
```bash
# WHOOP Integration (if used)
WHOOP_CLIENT_SECRET=your_whoop_client_secret
WHOOP_WEBHOOK_SECRET=your_whoop_webhook_secret

# AI Gateway (if used)  
VERCEL_AI_GATEWAY_API_KEY=your_ai_gateway_api_key
```

### 5. Start Developing

**Local Development:**
```bash
# Create .env.local with development resource IDs
cp .env.example .env.local
# Edit .env.local with your development resource IDs and WorkOS credentials

# Start development server
bun dev
```

**Deploy to Staging:**
```bash
git checkout -b feature/your-feature
git commit -am "Your changes"
git push origin feature/your-feature
# → Automatic staging deployment via Cloudflare CI/CD Builds
```

**Deploy to Production:**
```bash
git checkout main
git commit -am "Production ready changes"
git push origin main
# → Automatic production deployment via Cloudflare CI/CD Builds
```

## 🔧 Development Environment

### Setup

1. **Create `.env.local`** with development resource IDs:
```bash
# Copy template
cp .env.example .env.local

# Add your development resource IDs from step 3 above
CLOUDFLARE_DEV_D1_DATABASE_ID=your_dev_database_id
CLOUDFLARE_DEV_RATE_LIMIT_KV_ID=your_dev_rate_limit_kv_id
CLOUDFLARE_DEV_CACHE_KV_ID=your_dev_cache_kv_id

# Add WorkOS credentials (required for auth)
WORKOS_CLIENT_ID=your_workos_client_id
WORKOS_API_KEY=your_workos_api_key
```

2. **Run database migrations:**
```bash
# Apply migrations to development D1 database
wrangler d1 migrations apply swole-tracker-dev
```

3. **Start development server:**
```bash
bun dev
```

### Development Features

- **Hot reload** with Next.js Turbopack
- **Real-time database** via Cloudflare D1 local development
- **Environment validation** with helpful error messages
- **Type-safe APIs** with tRPC and Zod validation
- **Offline-first** PWA capabilities for mobile testing

### Development Commands

```bash
# Development
bun dev                    # Start dev server with hot reload
bun build                  # Build for development testing
bun preview               # Build and start locally

# Database
bun db:push               # Push schema changes to D1
bun db:studio             # Open Drizzle Studio (database UI)
bun db:generate           # Generate migration files
bun db:migrate            # Apply migrations

# Code Quality
bun check                 # Run lint + typecheck
bun lint                  # ESLint checking
bun lint:fix              # Auto-fix ESLint issues
bun format:write          # Format code with Prettier

# Testing
bun test                  # Unit tests with Vitest
bun test:watch            # Watch mode testing
bun coverage              # Generate coverage report
bun e2e                   # End-to-end tests with Playwright
```

## 🌐 Staging Environment

### Purpose
- **Feature testing** before production
- **Integration testing** with real Cloudflare Workers
- **Client demos** and stakeholder previews
- **Performance testing** under production-like conditions

### Automatic Deployment

Push any `feature/*` or `feat/*` branch:

```bash
# Create and push feature branch
git checkout -b feature/user-dashboard
git commit -am "Add user dashboard feature"
git push origin feature/user-dashboard

# ✅ Automatic staging deployment triggered via Cloudflare CI/CD Builds
# ✅ Available at: https://staging.swole-tracker.workers.dev
```

### Staging Features

- **Production-identical infrastructure** (Cloudflare Workers + D1)
- **Isolated staging database** with test data
- **Environment-specific configuration** via Cloudflare Project settings
- **Automatic builds and deployments** via Cloudflare CI/CD Builds
- **Real-world performance** testing capabilities

### Staging Commands

```bash
# Manual staging deployment (if needed)
bun run deploy:staging

# Check staging deployment
curl -f https://staging.swole-tracker.workers.dev/api/joke

# Staging database operations
wrangler d1 info swole-tracker-staging
wrangler d1 migrations apply swole-tracker-staging --env staging
```

## 🏭 Production Environment

### Purpose
- **Live application** serving real users
- **Optimized performance** with production builds
- **Full security** with rate limiting and monitoring
- **Zero-downtime deployments** via Cloudflare Workers

### Automatic Deployment

Push to `main` branch:

```bash
# Deploy to production
git checkout main
git merge feature/your-feature    # or PR merge
git push origin main

# ✅ Automatic production deployment triggered via Cloudflare CI/CD Builds
# ✅ Available at: https://swole-tracker.workers.dev
```

### Production Features

- **Optimized builds** with minification and compression via Cloudflare CI/CD
- **Production logging** with minimal verbose output
- **Rate limiting** enabled for API protection
- **Analytics tracking** with PostHog
- **Native Cloudflare integration** with zero-downtime deployments
- **CDN distribution** via Cloudflare's global network

### Production Commands

```bash
# Manual production deployment (emergency only)
bun run deploy:production

# Check production health
curl -f https://swole-tracker.workers.dev/api/joke

# Production database operations (careful!)
wrangler d1 info swole-tracker-prod --env production
wrangler d1 migrations apply swole-tracker-prod --env production

# Monitor production logs (local CLI)
wrangler tail --env production

# View build logs (Cloudflare Dashboard)
# Navigate to Workers & Pages → swole-tracker-production → View build history
```

## ⚙️ Environment Variables

### Development (.env.local)

```bash
# Cloudflare Development Resources
CLOUDFLARE_DEV_D1_DATABASE_ID=your_dev_database_id
CLOUDFLARE_DEV_RATE_LIMIT_KV_ID=your_dev_rate_limit_kv_id
CLOUDFLARE_DEV_CACHE_KV_ID=your_dev_cache_kv_id

# Authentication (required)
WORKOS_CLIENT_ID=client_01XXXXXXXXXXXXXXXXXX
WORKOS_API_KEY=workos-api-key

# Environment Settings
NODE_ENV=development                    # Hot reload, detailed errors
NEXT_TELEMETRY_DISABLED=1              # Disable Vercel data collection
SKIP_ENV_VALIDATION=0                  # Validate all env vars
ENVIRONMENT=development                # Environment identifier

# Optional: Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Optional: WHOOP Integration
WHOOP_CLIENT_ID=your_whoop_client_id
WHOOP_CLIENT_SECRET=your_whoop_client_secret
WHOOP_WEBHOOK_SECRET=your_whoop_webhook_secret

# Optional: AI Features  
VERCEL_AI_GATEWAY_API_KEY=your_ai_gateway_api_key
AI_GATEWAY_MODEL=xai/grok-3-mini
```

### Staging/Production (Cloudflare Projects)

All environment-specific values are managed as Cloudflare Project environment variables and automatically injected during CI/CD builds:
- **Build Variables**: Available during build process (non-sensitive configuration)
- **Runtime Secrets**: Available during runtime (sensitive API keys, encrypted values)
- **Configuration**: Set via Cloudflare Dashboard → Workers & Pages → [Project] → Settings → Environment Variables

## 🔑 Local Development Setup

For local development, you'll need the Cloudflare CLI (wrangler):

### Wrangler Authentication:
1. Install: `npm install -g wrangler`
2. Login: `wrangler login`
3. Verify: `wrangler whoami`

### Local Environment:
- Create `.env.local` with development resource IDs
- All production deployments happen automatically via Cloudflare CI/CD Builds
- Local CLI is only needed for development and emergency manual deployments

## 📦 Deployment Methods

### 🚀 Method 1: Cloudflare CI/CD Builds (Primary/Recommended)

**Automatic deployments** via native Cloudflare integration with GitHub:

#### Benefits:
- **🔄 Automatic deployments** on git push via Cloudflare CI/CD Builds
- **🌿 Branch-based environments** (`main` → production, `feature/*` → staging)
- **🔒 Secure secret management** via Cloudflare Project settings
- **📊 Deployment monitoring** with Cloudflare Dashboard build history
- **⚡ Native Cloudflare integration** with optimized build environment
- **🔄 Version management** and easy rollbacks via Cloudflare Workers

#### Usage:
```bash
# Production deployment (main branch)
git checkout main
git push origin main
# ✅ Automatic production deployment via Cloudflare CI/CD Builds

# Staging deployment (feature branch)
git checkout -b feature/user-dashboard
git push origin feature/user-dashboard
# ✅ Automatic staging deployment via Cloudflare CI/CD Builds
```

### 🛠️ Method 2: Local Development Deployment (Secondary)

For local testing and emergency deployments only:

```bash
# Local development deployment
bun run deploy                    # Deploy to development worker
bun run deploy:staging           # Emergency staging deployment  
bun run deploy:production        # Emergency production deployment
```

**Prerequisites:** `.env.local` with required variables and `wrangler login`
**Note:** Production deployments should normally use Cloudflare CI/CD Builds

### 🔧 Method 3: Manual Wrangler (Advanced)

For complete manual control:

```bash
# 1. Generate config
bun run env:substitute --env production

# 2. Build application  
bun run build:cloudflare

# 3. Deploy with wrangler
npx wrangler deploy --env production
```

## 🔍 Troubleshooting

### Common Cloudflare CI/CD Build Errors

#### Missing Environment Variable Error
```bash
Error: Environment variable CLOUDFLARE_STAGING_D1_DATABASE_ID not found
```
**Solution:** Add the missing variable to Cloudflare Project settings → Environment Variables.

#### Worker Name Mismatch
```bash
Error: Worker name mismatch between dashboard and wrangler.toml
```
**Solution:** Ensure Worker name in Cloudflare dashboard matches `name` in wrangler.toml file.

#### Build Command Failed
```bash
Error: Build command failed with exit code 1
```
**Solution:** Check build logs in Cloudflare Dashboard → Project → View build history.

#### D1 Database Connection Error
```bash
Error: Could not connect to D1 database
```
**Solution:** Verify D1 database ID in Project environment variables matches your actual database ID.

### Branch Deployment Issues

#### Feature Branch Not Building
**Check:**
1. Branch name matches pattern: `feature/*` or `feat/*`
2. Project has "Build branches" enabled for staging
3. Build logs in Cloudflare Dashboard → Project → View build history

#### Build Timeout
**Solutions:**
1. Check [Cloudflare status](https://status.cloudflare.com)
2. Re-trigger build by pushing another commit
3. Check build logs for specific error details

### Development Issues

#### Local Development Not Working
**Check:**
1. `.env.local` file exists with correct resource IDs
2. `wrangler login` completed successfully  
3. Development D1 database created and accessible
4. WorkOS credentials are valid

#### Database Connection Issues
```bash
# Verify D1 database exists
wrangler d1 info swole-tracker-dev

# Check database migrations
wrangler d1 migrations list swole-tracker-dev

# Apply missing migrations
wrangler d1 migrations apply swole-tracker-dev
```

## 🎉 Congratulations!

You now have a **production-ready DevOps pipeline** with:

- ✅ **Automatic deployments** on every git push via Cloudflare CI/CD Builds
- ✅ **Environment isolation** (development, staging, production)  
- ✅ **Secure secret management** via Cloudflare Project settings
- ✅ **Native Cloudflare integration** with optimized build environment
- ✅ **Team collaboration** with deployment history and build logs
- ✅ **Zero-downtime deployments** with Cloudflare Workers
- ✅ **Scalable infrastructure** with global CDN and version management

**Ready to deploy?** Just push your code! 🚀

---

**Stack**: Next.js 15 + React 19 + Cloudflare Workers + D1 + Cloudflare CI/CD Builds  
**Status**: Production Ready with Native Cloudflare CI/CD  
**Updated**: January 2025