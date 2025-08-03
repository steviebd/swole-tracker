# DESIGN.md - Swole Tracker

This document captures the system design, key decisions, tradeoffs, and how the parts of the application fit together.

## Overview

Swole Tracker is a mobile-first workout tracking app built on the T3 stack with a strong emphasis on type safety, offline-friendly UX, and clean separation between API, database, and UI. Authentication is done with Clerk. Data access is type-safe through Drizzle ORM, and API calls are typed end-to-end using tRPC v11.

Primary user journeys:
- Create workout templates, add exercises, and reorder them.
- Start workout sessions and record sets (weight, reps, units).
- View recent/history workouts and repeat previous sessions.
- Manage personal preferences (kg/lbs).
- Optionally connect Whoop to sync external workouts (last 25).

## Architecture

- Next.js 15 App Router
  - All pages in `src/app`, components under `src/app/_components`.
  - Providers in `src/providers`.
  - Tailwind v4 for styling, dark theme by default.
- tRPC v11
  - Routers in `src/server/api/routers`, root in `src/server/api/root.ts`.
  - Context and middleware in `src/server/api/trpc.ts`.
  - Public vs protected procedures to guard data.
- Drizzle ORM (PostgreSQL)
  - Schema in `src/server/db/schema.ts` with a prefixed table creator (`swole-tracker_*`).
  - Strong indexing strategy and explicit foreign keys.
  - App-level RLS via `user_id` and Clerk authentication.
- Clerk
  - Middleware protects `/workout(.*)`, `/templates(.*)`, `/workouts(.*)`.
  - Server-side `currentUser` used to populate tRPC context.
- State/Data layer
  - React Query (TanStack) with persistence for offline support.
  - Aggressive caching, optimistic updates, and background revalidation.
- Analytics
  - PostHog via `PostHogProvider` and helpers in `src/lib`.

## Data Model

Tables (see `src/server/db/schema.ts`):
- workout_template: user-defined templates.
- template_exercise: rows per exercise in a template; preserves order via `orderIndex`.
- workout_session: a concrete session linked to a template with `workoutDate`.
- session_exercise: performed sets with weight, reps, sets, unit, and ordering.
- user_preferences: one row per user for defaults (e.g., weight unit).
- user_integration: OAuth tokens for external providers (e.g., Whoop).
- whoop_workout: external workouts synced from Whoop (deduped by `whoopWorkoutId`).
- rate_limit: per-user per-endpoint rate window management.
- master_exercise: normalized canonical exercises for cross-template linking.
- exercise_link: maps template exercises to master exercises.
- daily_joke: demo/feature table for jokes.
- webhook_event: storage for webhook debugging/auditing.

Key constraints and indexes:
- Unique `master_exercise` per `(user_id, normalizedName)`.
- Unique `exercise_link` per `templateExerciseId`.
- Extensive indexing for `user_id`, foreign keys, and time fields for efficient queries.

User isolation:
- Every domain entity stores `user_id` (Clerk ID).
- All queries must filter by `user_id = ctx.user.id`.
- RLS enforced at application layer; no shared reads across users.

## API Design (tRPC)

- Public procedures: `publicProcedure` includes timing middleware (dev delay to surface waterfalls).
- Protected procedures: `protectedProcedure` ensures presence of `ctx.user`.
- Context: `{ db, user, headers }` with logger integration.
- Validation: Zod schemas on inputs and outputs.
- Serialization: superjson for richer types.

Routers include:
- templates: CRUD for templates and exercises.
- workouts: create sessions, write sets, history reads.
- preferences: read/write user preferences.
- exercises: universal drag/reorder and linking actions (master exercise mapping).
- whoop: OAuth, sync orchestration, deduplication, and limits.
- webhooks: ingestion endpoints and debug views.
- jokes: daily jokes example.

## Security

- Authentication: Clerk with middleware gating sensitive routes and APIs.
- Authorization: performed in procedures using `ctx.user.id` checks.
- Database write safety: ESLint rules enforce `.where` on update/delete calls.
- Webhooks: payload persisted for audit with status, headers, and timing.
- Rate limiting: configured via `rate_limit` table; configurable per hour via env.

Secrets and env:
- `.env` for local development; Vercel env for production.
- Required keys are listed in README and AGENT.md.

