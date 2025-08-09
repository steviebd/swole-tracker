# Swole Tracker

Mobile‑first workout tracking built on the T3 stack: Next.js App Router, tRPC v11, Drizzle ORM, Clerk auth, Tailwind CSS v4, Supabase/Postgres, and WHOOP integration. Includes offline UX, rate limiting, webhook verification (HMAC), SSE, and analytics.

Repository: https://github.com/steviebd/swole-tracker

## Table of Contents
- Overview
- Tech Stack
- Features
- Architecture
- Getting Started
- Environment Variables
- Database
- Development Commands
- Whoop Integration
- Webhooks & Debugging
- Analytics (PostHog)
- Security Notes
- Deployment
- Troubleshooting
- Roadmap
- Acknowledgements

## Overview
Swole Tracker helps you create templates, run workout sessions, and track progress over time. Authenticated areas include /workout, /workouts, and /templates. The app is optimized for mobile and supports offline-first usage with synchronization, save queue, and visual indicators.

Key flows:
- Template → Start workout → Log sets/reps/weight → Save → History
- Optional WHOOP integration for importing workouts
- Preferences for unit system (kg/lbs)

## Tech Stack
- Next.js 15 (App Router), React 19, TypeScript (strict)
- tRPC v11 with TanStack Query and superjson
- Drizzle ORM with PostgreSQL (Supabase recommended)
- Clerk authentication and route protection via middleware
- Tailwind CSS v4
- Supabase JS
- PostHog analytics (client + server helpers)
- Vercel AI Gateway (optional) for AI jokes demo
- Server-Sent Events (SSE) for workout updates
- Custom rate limiting backed by DB

## Features
- Authenticated routes: /workout, /workouts, /templates
- Workout templates with exercises
- Workout sessions with:
  - Set logging and unit toggling
  - Previous value suggestions
  - Drag reorder and swipe to bottom
  - Read-only views for saved sessions
- History and progression helpers
- Preferences (units: kg/lbs)
- Offline-first UX:
  - Connection and sync indicators
  - React Query persistence/local storage
  - Offline save queue with retries (src/lib/offline-queue.ts)
- WHOOP integration:
  - OAuth connect/disconnect
  - Sync last 25 workouts
  - GPGDuplicate detection
  - Rate-limited sync endpoint
  - Webhook handling and debug page
- Analytics via PostHog
- Jokes demo via Vercel AI Gateway (configurable)

## Architecture
- App Router pages: src/app/
  - Shared components: src/app/_components/
  - Providers: src/providers/
- API:
  - tRPC routers: src/server/api/routers/
  - Root: src/server/api/root.ts
  - tRPC plumbing/middleware: src/server/api/trpc.ts
- Database:
  - Drizzle schema: src/server/db/schema.ts
  - Supabase client helpers: src/server/db/supabase.ts; browser/server clients under src/lib/
- Auth:
  - Clerk middleware: src/middleware.ts (protects /workout(.*), /templates(.*), /workouts(.*))
- Utilities:
  - Rate limiting: src/lib/rate-limit.ts, src/lib/rate-limit-middleware.ts
  - Webhook verification: src/lib/whoop-webhook.ts
  - Logging: src/lib/logger.ts (replace console.* in source)
  - SSE broadcast: src/lib/sse-broadcast.ts
  - Offline storage/queue: src/lib/offline-storage.ts, src/lib/offline-queue.ts
- TRPC client utilities:
  - src/trpc/react.tsx, src/trpc/server.ts, src/trpc/HydrateClient.tsx, src/trpc/query-client.ts

## Getting Started

Prerequisites:
- Node.js 18+
- pnpm (pinned in package.json)
- PostgreSQL (Supabase recommended)

1) Install dependencies
```bash
pnpm install
```

2) Configure environment
Copy .env.example to .env and fill values (see next section). See src/env.js for canonical schema validation.

3) Initialize database (dev)
```bash
pnpm db:push
```

4) Start dev server
```bash
pnpm dev
```

5) Lint/typecheck and format before commit
```bash
pnpm check
pnpm format:write
```

## Environment Variables
Create .env with the following (see src/env.js for the canonical schema):

Database
- DATABASE_URL=postgres connection string

Clerk
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
- CLERK_SECRET_KEY=sk_...

Supabase
- NEXT_PUBLIC_SUPABASE_URL=https://...
- NEXT_PUBLIC_SUPABASE_KEY=public-anon-key
- NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=... (optional, local dev only)

PostHog
- NEXT_PUBLIC_POSTHOG_KEY=phc_...
- NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com (or your instance)

AI Gateway (optional, jokes demo)
- VERCEL_AI_GATEWAY_API_KEY=...
- AI_GATEWAY_MODEL=xai/grok-3-mini (default)
- AI_GATEWAY_PROMPT="Tell me a short, funny programming or tech joke..."
- AI_GATEWAY_JOKE_MEMORY_NUMBER=3

WHOOP
- WHOOP_CLIENT_ID=...
- WHOOP_CLIENT_SECRET=...
- WHOOP_SYNC_RATE_LIMIT_PER_HOUR=10

