# Cloudflare Pages Staging Setup Guide

This guide provides step-by-step instructions for setting up the Swole Tracker application on Cloudflare Pages for staging deployment.

## Prerequisites

1. Cloudflare account with Pages access
2. WorkOS account with staging environment configured
3. GitHub repository access
4. Completed Phase 1 and Phase 2 migration work

## Step 1: Create Cloudflare Pages Project

### 1.1 Connect GitHub Repository

1. Navigate to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **Workers & Pages** in the sidebar
3. Click **Create application** → **Pages** tab
4. Click **Connect to Git**
5. Select your GitHub repository: `swole-tracker`
6. Choose branch: `feature/cloudflare-migration`

### 1.2 Configure Build Settings

**Build command:** `bun run build:cloudflare`
**Build output directory:** `.next`
**Root directory:** (leave empty)

### 1.3 Environment Variables

Set the following environment variables in Pages settings:

```bash
# Core Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://[your-pages-url].pages.dev

# WorkOS Configuration
WORKOS_CLIENT_ID=client_xxx
WORKOS_API_KEY=sk_xxx
WORKOS_REDIRECT_URI=https://[your-pages-url].pages.dev/auth/callback

# Database Configuration (will be set after D1 creation)
DATABASE_URL=[will-be-set-by-d1-binding]

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_PROJECT_API_KEY=xxx

# Optional: WHOOP Integration (for testing)
WHOOP_CLIENT_ID=xxx
WHOOP_CLIENT_SECRET=xxx

# Optional: AI Gateway
CLOUDFLARE_ACCOUNT_ID=xxx
AI_GATEWAY_ID=xxx
OPENAI_API_KEY=xxx
```

## Step 2: Provision D1 Database

### 2.1 Create Staging Database

**IMPORTANT**: You need to create the D1 database manually via the Cloudflare Dashboard due to API token permissions.

**Manual Steps:**
1. Go to Cloudflare Dashboard → Workers & Pages → D1 SQL Database
2. Click **Create Database**
3. Name: `swole-tracker-staging`
4. Region: Choose appropriate region (US, Europe, etc.)
5. Click **Create**
6. Note the Database ID from the overview page

**Alternative via CLI (if permissions are configured):**
```bash
# Create staging D1 database (requires proper API token permissions)
wrangler d1 create swole-tracker-staging

# Note the database ID from output
```

### 2.2 Update wrangler.toml

Update the staging environment section in `wrangler.toml`:

```toml
# Staging Environment
[env.staging]

[[env.staging.d1_databases]]
binding = "DB"
database_name = "swole-tracker-staging"
database_id = "your-actual-database-id-here"

[[env.staging.kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "rate-limit-staging-id"

[[env.staging.kv_namespaces]]
binding = "CACHE_KV"
id = "cache-staging-id"
```

### 2.3 Run Database Migrations

```bash
# Generate migrations
bun db:generate

# Apply to staging database
wrangler d1 migrations apply swole-tracker-staging --env staging
```

## Step 3: Provision KV Namespaces

### 3.1 Create KV Namespaces

```bash
# Create rate limiting namespace
wrangler kv:namespace create "RATE_LIMIT_KV" --env staging

# Create cache namespace  
wrangler kv:namespace create "CACHE_KV" --env staging
```

### 3.2 Update Configuration

Add the namespace IDs to your `wrangler.toml` and Pages environment variables.

## Step 4: Configure Pages D1 Binding

### 4.1 Add D1 Binding to Pages

1. In Cloudflare Dashboard, go to your Pages project
2. Navigate to **Settings** → **Functions**
3. Scroll to **D1 database bindings**
4. Click **Add binding**
5. Set **Variable name**: `DB`
6. Select your staging database: `swole-tracker-staging`
7. Save

### 4.2 Add KV Bindings

1. In **KV namespace bindings**:
   - Add binding: `RATE_LIMIT_KV` → select your staging rate limit namespace
   - Add binding: `CACHE_KV` → select your staging cache namespace

## Step 5: Update WorkOS Configuration

### 5.1 Add Staging Redirect URLs

In your WorkOS dashboard:

1. Go to **Configuration** → **Redirects**
2. Add staging URLs:
   - `https://[your-pages-url].pages.dev/auth/callback`
   - `https://[your-pages-url].pages.dev/api/auth/callback`
   - `https://[your-pages-url].pages.dev/api/mobile/auth/callback`

## Step 6: Deploy and Test

### 6.1 Trigger Deployment

1. Push changes to the `feature/cloudflare-migration` branch
2. Cloudflare Pages will automatically trigger a build
3. Monitor the build logs for any issues

### 6.2 Initial Testing

Once deployed, test the following:

1. **Authentication Flow:**
   - Visit staging URL
   - Click login/register
   - Complete WorkOS OAuth flow
   - Verify successful login

2. **Database Operations:**
   - Create a workout template
   - Start a workout session
   - Save workout data
   - Verify data persistence

3. **Rate Limiting:**
   - Make rapid API calls
   - Verify rate limiting activates

## Step 7: Monitoring and Troubleshooting

### 7.1 Monitor Logs

- Use Cloudflare Dashboard → Pages → Functions → Real-time logs
- Check for authentication errors
- Monitor database connection issues

### 7.2 Common Issues

**Build Failures:**
- Check TypeScript errors in build logs
- Verify all dependencies are compatible with Edge Runtime
- Check environment variable configuration

**Authentication Issues:**
- Verify WorkOS redirect URLs match deployment URL
- Check WorkOS API keys are correctly set
- Verify session cookie configuration

**Database Issues:**
- Confirm D1 binding is properly configured
- Check migration status
- Verify table creation and data types

## Next Steps

After successful staging deployment:

1. Complete comprehensive testing (Step 3.5)
2. Performance benchmarking (Step 3.6) 
3. Mobile app validation (Step 3.7)
4. Prepare for production cutover (Phase 4)

## Rollback Plan

If critical issues are discovered:

1. Revert to main branch deployment on Vercel
2. Update DNS if necessary
3. Document issues for resolution
4. Plan fixes before retry

---

**Note**: This staging environment is for testing purposes only. Do not use production data or expose to end users.