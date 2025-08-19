# AGENT.md - Swole Tracker Configuration

This document defines the project-specific workflow, commands, architecture, and conventions for maintainers and automation. It consolidates critical details from Claude, Cloudflare, and the Design System docs.

## Commands
- Dev: `bun dev` (Next.js 15 with Turbopack; injects secrets via Infisical)
- Build (web): `bun build`
- Build (Cloudflare Workers): `npm run build:cloudflare`
- Preview (prod locally): `bun preview`
- Start: `bun start`
- Lint: `bun lint`
- Lint:Fix: `bun lint:fix`
- Type Check: `bun typecheck`
- Check (lint + typecheck): `bun check`
- Format (write): `bun format:write`
- Format (check): `bun format:check`
- Test (unit): `bun test`
- Test (watch): `bun test:watch`
- Test (coverage/CI): `bun test:ci` or `bun coverage`
- E2E: `bun e2e` / `bun test:e2e` (UI: `bun test:e2e:ui`)
- DB: Generate: `bun db:generate`
- DB: Migrate: `bun db:migrate`
- DB: Push (dev): `bun db:push`
- DB: Studio (UI): `bun db:studio`
- Tokens: Build all: `bun run tokens:build` | Mobile only: `bun run tokens:mobile` | Watch: `bun run tokens:watch`

Cloudflare Workers deployment:
- Deploy (dev): `npm run deploy`
- Deploy (staging): `npm run deploy:staging`
- Deploy (production): `npm run deploy:production`
- Upload versions (dev/staging/prod): `npm run deploy:versions*`

Notes:
- Package manager pinned: `bun@1.2.19` (required)
- Node.js 20.19.4 pinned via Volta

## Architecture
- Stack: Next.js 15 App Router + React 19 + tRPC v11 + Drizzle ORM (D1/SQLite) + Tailwind CSS v4
- Monorepo: Single app; src root aliased as `~/`
- API: tRPC routers in `src/server/api/routers/`, root at `src/server/api/root.ts`, server plumbing in `src/server/api/trpc.ts`
- Database: Cloudflare D1 via Drizzle ORM (SQLite dialect)
  - Schema: `src/server/db/schema.ts` (tables prefixed `swole-tracker_*`)
  - App-level user isolation via `user_id` columns (WorkOS user id)
- Auth: WorkOS session with middleware at `src/middleware.ts` protects `/workout|/templates|/workouts`
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
- Environment management via Infisical: local `bun` scripts automatically inject secrets using `infisical run --`. No manual `.env` file needed for local dev if Infisical is configured.
- Cloudflare Workers builds use the Cloudflare dashboard/GitHub Secrets for environment variables and resource bindings.

Setup Requirements:
1) Install Infisical CLI: `npm install -g @infisical/cli` or `brew install infisical/get-cli/infisical`
2) Login: `infisical login`
3) Verify access to project: `infisical user`
4) All `bun` commands now automatically inject environment variables from Infisical

Required Environment Variables (managed via Infisical/Cloudflare as appropriate):
- WorkOS: `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`
- PostHog: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (optional)
- WHOOP: `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WHOOP_WEBHOOK_SECRET` (optional)
- Cloudflare: account and resource identifiers if building/deploying via Workers (see Cloudflare section)

Important Database Note (Cloudflare D1):
- D1 uses Cloudflare bindings (via `wrangler.toml`), not a `DATABASE_URL`. Bindings are injected at runtime.

## Database
- Runtime DB: Cloudflare D1 (via `drizzle-orm/d1`)
- Schema lives in `src/server/db/schema.ts`
- Studio: `bun db:studio`
- Local dev pushes: `bun db:push` (development only)
- Migrations: see Cloudflare section for D1 migration commands
- Always filter by `user_id = ctx.user.id` in queries
- Indexes are defined in schema for performance

## tRPC Guidelines
- Public procedures: `publicProcedure` (timing middleware included)
- Protected procedures: `protectedProcedure` (requires WorkOS user)
- Context provides: `{ db, user, headers, requestId }`
- Use Zod for input parsing; errors formatted by superjson + errorFormatter
- Logging: request timing logged via `logApiCall` in `~/lib/logger`

## Middleware & Routing
- WorkOS middleware protects `/workout(.*)`, `/templates(.*)`, `/workouts(.*)` via `src/middleware.ts`
- Middleware matches API and tRPC routes by default
- App router pages live under `src/app/.../page.tsx`

## Testing
- Unit tests: Vitest (`bun test`, `bun test:watch`)
- Coverage/CI: `bun test:ci` or `bun coverage`
- E2E tests: Playwright (`bun e2e` / `bun test:e2e`, UI with `bun test:e2e:ui`)
- Testing focus: `src/lib/` and `src/server/api/` directories, mocks with MSW as needed

