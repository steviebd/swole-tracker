# Swole Tracker - Complete DevOps & Development Guide

> **Production-ready fitness tracking application** with GitHub Actions CI/CD and Cloudflare Workers deployment.

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

**This application uses a GitHub-driven DevOps workflow** with automatic branch-based deployments:

| Branch Pattern | Environment | Worker Name | Database | Deployment | URL |
|----------------|-------------|-------------|----------|------------|-----|
| `main` | **Production** | `swole-tracker-production` | `swole-tracker-prod` | 🔄 **Automatic** | `https://swole-tracker.workers.dev` |
| `feature/*` | **Staging** | `swole-tracker-staging` | `swole-tracker-staging` | 🔄 **Automatic** | `https://staging.swole-tracker.workers.dev` |
| Local dev | **Development** | Local worker | `swole-tracker-dev` | 🔧 **Manual** | `http://localhost:3000` |

**✅ Setup once → Deploy forever:** Configure GitHub Secrets once, then every git push automatically deploys to the correct environment.

## 🏗️ Architecture

### Stack
- **Framework**: Next.js 15 + React 19 + TypeScript
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Auth**: WorkOS (enterprise-grade authentication)
- **Deployment**: Cloudflare Workers + GitHub Actions CI/CD
- **Storage**: Cloudflare KV (rate limiting & caching)
- **Analytics**: PostHog (optional)
- **Integrations**: WHOOP fitness tracking (optional)

### Environment Isolation
Each environment has completely isolated resources:
- **Separate D1 databases** for data isolation
- **Separate KV namespaces** for caching and rate limiting
- **Environment-specific configuration** via GitHub Secrets
- **Branch-based automatic deployments**

## 🚀 Quick Start

### Prerequisites

1. **GitHub Repository** with Actions enabled
2. **Cloudflare Account** with Workers plan 
3. **Admin access** to GitHub repository for secrets management
4. **Cloudflare API Token** with Workers permissions
5. **Node.js 20.19.4** and **bun** package manager
6. **Cloudflare CLI**: `npm install -g wrangler`

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

### 4. Configure GitHub Secrets

In your GitHub repository: **Settings → Secrets and variables → Actions**

#### Required Secrets:

```bash
# Cloudflare Authentication
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# Production Resources
CLOUDFLARE_PROD_D1_DATABASE_ID=your_prod_database_id
CLOUDFLARE_PROD_RATE_LIMIT_KV_ID=your_prod_rate_limit_kv_id
CLOUDFLARE_PROD_CACHE_KV_ID=your_prod_cache_kv_id

# Staging Resources
CLOUDFLARE_STAGING_D1_DATABASE_ID=your_staging_database_id
CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID=your_staging_rate_limit_kv_id
CLOUDFLARE_STAGING_CACHE_KV_ID=your_staging_cache_kv_id

# Authentication
WORKOS_CLIENT_ID=your_workos_client_id
WORKOS_API_KEY=your_workos_api_key

# Optional: Legacy database URLs (for migrations only)
STAGING_DATABASE_URL=your_staging_postgres_url
PRODUCTION_DATABASE_URL=your_production_postgres_url
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
# → Automatic staging deployment
```

**Deploy to Production:**
```bash
git checkout main
git commit -am "Production ready changes"
git push origin main
# → Automatic production deployment
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

# ✅ Automatic staging deployment triggered
# ✅ Available at: https://staging.swole-tracker.workers.dev
```

### Staging Features

- **Production-identical infrastructure** (Cloudflare Workers + D1)
- **Isolated staging database** with test data
- **Environment-specific configuration** 
- **Automatic health checks** post-deployment
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

