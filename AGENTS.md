# AGENT.md - Swole Tracker Configuration

This document captures the workflows, architecture, and conventions used in the Swole Tracker codebase.

## Commands
- Dev: `bun dev` – Next.js 15 + Turbopack; wraps `infisical run -- next dev --turbo` if Infisical is configured
- Build: `bun build` – `next build`; ensure required env vars are loaded (use `.env.local`, CI secrets, or `infisical run -- bun build`)
- Preview: `bun preview` – `next build && next start`
- Start: `bun start` – serves the pre-built app
- Lint: `bun lint` / `bun lint:fix` – ESLint with a 20 warning cap
- Type Check: `bun typecheck` – `tsc --noEmit`
- Check: `bun check` – runs lint + typecheck
- Format: `bun format:write` / `bun format:check` – Prettier + Tailwind plugin
- DB: `bun db:generate` / `bun db:migrate` / `bun db:push` / `bun db:studio` – Drizzle Kit tooling
- Unit tests: `bun test` (Vitest watch), `bun test:unit`, `bun test:integration`
- Coverage: `bun test:coverage` (Vitest), `bun test:ci` (Vitest run + coverage)
Notes:
- Package manager pinned to `bun@1.2.21` (see `package.json#packageManager`)
- Node.js pinned via Volta: `node@20.19.4`

## Architecture
- Stack: Next.js 15 App Router + React 19 + strict TypeScript + T3 core (tRPC v11, Drizzle ORM, Supabase Auth)
- Auth: Supabase SSR integration (`src/providers/AuthProvider.tsx`, `src/lib/supabase-*.ts`, `src/middleware.ts`)
- API: tRPC routers in `src/server/api/routers/*`, schemas in `src/server/api/schemas/*`, helpers in `src/server/api/utils/*`, root at `src/server/api/root.ts`
- Database: PostgreSQL via Drizzle; schema in `src/server/db/schema.ts`, connection helpers in `src/server/db/index.ts`, monitoring utilities in `src/server/db/monitoring.ts`
- Frontend: App Router pages/components live in `src/app/**`; shared client components in `src/components/**`; App Router-only components in `src/app/_components/**`
- tRPC clients: React Query + RSC helpers in `src/trpc/*` (server caller, `HydrateClient`, persistent query client, offline hydration)
- Styling: Tailwind CSS v4 with custom utilities in `src/styles/globals.css`; design tokens live in `src/design-tokens/*` and `src/lib/design-tokens.ts` (see `DESIGN_MANIFESTO.md`)
- Offline & caching: Enhanced persistence, background sync, and analytics in `src/lib/offline-storage.ts`, `src/lib/mobile-offline-queue.ts`, `src/hooks/use-offline-*`
- Integrations: Whoop OAuth + webhooks (`src/server/api/routers/whoop.ts`, `src/lib/whoop-webhook.ts`), AI Gateway prompts (`src/lib/ai-prompts/**`, `src/lib/analytics`), PostHog analytics providers (`src/providers/PostHogProvider.tsx`, `src/lib/posthog.ts`)
- Realtime updates: Server-Sent Events endpoint at `src/app/api/sse/workout-updates/route.ts`

## Key Features
- Authenticated workout dashboards (`/workout`, `/workouts`, `/templates`) gated by Supabase sessions
- Workout template + session management, set logging, progression helpers, achievements, and insights
- Offline-first UX with conflict resolution, queueing, and cache health monitoring
- AI-assisted coaching: jokes demo route plus health advice & wellness insights (`healthAdvice`, `wellness`, `suggestions` routers)
- Whoop integration: OAuth flow, sync orchestration, webhook processor, and rate limiting
- Progress analytics, charts, and SSE live updates for active sessions

## Code Style & Conventions
- Strict TypeScript with `noUncheckedIndexedAccess`; `verbatimModuleSyntax` enforced
- Import aliases: prefer `~/` (and `@/` when required by tooling) for paths under `src/`
- Use `import { type Foo } from '...'` for type-only imports
- Logging: use `~/lib/logger` helpers (`logger`, `logApiCall`, `logSecurityEvent`) instead of raw console calls
- Database safety: ESLint enforces `drizzle/enforce-delete-with-where` and `drizzle/enforce-update-with-where` on `db`/`ctx.db`
- Tailwind class ordering via Prettier plugin; mobile-first layout conventions
- Unused values must be prefixed `_` to satisfy lint rules

