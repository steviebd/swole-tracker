# Swole Tracker

> **Production-ready fitness tracking application** with Infisical secrets management and Cloudflare Workers deployment.

## 🎯 Overview

**Stack:** Next.js 15 + React 19 + TypeScript + Cloudflare Workers + Infisical + Drizzle ORM

This application uses **Infisical Machine Identity** for secure secrets management across all environments, eliminating the need for manual environment variable configuration.

## 🚀 Quick Start

### Prerequisites

1. **Node.js 20.19.4** with **bun** package manager
2. **Cloudflare Account** with Workers plan
3. **Infisical Account** with Machine Identity configured
4. **Wrangler CLI**: `npm install -g wrangler`

### 1. Setup Project

```bash
# Clone and install
git clone <your-repo>
cd swole-tracker
bun install

# Authenticate with Cloudflare
wrangler login
```

### 2. Configure Infisical Machine Identity

1. **Create Machine Identity** in your [Infisical dashboard](https://app.infisical.com/)
2. **Set up environments** in Infisical:
   - `dev` - Development secrets
   - `staging` - Staging deployment secrets
   - `production` - Production deployment secrets

3. **Create `.env.local`** with your Infisical credentials:

```bash
# Copy template
cp .env.example .env.local

# Add your Infisical Machine Identity credentials
INFISICAL_CLIENT_ID=your_client_id
INFISICAL_SECRET=your_client_secret
INFISICAL_PROJECT_ID=your_project_id
INFISICAL_ENVIRONMENT=dev

# Local development overrides (optional)
USE_LOCAL_D1=true
CLOUDFLARE_D1_DATABASE_ID=local-swole-tracker-dev
DATABASE_URL=sqlite:.wrangler/state/swole-tracker-dev.db
```

### 3. Create Cloudflare Resources

Create the required D1 databases and KV namespaces, then store their IDs in Infisical:

```bash
# Development
wrangler d1 create swole-tracker-dev
wrangler kv namespace create "RATE_LIMIT_KV"
wrangler kv namespace create "CACHE_KV"

# Staging
wrangler d1 create swole-tracker-staging
wrangler kv namespace create "RATE_LIMIT_KV" --env staging
wrangler kv namespace create "CACHE_KV" --env staging

# Production
wrangler d1 create swole-tracker-prod
wrangler kv namespace create "RATE_LIMIT_KV" --env production
wrangler kv namespace create "CACHE_KV" --env production
```

**Store all resource IDs in your Infisical environments** (dev/staging/production).

## 🔧 Development Commands

The application uses **4 core commands** for all development and deployment workflows:

### Local Development

```bash
# Local development with local SQLite database
bun dev

# Local development with remote Cloudflare resources (D1, KV)
bun run dev:remote
```

### Deployment

```bash
# Deploy to staging environment (uses Infisical 'staging' secrets)
bun run deploy:staging

# Deploy to production environment (uses Infisical 'production' secrets)
bun run deploy:production
```

## 🔐 Infisical Integration

### How It Works

1. **Build Time**: Scripts pull secrets from Infisical using Machine Identity
2. **Runtime**: Secrets are injected into `wrangler.toml` `[vars]` section
3. **Environment-Specific**: Each command uses different Infisical environment:
   - `dev:remote` → `dev` environment
   - `deploy:staging` → `staging` environment
   - `deploy:production` → `production` environment

### Required Secrets in Infisical

Store these secrets in **each environment** (dev/staging/production):

**Infrastructure:**

- `CLOUDFLARE_D1_DATABASE_ID` - D1 database ID
- `CLOUDFLARE_RATE_LIMIT_KV_ID` - Rate limit KV namespace ID
- `CLOUDFLARE_CACHE_KV_ID` - Cache KV namespace ID
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token for Wrangler

**Authentication:**

- `WORKOS_CLIENT_ID` - WorkOS client ID
- `WORKOS_API_KEY` - WorkOS API key

**Optional Integrations:**

- `WHOOP_CLIENT_ID` - WHOOP fitness tracker integration
- `WHOOP_CLIENT_SECRET` - WHOOP client secret
- `WHOOP_WEBHOOK_SECRET` - WHOOP webhook verification secret
- `AI_GATEWAY_API_KEY` - AI gateway for jokes/health advice
- `VERCEL_AI_GATEWAY_API_KEY` - Alternative AI gateway

**Domains (staging/production only):**

- `STAGING_CLOUDFLARE_DOMAIN` - Staging custom domain
- `PRODUCTION_CLOUDFLARE_DOMAIN` - Production custom domain
- `CLOUDFLARE_ZONE_NAME` - Root domain for custom domains

### Environment Variables vs Secrets

- **Local Development**: Uses `.env.local` with fallback to Infisical `dev` environment
- **Remote Development**: Pulls all values from Infisical `dev` environment
- **Staging**: Pulls all values from Infisical `staging` environment
- **Production**: Pulls all values from Infisical `production` environment

## 🗄️ Database Management

The application supports **4 database environments** with consistent command patterns:

### Local Development (SQLite)

```bash
# Schema management
bun run db:generate        # Generate migration files from schema changes
bun run db:push           # Push schema changes directly (development only)
bun run db:migrate        # Apply migrations to local database
bun run db:studio         # Open Drizzle Studio for local database
```

### Remote Development (Cloudflare D1)

```bash
# Schema management
bun run db:generate:remote # Generate migration files (same as local)
bun run db:migrate:remote  # Apply migrations to remote D1 database
bun run db:studio:remote   # Open Drizzle Studio with remote connection
bun run db:push:remote     # Push schema changes to remote D1 (development only)
```

### Staging Environment

```bash
bun run db:migrate:staging # Apply migrations to staging D1 database
bun run db:studio:staging  # Open Drizzle Studio for staging database
```

### Production Environment

```bash
bun run db:migrate:production # Apply migrations to production D1 database
bun run db:studio:production  # Open Drizzle Studio for production database
```

### Database Workflow

**For Schema Changes:**

1. **Local**: Make schema changes in `src/server/db/schema.ts`
2. **Generate**: `bun run db:generate` (creates migration files)
3. **Test Locally**: `bun run db:migrate` (apply to local SQLite)
4. **Deploy**: Use appropriate remote command for target environment

**Database Names by Environment:**

- **Local**: SQLite file (`.wrangler/state/swole-tracker-dev.db`)
- **Remote Dev**: `swole-tracker-dev` D1 database
- **Staging**: `swole-tracker-staging` D1 database
- **Production**: `swole-tracker-prod` D1 database

## 🛠️ Database Operations with Wrangler

For direct control over database operations, use these wrangler commands. These are the official Cloudflare D1 commands that provide full control over migrations and database management.

### Prerequisites

Before using wrangler commands, ensure you have:

1. **Wrangler CLI installed**: `npm install -g wrangler`
2. **Authenticated with Cloudflare**: `wrangler login`
3. **Proper wrangler.toml**: Generate with `bun run scripts/generate-wrangler-infisical.ts`

### Migration Commands

```bash
# Create a new migration
wrangler d1 migrations create swole-tracker-dev "add_user_preferences"

# List all migrations for a database
wrangler d1 migrations list swole-tracker-dev

# Apply migrations to a database
wrangler d1 migrations apply swole-tracker-dev --remote
```

### Database Commands by Environment

#### Development Database

```bash
# Create migration
wrangler d1 migrations create swole-tracker-dev "migration_description"

# List migrations
wrangler d1 migrations list swole-tracker-dev

# Apply migrations
wrangler d1 migrations apply swole-tracker-dev --remote

# Execute SQL queries
wrangler d1 execute swole-tracker-dev --command="SELECT * FROM users LIMIT 5"
wrangler d1 execute swole-tracker-dev --file=./queries.sql --remote
```

#### Staging Database

```bash
# Apply migrations to staging
wrangler d1 migrations apply swole-tracker-staging --remote

# List staging migrations
wrangler d1 migrations list swole-tracker-staging

# Execute queries on staging
wrangler d1 execute swole-tracker-staging --command="SELECT COUNT(*) FROM users" --remote
```

#### Production Database

```bash
# Apply migrations to production (CAUTION!)
wrangler d1 migrations apply swole-tracker-prod --remote

# List production migrations
wrangler d1 migrations list swole-tracker-prod

# Execute queries on production (CAUTION!)
wrangler d1 execute swole-tracker-prod --command="SELECT * FROM users WHERE created_at > '2024-01-01'" --remote
```

### Advanced Wrangler Commands

```bash
# Query with local file
wrangler d1 execute swole-tracker-dev --file=./migration.sql --remote

# Batch multiple queries
wrangler d1 execute swole-tracker-dev --command="BEGIN; INSERT INTO...; COMMIT;" --remote

# Check database info
wrangler d1 info swole-tracker-dev

# Delete database (DESTRUCTION!)
wrangler d1 delete swole-tracker-dev
```

### Environment-Specific Usage

The wrangler commands use the database names defined in your `wrangler.toml`. For environment-specific operations:

```bash
# Development (uses local resources when available)
wrangler d1 migrations apply swole-tracker-dev --remote

# Staging (requires staging resources in wrangler.toml)
wrangler d1 migrations apply swole-tracker-staging --remote

# Production (requires production resources in wrangler.toml)
wrangler d1 migrations apply swole-tracker-prod --remote
```

### Workflow with Wrangler Commands

**For Schema Changes:**

1. **Update Schema**: Modify `src/server/db/schema.ts`
2. **Generate Migration**: `bun run db:generate` (creates migration files)
3. **Test Locally**: `bun run db:migrate` (local SQLite)
4. **Apply to Remote**: Use appropriate wrangler command for target environment

**Example Migration Workflow:**

```bash
# 1. Make schema changes in src/server/db/schema.ts
# 2. Generate migration file
bun run db:generate

# 3. Test on local database
bun run db:migrate

# 4. Apply to development D1
wrangler d1 migrations apply swole-tracker-dev --remote

# 5. Apply to staging D1
wrangler d1 migrations apply swole-tracker-staging --remote

# 6. Apply to production D1 (when ready)
wrangler d1 migrations apply swole-tracker-prod --remote
```

### Important Notes

- **Always test migrations locally first** before applying to remote databases
- **Use `--remote` flag** when working with Cloudflare-hosted D1 databases
- **Database names must match** the names in your `wrangler.toml` configuration
- **Production migrations are irreversible** - always backup before applying
- **Environment isolation** - each environment uses separate database instances

## 🧪 Testing & Quality

```bash
# Code quality
bun check                  # Run lint + typecheck
bun lint                   # ESLint checking
bun lint:fix               # Auto-fix ESLint issues
bun typecheck              # TypeScript type checking

# Testing
bun test                   # Unit tests with Vitest
bun test:watch             # Watch mode testing
bun coverage               # Generate coverage report
bun e2e                    # End-to-end tests with Playwright
```

## 🌐 Deployment Workflow

### Staging Deployment

```bash
# Deploy feature to staging
bun run deploy:staging
```

**What happens:**

1. Sets `INFISICAL_ENVIRONMENT=staging`
2. Pulls secrets from Infisical `staging` environment
3. Generates `wrangler.toml` with staging configuration
4. Builds Next.js application with staging environment
5. Deploys to `swole-tracker-staging` worker

### Production Deployment

```bash
# Deploy to production
bun run deploy:production
```

**What happens:**

1. Sets `INFISICAL_ENVIRONMENT=production`
2. Pulls secrets from Infisical `production` environment
3. Generates `wrangler.toml` with production configuration
4. Builds Next.js application with production environment
5. Deploys to `swole-tracker-production` worker

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Auth**: WorkOS enterprise authentication
- **Deployment**: Cloudflare Workers
- **Secrets**: Infisical Machine Identity
- **Storage**: Cloudflare KV (rate limiting & caching)

### Environment Isolation

- **Development**: Local SQLite or remote D1 for testing
- **Staging**: Dedicated D1 database + KV namespaces
- **Production**: Separate production resources

### Security

- **No secrets in code**: All sensitive values in Infisical
- **Machine Identity**: Secure API-based secret retrieval
- **Environment isolation**: Separate secrets per environment
- **Build-time injection**: Secrets baked into worker at build time

## 🔍 Troubleshooting

### Common Issues

**"WORKOS_CLIENT_ID not configured"**

- Check Infisical has `WORKOS_CLIENT_ID` and `WORKOS_API_KEY` in correct environment
- Verify Infisical Machine Identity has access to secrets

**"KV namespace 'undefined' is not valid"**

- Ensure Cloudflare resource IDs are stored in Infisical
- Check `CLOUDFLARE_RATE_LIMIT_KV_ID` and `CLOUDFLARE_CACHE_KV_ID` exist

**Build fails with missing environment variables**

- Verify all required secrets exist in target Infisical environment
- Check Infisical Machine Identity permissions

**"Infisical integration enabled but pulled 0 secrets"**

- Verify `INFISICAL_ENVIRONMENT` matches your Infisical environment name
- Check Infisical Machine Identity credentials in `.env.local`

### Debug Commands

```bash
# Test Infisical connection
bun run scripts/test-infisical.ts

# Generate wrangler config only (for debugging)
bun run scripts/generate-wrangler-infisical.ts

# Check current environment variables
env | grep INFISICAL
```

## 📦 Utility Scripts

Additional scripts available for specific workflows:

```bash
# Design tokens
bun tokens:build           # Build design tokens
bun tokens:watch           # Watch for token changes

# Code formatting
bun format:write           # Format code with Prettier
bun format:check           # Check code formatting

# Build
bun build                  # Build Next.js application
bun preview                # Build and preview locally
```

---

**🔐 Secure by Design**: All secrets managed through Infisical  
**🚀 Simple Deployment**: Four commands handle all environments  
**⚡ Modern Stack**: Next.js 15 + Cloudflare Workers + TypeScript
