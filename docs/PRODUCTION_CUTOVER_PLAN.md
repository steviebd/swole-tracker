# Production Cutover Plan - Phase 4 Execution

**Status**: Ready for Production Deployment  
**Date**: 2025-08-18  
**Migration**: Vercel/Supabase → Cloudflare/WorkOS

## 🔥 CRITICAL - Action Required Before Deployment

### API Token Permissions Issue
**BLOCKER**: Current Cloudflare API token lacks D1 database permissions.

**Resolution Required:**
1. Visit [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Create a new token with these permissions:
   - **Account**: Cloudflare Workers:Edit
   - **Zone**: Zone:Read, Zone:Edit (if custom domain)  
   - **Account**: D1:Edit
   - **Account**: Workers KV Storage:Edit
   - **Account**: Cloudflare Pages:Edit
3. Update `CLOUDFLARE_API_TOKEN` in your environment

**Current Status:**
- ✅ Production KV Namespaces Created
- ❌ Production D1 Database (blocked by permissions)
- ✅ wrangler.toml Updated with KV IDs

## 📋 Production Resources Status

### Cloudflare KV Namespaces - ✅ CREATED
```toml
# Production KV Resources (LIVE)
[[env.production.kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "2fd1a6b5c3844ae09bc66c04d70fc71c"

[[env.production.kv_namespaces]]  
binding = "CACHE_KV"
id = "8d61987cb7e744789e2e067b560566c2"
```

### Cloudflare D1 Database - ❌ PENDING
**Command to run after API token fix:**
```bash
wrangler d1 create swole-tracker-prod
```
**Expected Result**: Database ID to update in wrangler.toml

## 🚀 Step-by-Step Production Deployment

### Phase 4.1: Cloudflare Infrastructure Setup

#### Step 1: Complete D1 Database Creation
```bash
# After fixing API token permissions:
wrangler d1 create swole-tracker-prod

# Update wrangler.toml with returned database_id
# Replace "production-database-id" with actual ID
```

#### Step 2: Apply Database Schema
```bash
# Apply D1 migrations to production database
wrangler d1 migrations apply swole-tracker-prod --env production

# Verify tables were created
wrangler d1 execute swole-tracker-prod --command="SELECT name FROM sqlite_master WHERE type='table';" --env production
```

#### Step 3: Validate Infrastructure
```bash
# Test KV namespace access
wrangler kv:key put test-key "test-value" --binding RATE_LIMIT_KV --env production
wrangler kv:key get test-key --binding RATE_LIMIT_KV --env production
wrangler kv:key delete test-key --binding RATE_LIMIT_KV --env production

# Test D1 database access  
wrangler d1 execute swole-tracker-prod --command="SELECT 1 as test;" --env production
```

### Phase 4.2: Cloudflare Pages Deployment

#### Step 1: Connect GitHub Repository
1. **Login to Cloudflare Dashboard**
   - Navigate to `Workers & Pages`
   - Click `Create application` → `Pages` tab
   - Select `Connect to Git`

2. **Repository Configuration**
   - **Repository**: `swole-tracker`
   - **Branch**: `feature/cloudflare-migration`
   - **Build Command**: `bun run build`
   - **Build Output Directory**: `.next`
   - **Node Version**: `20.19.4` (via package.json)

#### Step 2: Production Environment Variables
**Set in Cloudflare Pages Dashboard → Environment Variables → Production:**

```env
# Authentication (Required)
WORKOS_API_KEY=your_production_workos_api_key
WORKOS_CLIENT_ID=your_production_workos_client_id

# Application URLs
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
NEXT_PUBLIC_ENV=production
NODE_ENV=production

# Analytics (Optional)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_production_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# WHOOP Integration (Required if using)
WHOOP_CLIENT_ID=your_production_whoop_client_id
WHOOP_CLIENT_SECRET=your_production_whoop_client_secret
WHOOP_REDIRECT_URI=https://your-production-domain.com/api/auth/whoop/callback
WHOOP_WEBHOOK_SECRET=your_production_whoop_webhook_secret
WHOOP_SYNC_RATE_LIMIT_PER_HOUR=1000

# AI Gateway (Optional)
AI_GATEWAY_API_KEY=your_production_ai_gateway_key
AI_GATEWAY_MODEL=google/gemini-2.0-flash-lite
AI_GATEWAY_PROMPT=Tell a short, clean gym-related joke suitable for all audiences.

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR=1000
RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR=1000
RATE_LIMIT_API_CALLS_PER_MINUTE=1000
```

#### Step 3: Deploy to Production
```bash
# Trigger manual deployment or push to feature branch
git push origin feature/cloudflare-migration

# Monitor deployment at:
# https://dash.cloudflare.com/[account]/pages/swole-tracker
```

### Phase 4.3: Data Migration Execution

#### Step 1: Pre-Migration Validation
```bash
# Run comprehensive staging tests
bun run test:comprehensive:staging
bun run test:performance:staging  
bun run test:mobile:staging

# Validate migration script (dry run)
bun run migrate:production  # --dry-run is default
```

#### Step 2: User ID Mapping Migration
```bash
# CRITICAL: Execute production data migration
bun run migrate:production:execute

# Verify data integrity
# Script will validate:
# - User record mapping
# - Workout data integrity  
# - Template preservation
# - WHOOP integration data
```

#### Step 3: Post-Migration Validation
```bash
# Test production endpoints
curl https://your-domain.com/api/health
curl https://your-domain.com/api/auth/me

# Validate user authentication flow
# Test workout CRUD operations
# Verify WHOOP webhook handling
```

### Phase 4.4: WHOOP Integration Switchover

#### Step 1: Coordinate URL Changes
**Current URLs (Vercel):**
```
OAuth Redirect: https://current-vercel-app.vercel.app/api/auth/whoop/callback
Webhook URL: https://current-vercel-app.vercel.app/api/webhooks/whoop
```

**New URLs (Cloudflare):**
```
OAuth Redirect: https://your-production-domain.com/api/auth/whoop/callback  
Webhook URL: https://your-production-domain.com/api/webhooks/whoop
```

#### Step 2: WHOOP Developer Portal Updates
1. **Login to WHOOP Developer Portal**
2. **Update OAuth Redirect URIs**
   - Add new Cloudflare Pages URL
   - Remove old Vercel URL (after validation)
3. **Update Webhook Endpoints**
   - Configure new webhook URL
   - Verify webhook secret matches environment

#### Step 3: Test WHOOP Integration
```bash
# Run WHOOP webhook testing suite
bun run test:whoop-webhooks

# Test OAuth flow end-to-end
# Verify webhook signature validation
# Test workout data synchronization
```

### Phase 4.5: DNS and Traffic Management

#### Step 1: Custom Domain Configuration
```bash
# In Cloudflare Pages Dashboard:
# 1. Go to Custom Domains
# 2. Add your production domain
# 3. Configure CNAME record:
#    CNAME your-domain.com -> your-pages-deployment.pages.dev
```

#### Step 2: SSL/TLS Configuration
- **SSL Mode**: Full (Strict) 
- **Edge Certificates**: Enabled
- **HSTS**: Enabled for security
- **HTTP Redirect**: HTTPS only

#### Step 3: Performance Optimization
- **Caching Rules**: Static assets 1 year, API 5 minutes
- **Compression**: Brotli + Gzip enabled
- **Minification**: JS/CSS/HTML enabled

### Phase 4.6: Monitoring and Validation

#### Step 1: Health Checks
```bash
# Automated monitoring endpoints
curl https://your-domain.com/api/health
curl https://your-domain.com/api/auth/health  
curl https://your-domain.com/api/workouts/health
```

#### Step 2: Performance Monitoring
- **Core Web Vitals**: Monitor LCP, FID, CLS
- **API Response Times**: <200ms target
- **Database Query Performance**: <50ms average
- **Error Rates**: <0.1% target

#### Step 3: User Experience Validation  
- **Authentication Flows**: WorkOS login/logout
- **Workout CRUD**: Create, read, update, delete
- **Template Management**: Template operations
- **WHOOP Sync**: Data synchronization
- **Mobile PWA**: Offline functionality

## 🔄 Rollback Strategy

### Quick Rollback (DNS Level)
```bash
# Immediate rollback via DNS (5 minute TTL)
# Change CNAME back to Vercel deployment:
CNAME your-domain.com -> current-vercel-app.vercel.app
```

### Application Rollback (Code Level)
```bash
# Deploy previous working commit
git revert <migration-commit>
git push origin main

# Or redeploy from known good commit
git checkout <previous-working-commit>
git push origin main --force-with-lease
```

### Data Rollback (Database Level)
```bash
# Emergency data restoration
# 1. Stop new user registrations
# 2. Export D1 data for analysis
# 3. Restore from Supabase backup
# 4. Re-sync WHOOP webhooks to Vercel
```

## 📊 Success Metrics

### Technical Metrics
- [ ] **Deployment Success**: Pages deployment completes without errors
- [ ] **Database Migration**: 100% data integrity maintained  
- [ ] **API Endpoints**: All endpoints respond correctly
- [ ] **Authentication**: WorkOS login/logout functional
- [ ] **Performance**: <2s page load, <200ms API response

### Business Metrics
- [ ] **User Authentication**: No authentication failures
- [ ] **Workout Operations**: No data loss or corruption  
- [ ] **WHOOP Integration**: Webhook processing maintains function
- [ ] **Mobile Experience**: PWA functionality preserved
- [ ] **Error Rates**: <0.1% application errors

## 🚨 Emergency Contacts

- **Technical Lead**: Available during cutover window
- **WHOOP Developer Portal**: Access for URL updates  
- **Cloudflare Support**: Enterprise support if needed
- **WorkOS Support**: Authentication issues
- **Domain Registrar**: DNS change authority

## 📋 Go/No-Go Checklist

### Prerequisites (Must Complete)
- [ ] API token permissions fixed (D1 access)
- [ ] Production D1 database created and migrated
- [ ] All environment variables configured in Cloudflare Pages
- [ ] WHOOP URL coordination scheduled
- [ ] Rollback procedures validated
- [ ] Monitoring and alerting configured

### Validation Gates (Must Pass)
- [ ] Staging environment fully functional
- [ ] All test suites passing
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Mobile app compatibility confirmed

### Execution Ready (Must Confirm)
- [ ] Deployment window scheduled (low traffic)
- [ ] Team availability confirmed
- [ ] Communication plan activated
- [ ] Rollback triggers defined
- [ ] Success metrics baseline established

---

**Next Steps**: Fix API token permissions → Complete D1 setup → Execute deployment