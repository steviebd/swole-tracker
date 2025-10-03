# Migration Plan: Vercel + Supabase to Cloudflare + WorkOS

This document outlines the step-by-step process for migrating the Swole Tracker application from its current stack (Vercel, Supabase) to a new stack (Cloudflare Pages, Cloudflare D1, WorkOS). Mark each item as complete by placing an `x` in the brackets (`[x]`)

**Guiding Principles:**
- **Start Fresh:** We will start with a fresh, empty database on Cloudflare D1. No data migration is required.
- **Application-Layer Security:** All data access policies currently enforced by Supabase's Row-Level Security (RLS) will be re-implemented in the application layer.

---

## Phase 1: Project Setup & Tooling

- [ ] **Install Wrangler CLI:** Install the command-line tool for Cloudflare's developer platform.
  ```bash
  bun install -g wrangler
  ```

- [ ] **Create `wrangler.toml`:** Create and configure the `wrangler.toml` file in the project root for Cloudflare Pages and D1 bindings. You will need to create the D1 databases in the Cloudflare dashboard to get the necessary `database_id` values.

- [ ] **Update `package.json` Scripts:** Modify the `dev` and `build` scripts to use Wrangler for local development and building.

---

## Phase 2: Authentication (Supabase Auth -> WorkOS)

- [ ] **Set up WorkOS Project:**
  - [ ] Create a new project in the WorkOS dashboard.
  - [ ] Configure "Email and Password" and "Google OAuth" authentication methods.
  - [ ] Note the **Client ID** and **API Key** for the next step.

- [ ] **Configure Environment & Secrets:**
  - [ ] Add WorkOS credentials (`WORKOS_API_KEY`, `WORKOS_CLIENT_ID`) to Cloudflare secrets using the dashboard or `wrangler secret put`.
  - [ ] Create a new `.env.example` file that reflects the new variable requirements for WorkOS, Cloudflare, and other services.

- [ ] **Refactor Authentication Code:**
  - [ ] Install the WorkOS Node.js SDK: `bun add @workos-inc/node`.
  - [ ] Remove unused Supabase packages: `bun remove @supabase/ssr @supabase/auth-helpers-nextjs`.
  - [ ] Create a new library file (`src/lib/workos.ts`) to initialize and export the WorkOS client.
  - [ ] Refactor `src/providers/AuthProvider.tsx` to use a new hook that manages the WorkOS user session.
  - [ ] Rebuild the sign-in UI at `src/app/sign-in/page.tsx` to use the WorkOS SDK for login flows.
  - [ ] Update `src/middleware.ts` to protect routes by validating the WorkOS session instead of the Supabase one.

---

## Phase 3: Database (Postgres -> Cloudflare D1)

- [ ] **Update Drizzle Configuration:**
  - [ ] Install the D1 driver for Drizzle: `bun add @drizzle-team/d1`.
  - [ ] Modify `drizzle.config.ts` to set the `dialect` to `sqlite` and the `driver` to `d1`.

- [ ] **Review and Refactor DB Schema:**
  - [ ] Audit the schema in `src/server/db/schema.ts`.
  - [ ] Convert any Postgres-specific data types to their SQLite-compatible equivalents.

- [ ] **Implement Application-Layer Security (Replaces RLS):**
  - [ ] **CRITICAL:** Audit every database query in the application.
  - [ ] For every query that accesses user-specific data, add a `where` clause to filter results by the `userId` obtained from the authenticated WorkOS session.

- [ ] **Generate and Apply New Migrations:**
  - [ ] After refactoring the schema, generate the initial D1 migration: `bun run drizzle-kit push` (or your configured push script).

---

## Phase 4: Deployment

- [ ] **Configure Cloudflare Pages:**
  - [ ] **Workflow:** Connect your GitHub repository to a new Cloudflare Pages project for a git-based deployment workflow.
  - [ ] **Production Secrets:** Add all production secrets (`WORKOS_API_KEY`, `WHOOP_CLIENT_SECRET`, etc.) in the Pages project settings.
  - [ ] **Production Environment Variables:** Add all production build variables (`NEXT_PUBLIC_SITE_URL`, etc.).
  - [ ] **D1 Database Binding:** Link the production D1 database in **Settings -> Functions -> D1 database bindings**.

- [ ] **Trigger Initial Deployment:** Push a commit to the main branch to trigger the first build and deployment on Cloudflare Pages.

- [ ] **Verify Production:** Thoroughly test the live deployment, including login, data fetching, and form submissions.

---

## Phase 5: Cleanup

- [ ] **Remove Old Code & Config:**
  - [ ] Delete `vercel.json`.
  - [ ] Delete Supabase-specific helper files (`supabase-browser.ts`, `supabase-server.ts`).
  - [ ] Delete old SQL files related to RLS from the `drizzle/` directory.

- [ ] **Decommission Old Services:**
  - [ ] Once the Cloudflare deployment is stable and verified, delete the project from Vercel.
  - [ ] Delete the project from Supabase.
