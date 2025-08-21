# BetterAuth Migration Plan: WorkOS to BetterAuth

## Overview

This plan outlines the migration from WorkOS to BetterAuth for authentication in the swole-tracker project. BetterAuth will provide self-hosted authentication with D1/SQLite support, eliminating external dependencies and improving developer experience while maintaining full control over the authentication infrastructure.

## Key Motivations

- **Developer Experience**: Fix Cloudflare Workers development server issues and provide better local development workflow
- **Self-Hosting**: Remove external dependencies and gain full control over authentication
- **Security**: Strengthen session validation and ensure proper user data isolation
- **Flexibility**: Better control over authentication flows and customization options

## Current Setup Analysis

- **WorkOS** for authentication with email/password and OAuth
- **Session-based auth** with cookies
- **Middleware protection** for `/workout*`, `/templates*`, `/workouts*` routes
- **Custom auth provider** (`AuthProvider.tsx`) and utilities
- **Environment variables**: `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`

## Why BetterAuth

- ✅ **D1/SQLite support** via Kysely D1 dialect
- ✅ **Framework agnostic** (works with Next.js)
- ✅ **Type-safe** with excellent TypeScript support
- ✅ **Auto-generates database schemas** via CLI
- ✅ **Simplified setup** compared to WorkOS
- ✅ **Plugin ecosystem** for advanced features
- ✅ **Better developer experience**

## Migration Phases

### Phase 1: Preparation & Dependencies

1. **Remove WorkOS dependencies**
   - [ ] Remove `@workos-inc/node` from package.json
   - [ ] Remove WorkOS-related files: `src/lib/workos.ts`, `src/lib/workos-edge.ts`, `src/lib/workos-types.ts`
   - [ ] Remove WorkOS environment variables from `src/env.js`
   - [ ] Clean up any WorkOS imports in other files

2. **Install BetterAuth**
   - [ ] Install BetterAuth: `npm install better-auth @better-auth/cli`
   - [ ] Install Cloudflare dependencies: `npm install @cloudflare/workers-types kysely-d1`
   - [ ] Verify package.json is updated correctly

### Phase 2: Database & Configuration

3. **Set up BetterAuth configuration**
   - [ ] Create `src/lib/auth.ts` with BetterAuth instance
   - [ ] Configure D1 database adapter using Kysely D1 dialect for Cloudflare Workers compatibility
   - [ ] Set up email/password authentication
   - [ ] Configure OAuth providers (Google, GitHub, etc.)
   - [ ] Configure session settings with secure cookie options (httpOnly, secure, sameSite)
   - [ ] Set up proper JWT token validation instead of basic presence checks
   - [ ] Configure for both local development (wrangler dev) and Cloudflare Workers production

4. **Update environment variables**
   - [ ] Add `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` to `src/env.js`
   - [ ] Add OAuth provider credentials to environment schema
   - [ ] Remove WorkOS variables from environment schema
   - [ ] Update `.env.example` with new variables

5. **Generate and apply database schema**
   - [ ] Run `npx @better-auth/cli generate` to create schema
   - [ ] Run `npx @better-auth/cli migrate` to apply to database
   - [ ] Verify database tables are created correctly
   - [ ] Ensure user table integrates with existing schema

### Phase 3: API & Middleware Updates

6. **Create API routes**
   - [ ] Create `/api/auth/[...all]/route.ts` with BetterAuth handler using `toNextJsHandler`
   - [ ] Remove old WorkOS auth routes (`/api/auth/login`, `/api/auth/logout`, `/api/auth/callback`)
   - [ ] Update OAuth callback routes to work with BetterAuth's session management
   - [ ] Add proper error handling for authentication failures
   - [ ] Security: Ensure all protected API routes extract `user_id` from session and validate ownership
   - [ ] Configure API routes for Cloudflare Workers compatibility
   - [ ] Add proper CORS headers for cross-origin requests if needed

7. **Update middleware**
   - [ ] Replace WorkOS session validation in `src/middleware.ts` with BetterAuth session checking
   - [ ] Update session cookie handling to use BetterAuth's session format
   - [ ] Maintain protection for `/workout*`, `/templates*`, `/workouts*` routes
   - [ ] Update middleware to attach the BetterAuth session/user object to the request context for use in API routes and tRPC procedures
   - [ ] Handle session refresh and token renewal automatically
   - [ ] Security: Validate session contains valid `user_id` before allowing access

8. **Update client-side auth**
   - [ ] Replace `src/providers/AuthProvider.tsx` with BetterAuth React client
   - [ ] Create `src/lib/auth-client.ts` with BetterAuth client configuration
   - [ ] Update `src/app/auth/login/page.tsx` to use BetterAuth `signIn` function
   - [ ] Update `src/app/auth/register/page.tsx` to use BetterAuth `signUp` function
   - [ ] Replace custom session management with BetterAuth's `useSession` hook
   - [ ] Update logout functionality to use BetterAuth's `signOut` method
   - [ ] Security: Ensure all API calls include proper authentication headers with user context

### Phase 4: Documentation & Configuration Updates

9. **Update README.md**
   - [ ] Update authentication section to document BetterAuth setup
   - [ ] Add BetterAuth configuration instructions
   - [ ] Update deployment instructions for Cloudflare Workers
   - [ ] Document new environment variables and their purposes
   - [ ] Add security considerations and user data isolation information

10. **Update AGENT.md**
    - [ ] Update development commands for BetterAuth
    - [ ] Add BetterAuth-specific troubleshooting section
    - [ ] Update authentication flow documentation
    - [ ] Document database security patterns with user_id filtering

11. **Update CLAUDE.md**
    - [ ] Update authentication architecture section
    - [ ] Document BetterAuth integration details
    - [ ] Update key development commands
    - [ ] Add BetterAuth-specific implementation notes
    - [ ] Document security patterns and middleware changes