## Environment
- Env schema defined in `src/env.js` with `@t3-oss/env-nextjs`
- Local setup: copy `.env.example` to `.env.local` (or export variables in the shell) and fill Supabase, PostHog, AI Gateway, Whoop, encryption, and rate-limit values
- Optional Infisical: `.infisical.json` configured; `bun dev` already wraps `infisical run --`. For other scripts use `infisical run -- bun <script>` if you depend on Infisical instead of `.env.local`
- Required variables (per `.env.example`):
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `DATABASE_URL` (Postgres connection string)
  - `ENCRYPTION_MASTER_KEY` for secure token storage
  - Rate limit knobs: `RATE_LIMIT_ENABLED`, `RATE_LIMIT_*`
  - AI Gateway config (`VERCEL_AI_GATEWAY_API_KEY`, `AI_GATEWAY_MODEL`, etc.)
  - PostHog keys (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`)
  - Whoop OAuth secrets (`WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WHOOP_REDIRECT_URI`, `WHOOP_WEBHOOK_SECRET`)

## Database
- Schema lives in `src/server/db/schema.ts` with `createTable` helper prefixing tables as `swole-tracker_*`
- Connection + pool tuning in `src/server/db/index.ts`; query monitoring utilities exported from `src/server/db/monitoring.ts`
- Additional SQL lives under `drizzle/` (RLS scripts, enable/disable helpers) and `scripts/apply-migration.js` for manual SQL migrations
- Always filter queries by `ctx.user.id` (Supabase UUID string). Computed columns (e.g., `one_rm_estimate`, `volume_load`) are maintained via application logic and SQL helpers—ensure indexes are respected when adding new fields
- RLS: Supabase handles cookie-based auth; optional RLS policies are in `src/server/db/rls.sql` if you enable them in Supabase

## tRPC Guidelines
- Context (`src/server/api/trpc.ts`) provides `{ db, user, headers, requestId }`
- Use `publicProcedure` for anonymous endpoints (still wrapped in timing middleware) and `protectedProcedure` to enforce Supabase auth (`ctx.user` is non-null)
- Validate input with Zod schemas from `src/server/api/schemas/*`; reuse shared types from `src/server/api/types/*`
- Log long-running calls with `logApiCall` and rely on the built-in timing middleware for request metrics
- Apply `ctx.user.id` filters in every protected procedure to maintain tenant isolation

## Middleware & Routing
- `src/middleware.ts` bootstraps a Supabase SSR client, refreshes sessions, and protects `/workout*`, `/workouts*`, `/templates*`
- App Router API handlers live in `src/app/api/*` (Whoop OAuth, SSE, AI gateways, webhook endpoints)
- tRPC HTTP transport at `src/app/api/trpc/[trpc]/route.ts`

## Local Development Workflow
1. `bun install`
2. Configure env vars (`.env.local` or Infisical) and confirm Supabase project access
3. Initialize/refresh database: `bun db:push` (optionally apply SQL scripts under `drizzle/` or `scripts/`)
4. Start dev server: `bun dev`
5. Before committing: `bun format:write`, `bun check`, and at least `bun test`

## Commit & PR Checklist
- [ ] Formatting clean (`bun format:write`)
- [ ] Lint + typecheck pass (`bun check`)
- [ ] Vitest suite green (`bun test` / `bun test:ci` as appropriate)
- [ ] DB schema changes reviewed; run `bun db:push` or generate migrations + update `drizzle/` SQL helpers if needed
- [ ] tRPC procedures include Zod input validation and respect `ctx.user.id`
- [ ] Protected pages/components follow Supabase auth patterns and Tailwind ordering conventions

## Production & Preview
- Preview locally: `bun preview`
- Vercel build: `bun build` (ensure env vars are supplied via Vercel or Infisical)
- Install step: `bun install`; output directory: `.next`
- Post-deploy: apply Drizzle migrations (`bun db:push` or generated SQL) against the production database and ensure Supabase auth redirect URIs match the deployed domain

## Recent Changes
- Supabase auth + SSR middleware replaced earlier Clerk integration; update code/tests to avoid lingering Clerk mocks (`src/__tests__/setup.ts` still carries temporary shims)
- Offline persistence received major upgrades (`src/lib/offline-storage.ts`, `src/lib/cache-analytics.ts`) with cache health checks, background sync, and PostHog instrumentation
- AI coaching features expanded: health advice persistence (`src/server/api/routers/health-advice.ts`), wellness tracking (`src/server/api/routers/wellness.ts`), and suggestion routers leverage the Vercel AI Gateway configuration in `src/env.js`

## Troubleshooting
- Supabase auth issues: ensure cookies are being set (Next middleware) and Supabase keys match your environment; `debugAuth` helper exposed on `window` for clearing sessions
- Environment problems: validate against `src/env.js`; remember only `bun dev` auto-wraps with Infisical—other scripts need `.env.local` or manual `infisical run`
- Database connection: confirm `DATABASE_URL` + SSL params, and watch Postgres pool limits (tuned in `src/server/db/index.ts`)
- Rate limiting or Whoop sync errors: check `src/lib/rate-limit.ts` and `src/lib/whoop-webhook.ts`; confirm env knobs are set
- Offline queue quirks: inspect localStorage size (cache health logs) and PostHog events; `setupEnhancedOfflinePersistence` can fall back to memory-only mode when storage is full
- SSE failures: verify `/api/sse/workout-updates` returns 200 and that clients stay authorized (Supabase session cookies must be present)

## Test Strategy
- Unit & integration tests: Vitest (`vitest.config.ts`) with jsdom, setup in `src/__tests__/setup.ts`; mocks live in `src/__tests__/mocks`
- Coverage: enforced via `bun test:ci` / `bun test:coverage` (v8 provider, thresholds set to 80/75)
- E2E: Currently not planned; Playwright config remains in the repo but no browser flows are maintained
- Mocking: MSW for network scenarios, custom DB/service mocks per test suite. Keep new utilities in `src/__tests__/test-utils.tsx` for reuse
