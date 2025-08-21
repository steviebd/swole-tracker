# BetterAuth Migration Plan: WorkOS to BetterAuth

## Overview

This plan outlines the migration from WorkOS to BetterAuth for authentication in the swole-tracker project. BetterAuth will provide self-hosted authentication with D1/SQLite support, eliminating external dependencies and reducing costs while maintaining full control over the authentication infrastructure.

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
   - [ ] Configure D1 database adapter using Kysely D1 dialect
   - [ ] Set up email/password authentication
   - [ ] Configure OAuth providers (Google, GitHub, etc.)
   - [ ] Configure session settings and security options

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

7. **Update middleware**
   - [ ] Replace WorkOS session validation in `src/middleware.ts` with BetterAuth session checking
   - [ ] Update session cookie handling to use BetterAuth's session format
   - [ ] Maintain protection for `/workout*`, `/templates*`, `/workouts*` routes
   - [ ] Add middleware to inject `user_id` into request headers for API routes
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
    - [ ] Test user data isolation - ensure users can only access their own data
    - [ ] Test session persistence across page reloads
    - [ ] Test OAuth provider integrations (Google, GitHub, etc.)
    - [ ] Remove all WorkOS-related code and dependencies
    - [ ] Update TypeScript types for BetterAuth integration
    - [ ] Security audit: Verify all database queries include `user_id` filtering
    - [ ] Test edge cases: expired sessions, invalid tokens, concurrent logins

## Security Considerations

### Database Security (Critical)

- [ ] **User Data Isolation**: All database queries MUST include `WHERE user_id = ?` filtering
- [ ] **tRPC Procedures**: Update all protected procedures to extract `user_id` from session context
- [ ] **Database Schema**: Ensure BetterAuth user table integrates with existing `user_id` foreign keys
- [ ] **API Route Security**: Every protected API route must validate session and extract `user_id`
- [ ] **Middleware Security**: Session validation must include `user_id` verification
- [ ] **Client Security**: Ensure user_id is never exposed to client-side code unnecessarily

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

1. **Simplified Architecture**: BetterAuth handles most auth logic internally
2. **Better Performance**: No external API calls to WorkOS
3. **Cost Reduction**: No WorkOS subscription fees
4. **Full Control**: Own your auth infrastructure
5. **Enhanced Security**: Direct database access without third-party dependencies
6. **Future-Proof**: Active development and community support

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

## Timeline Estimate

- **Phase 1**: 1-2 days (dependency changes)
- **Phase 2**: 2-3 days (configuration & database)
- **Phase 3**: 3-4 days (API & middleware updates)
- **Phase 4**: 1-2 days (documentation updates)
- **Phase 5**: 2-3 days (testing & cleanup)

**Total: 8-14 days** depending on complexity and testing requirements.

## Success Criteria

- ✅ All authentication flows working (login, register, OAuth)
- ✅ Protected routes properly secured
- ✅ Database schema updated and migrated
- ✅ Documentation updated and accurate
- ✅ Environment variables properly configured
- ✅ No external authentication dependencies
- ✅ TypeScript types updated and working