12. **Update .env.example**
    - [ ] Remove WorkOS variables: `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`
    - [ ] Add BetterAuth variables: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
    - [ ] Add OAuth provider variables (Google, GitHub, etc.)
    - [ ] Add comments explaining each variable's purpose
    - [ ] Include Cloudflare Workers specific configurations
    - [ ] Add security-related environment variables

### Phase 5: Testing & Cleanup

13. **Testing & cleanup**
    - [ ] Test all authentication flows (login, register, OAuth, logout)
    - [ ] Verify protected routes work correctly with BetterAuth sessions
    - [ ] Test user data isolation - ensure users can only access their own data via user_id filtering
    - [ ] Test session persistence across page reloads
    - [ ] Test account linking: sign up with email, then log in with an OAuth provider for the same email, and verify it links to the same account.
    - [ ] Test local development with `wrangler dev` - ensure no more Cloudflare Workers issues
    - [ ] Test production deployment to Cloudflare Workers
    - [ ] Remove all WorkOS-related code and dependencies
    - [ ] Update TypeScript types for BetterAuth integration
    - [ ] Security audit: Verify all database queries include `user_id` filtering
    - [ ] Test edge cases: expired sessions, invalid tokens, concurrent logins
    - [ ] Test developer experience: easy setup, clear error messages, good debugging tools

## Security Considerations

### Database Security (Critical)

- [ ] **User Data Isolation**: All database queries MUST include `WHERE user_id = ?` filtering to ensure users only access their own data
- [ ] **tRPC Procedures**: Update all protected procedures to extract `user_id` from session context and validate ownership
- [ ] **Database Schema**: Ensure BetterAuth user table integrates with existing `user_id` foreign keys
- [ ] **API Route Security**: Every protected API route must validate session and extract `user_id` for data filtering
- [ ] **Middleware Security**: Session validation must include `user_id` verification and proper token validation
- [ ] **Client Security**: Ensure user_id is never exposed to client-side code unnecessarily
- [ ] **Session Validation**: Implement proper JWT token validation instead of basic presence checks
- [ ] **Token Security**: Use httpOnly, secure, sameSite cookies for session management

### Session Security

- [ ] **Session Validation**: Verify BetterAuth sessions contain valid user_id
- [ ] **Token Security**: Ensure proper token storage and refresh mechanisms
- [ ] **Session Expiry**: Configure appropriate session lifetimes
- [ ] **Concurrent Sessions**: Handle multiple sessions per user securely

### OAuth Security

- [ ] **Provider Configuration**: Securely configure OAuth providers with proper scopes
- [ ] **Callback Validation**: Validate OAuth callbacks and state parameters
- [ ] **Token Storage**: Secure storage of OAuth tokens in database

## Key Benefits

1. **Improved Developer Experience**: Better local development with wrangler dev and simplified setup
2. **Simplified Architecture**: BetterAuth handles most auth logic internally
3. **Better Performance**: No external API calls to WorkOS
4. **Cost Reduction**: No WorkOS subscription fees
5. **Full Control**: Own your auth infrastructure with complete customization flexibility
6. **Enhanced Security**: Direct database access without third-party dependencies and proper session validation
7. **Future-Proof**: Active development and community support
8. **Cloudflare Workers Optimized**: Native support for edge runtime environment

## Environment Variables for Cloudflare Workers

### Required for BetterAuth

```
# BetterAuth Configuration
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=https://your-domain.com

# OAuth Providers (optional but recommended)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Database Configuration

```
DATABASE_URL=your-d1-database-url
```

### Cloudflare Workers Specific

```
# For Cloudflare Workers deployment
CF_ACCOUNT_ID=your-cloudflare-account-id
CF_API_TOKEN=your-cloudflare-api-token
```

### Local Development Configuration

```
# For local development with wrangler dev
NODE_ENV=development
BETTER_AUTH_URL=http://localhost:8787
DATABASE_URL=your-local-d1-database-url
```

## Cloudflare Workers & Local Development Setup

### Local Development with Wrangler

1. **Install Wrangler**: `npm install -g wrangler`
2. **Configure D1 Database**: Create local D1 database for development
3. **Environment Variables**: Set up `.env.local` with development-specific variables
4. **Run Development Server**: `wrangler dev` instead of `npm run dev`
5. **Database Migrations**: Use `wrangler d1 execute` for local database operations

### Production Deployment

1. **Build Configuration**: Ensure BetterAuth is properly configured for Cloudflare Workers
2. **D1 Database**: Set up production D1 database instance
3. **Environment Variables**: Configure production environment variables in Cloudflare
4. **Deployment**: Use `npm run deploy:production` with proper Cloudflare credentials

## Timeline Estimate

- **Phase 1**: 1-2 days (dependency changes)
- **Phase 2**: 2-3 days (configuration & database)
- **Phase 3**: 3-4 days (API & middleware updates)
- **Phase 4**: 1-2 days (documentation updates)
- **Phase 5**: 2-3 days (testing & cleanup)

**Total: 8-14 days** depending on complexity and testing requirements.

## Success Criteria

- ✅ All authentication flows working (login, register, OAuth)
- ✅ Protected routes properly secured with user_id validation
- ✅ Database schema updated and migrated
- ✅ Documentation updated and accurate
- ✅ Environment variables properly configured for both local dev and production
- ✅ No external authentication dependencies
- ✅ TypeScript types updated and working
- ✅ Local development works seamlessly with `wrangler dev`
- ✅ Production deployment to Cloudflare Workers successful
- ✅ Developer experience significantly improved (easier setup, better debugging)
- ✅ Security strengthened with proper session validation and user data isolation
