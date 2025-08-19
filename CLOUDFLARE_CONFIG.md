# Cloudflare Workers Configuration Guide

This guide covers the complete setup and deployment of the Swole Tracker application using **Cloudflare Workers** (not Pages). The setup uses environment variables for secure configuration management and supports both local and GitHub-based deployments.

## Overview

The application has been migrated from Cloudflare Pages to **Cloudflare Workers** for improved performance and flexibility. This setup includes:

- **Cloudflare Workers** deployment for the Next.js application
- **D1 Database** for persistent data storage
- **KV Namespaces** for rate limiting and caching
- **Environment-based configuration** (development, staging, production)
- **GitHub Actions** integration for CI/CD
- **Security-first approach** with no hardcoded secrets

## Prerequisites

Before starting, ensure you have:

1. **Cloudflare Account** with Workers plan
2. **GitHub Repository** with access to Secrets
3. **Node.js 20.19.4** and **bun** package manager
4. **Cloudflare CLI** (wrangler) installed globally: `npm install -g wrangler`

## Quick Start

### 1. Initial Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd swole-tracker

# Install dependencies
bun install

# Copy environment template
cp .env.example .env.local
```

### 2. Authenticate with Cloudflare

```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

### 3. Create Cloudflare Resources

Run the setup commands to create required resources:

```bash
# Create production resources
wrangler d1 create swole-tracker-prod
wrangler kv namespace create "RATE_LIMIT_KV" --env production
wrangler kv namespace create "CACHE_KV" --env production

# Create staging resources  
wrangler d1 create swole-tracker-staging
wrangler kv namespace create "RATE_LIMIT_KV" --env staging
wrangler kv namespace create "CACHE_KV" --env staging
```

### 4. Configure Environment Variables

Update your `.env.local` file with the resource IDs from step 3:

```bash
# Cloudflare Account Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here

# Production Resources
CLOUDFLARE_PROD_D1_DATABASE_ID=your_prod_database_id
CLOUDFLARE_PROD_RATE_LIMIT_KV_ID=your_prod_rate_limit_kv_id  
CLOUDFLARE_PROD_CACHE_KV_ID=your_prod_cache_kv_id

# Staging Resources
CLOUDFLARE_STAGING_D1_DATABASE_ID=your_staging_database_id
CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID=your_staging_rate_limit_kv_id
CLOUDFLARE_STAGING_CACHE_KV_ID=your_staging_cache_kv_id

# Application Configuration
WORKOS_CLIENT_ID=your_workos_client_id
WORKOS_API_KEY=your_workos_api_key
```

### 🔗 Important: D1 Database Connection

**The project uses Cloudflare D1 bindings, NOT traditional DATABASE_URL connection strings.**

- ✅ **D1 bindings**: Injected automatically by Cloudflare Workers runtime
- ✅ **No DATABASE_URL needed**: Connection handled via `wrangler.toml` bindings  
- ✅ **Environment-aware**: Different D1 database per environment (staging/production)
- ✅ **Automatic connection**: Database connection established through Cloudflare Workers runtime

### 5. Deploy

```bash
# Quick deploy to development
bun run deploy

# Deploy to staging
bun run deploy:staging

# Deploy to production
bun run deploy:production
```

## Detailed Configuration

### Environment Variables Reference

