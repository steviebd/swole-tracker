## Commands

- Dev: `bun dev` – Next.js dev server with remote D1; dynamically updates wrangler.toml from Infisical secrets (Wrangler integration pending build fixes)
- Build: `bun build` – `opennext build`; ensure required env vars are loaded via `infisical run -- bun build`
- Deploy: `bun deploy` – `wrangler deploy`; ensure required env vars are loaded via `infisical run -- bun deploy`
- Lint: `bun lint` / `bun lint:fix` – ESLint with a 20 warning cap
- Type Check: `bun typecheck` – `tsc --noEmit`
- Check: `bun check` – runs lint + typecheck
- Format: `bun format:write` / `bun format:check` – Prettier + Tailwind plugin
- DB: `bun db:generate` / `bun db:migrate` / `bun db:push` / `bun db:studio` – Drizzle Kit tooling
- Unit tests: `bun test` (Vitest run), `bun test:watch` (Vitest watch), `bun test:unit`, `bun test:integration`
- Coverage: `bun test:coverage` (Vitest), `bun coverage` (Vitest run + coverage)
  Notes:
- Package manager pinned to `bun@1.2.21` (see `package.json#packageManager`)
- Node.js pinned via Volta: `node@20.19.4`

## Architecture

- Stack: Next.js 15 App Router + React 19 + strict TypeScript + T3 core (tRPC v11, Drizzle ORM, WorkOS)
- Auth: WorkOS SSR integration (`src/middleware.ts`)
- API: tRPC routers in `src/server/api/routers/*`, schemas in `src/server/api/schemas/*`, helpers in `src/server/api/utils/*`, root at `src/server/api/root.ts`
- Database: Cloudflare D1 via Drizzle; schema in `src/server/db/schema.ts`, connection helpers in `src/server/db/index.ts`, monitoring utilities in `src/server/db/monitoring.ts`
- Frontend: App Router pages/components live in `src/app/**`; shared client components in `src/components/**`; App Router-only components in `src/app/_components/**`
- tRPC clients: React Query + RSC helpers in `src/trpc/*` (server caller, `HydrateClient`, persistent query client, offline hydration)
- Styling: Tailwind CSS v4 with custom utilities in `src/styles/globals.css`; design tokens live in `src/design-tokens/*` and `src/lib/design-tokens.ts` (see `DESIGN_MANIFESTO.md`)
- Offline & caching: React Query persistence with offline queue in `src/lib/offline-storage.ts`, `src/lib/offline-queue.ts`, `src/hooks/use-offline-*`
- Integrations: Whoop OAuth + webhooks (`src/server/api/routers/whoop.ts`, `src/lib/whoop-webhook.ts`), AI Gateway prompts (`src/lib/ai-prompts/**`, `src/lib/analytics`), PostHog analytics providers (`src/providers/PostHogProvider.tsx`, `src/lib/posthog.ts`)
- Realtime updates: Server-Sent Events endpoint planned at `src/app/api/sse/workout-updates/route.ts` (not yet implemented)

## Key Features

