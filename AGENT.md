# AGENT.md - Swole Tracker Configuration

This document defines the project-specific workflow, commands, architecture, and conventions for maintainers and automation.

## Commands
- Dev: `bun dev` (Next.js 15 with turbopack, automatically injects secrets from Infisical)
- Build: `bun build` (automatically injects secrets from Infisical)
- Preview (prod locally): `bun preview` (alias: `next build && next start`, automatically injects secrets from Infisical)
- Start: `bun start` (serve built app, automatically injects secrets from Infisical)
- Lint: `bun lint`
- Lint:Fix: `bun lint:fix`
- Type Check: `bun typecheck`
- Check (lint + typecheck): `bun check`
- Format (write): `bun format:write`
- Format (check): `bun format:check`
- DB: Generate: `bun db:generate` (automatically injects secrets from Infisical)
- DB: Migrate: `bun db:migrate` (automatically injects secrets from Infisical)
- DB: Push (dev): `bun db:push` (automatically injects secrets from Infisical)
- DB: Studio (UI): `bun db:studio` (automatically injects secrets from Infisical)

Notes:
- Package manager is pinned: `bun@1.1.42` (required).
- Node.js 20.19.4 recommended (pinned via Volta).

## Architecture
- Stack: Next.js 15 App Router + tRPC v11 + Drizzle ORM + Clerk + Tailwind CSS v4
- Monorepo: Single app; src root aliased as `~/`
- API: tRPC routers in `src/server/api/routers/`, root at `src/server/api/root.ts`, server plumbing in `src/server/api/trpc.ts`
- Database: PostgreSQL via Drizzle ORM
  - Schema: `src/server/db/schema.ts` (table creator prefix `swole-tracker_*`)
  - Enforced app-level user isolation via `user_id` on tables (Clerk user id)
- Auth: Clerk (middleware `src/middleware.ts` protects `/workout|/templates|/workouts`)
- Frontend: Next.js App Router in `src/app/`
  - Shared components in `src/app/_components/`
  - Providers in `src/providers/`
- Styling: Tailwind v4 (`src/styles/globals.css`), mobile-first, dark theme by default
- Analytics: PostHog (`src/providers/PostHogProvider.tsx`, `src/lib/posthog.ts`, `src/lib/analytics.ts`)
- Offline: Connection and sync indicators, react-query persistence
- Integrations: Whoop OAuth + syncing, webhooks, and rate limiting

## Key Features (High Level)
- Authenticated areas: /workout, /workouts, /templates
- Workout templates and sessions with exercise sets
- Progression helpers (previous values), history, read-only views
- Preferences (units kg/lbs)
- Offline-first UX with indicators
- Whoop integration: OAuth, sync last 25 workouts, duplicate detection, webhook debug page
- Jokes (demo for AI usage and tRPC route)

## Code Style & Conventions
- Language: Strict TypeScript
- Imports:
  - Use `~/` alias for `src/`
  - Prefer inline type imports: `import { type Foo } from '...'`
  - `verbatimModuleSyntax` enabled (no transformed type-only imports)
- Naming: camelCase for vars/functions, PascalCase for components
- Unused vars: Prefix with `_` to satisfy ESLint
- Database safety (ESLint):
  - `drizzle/enforce-delete-with-where`: error
  - `drizzle/enforce-update-with-where`: error
  - Applies to `db` and `ctx.db`
- Formatting: Prettier + Tailwind plugin
- Linting: ESLint flat config with Next.js core-web-vitals + typescript-eslint

## Environment
**Environment management via Infisical:** All scripts automatically inject secrets using `infisical run --`. No manual `.env` file management needed.

**Setup Requirements:**
1. Install Infisical CLI: `npm install -g @infisical/cli` or `brew install infisical/get-cli/infisical`
2. Login: `infisical login`
3. Verify access to project: `infisical user`
4. All `bun` commands will now automatically inject environment variables from Infisical

**Required Environment Variables (managed in Infisical):**
- DATABASE_URL
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- Whoop (optional): WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, WHOOP_SYNC_RATE_LIMIT_PER_HOUR

## Database
- Use Drizzle Kit:
  - Local dev: `bun db:push` (automatically injects secrets from Infisical)
  - SQL changes live in `src/server/db/schema.ts`
  - Studio: `bun db:studio` (automatically injects secrets from Infisical)
- Row-level security handled at application level via Clerk user id.
- Always filter by `user_id = ctx.user.id` in queries.
- Use indexes defined in schema to keep queries performant.

## tRPC Guidelines
- Public procedures: `publicProcedure` (includes timing middleware)
- Protected procedures: `protectedProcedure` (requires Clerk user)
- Context provides: `{ db, user, headers }`
- Use Zod for input parsing; errors are formatted by superjson + errorFormatter
- Logging: request timing logged via `logApiCall` in `~/lib/logger`

## Middleware & Routing
- Clerk middleware protects `/workout(.*)`, `/templates(.*)`, `/workouts(.*)`
- Middleware matches API and tRPC routes by default
- App router pages live under `src/app/.../page.tsx`

## Local Development Workflow
1) Install: `bun install`
2) Setup Infisical: `infisical login` and verify access
3) Initialize DB: `bun db:push` (automatically injects secrets from Infisical)
4) Dev server: `bun dev` (automatically injects secrets from Infisical)
5) Lint/typecheck prior to commit: `bun check`
6) Format code: `bun format:write`

## Commit & PR Checklist
- [ ] `bun format:write` clean
- [ ] `bun check` passes (lint + typecheck)
- [ ] DB changes reviewed; `bun db:push` run locally if schema changed
- [ ] No direct updates/deletes without `where` clauses
- [ ] Added/updated tRPC procedures include Zod validation
- [ ] Protected routes use `protectedProcedure` where required
- [ ] UI follows mobile-first and Tailwind class ordering conventions

## Production & Preview
- Preview locally: `bun preview` (automatically injects secrets from Infisical)
- Vercel deployment:
  - Build: `bun build` (automatically injects secrets from Infisical)
  - Output: `.next`
  - Install: `bun install`
  - Env vars: Managed via Infisical integration or Vercel dashboard
- After deploy, push schema to production DB as needed:
  - Ensure Infisical configured for production environment
  - `bun db:push` (automatically injects secrets from Infisical)

## Troubleshooting
- **Infisical issues:** Verify login status with `infisical user`, ensure project access, check workspace ID in `.infisical.json`
- Clerk auth issues: verify publishable and secret keys, redirect URLs, and middleware matcher
- DB connection: confirm `DATABASE_URL` and SSL params for Supabase pooler
- tRPC type errors: ensure Zod schemas match input usage
- Rate limit: ensure `WHOOP_SYNC_RATE_LIMIT_PER_HOUR` is set, see `~/src/lib/rate-limit.ts`
- Styling anomalies: Tailwind v4 + Prettier plugin alignment
- **Environment variables not loading:** Ensure Infisical CLI is installed, logged in, and commands are prefixed with `infisical run --`

## Test Strategy
- No formal test framework configured yet. Unit/integration tests TBD.
- Temporary guidance:
  - Prefer extracting pure helpers into `~/lib/*` for easier testing later
  - Keep IO boundaries (API, DB) thin to facilitate future tests