#### Required for All Environments

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Cloudflare Dashboard → Right sidebar |
| `CLOUDFLARE_API_TOKEN` | API token with Workers permissions | [Create Token](#api-token-setup) |
| `WORKOS_CLIENT_ID` | WorkOS client identifier | WorkOS Dashboard |
| `WORKOS_API_KEY` | WorkOS API key | WorkOS Dashboard |

#### Per Environment Resources

**Staging Environment:**
```bash
CLOUDFLARE_STAGING_D1_DATABASE_ID=staging_d1_id_here
CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID=staging_rate_limit_kv_id
CLOUDFLARE_STAGING_CACHE_KV_ID=staging_cache_kv_id
```

**Production Environment:**
```bash
CLOUDFLARE_PROD_D1_DATABASE_ID=prod_d1_id_here
CLOUDFLARE_PROD_RATE_LIMIT_KV_ID=prod_rate_limit_kv_id
CLOUDFLARE_PROD_CACHE_KV_ID=prod_cache_kv_id
```

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog analytics key | Not set |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host URL | `https://us.i.posthog.com` |
| `VERCEL_AI_GATEWAY_API_KEY` | AI features API key | Not set |
| `WHOOP_CLIENT_ID` | WHOOP integration client ID | Not set |
| `WHOOP_CLIENT_SECRET` | WHOOP integration secret | Not set |

### API Token Setup

Create a Cloudflare API token with these permissions:

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"**
3. Use **"Custom token"** template
4. Configure permissions:
   ```
   Account Permissions:
   - Cloudflare Workers:Edit
   - Account Settings:Read
   
   User Permissions: 
   - User Details:Read
   
   Zone Permissions (if using custom domains):
   - Zone:Read
   ```
5. Set **Account Resources**: Include your specific account
6. Set **Zone Resources**: Include all zones (if using custom domains)
7. Save and copy the token to `CLOUDFLARE_API_TOKEN`

## Database Setup

### D1 Database Creation

Create separate databases for each environment:

```bash
# Production database
wrangler d1 create swole-tracker-prod

# Staging database  
wrangler d1 create swole-tracker-staging

# Development (already exists with hardcoded ID in template)
# No action needed - uses local development database
```

**Important:** Copy the database IDs from the command output and update your `.env.local` file:

```bash
# Example output:
✅ Successfully created DB 'swole-tracker-prod' in region ENAM
Created your new D1 database.

[[d1_databases]]
binding = "DB"
database_name = "swole-tracker-prod"
database_id = "12345678-abcd-1234-abcd-123456789abc"  # ← Copy this ID
```

**Key Point:** The project connects to D1 via Cloudflare bindings, NOT database URLs. The resource IDs you collect here are used in `wrangler.toml` to bind the D1 databases to your Workers deployment.

### Database Migration

After creating databases, run migrations:

```bash
# Generate migration files (if schema changed)
bun run db:generate

# Apply migrations to staging
wrangler d1 migrations apply swole-tracker-staging --env staging

# Apply migrations to production
wrangler d1 migrations apply swole-tracker-prod --env production
```

### Database Management

```bash
# Local development with Drizzle Studio
bun run db:studio

# Push schema changes (development only)
bun run db:push

# View remote database
wrangler d1 info swole-tracker-prod
```

## KV Namespace Setup

Create KV namespaces for each environment:

### Production KV Namespaces

```bash
# Rate limiting storage
wrangler kv namespace create "RATE_LIMIT_KV" --env production

# Application caching
wrangler kv namespace create "CACHE_KV" --env production
```

### Staging KV Namespaces

```bash
# Rate limiting storage
wrangler kv namespace create "RATE_LIMIT_KV" --env staging

# Application caching  
wrangler kv namespace create "CACHE_KV" --env staging
```

Copy the returned namespace IDs to your environment variables.

## Cloudflare Portal Configuration

### Workers Dashboard Setup

In the Cloudflare Workers dashboard, configure your worker:

1. **Go to** Cloudflare Dashboard → Workers & Pages → Create Application → Pages → Connect to Git
2. **Select** your GitHub repository  
3. **Configure build settings**:
   ```
   Build command: bun run build:cloudflare
   Build output directory: .next
   Root directory: (leave empty or specify if in monorepo)
   ```

4. **Environment Variables**: Set these in the Cloudflare Dashboard:
   ```bash
   # Production Environment
   WORKOS_API_KEY=your_workos_api_key
   WORKOS_CLIENT_ID=your_workos_client_id
   WHOOP_CLIENT_ID=your_whoop_client_id
   WHOOP_CLIENT_SECRET=your_whoop_client_secret
   WHOOP_WEBHOOK_SECRET=your_whoop_webhook_secret
   NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   
   # Resource IDs (automatically injected via wrangler.toml)
   # D1 and KV bindings are configured through wrangler.toml, not env vars
   ```

5. **Functions and Compatibility**:
   - Compatibility Date: `2024-03-20`
   - Compatibility Flags: `nodejs_compat`
   - Node.js compatibility mode: Enabled

### Build Configuration

The project uses a specialized build process for Cloudflare Workers:

```bash
# Build command in package.json
"build:cloudflare": "bun run tokens:build && next build && npx @cloudflare/next-on-pages"
```

This command:
1. Builds design tokens
2. Runs Next.js build  
3. Transforms the output for Cloudflare Workers runtime

### Portal vs GitHub Actions

**Option 1: Cloudflare Portal (Simple)**
- Connect your GitHub repo directly
- Automatic deployments on git push
- Environment variables set in dashboard
- Uses Cloudflare's build system

**Option 2: GitHub Actions (Recommended)**
- More control over build process
- Better secret management
- Environment-specific deployments
- Custom deployment logic

## Deployment Methods

### Method 1: GitHub Actions (Recommended)

This is the preferred method for production deployments.

#### Setup GitHub Secrets

Add these secrets to your GitHub repository:

**Repository Settings → Secrets and variables → Actions → New repository secret**

```bash
# Required for all deployments
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# Staging environment
CLOUDFLARE_STAGING_D1_DATABASE_ID=staging_d1_id
CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID=staging_rate_kv_id
CLOUDFLARE_STAGING_CACHE_KV_ID=staging_cache_kv_id

# Production environment  
CLOUDFLARE_PROD_D1_DATABASE_ID=prod_d1_id
CLOUDFLARE_PROD_RATE_LIMIT_KV_ID=prod_rate_kv_id
CLOUDFLARE_PROD_CACHE_KV_ID=prod_cache_kv_id

# Application secrets
WORKOS_CLIENT_ID=your_workos_client_id
WORKOS_API_KEY=your_workos_api_key
STAGING_DATABASE_URL=your_staging_db_url  
PRODUCTION_DATABASE_URL=your_prod_db_url

# Optional
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

#### Deployment Workflow

**Automatic Staging Deployment:**
```bash
# Push to main branch triggers automatic staging deployment
git push origin main
```

**Manual Production Deployment:**
1. Go to GitHub → Actions → "Deploy to Cloudflare Workers"
2. Click **"Run workflow"**
3. Select **"production"** environment
4. Click **"Run workflow"**

### Method 2: Local Deployment

For development and testing:

```bash
# Simple deployment commands
bun run deploy                    # Deploy to development
bun run deploy:staging           # Deploy to staging environment  
bun run deploy:production        # Deploy to production environment

# Advanced deployment with health checks
bun run deploy:worker:staging    # Deploy to staging with validation
bun run deploy:worker:production # Deploy to production with validation

# Deploy with options
bun scripts/deploy-workers.ts --env production --dry-run
```

**What each command does:**
- `deploy`: Generates wrangler config → builds → deploys to development
- `deploy:staging`: Generates config → builds → deploys to staging environment
- `deploy:production`: Generates config → builds → deploys to production environment  
- `deploy:worker:*`: Uses advanced deployment script with health checks

### Method 3: Direct Wrangler

For manual control:

```bash
# Substitute environment variables
bun run env:substitute --env production

# Build application  
bun run build:cloudflare

# Deploy with wrangler
npx wrangler deploy --env production
```

## Security Best Practices

### Environment Variable Security

1. **Never commit secrets** to version control
2. **Use GitHub Secrets** for CI/CD deployments
3. **Separate environments** with different resource IDs
4. **Rotate API tokens** regularly
5. **Limit token permissions** to minimum required

### Resource Isolation

- **Separate D1 databases** for each environment
- **Separate KV namespaces** for each environment  
- **Environment-specific secrets** in GitHub
- **No cross-environment access**

### Access Control

- **API tokens** with minimal required permissions
- **Account-specific tokens** (not global)
- **Regular security audits** of tokens and permissions
- **Monitor deployment logs** for unauthorized access

## Troubleshooting

### Common Issues

#### Missing CLOUDFLARE_ACCOUNT_ID Error

**Problem:** Wrangler cannot find your account ID
**Solution:** 
```bash
# Get your account ID
wrangler whoami

# Add to .env.local
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

#### Environment Variable Not Found

**Problem:** Build fails with missing environment variables
**Solution:**
```bash
# Check environment variable substitution
bun run env:substitute --env staging --dry-run

# Verify all required variables are set
cat .env.local | grep CLOUDFLARE
```

#### Database Migration Failures

**Problem:** Migrations fail on remote databases
**Solution:**
```bash
# Check database exists
wrangler d1 info swole-tracker-prod

# Apply migrations step by step
wrangler d1 migrations list swole-tracker-prod
wrangler d1 migrations apply swole-tracker-prod --local
```

#### Deploy Authentication Errors

**Problem:** "Authentication error" during deployment
**Solution:**
```bash
# Re-authenticate with Cloudflare
wrangler login

# Verify token permissions
# Go to Cloudflare Dashboard → API Tokens → View token details
```

#### GitHub Actions Deployment Failures

**Problem:** GitHub Actions fail with permission errors
**Solution:**
1. Verify all required secrets are added to GitHub
2. Check API token has correct permissions
3. Ensure resource IDs match created resources
4. Review GitHub Actions logs for specific errors

### Health Checks

Verify deployments are working:

```bash
# Check staging deployment
curl -f https://staging.swole-tracker.workers.dev/api/joke

# Check production deployment  
curl -f https://swole-tracker.workers.dev/api/joke

# Check with health endpoint
curl -f https://your-domain.workers.dev/api/health
```

### Debugging Commands

```bash
# View deployment logs
wrangler tail --env production

# Check resource bindings
wrangler dev --env staging

# Test configuration generation
bun run env:substitute --env production --dry-run

# Validate wrangler.toml
npx wrangler config validate
```

### Support Resources

- **Cloudflare Workers Docs**: [https://developers.cloudflare.com/workers/](https://developers.cloudflare.com/workers/)
- **D1 Database Docs**: [https://developers.cloudflare.com/d1/](https://developers.cloudflare.com/d1/)
- **Wrangler CLI Docs**: [https://developers.cloudflare.com/workers/wrangler/](https://developers.cloudflare.com/workers/wrangler/)
- **GitHub Actions**: [.github/workflows/deploy-workers.yml](/.github/workflows/deploy-workers.yml)

## File Structure Reference

```
├── wrangler.toml.template          # Template with environment variables
├── wrangler.toml                   # Generated config (gitignored)
├── .env.example                    # Environment variable examples
├── .env.local                      # Your local environment (gitignored)
├── scripts/
│   ├── deploy-workers.ts           # Local deployment script  
│   ├── substitute-env-variables.ts # Environment variable substitution
│   └── generate-wrangler-config.ts # Config generation script
├── .github/workflows/
│   └── deploy-workers.yml          # GitHub Actions workflow
└── drizzle/                        # Database migration files
```

## Next Steps

After completing the setup:

1. **Test deployment** with staging environment
2. **Configure custom domain** (if needed)
3. **Set up monitoring** with Cloudflare Analytics
4. **Configure alerts** for deployment failures
5. **Document team workflows** for your specific use case

---

**Migration Completed**: January 2025  
**Configuration Type**: Cloudflare Workers (not Pages)  
**Status**: Production Ready