## Design System (Summary)
- Tokens are JSON-first and build into platform-specific outputs.
- Scripts:
  - Build all tokens: `bun run tokens:build`
  - Mobile only: `bun run tokens:mobile`
  - Watch: `bun run tokens:watch`
- Generated files (web):
  - `src/styles/tokens/generated-base.css`
  - `src/styles/tokens/generated-light.css`
- Generated files (mobile):
  - `apps/mobile/tailwind.config.js`
  - `apps/mobile/lib/design-tokens.ts`
- Theme strategy: `data-theme` with `light`, `dark`, `system`; dark theme default
- Usage:
  - Prefer semantic classes (`bg-app`, `bg-surface`, `text-primary`, `btn-primary`, `card`)
  - For custom components, use CSS variables (e.g., `var(--color-text-primary)`, spacing/radius/shadows)
- See full details in `DESIGN_SYSTEM.md`

## Local Development Workflow
1) Install: `bun install`
2) Setup Infisical: `infisical login` and verify access
3) Dev server: `bun dev`
4) Lint/typecheck prior to commit: `bun check`
5) Format code: `bun format:write`
6) Run tests as appropriate (`bun test`, `bun e2e`)

## Production & Preview
- Local preview: `bun preview`

Cloudflare Workers (primary):
- Build: `npm run build:cloudflare`
- Deploy: `npm run deploy` (dev), `npm run deploy:staging`, `npm run deploy:production`
- Versions API: `npm run deploy:versions*`
- D1 & KV are bound via `wrangler.toml`. No `DATABASE_URL` is required for runtime.
- Full guide: see `CLOUDFLARE_CONFIG.md`

Vercel (optional/legacy):
- Build: `bun build`
- Output: `.next`
- Install: `bun install`
- Env vars: via Infisical integration or Vercel dashboard

## Cloudflare Workers Details (Essentials)
- Prereqs: Cloudflare account, wrangler CLI, Node 20.19.4, bun
- Authenticate: `wrangler login`
- Create resources (examples):
  - D1: `wrangler d1 create swole-tracker-staging|prod`
  - KV: `wrangler kv namespace create "RATE_LIMIT_KV" --env staging|production`
- Environment variables: set in Cloudflare dashboard or GitHub Secrets
- D1 migrations:
  - Generate: `bun run db:generate`
  - Apply staging: `wrangler d1 migrations apply swole-tracker-staging --env staging`
  - Apply production: `wrangler d1 migrations apply swole-tracker-prod --env production`
- Troubleshooting & more: see `CLOUDFLARE_CONFIG.md`

## Commit & PR Checklist
- [ ] `bun format:write` clean
- [ ] `bun check` passes (lint + typecheck)
- [ ] DB changes reviewed; local dev pushes/migrations run if schema changed
- [ ] No direct updates/deletes without `where` clauses
- [ ] Added/updated tRPC procedures include Zod validation
- [ ] Protected routes use `protectedProcedure` where required
- [ ] UI follows mobile-first and Tailwind class ordering conventions
- [ ] If Cloudflare deployment is affected, verify wrangler bindings and envs

## Troubleshooting
- Infisical: `infisical user` to verify login; check `.infisical.json`
- Auth (WorkOS): verify keys, cookie handling, and middleware redirects
- D1 connection: ensure wrangler bindings present; remember no `DATABASE_URL` in Workers
- KV/Rate limit: verify namespaces; see `~/src/lib/rate-limit.ts` and middleware
- Styling anomalies: Tailwind v4 + Prettier plugin alignment
- Environment variables not loading: ensure Infisical installed/logged in; Cloudflare vars set in dashboard/Secrets

## Resources
- Claude guidance: `CLAUDE.md`
- Cloudflare Workers: `CLOUDFLARE_CONFIG.md`
- Design System: `DESIGN_SYSTEM.md`

## Visual Development

### Design Principles
- Comprehensive design checklist in `DESIGN_PRINCIPLES.md`
- Brand style guide in `DESIGN_SYSTEM.md`
- When making visual (front-end, UI/UX) changes, always refer to these files for guidance

### Quick Visual Check
IMMEDIATELY after implementing any front-end change:
1. Identify what changed — review the modified components/pages
2. Navigate to affected pages — use the browser to visit each changed view
3. Verify design compliance — compare against `DESIGN_PRINCIPLES.md` and `DESIGN_SYSTEM.md`
4. Validate feature implementation — ensure the change fulfills the user's specific request
5. Check acceptance criteria — review provided context files or requirements
6. Capture evidence — take full page screenshot at desktop viewport (1440px) of each changed view
7. Check for errors — open browser devtools and console

This verification ensures changes meet design standards and user requirements.

### Comprehensive Design Review
Invoke a design review when:
- Completing significant UI/UX features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility and responsiveness testing
