# Migration Playbook: Vercel + Supabase ➜ Cloudflare Workers + WorkOS

This checklist replaces the previous migration outline. Tick items with `[x]` as they are completed.

**Guiding Principles**

- **Fresh start:** Provision new Cloudflare D1 databases per environment — no user data migration.
- **Stateless sessions:** Authenticate with WorkOS, mint our own signed HTTP-only cookies, and enforce tenant isolation through application code.
- **SQLite-first design:** Align schema, queries, and tooling with D1/SQLite limitations.
- **Confidence by phase:** Each phase includes a definition of done (DoD) so contributors know when the handoff is complete.

---

## Environment Matrix & Variables

- [x] **Bootstrap `.env.example`**
  - [x] Create environment-specific sections with comments, e.g.:

    ```
    # --- dev ---
    NEXT_PUBLIC_SITE_URL=http://localhost:3000
    WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback
    ...

    # --- staging ---
    NEXT_PUBLIC_SITE_URL=https://preview.stevenduong.com
    WORKOS_REDIRECT_URI=https://preview.stevenduong.com/api/auth/callback
    ...

    # --- production ---
    NEXT_PUBLIC_SITE_URL=https://workout.stevenduong.com
    WORKOS_REDIRECT_URI=https://workout.stevenduong.com/api/auth/callback
    ...
    ```

  - [x] For now, only `NEXT_PUBLIC_SITE_URL` and `WORKOS_REDIRECT_URI` differ per environment; add more overrides in these blocks if future services require environment-specific values.
  - [x] Ensure sensitive values are shown as placeholders (e.g., `WORKOS_API_KEY=___`) and never committed.
  - [x] Use Infisical folders/labels to mirror the three environments (e.g., `infisical/env/dev`, `infisical/env/staging`, `infisical/env/prod`).

| Environment | Domain / Base URL                 | Cloudflare env | D1 database name        | Infisical scope         | `.env.example` baseline                                | Notes                   |
| ----------- | --------------------------------- | -------------- | ----------------------- | ----------------------- | ------------------------------------------------------ | ----------------------- |
| dev         | `http://localhost:3000`           | default        | `swole-tracker-dev`     | `infisical/env/dev`     | `NEXT_PUBLIC_SITE_URL=http://localhost:3000`           | Local Wrangler preview  |
| staging     | `https://preview.stevenduong.com` | `staging`      | `swole-tracker-staging` | `infisical/env/staging` | `NEXT_PUBLIC_SITE_URL=https://preview.stevenduong.com` | Deployed preview Worker |
| production  | `https://workout.stevenduong.com` | `production`   | `swole-tracker-prod`    | `infisical/env/prod`    | `NEXT_PUBLIC_SITE_URL=https://workout.stevenduong.com` | Customer-facing Worker  |

**Key environment variables** (capture in `.env.example` and Infisical):

- `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_REDIRECT_URI`
- `WORKER_SESSION_SECRET`
- `NEXT_PUBLIC_SITE_URL` (different per environment)
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- Whoop credentials (`WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WHOOP_REDIRECT_URI`, `WHOOP_WEBHOOK_SECRET`)
- Vercel AI Gateway keys (`VERCEL_AI_GATEWAY_API_KEY`, `AI_GATEWAY_MODEL`, etc.)
- Rate limiting knobs (`RATE_LIMIT_*`)
- Cloudflare-specific bindings (e.g., `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`) for CI/CD

---

## Phase 0 – Prerequisites & Tooling

- [x] **Install core tooling**
  - [x] wrangler already installed (4.30.0)
  - [x] `bun add -D @opennextjs/cloudflare @cloudflare/workers-types`
  - [x] `node@20.19.4` / `bun@1.2.21` already set via Volta.
- [x] **Authenticate with Cloudflare**
  - [x] Set up CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in Infisical dev environment (OAuth token works)
  - [x] `wrangler login` (developer accounts)
  - [x] Capture account ID: a117baf912d1ea7af56ffee4a64d5469
- [x] **Create D1 databases**
  - [x] `wrangler d1 create swole-tracker-dev` (ID: df72a743-bd0c-4015-806f-b12e13f14eb3)
  - [x] `wrangler d1 create swole-tracker-staging` (ID: 8ca59bbc-e2e9-4684-a769-ed446de632c7)
  - [x] `wrangler d1 create swole-tracker-prod` (ID: b3cda6a6-3f2c-4b3d-97cd-0502e8552ded)
- [x] **Scaffold `wrangler.toml`**
  - [x] Include account ID placeholder, `name`, `compatibility_date`.
  - [x] Bind `DB` (D1), declare environment sections (`[env.dev]`, `[env.staging]`, `[env.production]`).
  - [x] Add placeholders for secrets loaded via Wrangler/CI (ensure no secret values committed).

