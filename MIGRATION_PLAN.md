# Migration Plan: Vercel/Supabase to Cloudflare/WorkOS

This document outlines the strategy and step-by-step plan for migrating the Swole Tracker application from its current stack (Vercel, Supabase) to a new stack centered on Cloudflare (Workers, D1) and WorkOS for authentication.

## 1. High-Level Summary

- **Current Stack:** Next.js on Vercel, Drizzle ORM with a Supabase Postgres database, and Supabase for Authentication.
- **Target Stack:** Next.js on Cloudflare Pages, Drizzle ORM with a Cloudflare D1 database, and WorkOS for Authentication.

This is a significant architectural change that will enhance performance, potentially reduce costs, and modernize the stack. The migration will be conducted in three phases to minimize risk.

## 2. Phased Migration Approach

### **Phase 1: Local Development & Core Logic Replacement**
*(Detailed steps below)*
- **Goal:** Get the application running locally with the new stack.
- **Activities:** Set up local Cloudflare/D1 environment, replace database driver and schema definitions, and replace all Supabase Auth logic with WorkOS.

### **Phase 2: Staging Deployment & Data Migration**
- **Goal:** Deploy a fully functional version of the app to a Cloudflare staging environment.
- **Activities:**
    1. Deploy the application to a Cloudflare Pages preview deployment.
    2. Provision a staging D1 database and connect the preview deployment to it.
    3. Develop, test, and refine a data migration script to move data from Supabase (Postgres) to D1 (SQLite). This script must handle the mapping of old Supabase `user_id`s to new WorkOS `user_id`s.
    4. Conduct thorough E2E testing on the staging environment.

### **Phase 3: Production Cutover**
- **Goal:** Go live on the new infrastructure.
- **Activities:**
    1. Schedule and announce a maintenance window.
    2. Perform a final data migration from the production Supabase database to the production D1 database.
    3. Update DNS records to point the production domain to Cloudflare Pages.
    4. Monitor the application closely for any issues.

---

## 3. Phase 1: Detailed Step-by-Step Instructions

This phase focuses on getting a development version of the application running on your local machine with the new stack.

### **Step 1: Initial Setup & Branching**

1.  **Create a New Branch:** All work should be done on a dedicated git branch.
    ```bash
    git checkout -b feat/cloudflare-migration
    ```
2.  **Install Cloudflare Wrangler:** This is the CLI for managing Cloudflare Workers and D1.
    ```bash
    npm install -g wrangler
    ```
