# AGENTS.md - Swole Tracker Configuration

This document defines the project-specific workflow, commands, architecture, and conventions for maintainers and automation.

## Commands

- Dev: `bun dev` (Next.js 15 with turbopack)
- Build: `bun build`
- Lint/Check: `bun check` (lints + typecheck)

Notes:

- Package manager: bun (required)
- Node.js recommended: Latest LTS

## Architecture

- Stack: Next.js 15 App Router + Convex + WorkOS + Tailwind CSS v4
- Monorepo: Single app; src root aliased as `~/`
- API: Convex functions in `convex/`, generated types in `convex/_generated/`
- Database: Convex (serverless database with real-time)
  - Schema: `convex/schema.ts`
  - Enforced app-level user isolation via `userId` on tables (WorkOS user id)
- Auth: WorkOS + Convex auth (`convex/auth.config.ts`, middleware `middleware.ts` protects authenticated routes)
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

**Environment Variables:**

**Required:**

- `NEXT_PUBLIC_CONVEX_URL` - Your Convex deployment URL
- Convex environment variables are managed through the Convex dashboard

**Optional:**

- WorkOS credentials (when auth is implemented)
- Whoop integration credentials: `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`

## Database

- Use Convex dashboard and CLI:
  - Local dev: `pnpm db:push` (dev), `pnpm db:studio` (UI)
  - Schema changes live in `convex/schema.ts`
  - Deploy: `pnpm db:generate`, `pnpm db:migrate`
- Row-level security handled at application level via WorkOS user id.
- Always filter by `userId = ctx.user.id` in queries.
- Use indexes defined in schema to keep queries performant.
- Real-time subscriptions available via Convex

## Convex Guidelines

- Functions are defined in `convex/*.ts` files
- Queries: `query()` for read operations
- Mutations: `mutation()` for write operations
- Actions: `action()` for external API calls
- Authentication: `ctx.auth.getUserIdentity()` for current user
- Context provides: `{ db, auth, storage }`
- Use Zod for input validation in functions
- TypeScript types auto-generated in `convex/_generated/`

## Middleware & Routing

- Convex auth protects authenticated functions via `ctx.auth`
- Next.js middleware in `middleware.ts` protects routes
- App router pages live under `src/app/.../page.tsx`

## Local Development Workflow

1. Install: `pnpm install`
2. Setup Convex: Initialize project and get deployment URL
3. Initialize DB: `pnpm db:push` (dev mode)
4. Dev server: `pnpm dev`
5. Lint/typecheck prior to commit: `pnpm check`
6. Format code: `pnpm format:write`

## Commit & PR Checklist

- [ ] `pnpm format:write` clean
- [ ] `pnpm check` passes (lint + typecheck)
- [ ] DB schema changes reviewed; update `convex/schema.ts`
- [ ] Convex functions reviewed for proper auth and validation
- [ ] Authentication properly handled in protected functions
- [ ] All queries/mutations use proper userId filtering
- [ ] UI follows mobile-first and Tailwind class ordering conventions

## Production & Preview

- Preview locally: `pnpm build && pnpm start`
- Vercel/Netlify deployment:
  - Build: `pnpm build`
  - Install: `pnpm install` (for installing dependencies)
  - Env vars: Set `NEXT_PUBLIC_CONVEX_URL` in deployment platform
- Convex deployment:
  - Schema changes auto-deploy from `convex/schema.ts`
  - Environment variables managed through Convex dashboard
  - Functions deploy automatically when pushed to main

## Troubleshooting

- **Convex authentication issues:** Verify `NEXT_PUBLIC_CONVEX_URL` is set correctly and deployment is active
- **WorkOS auth issues:** Ensure auth provider is properly configured if implemented
- **Database connection:** Check Convex dashboard for deployment status and schema issues
- **Convex type errors:** Ensure types are regenerated after schema changes with `pnpm db:generate`
- **Function deployment:** Convex functions auto-deploy; check deployment status in dashboard
- **Rate limiting:** Check Convex dashboard for rate limit status if applicable
- **Styling anomalies:** Tailwind v4 + Prettier plugin alignment
- **Environment variables not loading:** Verify `.env.local` has correct `NEXT_PUBLIC_CONVEX_URL`

## Test Strategy

- No formal test framework configured yet. Unit/integration tests TBD.
- Temporary guidance:
  - Prefer extracting pure helpers into `~/lib/*` for easier testing later
  - Keep Convex functions thin and test business logic separately
  - Use Convex's built-in testing utilities when implementing tests