Webhooks
- WHOOP_WEBHOOK_SECRET=<whoop app secret> (used for signature verification)

Rate Limiting
- RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR=100
- RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR=200
- RATE_LIMIT_API_CALLS_PER_MINUTE=60
- RATE_LIMIT_ENABLED=true

Optional
- NODE_ENV=development|test|production

Refer to .env.example and src/env.js for the latest list and defaults.

## Database
- ORM: Drizzle
- Primary schema: src/server/db/schema.ts
- Local workflow:
  - Edit schema.ts
  - Push schema (dev): pnpm db:push
  - Inspect: pnpm db:studio
- Bootstrap SQL (optional): drizzle/setup_database.sql

Tables include (not exhaustive; see schema.ts):
- User integrations (OAuth tokens)
- WHOOP workouts (externalWorkoutsWhoop)
- Rate limit records
- Webhook events
- Templates, exercises, sessions, preferences, jokes

Row-level security
- Enforced by filtering queries with user_id = ctx.user.id (Clerk).
- Always include where clauses in updates/deletes (lint rule enforced).

## Development Commands
Common:
- pnpm dev — Next dev (Turbopack)
- pnpm build — Next build
- pnpm preview — Build and start locally
- pnpm start — Start built app
- pnpm check — Lint + typecheck
- pnpm lint, pnpm lint:fix
- pnpm typecheck
- pnpm format:write, pnpm format:check

Database:
- pnpm db:generate — Drizzle Kit generate
- pnpm db:migrate — Drizzle Kit migrate
- pnpm db:push — Push schema (dev)
- pnpm db:studio — Drizzle Studio UI

## WHOOP Integration
Development setup
1) Create a WHOOP developer app: https://developer.whoop.com/
2) Add redirect URIs:
   - http://localhost:3000/api/auth/whoop/callback (dev)
   - https://yourdomain.com/api/auth/whoop/callback (prod)
3) Set WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET in .env
4) In the app, go to /connect-whoop to start OAuth
5) After connecting, use the "Sync Workouts" UI (latest 25 workouts)

Rate limiting
- WHOOP_SYNC_RATE_LIMIT_PER_HOUR controls per-user sync quota (default 10)
- Backed by database (src/lib/rate-limit.ts and src/lib/rate-limit-middleware.ts)
- 429 responses and retry hints are returned as appropriate

## Webhooks & Debugging
Webhook verification
- HMAC-SHA256 signature verification with timestamp window
- src/lib/whoop-webhook.ts (uses WHOOP_WEBHOOK_SECRET)

Endpoints
- Receiver: /api/webhooks/whoop
- Test: /api/webhooks/whoop/test

Local testing
- See WEBHOOK_TESTING.md
- Quickstart:
  - Set WHOOP_WEBHOOK_SECRET in .env
  - Use the test route or ./test-webhook.sh
  - For external delivery: expose localhost via ngrok and configure WHOOP app webhook URL (v2 model)

UI
- Debug page at /debug/webhooks

## Analytics (PostHog)
- Client SDK provider: src/providers/PostHogProvider.tsx
- Server helpers: src/lib/posthog.ts
- Configure NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST

## Security Notes
- Auth via Clerk; middleware protects sensitive routes (src/middleware.ts)
- tRPC:
  - publicProcedure with timing middleware
  - protectedProcedure requires Clerk session
- Input validation via Zod throughout routers
- Drizzle ORM with enforced where clauses (lint)
- Webhook signatures verified and timestamp-checked
- Environment variables validated via @t3-oss/env-nextjs
- Rate limiting backed by database

## Deployment
Vercel (recommended)
- Connect repository
- Set environment variables
- Build: pnpm build
- Output: .next
- Install: pnpm install

Database
```bash
# after deploy
export DATABASE_URL="your-prod-connection-string"
pnpm db:push
```

Domains
- Configure Clerk redirect URLs
- Optionally add a custom domain on Vercel

## Troubleshooting
Auth (Clerk)
- Verify keys and allowed redirect URLs
- Ensure middleware matcher protects expected routes

Database
- Confirm DATABASE_URL and SSL settings (Supabase pooler)
- pnpm db:studio to inspect data

tRPC / Zod
- Ensure inputs match Zod schemas
- Check superjson serialization

Rate limiting
- Verify RATE_LIMIT_* and WHOOP_SYNC_RATE_LIMIT_PER_HOUR
- Inspect DB records for per-user/endpoint usage

Offline / Network
- Dev logs indicate online/offline and queue size
- AbortSignal timeouts help detect offline

Webhooks
- Check verification logs
- Confirm WHOOP_WEBHOOK_SECRET and ngrok URL config
- Use /api/webhooks/whoop/test and /debug/webhooks

## Roadmap
- Extend rate limiting coverage to more mutation endpoints
- Add automated tests (unit/integration)
- Enhance security monitoring and request size limits
- Support additional integrations (Strava, Garmin)
- Periodic background sync for integrations

## Acknowledgements
- T3 Stack inspiration
- WHOOP Developer Platform
- Supabase, Drizzle ORM, Clerk, PostHog

## License
MIT — see LICENSE