3.  **Create Accounts:**
    *   Sign up for a [Cloudflare account](https://dash.cloudflare.com/sign-up).
    *   Sign up for a [WorkOS account](https://dashboard.workos.com/signup).

### **Step 2: Database Migration (Postgres -> D1)**

The goal here is to make Drizzle work with a local D1 database.

1.  **Create a Local D1 Database:**
    *   Use Wrangler to create a local D1 database for development.
    ```bash
    wrangler d1 database create swole-tracker-dev
    ```
    *   This command will output the database name, and configuration details. Add these details to a new, local-only `.dev.vars` file in your project root. **Do not commit this file.**
    ```ini
    # .dev.vars
    [[d1_databases]]
    binding = "DB" # This is the binding name your worker will use
    database_name = "swole-tracker-dev"
    database_id = "your-database-id-from-wrangler"
    preview_database_id = "your-preview-id"
    ```

2.  **Update Drizzle Configuration:**
    *   **Install D1 Driver:** Drizzle needs a different driver for D1.
        ```bash
        bun add drizzle-orm-d1
        ```
    *   **Modify `drizzle.config.ts`:** Change the configuration to target SQLite/D1.
        *   **OLD (`drizzle.config.ts`):**
            ```typescript
            export default {
              schema: "./src/server/db/schema.ts",
              dialect: "postgresql",
              dbCredentials: {
                url: databaseUrl,
              },
              tablesFilter: ["swole-tracker_*"],
            } satisfies Config;
            ```
        *   **NEW (`drizzle.config.ts`):**
            ```typescript
            export default {
              schema: "./src/server/db/schema.ts",
              dialect: "sqlite", // Change dialect to sqlite
              driver: "d1", // Specify the d1 driver
              dbCredentials: {
                wranglerConfigPath: "wrangler.toml",
                dbName: "swole-tracker-dev",
              },
              tablesFilter: ["swole-tracker_*"],
            } satisfies Config;
            ```
    *   **Update `wrangler.toml`:** Create or update `wrangler.toml` to include the D1 binding.
        ```toml
        # wrangler.toml
        name = "swole-tracker"
        main = "src/index.ts" # Adjust if your entrypoint is different
        compatibility_date = "2024-03-20"

        [[d1_databases]]
        binding = "DB"
        database_name = "swole-tracker-dev"
        database_id = "your-database-id-from-wrangler"
        ```

3.  **Adapt Drizzle Schema (`src/server/db/schema.ts`):**
    *   **Change Table Creator:** Replace `pgTableCreator` with a generic `tableCreator` or one suitable for SQLite.
        *   Change `import { pgTableCreator } from "drizzle-orm/pg-core";` to `import { tableCreator } from "drizzle-orm";`
        *   Change `pgTableCreator` to `tableCreator`.
    *   **Change Data Types:** Replace Postgres-specific types with their SQLite equivalents.
        *   `d.timestamp({ withTimezone: true })` -> `d.text()` (for ISO strings) or `d.integer()` (for Unix timestamps). Storing as text is often simpler.
        *   `d.json()` -> `d.text()`
        *   `d.numeric(...)` -> `d.real()`
        *   `d.smallint()` -> `d.integer()`
    *   **Update Default Values:**
        *   `default(sql\
CURRENT_TIMESTAMP\
)` -> `default(sql\
(CURRENT_TIMESTAMP)\
)`
    *   **Update Auto-Incrementing Keys:**
        *   `generatedByDefaultAsIdentity()` is a pg-specific feature. For SQLite, `d.integer().primaryKey({ autoIncrement: true })` is the standard.

4.  **Generate New Migrations:**
    *   Once the schema file is updated, generate a new set of migrations for D1.
    ```bash
    bun drizzle-kit generate
    ```
    *   Apply the new migration to your local D1 database.
    ```bash
    wrangler d1 migrations apply swole-tracker-dev --local
    ```

### **Step 3: Authentication Migration (Supabase -> WorkOS)**

This is the most invasive step. It requires replacing auth logic throughout the application.

1.  **Setup WorkOS:**
    *   In your WorkOS dashboard, create a new project.
    *   Navigate to "API Keys" and get your **Client ID** and **API Key**.
    *   Navigate to "Redirects" and add `http://localhost:3000/api/auth/callback` as an allowed redirect URI for development.

2.  **Install WorkOS SDK:**
    ```bash
    bun add @workos-inc/node
    ```

3.  **Update Environment Variables:**
    *   Add your WorkOS credentials to your `.env` files (and `.env.example`).
    ```env
    # .env.example
    WORKOS_API_KEY=your_workos_api_key
    WORKOS_CLIENT_ID=your_workos_client_id
    ```

4.  **Replace Auth Logic:**
    *   **Create a WorkOS Helper:** Create a new file, e.g., `src/lib/workos.ts`, to initialize the WorkOS client.
    *   **Update Middleware (`src/middleware.ts`):** This is the most critical change.
        *   Remove the Supabase SSR client (`createServerClient`).
        *   Use the WorkOS SDK to get the authenticated user from the `workos-session` cookie. The WorkOS SDK provides helpers for this. If the user is not authenticated, redirect to a new login page.
    *   **Replace Client-Side Supabase Calls:**
        *   Go through every file that uses `createBrowserSupabaseClient` (e.g., `src/app/auth/login/page.tsx`, `src/app/auth/register/page.tsx`, `src/providers/AuthProvider.tsx`).
        *   Replace all calls to `supabase.auth.signInWith...`, `supabase.auth.signUp`, and `supabase.auth.signOut` with their WorkOS equivalents. You will likely need to create new API routes (e.g., `/api/auth/login`, `/api/auth/logout`) that use the WorkOS Node SDK to perform these actions securely on the server.
    *   **Update Server-Side Auth:**
        *   Modify the tRPC context (`src/server/api/trpc.ts`) to get the user from your new WorkOS-powered middleware instead of from `createServerSupabaseClient`.

### **Step 4: Running the App Locally**

*   Use Wrangler to run your Next.js application in a local environment that simulates the Cloudflare Workers runtime.
    ```bash
    wrangler pages dev .
    ```

This command starts a local server. You can now access your application at `http://localhost:8788` (or a similar port) and test the new database connection and authentication flow.

---
This concludes the detailed plan for Phase 1. Once this is complete, your application should be fully functional locally using the new stack, paving the way for a safe and structured deployment to staging and production.