**DoD:** Local environment can run `wrangler pages dev` (or `wrangler dev`) and recognizes the D1 binding; project has a committed `wrangler.toml` template.

---

## Phase 1 – Next.js on Workers Foundation

- [x] **Configure Next.js adapter**
  - [x] Add `opennext.config.ts` created.
  - [x] Update `next.config.js` for edge runtime compatibility.
- [x] **Adjust scripts**
  - [x] Replace `bun dev`/`bun build` scripts to call `opennext build` and `wrangler pages dev`.
- [x] **Runtime verification**
  - [x] Confirm dynamic routes, middleware, and API handlers execute in Workers locally.
- [x] **Wrangler dev with remote D1 integration**
  - [x] Add `remote = true` to dev environment D1 binding in `wrangler.toml` for production mirroring.
  - [x] Create `scripts/update-wrangler-config.sh` to dynamically pull `D1_DB_ID` from Infisical and update wrangler.toml.
  - [x] Update `package.json` dev script: `"dev": "bun run update-wrangler-config && infisical run -- wrangler dev --env dev"`.
  - [x] Add fallback `"dev:next": "infisical run -- next dev"` for pure Next.js development when needed.
  - [x] Configure OpenNext for Cloudflare with nodejs runtime and compatibility flags.
  - [x] Successfully tested `bun dev` running on port 8787 with remote D1 database access.

**DoD:** Running `bun dev` uses the Workers runtime via OpenNext; local requests resolve without any issues; README lists new dev commands. Development environment mirrors production with remote D1 database access.

---

## Phase 2 – Authentication: WorkOS + Signed Cookies

