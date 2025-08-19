# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Development Commands

**Development workflow:**
- `bun dev` - Start Next.js dev server with Turbopack
- `bun build` or `npm run build` - Build the application
- `bun run build:cloudflare` or `npm run build:cloudflare` - Build for Cloudflare Workers deployment (identical commands)
- `bun preview` - Build and start locally
- `bun check` - Run lint + typecheck (use before commits)
- `bun typecheck` - TypeScript type checking only
- `bun lint` / `bun lint:fix` - ESLint checking/fixing

**Deployment (Cloudflare Workers):**
- `npm run deploy` - Deploy to development environment
- `npm run deploy:staging` - Deploy to staging environment
- `npm run deploy:production` - Deploy to production environment
- `npm run deploy:versions` - Upload new version to development
- `npm run deploy:versions:staging` - Upload new version to staging
- `npm run deploy:versions:production` - Upload new version to production

**Universal Build Command:**
Both `bun run build:cloudflare` and `npm run build:cloudflare` work identically on local and Cloudflare environments.

**Testing:**
- `bun test` - Run Vitest unit tests
- `bun test:ci` - Run tests with coverage
- `bun test:watch` - Watch mode testing
- `bun coverage` - Generate coverage report
- `bun e2e` - Run Playwright e2e tests
- `bun test:e2e:ui` - Run e2e tests with UI

**Database (Drizzle):**
- `bun db:push` - Push schema changes (development)
- `bun db:generate` - Generate migration files
- `bun db:migrate` - Run migrations
- `bun db:studio` - Open Drizzle Studio

**Code formatting:**
- `bun format:write` - Format code with Prettier
- `bun format:check` - Check formatting

## Core Architecture

**Stack:** Next.js 15 + React 19 + TypeScript + T3 Stack (tRPC v11 + Drizzle + Supabase Auth)

**Key directories:**
- `src/app/` - Next.js App Router pages and components
- `src/server/api/routers/` - tRPC API routers (templates, workouts, whoop, webhooks, etc.)
- `src/server/db/schema.ts` - Drizzle ORM schema with prefixed tables (`swole-tracker_*`)
- `src/lib/` - Utilities (rate limiting, offline queue, webhooks, analytics)
- `src/hooks/` - Custom React hooks
- `src/providers/` - React context providers (PostHog, Theme)
- `apps/mobile/` - Mobile (Android) app folder

**Authentication:** Supabase Auth middleware protects `/workout*`, `/templates*`, `/workouts*` routes

**Database:** PostgreSQL with Drizzle ORM, uses Supabase. All queries filtered by `user_id` for security.

## Important Implementation Details

**tRPC Structure:**
- All routers export from `src/server/api/root.ts` 
- Use `protectedProcedure` for authenticated endpoints
- Input validation with Zod schemas in `src/server/api/schemas/`

**Database Security:**
- Always include `where` clauses filtering by `ctx.user.id` (Supabase Auth user ID)
- Schema uses `user_id` VARCHAR(256) for Supabase Auth integration
- Tables prefixed with `swole-tracker_` via `createTable` helper

**Environment Variables:**
- Schema defined in `src/env.js` with @t3-oss/env-nextjs
- Create a `.env.local` file from `.env.example` with your environment variables
- Required: DATABASE_URL, Supabase keys, PostHog keys
- Optional: WHOOP integration, AI Gateway, rate limiting configs

**Offline-First Features:**
- Offline queue system in `src/lib/offline-queue.ts`
- React Query persistence for data caching
- Connection status indicators and sync states

**Rate Limiting:**
- Database-backed rate limiting via `src/lib/rate-limit.ts`
- Configurable per-endpoint limits in environment variables
- WHOOP sync has special per-hour rate limits

**WHOOP Integration:**
- OAuth flow with `/api/auth/whoop/` routes
- Webhook handling with HMAC verification in `src/lib/whoop-webhook.ts`
- Rate-limited sync endpoint at `/api/whoop/sync-workouts`

## Testing Setup

**Unit tests:** Vitest with jsdom environment, setup in `src/__tests__/setup.ts`
**E2E tests:** Playwright with config in `playwright.config.ts`
**Coverage:** Focuses on `src/lib/` and `src/server/api/` directories
**Mocking:** MSW for API mocking, custom mocks for database operations

## Key Patterns

**Path alias:** Use `~/*` for imports from `src/`
**Logging:** Use `src/lib/logger.ts` instead of console methods
**Analytics:** PostHog integration via `src/lib/posthog.ts` and provider
**Type safety:** Strict TypeScript with `noUncheckedIndexedAccess: true`

## Development Notes

- Uses bun as package manager (pinned in package.json)
- Node.js version pinned to 20.19.4 via Volta
- Create `.env.local` file with required environment variables
- Mobile-first design with offline capabilities
- Progressive Web App with service worker
- Tailwind CSS v4 for styling

## Visual Development

### Design Principles
- Comprehensive design checklist in `DESIGN_PRINCIPLES.md`
- Brand style guide in `DESIGN_SYSTEM.md`
- When making visual (front-end, UI/UX) changes, always refer to these files for guidance

### Quick Visual Check
IMMEDIATELY after implementing any front-end change:
1. **Identify what changed** - Review the modified components/pages
2. **Navigate to affected pages** - Use `mcp__playwright__browser_navigate` to visit each changed view
3. **Verify design compliance** - Compare against `DESIGN_PRINCIPLES.md` and `DESIGN_SYSTEM.md`
4. **Validate feature implementation** - Ensure the change fulfills the user's specific request
5. **Check acceptance criteria** - Review any provided context files or requirements
6. **Capture evidence** - Take full page screenshot at desktop viewport (1440px) of each changed view
7. **Check for errors** - Run `mcp__playwright__browser_console_messages`

This verification ensures changes meet design standards and user requirements.

### Comprehensive Design Review
Invoke the `@agent-design-review` subagent for thorough design validation when:
- Completing significant UI/UX features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility and responsiveness testing