## Offline & Performance

- React Query persistence layer enables read-caching while offline.
- Optimistic updates for set logging and UI interactions.
- Background refetch on regain focus/online.
- SSE channel for workout updates exists under `src/app/api/sse` to broadcast live events.
- Visible connection and sync indicators in the layout for UX transparency.

## Whoop Integration

- OAuth 2.0 using `oauth4webapi`.
- Sync endpoint respects `WHOOP_SYNC_RATE_LIMIT_PER_HOUR` and Whoop API’s last 25 constraints.
- Duplicate detection via unique `whoopWorkoutId` and merge strategy to avoid double inserts.
- Debug page at `/debug/webhooks` to inspect inbound events and processing.

## Frontend Design

- Mobile-first layout with dark theme; Geist font.
- Layout includes:
  - ConnectionStatus and SyncIndicator at the root for global status feedback.
  - Footer links to Privacy and Terms.
  - PageTracker for analytics/navigation events.
- Components emphasize:
  - Small, composable building blocks.
  - Explicit prop types.
  - Minimal client state, offload to React Query where possible.
- Accessibility:
  - Use semantic HTML and accessible focus states.
  - Ensure color contrast on dark theme.
  - Keyboard navigable where practical.

## Error Handling & Observability

- tRPC errorFormatter includes Zod error flattening for typed errors on the client.
- `~/lib/logger.ts` centralizes logging; `logApiCall` captures latency and user attribution.
- Webhook events record failures and processing times for incident analysis.
- Prefer typed errors and user-friendly UI toasts over silent failures.

## Styling & Theming

- Tailwind v4 with Prettier plugin to maintain consistent class ordering.
- Design tokens:
  - `--font-geist-sans` variable.
  - Dark theme root class on `<html>` (`className="dark"`).
- Component patterns:
  - Container widths with `container mx-auto px-4`.
  - Mobile-first; scale up with responsive utilities.

## Key Decisions & Tradeoffs

- App-level RLS with Clerk vs DB-native RLS
  - Decision: app-level using user_id filters.
  - Rationale: simpler local dev and migration, consistent with Drizzle best practices here.
  - Tradeoff: must maintain discipline in all queries.
- tRPC v11 vs REST
  - Decision: tRPC for end-to-end typing and DX.
  - Tradeoff: couples client/server versions and runtime; good for monorepo/app monolith.
- Drizzle ORM vs Prisma
  - Decision: Drizzle for lightweight, explicit SQL-first approach and great TS types.
  - Tradeoff: fewer high-level abstractions; more control over SQL.
- Tailwind v4
  - Decision: utility-first styling and predictable class composition.
  - Tradeoff: class-heavy JSX; mitigated by Prettier plugin and component extraction.
- Offline-first using React Query persistence
  - Decision: better UX on mobile and unreliable networks.
  - Tradeoff: complexity around cache invalidation and sync indicators.

## Scaling Considerations

- DB performance: cover queries with indexes, add composite indexes as usage patterns evolve.
- API throughput: Next.js edge-eligible routes where possible; otherwise serverless autoscaling via Vercel.
- Rate limiting: expand `rate_limit` strategy (sliding window, leaky bucket) as needed.
- Background jobs: consider moving sync/webhook processing to durable queues if volume increases.
- Observability: expand logger to structured logs, add tracing if necessary.

## Development Workflow

- Use AGENT.md for commands and contributor checklist.
- Before committing:
  - `pnpm format:write`
  - `pnpm check`
- Database schema changes:
  - Define in `src/server/db/schema.ts`
  - `pnpm db:push` in dev; review Drizzle SQL output in `drizzle/`
- Add new tRPC routers:
  - Create Zod schemas for inputs/outputs.
  - Decide `publicProcedure` vs `protectedProcedure`.
  - Register in `src/server/api/root.ts`.

## Future Enhancements

- Automated background sync for Whoop (cron or scheduled function).
- Additional integrations (Strava, Garmin) using `user_integration` model.
- Test harness:
  - Establish Vitest/Playwright stack.
  - Add db-test utilities and API contract tests.
- Improved exercise ontology and suggestions across templates using `master_exercise`.
- Real RLS in Postgres if moving to a shared multi-tenant DB with stricter controls.