- [x] **Environment updates**
  - [x] Add WorkOS env vars to `src/env.js`, `.env.example`, and Infisical (`WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, callback origins, `WORKER_SESSION_SECRET`).
- [x] **WorkOS client & session utilities**
  - [x] `bun add @workos-inc/node`
  - [x] Create `src/lib/workos.ts` (singleton WorkOS client factory).
  - [x] Add `src/lib/session-cookie.ts` (sign/verify stateless cookies with `WORKER_SESSION_SECRET`, set `HttpOnly`/`Secure` attributes).
- [x] **Middleware & providers**
  - [x] Replace old logic in `src/middleware.ts` with WorkOS session validation (verify cookie, refresh via WorkOS API if expiring, block unauthorized routes).
  - [x] Refactor `src/providers/AuthProvider.tsx` to consume WorkOS session endpoints (use fetcher to `/api/auth/session`).
  - [x] Implement `/api/auth/[login|callback|logout]` routes using WorkOS flows for Google SSO + email/password.
- [x] **Server context & API routes**
  - [x] Update `src/server/api/trpc.ts` to read user info from the signed cookie helper.
- [x] **Dependency cleanup**
  - [x] All old auth packages removed.

**DoD:** Logging in/out works locally for Google SSO and email/password; protected routes read `ctx.user.id` from the cookie; no old packages or imports remain.

---

## Phase 3 – Database: Postgres ➜ D1/SQLite

- [x] **Drizzle configuration**
  - [x] Update `drizzle.config.ts` with `dialect: "sqlite"`, `driver: "d1"`, and Worker bindings.
- [x] **Connection layer**
  - [x] Replace `src/server/db/index.ts` with D1 binding usage (`export const db = drizzle(env.DB)`), remove Postgres pooling code.
- [x] **Schema rewrite**
  - [x] Convert tables to `sqliteTable`; map data types (`timestamp` ➜ `integer` milliseconds or ISO text, `numeric` ➜ `real`, `json` ➜ `text`).
  - [x] Trim unsupported indexes (e.g., partials, descending indexes); document alternatives in code comments.
  - [x] Introduce a `users` table if WorkOS requires persisted metadata (optional but decide here). (Decision: Not needed - WorkOS handles user management)
- [x] **Query & security sweep**
  - [x] Audit all DB calls (`src/server/**`, `src/lib/**`, tRPC routers) to ensure every user-facing query scopes by `user_id` from WorkOS.
  - [x] Update offline persistence helpers to match new schema shapes. (No changes needed - localStorage caching works with new schema)
- [x] **Migrations & seeding**
  - [x] Generate initial migration via Drizzle (`bun drizzle-kit generate` or configured command). (No changes detected - schema already in sync)
  - [x] Apply locally with `wrangler d1 migrations apply swole-tracker-dev --local`.
  - [x] Add optional seed script (`bun run seed:d1`) for sample data. (Skipped - not required for DoD)

**DoD:** Drizzle builds succeed against D1 locally, all tests compile, and user-specific queries enforce the signed cookie `userId`.

---

## Phase 4 – Feature Adjustments & Testing

- [x] **Real-time simplification**
  - [x] Remove `/api/sse/workout-updates`; replace consuming hooks with polling or client-side cache invalidation.
- [x] **Offline & analytics**
  - [x] Review `src/lib/offline-storage.ts`, `src/lib/cache-analytics.ts`, and PostHog integrations for old assumptions.
- [x] **Testing**
  - [x] Update Vitest mocks for WorkOS session endpoints.
  - [x] Add unit tests for `session-cookie` helpers and protected route middleware.
  - [x] Ensure `bun check`, `bun test`, and adapter-specific smoke tests pass.

**DoD:** App features run locally without SSE; automated tests cover the new auth/session flow.

---

## Phase 5 – Deployment & CI/CD

- [x] **Wrangler deploy workflow**
  - [x] Document `wrangler deploy --env production` command and required bindings.
  - [x] Create `scripts/generate-wrangler-config.ts` (or shell script) that:
    - [x] Reads `wrangler.template.toml` from repo.
    - [x] Injects env-specific values (account ID, D1 IDs, binding names, domains) from environment variables.
    - [x] Writes a temporary `wrangler.toml` to the workspace (`$RUNNER_TEMP` for CI) without committing.
  - [x] Configure Worker custom domains/routes in Cloudflare:
    - [x] Map `preview.stevenduong.com` to the staging Worker environment.
    - [x] Map `workout.stevenduong.com` to the production Worker environment.
    - [x] Ensure DNS records in the Cloudflare zone point the subdomains to the Worker (proxied CNAME or route configuration) before go-live.
- [x] **GitHub Actions pipeline (Infisical-driven)**
  - [x] Add workflow triggered on `main` (and optionally tags) that:
    - [x] Uses Infisical GitHub Action to export secrets into environment variables (Machine Identity credentials stored as GitHub secrets).
    - [x] Runs the Wrangler config generator to materialize `wrangler.toml` for the job.
    - [x] Installs Bun + dependencies, runs `bun check`, `bun test`, `opennext build`.
    - [x] Executes `wrangler deploy --env production` using Cloudflare API token (stored as GitHub secret).
    - [x] Cleans up the generated `wrangler.toml` at job end.
  - [x] Add job matrix or manual dispatch for `dev`, `staging`, `production` to map:
    - [x] `NEXT_PUBLIC_SITE_URL` → `http://localhost:3000`, `https://preview.stevenduong.com`, `https://workout.stevenduong.com` respectively.
    - [x] D1 binding names (`swole-tracker-dev`, `swole-tracker-staging`, `swole-tracker-prod`).
    - [x] Infisical environments/workspace slug for secret export (dev/staging/prod).
    - [x] Pass the target Infisical environment to the action/CLI (e.g., `INFISICAL_ENVIRONMENT=dev|staging|prod` or via CLI flags) so the workflow fetches the correct secrets.
    - [x] Store the Machine Identity `INFISICAL_CLIENT_ID` / `INFISICAL_CLIENT_SECRET` as GitHub secrets; reuse them across matrix jobs while only varying `INFISICAL_ENVIRONMENT`.
- [x] **Production verification**
  - [x] Deploy to staging/preview Worker, run smoke tests (auth flow, D1 writes, offline mode).
  - [x] Promote to production once verification succeeds.

**DoD:** GitHub Actions pipeline deploys Workers using Infisical-provided secrets and the transient Wrangler config; documentation describes the workflow end-to-end.

---

## Phase 6 – Cleanup & Documentation

- [x] **Remove legacy assets**
  - [x] Delete `vercel.json` and unused scripts.
  - [x] Purge old references across code comments and logs.
- [x] **Docs & templates**
  - [x] Update `.env.example` with final WorkOS/Cloudflare variables.
  - [x] Refresh `README.md` (local setup, deployment instructions, troubleshooting).
  - [x] Refresh `AGENTS.md` (architecture, auth, DB, tooling updates).
- [x] **Service decommissioning**
  - [x] Shut down old project and Vercel deployment after production Worker is stable.

**DoD:** Repository, documentation, and infrastructure contain no old remnants; knowledge base reflects the Worker stack.

---

## Follow-ups & Open Questions

- **Session storage fallback:** Confirm whether stateless cookies cover all use cases (e.g., forced logout by deleting WorkOS session). If server-side blacklisting is required, add a lightweight D1/KV revocation list.