# ✅ Automatic production deployment triggered
# ✅ Available at: https://swole-tracker.workers.dev
```

### Production Features

- **Optimized builds** with minification and compression
- **Production logging** with minimal verbose output
- **Rate limiting** enabled for API protection
- **Analytics tracking** with PostHog
- **Health monitoring** and automatic rollback capabilities
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

# Monitor production logs
wrangler tail --env production
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
WORKOS_API_KEY=sk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

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

### Staging/Production (GitHub Secrets)

All environment-specific values are managed as GitHub Secrets and automatically injected during deployment.

## 🔑 API Token Setup

Create a Cloudflare API token with these **exact permissions**:

### Required Account Permissions:
- **Cloudflare Workers:Edit** (deploy workers)
- **Account Settings:Read** (read account info)
- **D1:Edit** (manage D1 databases)
- **Workers KV Storage:Edit** (manage KV namespaces)
- **Workers Tail:Read** (debug deployments)

### Required User Permissions:
- **User Details:Read** (verify authentication)

### Resource Scoping:
- **Account Resources**: Include your specific account
- **Zone Resources**: Include all zones (only if using custom domains)

### Token Configuration:
1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"** → **"Custom token"**
3. Configure the permissions above
4. Set TTL to 1 year or longer
5. Save and add to GitHub Secrets as `CLOUDFLARE_API_TOKEN`

## 📦 Deployment Methods

### 🚀 Method 1: GitHub Actions CI/CD (Primary/Recommended)

**Automatic deployments** on git push with environment isolation:

#### Benefits:
- **🔄 Automatic deployments** on git push
- **🌿 Branch-based environments** (`main` → production, `feature/*` → staging)
- **🔒 Secure secret management** via GitHub Secrets
- **📊 Deployment monitoring** with GitHub Actions UI
- **⚡ Health checks** and deployment validation
- **🔄 Rollback capabilities** via git revert

#### Usage:
```bash
# Production deployment (main branch)
git checkout main
git push origin main
# ✅ Automatic production deployment

# Staging deployment (feature branch)
git checkout -b feature/user-dashboard
git push origin feature/user-dashboard
# ✅ Automatic staging deployment
```

### 🛠️ Method 2: Local Development Deployment (Secondary)

For local testing and emergency deployments:

```bash
# Local development deployment
bun run deploy                    # Deploy to development worker
bun run deploy:staging           # Deploy to staging environment  
bun run deploy:production        # Deploy to production environment
```

**Prerequisites:** `.env.local` with required variables and `wrangler login`

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

### Common GitHub Actions Errors

#### Missing Secret Error
```bash
Error: Secret CLOUDFLARE_STAGING_D1_DATABASE_ID not found
```
**Solution:** Add the missing secret to GitHub repository secrets.

#### Invalid API Token
```bash
Error: 10000: Authentication error
```
**Solution:** Regenerate `CLOUDFLARE_API_TOKEN` with correct permissions.

#### Insufficient Permissions
```bash
Error: 10014: Could not route to workers/services
```
**Solution:** Add "Cloudflare Workers:Edit" permission to API token.

#### D1 Database Permission Error
```bash
Error: 7003: Access denied
```
**Solution:** Add "D1:Edit" permission to API token.

### Branch Deployment Issues

#### Feature Branch Not Deploying
**Check:**
1. Branch name starts with `feature/` or `feat/`
2. Changes aren't in `paths-ignore` (README.md, docs/*, etc.)
3. GitHub Actions tab for workflow run logs

#### Deployment Timeout
**Solutions:**
1. Check [Cloudflare status](https://status.cloudflare.com)
2. Re-run failed workflow
3. Use manual deployment: GitHub Actions → Run workflow

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

- ✅ **Automatic deployments** on every git push
- ✅ **Environment isolation** (development, staging, production)  
- ✅ **Secure secret management** via GitHub Secrets
- ✅ **Health monitoring** and deployment validation
- ✅ **Team collaboration** with deployment history
- ✅ **Zero-downtime deployments** with Cloudflare Workers
- ✅ **Scalable infrastructure** with global CDN

**Ready to deploy?** Just push your code! 🚀

---

**Stack**: Next.js 15 + React 19 + Cloudflare Workers + D1 + GitHub Actions  
**Status**: Production Ready with Automatic CI/CD  
**Updated**: January 2025