- Authenticated workout dashboards (`/workout`, `/workouts`, `/templates`) gated by WorkOS sessions
- Workout template + session management, set logging, progression helpers, achievements, and insights
- Offline-first UX with conflict resolution, queueing, and cache health monitoring
- AI-assisted coaching: health advice & wellness insights (`healthAdvice`, `wellness`, `suggestions` routers)
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
- Local setup: Configure Infisical (see `.infisical.json`) and ensure all required environment variables are set in your Infisical workspace
- Infisical integration: Required for local development; `bun dev` auto-wraps with `infisical run --`. For other scripts use `infisical run -- bun <script>`
- Required variables (per `.env.example`):
  - `WORKOS_CLIENT_ID`, `WORKOS_API_KEY` (redirect URI derived from `NEXT_PUBLIC_SITE_URL`)
  - `DATABASE_URL` (Cloudflare D1 connection string)
  - `ENCRYPTION_MASTER_KEY` for secure token storage
  - Rate limit knobs: `RATE_LIMIT_ENABLED`, `RATE_LIMIT_*`
  - AI Gateway config (`VERCEL_AI_GATEWAY_API_KEY`, `AI_GATEWAY_MODEL`, etc.)
  - PostHog keys (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`)
  - `NEXT_PUBLIC_SITE_URL` (drives OAuth redirect URIs)
  - Whoop OAuth secrets (`WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WHOOP_WEBHOOK_SECRET`)

## Database

- Schema lives in `src/server/db/schema.ts` with `createTable` helper prefixing tables as `swole-tracker_*`
- Connection + pool tuning in `src/server/db/index.ts`; query monitoring utilities exported from `src/server/db/monitoring.ts`
- Additional SQL lives under `drizzle/` (RLS scripts, enable/disable helpers) and `scripts/apply-migration.js` for manual SQL migrations
- Always filter queries by `ctx.user.id` (WorkOS user ID). Computed columns (e.g., `one_rm_estimate`, `volume_load`) are maintained via application logic and SQL helpers—ensure indexes are respected when adding new fields
- RLS: Not currently used.

## tRPC Guidelines

- Context (`src/server/api/trpc.ts`) provides `{ db, user, headers, requestId }`
- Use `publicProcedure` for anonymous endpoints (still wrapped in timing middleware) and `protectedProcedure` to enforce WorkOS auth (`ctx.user` is non-null)
- Validate input with Zod schemas from `src/server/api/schemas/*`; reuse shared types from `src/server/api/types/*`
- Log long-running calls with `logApiCall` and rely on the built-in timing middleware for request metrics
- Apply `ctx.user.id` filters in every protected procedure to maintain tenant isolation

## Middleware & Routing

- `src/middleware.ts` bootstraps a WorkOS SSR client, refreshes sessions, and protects `/workout*`, `/workouts*`, `/templates*`
- App Router API handlers live in `src/app/api/*` (Whoop OAuth, SSE, AI gateways, webhook endpoints)
- tRPC HTTP transport at `src/app/api/trpc/[trpc]/route.ts`

## Local Development Workflow

1. `bun install`
2. Configure Infisical workspace and confirm WorkOS project access
3. Initialize/refresh database: `bun db:push` (optionally apply SQL scripts under `drizzle/` or `scripts/`)
4. Start dev server: `bun dev`
5. Before committing: `bun format:write`, `bun check`, and at least `bun test`

## Commit & PR Checklist

- [ ] Formatting clean (`bun format:write`)
- [ ] Lint + typecheck pass (`bun check`)
- [ ] Vitest suite green (`bun test` / `bun coverage` as appropriate)
- [ ] DB schema changes reviewed; run `bun db:push` or generate migrations + update `drizzle/` SQL helpers if needed
- [ ] tRPC procedures include Zod input validation and respect `ctx.user.id`
- [ ] Protected pages/components follow WorkOS auth patterns and Tailwind ordering conventions

## Production & Preview

- Cloudflare build: `bun build` (ensure env vars are supplied via Infisical)
- Deploy: `bun deploy`
- Install step: `bun install`; output directory: `.open-next`
- Post-deploy: apply Drizzle migrations (`bun db:migrate`) against the production database and ensure WorkOS auth redirect URIs match the deployed domain

## Recent Changes

- WorkOS auth + SSR middleware replaced earlier Supabase integration
- Offline persistence simplified to React Query cache with offline queue (`src/lib/offline-storage.ts`, `src/lib/offline-queue.ts`) with automatic flushing and error handling
- AI coaching features expanded: health advice persistence (`src/server/api/routers/health-advice.ts`), wellness tracking (`src/server/api/routers/wellness.ts`), and suggestion routers leverage the Vercel AI Gateway configuration in `src/env.js`

## Troubleshooting

- WorkOS auth issues: ensure cookies are being set (Next middleware) and WorkOS keys match your environment;
- Environment problems: validate against `src/env.js`; `bun dev` auto-wraps with Infisical and dynamically updates wrangler.toml, runs on port 8787—other scripts need manual `infisical run`
- Database connection: confirm `DATABASE_URL` + SSL params, and watch D1 limits.
- Rate limiting or Whoop sync errors: check `src/lib/rate-limit.ts` and `src/lib/whoop-webhook.ts`; confirm env knobs are set
- Offline queue: workouts saved offline are queued in `offline.queue.v1` localStorage key and automatically flushed when online, on app start, tab visibility change, or manual sync
- SSE failures: verify `/api/sse/workout-updates` returns 200 and that clients stay authorized (WorkOS session cookies must be present)

## Test Strategy

- Unit & integration tests: Vitest (`vitest.config.ts`) with jsdom, setup in `src/__tests__/setup.ts`; mocks live in `src/__tests__/mocks`
- Coverage: enforced via `bun coverage` / `bun test:coverage` (v8 provider, thresholds set to 80/75)
- E2E: Currently not planned; Playwright dependencies removed from project
- Mocking: MSW for network scenarios, custom DB/service mocks per test suite. Keep new utilities in `src/__tests__/test-utils.tsx` for reuse
