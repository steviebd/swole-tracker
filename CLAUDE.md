# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Development Commands

**Development workflow:**
- `pnpm dev` - Start Next.js dev server with Turbopack
- `pnpm build` - Build the application
- `pnpm preview` - Build and start locally
- `pnpm check` - Run lint + typecheck (use before commits)
- `pnpm typecheck` - TypeScript type checking only
- `pnpm lint` / `pnpm lint:fix` - ESLint checking/fixing

**Testing:**
- `pnpm test` - Run Vitest unit tests
- `pnpm test:ci` - Run tests with coverage
- `pnpm test:watch` - Watch mode testing
- `pnpm coverage` - Generate coverage report
- `pnpm e2e` - Run Playwright e2e tests
- `pnpm test:e2e:ui` - Run e2e tests with UI

**Database (Drizzle):**
- `pnpm db:push` - Push schema changes (development)
- `pnpm db:generate` - Generate migration files
- `pnpm db:migrate` - Run migrations
- `pnpm db:studio` - Open Drizzle Studio

**Code formatting:**
- `pnpm format:write` - Format code with Prettier
- `pnpm format:check` - Check formatting

## Core Architecture

**Stack:** Next.js 15 + React 19 + TypeScript + T3 Stack (tRPC v11 + Drizzle + Clerk)

**Key directories:**
- `src/app/` - Next.js App Router pages and components
- `src/server/api/routers/` - tRPC API routers (templates, workouts, whoop, webhooks, etc.)
- `src/server/db/schema.ts` - Drizzle ORM schema with prefixed tables (`swole-tracker_*`)
- `src/lib/` - Utilities (rate limiting, offline queue, webhooks, analytics)
- `src/hooks/` - Custom React hooks
- `src/providers/` - React context providers (PostHog, Theme)

**Authentication:** Clerk middleware protects `/workout*`, `/templates*`, `/workouts*` routes

**Database:** PostgreSQL with Drizzle ORM, uses Supabase. All queries filtered by `user_id` for security.

## Important Implementation Details

**tRPC Structure:**
- All routers export from `src/server/api/root.ts` 
- Use `protectedProcedure` for authenticated endpoints
- Input validation with Zod schemas in `src/server/api/schemas/`

**Database Security:**
- Always include `where` clauses filtering by `ctx.user.id` (Clerk user ID)
- Schema uses `user_id` VARCHAR(256) for Clerk integration
- Tables prefixed with `swole-tracker_` via `createTable` helper

**Environment Variables:**
- Schema defined in `src/env.js` with @t3-oss/env-nextjs
- Required: Clerk keys, DATABASE_URL, Supabase keys, PostHog keys
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

- Uses pnpm as package manager (pinned in package.json)
- Node.js version pinned to 20.19.4 via Volta
- Mobile-first design with offline capabilities
- Progressive Web App with service worker
- Tailwind CSS v4 for styling