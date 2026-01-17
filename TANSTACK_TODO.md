# TanStack Start Migration Plan (Updated)

## Overview

Migrate Swole Tracker from Next.js 15 to TanStack Start with a **complete rewrite** strategy. This plan uses **Server Functions with direct Drizzle calls** for data fetching/mutations, **TanStack Query** for client-side caching, and **Server Routes** for webhooks and external API endpoints.

## Key Changes from Previous Plan

1. **Cloudflare Plugin**: Use `@cloudflare/vite-plugin` (official) instead of deprecated adapters
2. **Server Functions**: Complete rewrite using `createServerFn()` with direct Drizzle calls
3. **No tRPC**: Server Functions replace tRPC entirely - cleaner, simpler, still type-safe
4. **API Routes**: Only for webhooks and external consumers (WHOOP, etc.)
5. **Offline Storage**: Keep existing TanStack Query persistence unchanged

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        TanStack Start                            │
├─────────────────────────────────────────────────────────────────┤
│  Routes (src/routes/)                                            │
│  ├── __root.tsx          (Document shell, providers)            │
│  ├── _app.tsx            (Protected layout with auth guard)     │
│  ├── _app.index.tsx      (Dashboard)                            │
│  ├── _app.workouts.tsx   (Workouts list)                        │
│  ├── _app.templates.tsx  (Templates list)                       │
│  └── ...                                                         │
├─────────────────────────────────────────────────────────────────┤
│  Server Functions (src/server/functions/)                        │
│  ├── templates.ts        (getAll, create, update, delete)       │
│  ├── workouts.ts         (CRUD, sets, exercises)                │
│  ├── exercises.ts        (search, link, master)                 │
│  ├── progress.ts         (dashboard, PRs, streaks)              │
│  ├── whoop.ts            (status, recovery, sync)               │
│  └── ...                                                         │
├─────────────────────────────────────────────────────────────────┤
│  Server Routes (src/routes/api/)                                 │
│  ├── webhooks/           (WHOOP webhooks - external HTTP)       │
│  ├── auth/               (OAuth callbacks)                      │
│  └── debug/              (Debug endpoints)                       │
├─────────────────────────────────────────────────────────────────┤
│  Query Hooks (src/lib/queries/)                                  │
│  ├── templates.ts        (useTemplates, useCreateTemplate)      │
│  ├── workouts.ts         (useWorkouts, useWorkout)              │
│  └── ...                 (TanStack Query wrappers)              │
├─────────────────────────────────────────────────────────────────┤
│  Database (src/server/db/) - UNCHANGED                           │
│  ├── schema.ts           (Drizzle schema)                       │
│  ├── index.ts            (D1 connection)                        │
│  └── chunk-utils.ts      (Bulk operation helpers)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Recommended Stack

| Category            | Technology                                       |
| ------------------- | ------------------------------------------------ |
| **Framework**       | TanStack Start (latest) with Vite                |
| **Deployment**      | Cloudflare Workers via `@cloudflare/vite-plugin` |
| **Data Layer**      | Server Functions → Drizzle ORM → D1              |
| **Client Cache**    | TanStack Query v5 (existing)                     |
| **Auth**            | WorkOS (keep, UI handled by WorkOS)              |
| **Styling**         | Tailwind v4 + Material 3 (keep)                  |
| **E2E Testing**     | Playwright (keep)                                |
| **Package Manager** | Bun                                              |

---

## Phase 0: Project Setup

### 0.1 Clean Dependencies

**Task 0.1.1: Remove Next.js Dependencies**

```bash
bun remove next @opennextjs/cloudflare @t3-oss/env-nextjs eslint-config-next
```

- Remove `next.config.js`, `open-next.config.ts`
- Remove `src/middleware.ts` (will use TanStack Router guards)

**Task 0.1.2: Install TanStack Start Dependencies**

```bash
# Core TanStack Start
bun add @tanstack/react-start @tanstack/react-router

# Vite and Cloudflare
bun add -D vite @vitejs/plugin-react @cloudflare/vite-plugin vite-tsconfig-paths

# Keep existing (already installed)
# @tanstack/react-query, @tanstack/query-sync-storage-persister, etc.
```

**Task 0.1.3: Remove tRPC Dependencies**

```bash
bun remove @trpc/client @trpc/react-query @trpc/server superjson
```

### 0.2 Configure TanStack Start

**Task 0.2.1: Create vite.config.ts**

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    viteReact(),
    tsconfigPaths(),
  ],
  server: {
    port: 8787,
  },
});
```

**Task 0.2.2: Create wrangler.jsonc**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "swole-tracker",
  "compatibility_date": "2025-01-15",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry",
  "observability": { "enabled": true },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "swole-tracker-dev",
      "database_id": "${D1_DATABASE_ID}",
    },
  ],
  "vars": {
    "NODE_ENV": "production",
  },
}
```

**Task 0.2.3: Create src/router.tsx**

```typescript
// src/router.tsx
import { createRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { QueryClient, MutationCache } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
      },
    },
    mutationCache: new MutationCache({
      onSettled: () => {
        if (queryClient.isMutating() === 1) {
          return queryClient.invalidateQueries();
        }
      },
    }),
  });

  return routerWithQueryClient(
    createRouter({
      routeTree,
      context: { queryClient },
      scrollRestoration: true,
      defaultPreload: "intent",
    }),
    queryClient,
  );
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
```

**Task 0.2.4: Create src/env.ts**

```typescript
// src/env.ts
import { z } from "zod";

const envSchema = z.object({
  // Cloudflare D1
  DB: z.any().optional(),

  // WorkOS
  WORKOS_API_KEY: z.string().optional(),
  WORKOS_CLIENT_ID: z.string().optional(),

  // Session
  WORKER_SESSION_SECRET: z.string().min(32).optional(),

  // WHOOP
  WHOOP_CLIENT_ID: z.string().optional(),
  WHOOP_CLIENT_SECRET: z.string().optional(),
  WHOOP_REDIRECT_URI: z.string().url().optional(),
  WHOOP_WEBHOOK_SECRET: z.string().optional(),
  WHOOP_SYNC_RATE_LIMIT_PER_HOUR: z.coerce.number().default(10),

  // AI
  AI_GATEWAY_API_KEY: z.string().optional(),
  AI_GATEWAY_MODEL: z.string().default("xai/grok-3-mini"),
  AI_GATEWAY_MODEL_HEALTH: z.string().default("xai/grok-3-mini"),
  AI_DEBRIEF_MODEL: z.string().default("xai/grok-3-mini"),

  // Security & Rate Limiting
  ENCRYPTION_MASTER_KEY: z.string().min(32).optional(),
  RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR: z.coerce.number().default(100),
  RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR: z.coerce.number().default(200),
  RATE_LIMIT_API_CALLS_PER_MINUTE: z.coerce.number().default(60),
  RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),

  // Testing
  E2E_TESTING: z.string().optional(),

  // App
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  SITE_URL: z.string().url().default("http://localhost:8787"),
});

// Access via Cloudflare's env binding in server functions
export type Env = z.infer<typeof envSchema>;

// Client-side env (via Vite's import.meta.env)
export const clientEnv = {
  SITE_URL: import.meta.env.VITE_SITE_URL ?? "http://localhost:8787",
  POSTHOG_KEY: import.meta.env.VITE_POSTHOG_KEY ?? "",
  POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com",
};
```

**Task 0.2.5: Update tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "types": ["@cloudflare/workers-types", "vite/client"],
    "paths": {
      "~/*": ["./src/*"]
    }
  },
  "include": ["src", "vite.config.ts"],
  "exclude": ["node_modules"]
}
```

**Task 0.2.6: Update package.json Scripts**

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "bun run build && wrangler deploy",
    "typecheck": "tsc --noEmit",
    "lint": "eslint \"src/**/*.{ts,tsx}\"",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "cf-typegen": "wrangler types"
  }
}
```

**Task 0.2.7: Update playwright.config.ts**

- Update `webServer.command` to use `bun run dev` (or appropriate start script)
- Update `webServer.url` and `use.baseURL` to `http://localhost:8787`
- Ensure test runner waits for Vite dev server

### 0.3 Create Root Route

**Task 0.3.1: Create src/routes/\_\_root.tsx**

```typescript
// src/routes/__root.tsx
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Suspense, lazy } from 'react'
import { ThemeProvider } from '~/providers/ThemeProvider'
import { AuthProvider } from '~/providers/AuthProvider'
import { Toaster } from '~/components/ui/toaster'
import '~/styles/globals.css'

const PostHogProvider = lazy(() =>
  import('~/providers/PostHogProvider').then((m) => ({ default: m.PostHogProvider }))
)

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Swole Tracker' },
    ],
    links: [{ rel: 'icon', href: '/favicon.ico' }],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="en" className="antialiased">
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          <Suspense fallback={null}>
            <PostHogProvider>
              <ThemeProvider>
                <Outlet />
                <Toaster />
              </ThemeProvider>
            </PostHogProvider>
          </Suspense>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  )
}
```

### 0.4 Setup Database Access

**Task 0.4.1: Update src/server/db/index.ts**

```typescript
// src/server/db/index.ts
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { env } from "cloudflare:workers";

export function getDb() {
  if (!env.DB) {
    throw new Error("D1 database binding not available");
  }
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof getDb>;

// Re-export schema and utilities
export * from "./schema";
export * from "./chunk-utils";
```

**Task 0.4.2: Create src/server/context.ts**

```typescript
// src/server/context.ts
import { getDb, type Db } from "~/server/db";
import { SessionCookie, type WorkOSSession } from "~/lib/session-cookie";
import { getRequest } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

export interface ServerContext {
  db: Db;
  user: { id: string } | null;
  session: WorkOSSession | null;
  requestId: string;
}

export async function getServerContext(): Promise<ServerContext> {
  const request = getRequest();
  const requestId = crypto.randomUUID();

  const db = getDb();

  let user: { id: string } | null = null;
  let session: WorkOSSession | null = null;

  // E2E Test Bypass
  const isE2ETest =
    env.E2E_TESTING === "true" || request.headers.get("x-e2e-test") === "true";

  if (isE2ETest) {
    session = {
      userId: "e2e-test-user",
      accessToken: "e2e-test-token",
      refreshToken: null,
      accessTokenExpiresAt: Date.now() + 3600000,
      sessionExpiresAt: Date.now() + 3600000,
      expiresAt: Date.now() + 3600000,
    };
    user = { id: session.userId };
  } else {
    try {
      session = await SessionCookie.get(request);
      if (session && !SessionCookie.isExpired(session)) {
        user = { id: session.userId };
      }
    } catch (error) {
      console.error("Failed to get session:", error);
    }
  }

  return { db, user, session, requestId };
}

export async function requireAuth(): Promise<
  ServerContext & { user: { id: string } }
> {
  const ctx = await getServerContext();
  if (!ctx.user) {
    throw new Error("UNAUTHORIZED");
  }
  return ctx as ServerContext & { user: { id: string } };
}
```

**Acceptance Criteria for Phase 0:**

- [x] `bun run typecheck` passes (core source files)
- [x] `bun run lint` passes (core source files)
- [x] `bun run build` creates valid worker
- [x] Dev server runs at localhost:8787 (verified with infisical run --env dev -- bun run dev)
- [x] Next.js and tRPC dependencies fully removed
- [x] Playwright configured for new server port

---

## Phase 1: Server Functions & Auth

### 1.1 Create Server Function Infrastructure

**Task 1.1.1: Create src/server/functions/middleware.ts**

```typescript
// src/server/functions/middleware.ts
import { createMiddleware } from "@tanstack/react-start";
import { getServerContext, requireAuth } from "~/server/context";

// Middleware that provides context without requiring auth
export const withContext = createMiddleware().server(async ({ next }) => {
  const ctx = await getServerContext();
  return next({ context: ctx });
});

// Middleware that requires authentication
// TODO: Port session refresh logic from old middleware
export const withAuth = createMiddleware().server(async ({ next }) => {
  const ctx = await requireAuth();

  // Note: Session refresh logic should happen here or in global middleware
  // to ensure tokens stay fresh during user activity.

  return next({ context: ctx });
});

// Rate limiting middleware
// TODO: Port logic from src/lib/rate-limit-middleware.ts
export const withRateLimit = (limit: number, windowMs: number) =>
  createMiddleware().server(async ({ next }) => {
    // Implement rate limiting logic using RateLimitService
    return next();
  });
```

**Task 1.1.2: Create src/server/functions/templates.ts**

```typescript
// src/server/functions/templates.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { withAuth } from "./middleware";
import {
  workoutTemplates,
  templateExercises,
  workoutSessions,
  masterExercises,
  exerciseLinks,
} from "~/server/db/schema";
import { eq, and, desc, asc, max, count, inArray, sql } from "drizzle-orm";
import { chunkedBatch, whereInChunks } from "~/server/db/chunk-utils";
import { normalizeExerciseName } from "~/lib/exercise-utils";

// === GET ALL TEMPLATES ===
export const getTemplates = createServerFn({ method: "GET" })
  .middleware([withAuth])
  .validator(
    z
      .object({
        search: z.string().max(120).optional(),
        sort: z
          .enum(["recent", "lastUsed", "mostUsed", "name"])
          .default("recent"),
      })
      .optional(),
  )
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const input = data ?? {};
    const searchTerm = input.search?.trim();
    const sort = input.sort ?? "recent";

    const whereCondition = searchTerm
      ? and(
          eq(workoutTemplates.user_id, user.id),
          sql`LOWER(${workoutTemplates.name}) LIKE LOWER(${`%${searchTerm}%`})`,
        )
      : eq(workoutTemplates.user_id, user.id);

    const queryBuilder = db
      .select({
        template: workoutTemplates,
        lastUsed: max(workoutSessions.workoutDate).as("lastUsed"),
        totalSessions: count(workoutSessions.id).as("totalSessions"),
      })
      .from(workoutTemplates)
      .leftJoin(
        workoutSessions,
        eq(workoutTemplates.id, workoutSessions.templateId),
      )
      .where(whereCondition)
      .groupBy(workoutTemplates.id);

    switch (sort) {
      case "lastUsed":
        queryBuilder.orderBy(desc(max(workoutSessions.workoutDate)));
        break;
      case "mostUsed":
        queryBuilder.orderBy(desc(count(workoutSessions.id)));
        break;
      case "name":
        queryBuilder.orderBy(asc(workoutTemplates.name));
        break;
      default:
        queryBuilder.orderBy(desc(workoutTemplates.createdAt));
    }

    const results = await queryBuilder;
    const templateIds = results.map((row) => row.template.id);

    if (templateIds.length === 0) {
      return [];
    }

    const templates = await whereInChunks(templateIds, async (idChunk) => {
      return db.query.workoutTemplates.findMany({
        where: inArray(workoutTemplates.id, idChunk),
        with: {
          exercises: {
            orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
          },
        },
      });
    });

    const statsByTemplate = new Map(
      results.map((row) => [
        row.template.id,
        {
          lastUsed: row.lastUsed ?? null,
          totalSessions: Number(row.totalSessions ?? 0),
        },
      ]),
    );

    return templates.map((t) => ({
      ...t,
      ...statsByTemplate.get(t.id),
    }));
  });

// === GET TEMPLATE BY ID ===
export const getTemplate = createServerFn({ method: "GET" })
  .middleware([withAuth])
  .validator(z.object({ id: z.number() }))
  .handler(async ({ context, data }) => {
    const { db, user } = context;

    const template = await db.query.workoutTemplates.findFirst({
      where: and(
        eq(workoutTemplates.id, data.id),
        eq(workoutTemplates.user_id, user.id),
      ),
      with: {
        exercises: {
          orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
        },
      },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    return template;
  });

// === CREATE TEMPLATE ===
export const createTemplate = createServerFn({ method: "POST" })
  .middleware([withAuth])
  .validator(
    z.object({
      name: z.string().min(1).max(256),
      exercises: z.array(z.string().min(1).max(256)),
      dedupeKey: z.string().optional(),
      warmupConfig: z.record(z.string(), z.any()).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { db, user } = context;

    const [created] = await db
      .insert(workoutTemplates)
      .values({
        name: data.name,
        user_id: user.id,
        warmupConfig: data.warmupConfig
          ? JSON.stringify(data.warmupConfig)
          : null,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create template");
    }

    if (data.exercises.length > 0) {
      const exerciseRows = data.exercises.map((name, index) => ({
        user_id: user.id,
        templateId: created.id,
        exerciseName: name,
        orderIndex: index,
        linkingRejected: false,
      }));

      await chunkedBatch(db, exerciseRows, (chunk) =>
        db.insert(templateExercises).values(chunk),
      );
    }

    return db.query.workoutTemplates.findFirst({
      where: eq(workoutTemplates.id, created.id),
      with: {
        exercises: {
          orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
        },
      },
    });
  });

// === UPDATE TEMPLATE ===
export const updateTemplate = createServerFn({ method: "POST" })
  .middleware([withAuth])
  .validator(
    z.object({
      id: z.number(),
      name: z.string().min(1).max(256),
      exercises: z.array(z.string().min(1).max(256)),
      warmupConfig: z.record(z.string(), z.any()).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { db, user } = context;

    const existing = await db.query.workoutTemplates.findFirst({
      where: eq(workoutTemplates.id, data.id),
    });

    if (!existing || existing.user_id !== user.id) {
      return { success: true, alreadyDeleted: true };
    }

    await db
      .update(workoutTemplates)
      .set({
        name: data.name,
        warmupConfig: data.warmupConfig
          ? JSON.stringify(data.warmupConfig)
          : null,
      })
      .where(eq(workoutTemplates.id, data.id));

    await db
      .delete(templateExercises)
      .where(eq(templateExercises.templateId, data.id));

    if (data.exercises.length > 0) {
      const exerciseRows = data.exercises.map((name, index) => ({
        user_id: user.id,
        templateId: data.id,
        exerciseName: name,
        orderIndex: index,
        linkingRejected: false,
      }));

      await chunkedBatch(db, exerciseRows, (chunk) =>
        db.insert(templateExercises).values(chunk),
      );
    }

    return { success: true };
  });

// === DELETE TEMPLATE ===
export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([withAuth])
  .validator(z.object({ id: z.number() }))
  .handler(async ({ context, data }) => {
    const { db, user } = context;

    const existing = await db.query.workoutTemplates.findFirst({
      where: eq(workoutTemplates.id, data.id),
    });

    if (!existing || existing.user_id !== user.id) {
      return { success: true, alreadyDeleted: true };
    }

    await db.delete(workoutTemplates).where(eq(workoutTemplates.id, data.id));

    return { success: true };
  });

// === DUPLICATE TEMPLATE ===
export const duplicateTemplate = createServerFn({ method: "POST" })
  .middleware([withAuth])
  .validator(
    z.object({
      id: z.number(),
      name: z.string().min(1).max(256).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { db, user } = context;

    const original = await db.query.workoutTemplates.findFirst({
      where: eq(workoutTemplates.id, data.id),
      with: {
        exercises: {
          orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
        },
      },
    });

    if (!original || original.user_id !== user.id) {
      throw new Error("Template not found");
    }

    const baseName = data.name?.trim() || `${original.name} Copy`;

    const [created] = await db
      .insert(workoutTemplates)
      .values({ name: baseName, user_id: user.id })
      .returning();

    if (!created) {
      throw new Error("Failed to duplicate template");
    }

    if (original.exercises.length > 0) {
      const exerciseRows = original.exercises.map((ex) => ({
        user_id: user.id,
        templateId: created.id,
        exerciseName: ex.exerciseName,
        orderIndex: ex.orderIndex,
        linkingRejected: ex.linkingRejected ?? false,
      }));

      await chunkedBatch(db, exerciseRows, (chunk) =>
        db.insert(templateExercises).values(chunk),
      );
    }

    return db.query.workoutTemplates.findFirst({
      where: eq(workoutTemplates.id, created.id),
      with: {
        exercises: {
          orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
        },
      },
    });
  });
```

### 1.2 Create Query Hooks

**Task 1.2.1: Create src/lib/queries/templates.ts**

```typescript
// src/lib/queries/templates.ts
import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
} from "~/server/functions/templates";

// Query options factories
export const templatesQueryOptions = (params?: {
  search?: string;
  sort?: string;
}) =>
  queryOptions({
    queryKey: ["templates", params],
    queryFn: () => getTemplates({ data: params }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

export const templateQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ["templates", id],
    queryFn: () => getTemplate({ data: { id } }),
  });

// Hooks
export function useTemplates(params?: { search?: string; sort?: string }) {
  return useSuspenseQuery(templatesQueryOptions(params));
}

export function useTemplate(id: number) {
  return useSuspenseQuery(templateQueryOptions(id));
}

export function useCreateTemplate() {
  const mutationFn = useServerFn(createTemplate);
  return useMutation({
    mutationFn,
  });
}

export function useUpdateTemplate() {
  const mutationFn = useServerFn(updateTemplate);
  return useMutation({
    mutationFn,
  });
}

export function useDeleteTemplate() {
  const mutationFn = useServerFn(deleteTemplate);
  return useMutation({
    mutationFn,
  });
}

export function useDuplicateTemplate() {
  const mutationFn = useServerFn(duplicateTemplate);
  return useMutation({
    mutationFn,
  });
}
```

### 1.3 Auth Routes

**Task 1.3.1: Create src/routes/sign-in.tsx**

```typescript
// src/routes/sign-in.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getServerContext } from '~/server/context'
import { GoogleAuthButton } from '~/components/GoogleAuthButton'

export const Route = createFileRoute('/sign-in')({
  beforeLoad: async () => {
    const { user } = await getServerContext()
    if (user) {
      throw redirect({ to: '/' })
    }
  },
  component: SignInPage,
})

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-8 text-center">Sign In</h1>
        <GoogleAuthButton />
      </div>
    </div>
  )
}
```

**Task 1.3.2: Create src/routes/api/auth/callback.ts (Server Route)**

```typescript
// src/routes/api/auth/callback.ts
import { createFileRoute, redirect } from "@tanstack/react-router";
import { WorkOS } from "@workos-inc/node";
import { SessionCookie } from "~/lib/session-cookie";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/api/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");

        if (!code) {
          return new Response("Missing code", { status: 400 });
        }

        const workos = new WorkOS(env.WORKOS_API_KEY);

        const { user, accessToken, refreshToken, expiresAt } =
          await workos.userManagement.authenticateWithCode({
            clientId: env.WORKOS_CLIENT_ID!,
            code,
          });

        const sessionCookie = await SessionCookie.create({
          userId: user.id,
          accessToken,
          refreshToken,
          accessTokenExpiresAt: expiresAt,
          sessionExpiresAt: expiresAt + 60 * 60 * 24 * 30, // 30 days
          expiresAt,
        });

        return new Response(null, {
          status: 302,
          headers: {
            Location: "/",
            "Set-Cookie": sessionCookie,
          },
        });
      },
    },
  },
});
```

**Task 1.3.3: Create src/routes/api/auth/logout.ts (Server Route)**

```typescript
// src/routes/api/auth/logout.ts
import { createFileRoute } from "@tanstack/react-router";
import { SessionCookie } from "~/lib/session-cookie";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const destroyCookie = await SessionCookie.destroy(request);

        return new Response(null, {
          status: 302,
          headers: {
            Location: "/sign-in",
            "Set-Cookie": destroyCookie,
          },
        });
      },
    },
  },
});
```

**Task 1.3.4: Create src/routes/api/auth/session.ts (Server Route)**

```typescript
// src/routes/api/auth/session.ts
import { createFileRoute } from "@tanstack/react-router";
import { getServerContext } from "~/server/context";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async () => {
        const { user, session } = await getServerContext();

        if (!user || !session) {
          return Response.json({ user: null }, { status: 401 });
        }

        return Response.json({
          user: { id: user.id },
          expiresAt: session.sessionExpiresAt,
        });
      },
    },
  },
});
```

### 1.4 Protected Layout

**Task 1.4.1: Create src/routes/\_app.tsx**

```typescript
// src/routes/_app.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getServerContext } from '~/server/context'
import { DashboardHeader } from '~/components/dashboard-header'
import { ErrorBoundary } from '~/components/error-boundary'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const { user } = await getServerContext()
    if (!user) {
      throw redirect({ to: '/sign-in' })
    }
    return { user }
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <ErrorBoundary>
      <DashboardHeader />
      <Outlet />
    </ErrorBoundary>
  )
}
```

**Task 1.4.2: Create src/routes/\_app.index.tsx (Dashboard)**

```typescript
// src/routes/_app.index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { StatsCards } from '~/components/StatsCards'

const QuickActions = lazy(() =>
  import('~/components/quick-actions').then((m) => ({ default: m.QuickActions }))
)
const WeeklyProgress = lazy(() =>
  import('~/components/weekly-progress').then((m) => ({ default: m.WeeklyProgress }))
)
const RecentWorkouts = lazy(() =>
  import('~/components/recent-workouts').then((m) => ({ default: m.RecentWorkouts }))
)

export const Route = createFileRoute('/_app/')({
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="bg-app-gradient min-h-screen">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-10">
        <section className="flex flex-col gap-6">
          <Suspense fallback={<div className="h-16 animate-pulse bg-muted/50 rounded-lg" />}>
            <QuickActions />
          </Suspense>
          <StatsCards />
        </section>
        <section className="grid gap-6 lg:grid-cols-2">
          <Suspense fallback={<div className="h-64 animate-pulse bg-muted/50 rounded-lg" />}>
            <WeeklyProgress />
          </Suspense>
          <Suspense fallback={<div className="h-64 animate-pulse bg-muted/50 rounded-lg" />}>
            <RecentWorkouts />
          </Suspense>
        </section>
      </main>
    </div>
  )
}
```

**Acceptance Criteria for Phase 1:**

- [ ] Auth flow works (sign in → callback → session)
- [ ] Protected routes redirect to sign-in
- [ ] Dashboard loads after authentication
- [ ] Templates server functions work
- [ ] Query hooks fetch data correctly

---

## Phase 2: All Server Functions

### 2.1 Workouts Server Functions

**Task 2.1.1: Create src/server/functions/workouts.ts**

- `getRecentWorkouts` - GET recent workout sessions
- `getWorkout` - GET workout by ID with exercises and sets
- `createWorkout` - POST create new workout session
- `updateWorkout` - POST update workout
- `completeWorkout` - POST complete workout session
- `deleteWorkout` - POST delete workout
- `addExercise` - POST add exercise to workout
- `updateExercise` - POST update exercise
- `removeExercise` - POST remove exercise
- `addSet` - POST add set to exercise
- `updateSet` - POST update set
- `deleteSet` - POST delete set
- `startWorkout` - POST start workout timer
- `pauseWorkout` - POST pause workout
- `resumeWorkout` - POST resume workout
- `createFromTemplate` - POST create workout from template

### 2.2 Exercises Server Functions

**Task 2.2.1: Create src/server/functions/exercises.ts**

- `searchMaster` - GET search master exercises
- `findSimilar` - GET find similar exercises
- `getAllMaster` - GET all master exercises
- `getMigrationStatus` - GET migration status
- `createOrGetMaster` - POST create/get master exercise
- `linkToMaster` - POST link template exercise to master
- `unlink` - POST unlink exercise
- `bulkLink` - POST bulk link exercises
- `migrateAll` - POST migrate all exercises
- `deleteMaster` - POST delete master exercise
- `updateMaster` - POST update master exercise
- `resolveName` - POST resolve exercise name

### 2.3 Progress Server Functions

**Task 2.3.1: Create src/server/functions/progress.ts**

- `getDashboardData` - GET progress dashboard
- `getStrengthProgression` - GET strength over time
- `getVolumeProgression` - GET volume over time
- `getRecentPRs` - GET recent personal records
- `getTopSets` - GET top sets per exercise
- `getTopExercises` - GET most performed exercises
- `getPersonalRecords` - GET all PRs
- `getProgressHighlights` - GET progress highlights
- `getStreak` - GET workout streak
- `getConsistency` - GET consistency metrics
- `getHistory` - GET workout history

### 2.4 WHOOP Server Functions

**Task 2.4.1: Create src/server/functions/whoop.ts**

- `getIntegrationStatus` - GET WHOOP connection status
- `getWorkouts` - GET WHOOP workouts
- `disconnect` - POST disconnect integration
- `getWebhookInfo` - GET webhook configuration
- `getRecovery` - GET recovery data
- `getLatestRecovery` - GET latest recovery
- `getCycles` - GET physiological cycles
- `getSleep` - GET sleep data
- `getProfile` - GET user profile
- `getBodyMeasurements` - GET body measurements
- `getReadinessAggregation` - GET readiness aggregation

### 2.5 Other Server Functions

**Task 2.5.1: Create src/server/functions/preferences.ts**

- `get` - GET user preferences
- `update` - POST update preferences

**Task 2.5.2: Create src/server/functions/insights.ts**

- `getExerciseInsights` - GET exercise insights
- `getSessionInsights` - GET session insights
- `exportWorkoutsCSV` - GET export data

**Task 2.5.3: Create src/server/functions/wellness.ts**

- `getMetrics` - GET wellness metrics
- `getHistory` - GET wellness history
- `updateEntry` - POST update wellness entry
- `deleteEntry` - POST delete wellness entry

**Task 2.5.4: Create src/server/functions/suggestions.ts**

- `getExerciseSuggestions` - GET exercise suggestions
- `getWorkoutSuggestions` - GET workout suggestions
- `getRecoverySuggestions` - GET recovery suggestions
- `dismissSuggestion` - POST dismiss suggestion

**Task 2.5.5: Create src/server/functions/playbooks.ts**

- `getAll` - GET all playbooks
- `getById` - GET playbook by ID
- `create` - POST create playbook (AI generation)
- `update` - POST update playbook
- `delete` - POST delete playbook
- `duplicate` - POST duplicate playbook
- `startSession` - POST start playbook session
- `completeSession` - POST complete session
- `getProgress` - GET playbook progress
- `getRecommendations` - GET playbook recommendations
- `regenerate` - POST regenerate playbook

**Task 2.5.6: Create src/server/functions/session-debrief.ts**

- `generate` - POST generate session debrief
- `getBySessionId` - GET debrief by session ID

**Task 2.5.7: Create src/server/functions/recovery-planner.ts**

- `getRecommendations` - GET recovery recommendations
- `getPlan` - GET recovery plan
- `updatePlan` - POST update plan
- `getHistory` - GET recovery history
- `logActivity` - POST log recovery activity

**Task 2.5.8: Create src/server/functions/plateau-milestone.ts**

- `detect` - GET detect plateaus
- `getMilestones` - GET milestones
- `createMilestone` - POST create milestone
- `dismissPlateau` - POST dismiss plateau

**Task 2.5.9: Create src/server/functions/health-advice.ts**

- `getAdvice` - GET health advice
- `getJoke` - GET health-related joke
- `refreshAdvice` - POST refresh advice

### 2.6 Query Hooks for All Functions

**Task 2.6.1: Create src/lib/queries/workouts.ts**
**Task 2.6.2: Create src/lib/queries/exercises.ts**
**Task 2.6.3: Create src/lib/queries/progress.ts**
**Task 2.6.4: Create src/lib/queries/whoop.ts**
**Task 2.6.5: Create src/lib/queries/preferences.ts**
**Task 2.6.6: Create src/lib/queries/insights.ts**
**Task 2.6.7: Create src/lib/queries/wellness.ts**
**Task 2.6.8: Create src/lib/queries/suggestions.ts**
**Task 2.6.9: Create src/lib/queries/playbooks.ts**
**Task 2.6.10: Create src/lib/queries/session-debrief.ts**
**Task 2.6.11: Create src/lib/queries/recovery-planner.ts**
**Task 2.6.12: Create src/lib/queries/plateau-milestone.ts**
**Task 2.6.13: Create src/lib/queries/health-advice.ts**

**Acceptance Criteria for Phase 2:**

- [ ] All server functions compile and type-check
- [ ] All query hooks work correctly
- [ ] Mutations trigger proper cache invalidation
- [ ] Error handling matches previous tRPC behavior

---

## Phase 3: Page Routes

### 3.1 Template Routes

**Task 3.1.1: Create src/routes/\_app.templates.tsx**
**Task 3.1.2: Create src/routes/\_app.templates.new.tsx**
**Task 3.1.3: Create src/routes/\_app.templates.$id.edit.tsx**

### 3.2 Workout Routes

**Task 3.2.1: Create src/routes/\_app.workouts.tsx**
**Task 3.2.2: Create src/routes/\_app.workouts.$id.tsx**
**Task 3.2.3: Create src/routes/\_app.workout.start.tsx**
**Task 3.2.4: Create src/routes/\_app.workout.session.$localId.tsx**

### 3.3 Progress Routes

**Task 3.3.1: Create src/routes/\_app.progress.tsx**
**Task 3.3.2: Create src/routes/\_app.progress.achievements.tsx**

### 3.4 Exercises Route

**Task 3.4.1: Create src/routes/\_app.exercises.tsx**

### 3.5 Playbook Routes

**Task 3.5.1: Create src/routes/\_app.playbooks.tsx**
**Task 3.5.2: Create src/routes/\_app.playbooks.new.tsx**
**Task 3.5.3: Create src/routes/\_app.playbooks.$id.tsx**

### 3.6 WHOOP Routes

**Task 3.6.1: Create src/routes/\_app.connect-whoop.tsx**

### 3.7 Wellness Route

**Task 3.7.1: Create src/routes/\_app.wellness.tsx**

### 3.8 Static Routes

**Task 3.8.1: Create src/routes/terms.tsx**
**Task 3.8.2: Create src/routes/privacy.tsx**

**Acceptance Criteria for Phase 3:**

- [ ] All page routes render correctly
- [ ] Navigation works between pages
- [ ] Dynamic routes load correct data
- [ ] Loader preloading works

---

## Phase 4: Webhooks & External API Routes

### 4.1 WHOOP Webhooks (Server Routes)

**Task 4.1.1: Create src/routes/api/webhooks/whoop/index.ts**

```typescript
// src/routes/api/webhooks/whoop/index.ts
import { createFileRoute } from "@tanstack/react-router";
import { verifyWhoopSignature } from "~/lib/whoop-utils";
import { getDb } from "~/server/db";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/api/webhooks/whoop/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("x-whoop-signature");
        const body = await request.text();

        if (!verifyWhoopSignature(body, signature, env.WHOOP_WEBHOOK_SECRET)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(body);
        const db = getDb();

        // Process webhook based on type
        switch (payload.type) {
          case "workout.created":
          case "workout.updated":
            // Handle workout webhook
            break;
          case "recovery.updated":
            // Handle recovery webhook
            break;
          case "sleep.updated":
            // Handle sleep webhook
            break;
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
```

**Task 4.1.2: Create src/routes/api/webhooks/whoop/recovery.ts**
**Task 4.1.3: Create src/routes/api/webhooks/whoop/sleep.ts**
**Task 4.1.4: Create src/routes/api/webhooks/whoop/cycle.ts**
**Task 4.1.5: Create src/routes/api/webhooks/whoop/profile.ts**
**Task 4.1.6: Create src/routes/api/webhooks/whoop/body-measurement.ts**
**Task 4.1.7: Create src/routes/api/webhooks/whoop/test.ts**

### 4.2 WHOOP OAuth Routes

**Task 4.2.1: Create src/routes/api/auth/whoop/authorize.ts**
**Task 4.2.2: Create src/routes/api/auth/whoop/callback.ts**

### 4.3 WHOOP Sync Routes

**Task 4.3.1: Create src/routes/api/whoop/sync-all.ts**
**Task 4.3.2: Create src/routes/api/whoop/sync-workouts.ts**
**Task 4.3.3: Create src/routes/api/whoop/status.ts**
**Task 4.3.4: Create src/routes/api/whoop/cleanup-duplicates.ts**

### 4.4 Debug Routes

**Task 4.4.1: Create src/routes/api/debug/whoop-integration.ts**
**Task 4.4.2: Create src/routes/api/debug/oauth-states.ts**
**Task 4.4.3: Create src/routes/api/test-env.ts**

### 4.5 Health Advice Route

**Task 4.5.1: Create src/routes/api/health-advice.ts**

**Acceptance Criteria for Phase 4:**

- [ ] Webhook signature verification works
- [ ] WHOOP OAuth flow works
- [ ] Webhook events are processed correctly
- [ ] Debug endpoints accessible

---

## Phase 5: Migration & Cleanup

### 5.1 Component Updates

**Task 5.1.1: Update all components using `api.xxx.useQuery()`**

- Replace with new query hooks
- Pattern: `api.templates.getAll.useQuery()` → `useTemplates()`

**Task 5.1.2: Update all components using `api.xxx.useMutation()`**

- Replace with new mutation hooks
- Pattern: `api.templates.create.useMutation()` → `useCreateTemplate()`

### 5.2 Provider Updates

**Task 5.2.1: Update AuthProvider**

- Remove TRPCReactProvider wrapping
- Keep auth logic, update session fetching

**Task 5.2.2: Remove TRPCReactProvider**

- Delete `src/trpc/react.tsx`
- Update root layout

### 5.3 File Cleanup

**Task 5.3.1: Delete tRPC Files**

```bash
rm -rf src/trpc
rm -rf src/server/api/routers
rm src/server/api/root.ts
rm src/server/api/trpc.ts
```

**Task 5.3.2: Delete Next.js Files**

```bash
rm -rf src/app  # After all pages migrated
rm src/middleware.ts
rm next.config.js
rm open-next.config.ts
```

**Task 5.3.3: Delete Unused Dependencies**

```bash
rm src/env.js  # Replaced by src/env.ts
```

### 5.4 Final Verification

**Task 5.4.1: Run All Tests**

```bash
bun run typecheck
bun run lint
bun run test
bun run test:e2e
```

**Task 5.4.2: Verify Production Build**

```bash
bun run build
wrangler deploy --dry-run
```

**Acceptance Criteria for Phase 5:**

- [ ] `bun run check` passes
- [ ] `bun run test` passes
- [ ] `bun run test:e2e` passes (all tests)
- [ ] No tRPC imports remain
- [ ] No Next.js imports remain
- [ ] Build deploys successfully to Cloudflare

---

## Offline Storage (Unchanged)

The existing offline storage implementation works with TanStack Query and requires no changes:

- `src/lib/offline-storage.ts` - Cache management, LRU cleanup
- `setupOfflinePersistence()` - Query client persistence
- `createEnhancedPersister()` - localStorage adapter with size management

These files integrate directly with the QueryClient created in `src/router.tsx`.

---

## File Structure After Migration

```
src/
├── routes/
│   ├── __root.tsx              # Document shell
│   ├── sign-in.tsx             # Public sign-in page
│   ├── terms.tsx               # Terms page
│   ├── privacy.tsx             # Privacy page
│   ├── _app.tsx                # Protected layout
│   ├── _app.index.tsx          # Dashboard
│   ├── _app.templates.tsx      # Templates list
│   ├── _app.templates.new.tsx
│   ├── _app.templates.$id.edit.tsx
│   ├── _app.workouts.tsx
│   ├── _app.workouts.$id.tsx
│   ├── _app.workout.start.tsx
│   ├── _app.workout.session.$localId.tsx
│   ├── _app.progress.tsx
│   ├── _app.progress.achievements.tsx
│   ├── _app.exercises.tsx
│   ├── _app.playbooks.tsx
│   ├── _app.playbooks.new.tsx
│   ├── _app.playbooks.$id.tsx
│   ├── _app.connect-whoop.tsx
│   ├── _app.wellness.tsx
│   └── api/
│       ├── auth/
│       │   ├── callback.ts
│       │   ├── logout.ts
│       │   ├── session.ts
│       │   └── whoop/
│       │       ├── authorize.ts
│       │       └── callback.ts
│       ├── webhooks/
│       │   └── whoop/
│       │       ├── index.ts
│       │       ├── recovery.ts
│       │       ├── sleep.ts
│       │       ├── cycle.ts
│       │       ├── profile.ts
│       │       └── body-measurement.ts
│       ├── whoop/
│       │   ├── sync-all.ts
│       │   ├── sync-workouts.ts
│       │   └── status.ts
│       └── debug/
│           └── whoop-integration.ts
├── server/
│   ├── functions/
│   │   ├── middleware.ts       # Auth middleware
│   │   ├── templates.ts
│   │   ├── workouts.ts
│   │   ├── exercises.ts
│   │   ├── progress.ts
│   │   ├── whoop.ts
│   │   ├── preferences.ts
│   │   ├── insights.ts
│   │   ├── wellness.ts
│   │   ├── suggestions.ts
│   │   ├── playbooks.ts
│   │   ├── session-debrief.ts
│   │   ├── recovery-planner.ts
│   │   ├── plateau-milestone.ts
│   │   └── health-advice.ts
│   ├── context.ts              # Server context helpers
│   └── db/                     # UNCHANGED
│       ├── schema.ts
│       ├── index.ts
│       └── chunk-utils.ts
├── lib/
│   ├── queries/
│   │   ├── templates.ts
│   │   ├── workouts.ts
│   │   ├── exercises.ts
│   │   ├── progress.ts
│   │   ├── whoop.ts
│   │   ├── preferences.ts
│   │   ├── insights.ts
│   │   ├── wellness.ts
│   │   ├── suggestions.ts
│   │   ├── playbooks.ts
│   │   ├── session-debrief.ts
│   │   ├── recovery-planner.ts
│   │   ├── plateau-milestone.ts
│   │   └── health-advice.ts
│   ├── offline-storage.ts      # UNCHANGED
│   ├── session-cookie.ts       # UNCHANGED
│   └── ...
├── components/                 # MINIMAL CHANGES (import updates)
├── providers/                  # MINOR UPDATES
├── styles/                     # UNCHANGED
├── router.tsx                  # NEW
├── env.ts                      # NEW (replaces env.js)
└── routeTree.gen.ts            # AUTO-GENERATED
```

---

## Estimated Task Count

| Phase     | Description             | Tasks   | Estimated Hours |
| --------- | ----------------------- | ------- | --------------- |
| 0         | Project Setup           | 12      | 6-8             |
| 1         | Server Functions & Auth | 20      | 12-16           |
| 2         | All Server Functions    | 50      | 30-40           |
| 3         | Page Routes             | 20      | 12-16           |
| 4         | Webhooks & API Routes   | 18      | 10-14           |
| 5         | Migration & Cleanup     | 15      | 8-12            |
| **Total** |                         | **135** | **78-106**      |

---

## Test Commands by Phase

### Phase 0-1 Tests

```bash
bun run typecheck
bun run lint
bun run dev  # Verify server starts
```

### Phase 2 Tests

```bash
bun run test  # Unit tests for server functions
```

### Phase 3 Tests

```bash
bun run test:e2e --grep "Template"
bun run test:e2e --grep "Workout"
```

### Phase 4 Tests

```bash
bun run test:e2e --grep "WHOOP"
```

### Phase 5 Tests

```bash
bun run check
bun run test:e2e
bun run build
```

---

## Key Migration Patterns

### Before (tRPC)

```typescript
// Component
const { data } = api.templates.getAll.useQuery();
const createMutation = api.templates.create.useMutation();
```

### After (Server Functions + Query Hooks)

```typescript
// Component
const { data } = useTemplates();
const createMutation = useCreateTemplate();
```

### Server Function Pattern

```typescript
// src/server/functions/templates.ts
export const getTemplates = createServerFn({ method: 'GET' })
  .middleware([withAuth])
  .validator(z.object({ ... }).optional())
  .handler(async ({ context, data }) => {
    const { db, user } = context
    // Direct Drizzle queries
    return await db.query.workoutTemplates.findMany(...)
  })
```

### Query Hook Pattern

```typescript
// src/lib/queries/templates.ts
export const templatesQueryOptions = (params?) =>
  queryOptions({
    queryKey: ["templates", params],
    queryFn: () => getTemplates({ data: params }),
  });

export function useTemplates(params?) {
  return useSuspenseQuery(templatesQueryOptions(params));
}
```

---

## Important Notes

### Database Compatibility

- Schema unchanged - keep Drizzle + D1
- Same chunking strategy for bulk operations
- Session table format unchanged

### Auth Compatibility

- WorkOS callback URL: `/api/auth/callback`
- Session cookie format identical
- User ID extraction same

### Cloudflare Bindings

```typescript
// Access env via cloudflare:workers
import { env } from "cloudflare:workers";

// In server functions
const db = getDb(); // Uses env.DB internally
```

### Route Loaders with Preloading

```typescript
export const Route = createFileRoute("/_app/templates")({
  loader: ({ context }) => {
    // Prefetch for instant navigation
    context.queryClient.prefetchQuery(templatesQueryOptions());
  },
  component: TemplatesPage,
});
```

---

## Appendix A: tRPC Router Analysis (Porting Reference)

### Router Overview (13 Routers, 12 Utility Files)

This section documents the existing tRPC routers and utilities that need to be ported to Server Functions. **Complete rewrite required** - do not copy-paste tRPC code directly.

---

### A.1: templatesRouter (918 lines)

**Location**: `src/server/api/routers/templates.ts`

**Procedures**:
| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `getAll` | query | `{ search?, sort? }` | Get templates with usage stats |
| `getById` | query | `{ id }` | Single template by ID |
| `create` | mutation | `{ name, exercises, dedupeKey, warmupConfig? }` | Create with deduplication |
| `bulkCreateAndLinkExercises` | mutation | `{ name, exercises, linkingDecisions, dedupeKey }` | Create with explicit exercise linking |
| `update` | mutation | `{ id, name, exercises, warmupConfig? }` | Update template |
| `duplicate` | mutation | `{ id, name? }` | Duplicate with exercises |
| `delete` | mutation | `{ id }` | Delete template |

**Key Logic**:

- Deduplication via `dedupeKey` UUID and 5-second window fallback
- Master exercise auto-linking via `createAndLinkMasterExercise` helper
- Rate limited via `templateRateLimit`
- Returns template with `exercises[]`, `lastUsed`, `totalSessions`

**Zod Schemas**:

```typescript
sort: z.enum(["recent", "lastUsed", "mostUsed", "name"]);
exercises: z.array(z.string().min(1).max(256));
```

**Chunking**: Uses `chunkedBatch` for exercise inserts, `whereInChunks` for batch fetch

---

### A.2: workoutsRouter (Very Large)

**Location**: `src/server/api/routers/workouts.ts`

**Procedures**:
| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `migrateMasterExercises` | mutation | - | Migrate existing template exercises to master linking |
| `getRecent` | query | `{ limit }` | Recent workouts with template/playbook data |
| `getById` | query | `{ id }` | Single workout with exercises |
| `getLastExerciseData` | query | `{ exerciseName, templateId?, excludeSessionId?, templateExerciseId? }` | Last workout data for exercise |
| `getLatestPerformanceForTemplateExercise` | query | `{ templateExerciseId, excludeSessionId? }` | Performance via exercise linking |
| `start` | mutation | `{ templateId?, workoutDate?, copyFromSessionId? }` | Start workout session |
| `save` | mutation | `{ sessionId, exercises[] }` | Save workout with all exercises |
| `delete` | mutation | `{ id }` | Delete workout |
| `getStats` | query | `{ startDate?, endDate? }` | Workout statistics |
| `getExerciseHistory` | query | `{ exerciseName, limit, offset, startDate?, endDate? }` | Exercise history |
| `getSessionExercises` | query | `{ sessionId }` | Session exercises |
| `getByLocalId` | query | `{ localId }` | Find by localId (offline sync) |

**Input Schemas**:

```typescript
setInputSchema = {
  id: z.string(),
  weight?: z.number(),
  reps?: z.number().int().positive(),
  sets?: z.number().int().positive().default(1),
  unit: z.enum(['kg', 'lbs']).default('kg'),
  rpe?: z.number().int().min(1).max(10),
  rest?: z.number().int().positive(),
  isEstimate?: z.boolean(),
  isDefaultApplied?: z.boolean(),
}

exerciseInputSchema = {
  templateExerciseId?: z.number(),
  exerciseName: z.string().min(1).max(256),
  sets: z.array(setInputSchema),
  unit: z.enum(['kg', 'lbs']).default('kg'),
}
```

**Key Logic**:

- 1RM estimate: `weight * (1 + reps / 30)`
- Volume load: `sets * reps * weight`
- Master exercise linking via `ensureMasterExerciseLinks`
- Incremental aggregation triggers on save
- Debrief auto-generation on save
- Playbook session completion tracking
- Plateau detection after save
- Milestone/notifications after save

**Services Used**:

- `workout-save-service.ts` - complex save logic
- `session-debrief.ts` - AI debrief generation
- `plateau-detection.ts` - plateau detection
- `milestone-checking.ts` - milestone tracking

---

### A.3: progressRouter

**Location**: `src/server/api/routers/progress.ts`

**Procedures**:
| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `getProgressDashboardData` | query | `{ timeRange }` | Unified dashboard (CTE-based) |
| `getExerciseStrengthProgression` | query | `{ exerciseName?, templateExerciseId?, timeRange, startDate?, endDate? }` | 1RM over time |
| `getExerciseVolumeProgression` | query | Same as above | Volume over time |
| `getRecentPRs` | query | `{ limit, timeRange, exerciseName? }` | Recent personal records |
| `getTopSets` | query | `{ exerciseName?, limit }` | Top sets per exercise |
| `getTopExercises` | query | `{ limit, timeRange }` | Most performed exercises |
| `getPersonalRecords` | query | `{ timeRange, recordType }` | All PRs |
| `getProgressHighlights` | query | `{ tab, timeRange, limit?, offset? }` | Highlights (PRs, milestones, streaks) |
| `getStreak` | query | - | Current workout streak |
| `getConsistency` | query | `{ timeRange }` | Consistency metrics |
| `getHistory` | query | `{ startDate, endDate, limit }` | Workout history |

**Caching**:

```typescript
const calculationCache = cacheManager.getCache(
  "progress-calculations",
  cachePresets.calculations, // 1 hour TTL
);
```

**Utilities**:

- `exercise-calculations.ts` - Volume, progression, consistency calculations
- Uses CTEs for optimized dashboard queries

---

### A.4: exercisesRouter

**Location**: `src/server/api/routers/exercises.ts`

**Procedures**:
| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `searchMaster` | query | `{ q, limit, cursor? }` | Fuzzy search exercises |
| `findSimilar` | query | `{ exerciseName, limit }` | Find similar exercises |
| `getAllMaster` | query | `{ limit, offset }` | All master exercises |
| `getMigrationStatus` | query | - | Migration status |
| `createOrGetMaster` | mutation | `{ name, muscleGroup?, tags? }` | Create/get master exercise |
| `linkToMaster` | mutation | `{ templateExerciseId, masterExerciseId }` | Link exercise |
| `unlink` | mutation | `{ templateExerciseId }` | Unlink exercise |
| `bulkLink` | mutation | `{ links[] }` | Bulk link exercises |
| `migrateAll` | mutation | - | Migrate all exercises |
| `deleteMaster` | mutation | `{ id }` | Delete master exercise |
| `updateMaster` | mutation | `{ id, name, muscleGroup?, tags? }` | Update master |
| `resolveName` | mutation | `{ templateExerciseId }` | Resolve exercise name |

**Fuzzy Matching**:

- Levenshtein distance calculation
- Common variations dictionary (bench, squat, deadlift, etc.)
- Word overlap scoring
- Cursor-based pagination

**Caching**:

```typescript
const searchCache = cacheManager.getCache(
  "exercise-search",
  cachePresets.search, // 5 minute TTL
);
```

---

### A.5: whoopRouter

**Location**: `src/server/api/routers/whoop.ts`

**Procedures**:
| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `getIntegrationStatus` | query | - | WHOOP connection status |
| `getWorkouts` | query | `{ limit }` | WHOOP workouts |
| `disconnectIntegration` | mutation | - | Disconnect WHOOP |
| `getWebhookInfo` | query | - | Webhook configuration |
| `getLatestRecoveryData` | query | - | Latest recovery/sleep |
| `getRecovery` | query | - | Recovery history |
| `getCycles` | query | - | Physiological cycles |
| `getSleep` | query | - | Sleep data |
| `getProfile` | query | - | User profile |
| `getBodyMeasurements` | query | - | Body measurements |
| `getReadinessAggregation` | query | - | Readiness data |

**Token Management**:

- Uses `rotateOAuthTokens` from `~/lib/token-rotation`
- Automatic token refresh before queries
- Error handling for expired tokens

**Schemas**:

```typescript
whoopIntegrationSelection = {
  isActive: userIntegrations.isActive,
  createdAt: userIntegrations.createdAt,
  expiresAt: userIntegrations.expiresAt,
  scope: userIntegrations.scope,
};
```

---

### A.6: playbookRouter

**Location**: `src/server/api/routers/playbook.ts`

**Procedures**:
| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `create` | mutation | `{ name, goalText?, goalPreset?, targetType, targetIds, duration, metadata?, selectedPlans }` | Create playbook |
| `getById` | query | `{ id }` | Get playbook with weeks/sessions |
| `listByUser` | query | `{ status?, limit, offset }` | List playbooks |
| `acceptPlaybook` | mutation | `{ id }` | Accept and activate |
| `delete` | mutation | `{ id }` | Delete playbook |
| `submitSessionRPE` | mutation | `{ playbookSessionId, rpe, rpeNotes?, difficulty, deviation? }` | Submit RPE |
| `regenerate` | mutation | `{ id, reason? }` | Regenerate playbook |
| `getProgress` | query | `{ id }` | Playbook progress |
| `getRecommendations` | query | `{ id }` | AI recommendations |

**Key Logic**:

- Dual plan generation: AI + Algorithmic
- Uses `buildPlaybookContext` utility
- Uses `generateAlgorithmicPlan` utility
- AI generation via Vercel AI SDK (`generateText`)
- PostHog analytics tracking

**Input Schema**:

```typescript
playbookCreateInputSchema = {
  name: z.string(),
  goalText?: z.string(),
  goalPreset?: z.enum(['strength', 'hypertrophy', 'endurance', 'general']),
  targetType: z.enum(['muscle_group', 'exercise', 'template']),
  targetIds: z.array(z.number()),
  duration: z.number().min(1).max(12),
  metadata?: z.record(z.any()),
  selectedPlans: z.object({
    ai: z.boolean(),
    algorithmic: z.boolean(),
  }),
}
```

---

### A.7: sessionDebriefRouter

**Location**: `src/server/api/routers/session-debrief.ts`

**Procedures**:
| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `generateAndSave` | mutation | `{ sessionId, locale?, timezone?, skipIfActive? }` | Generate debrief |
| `regenerate` | mutation | `{ sessionId, locale?, timezone? }` | Regenerate |
| `listBySession` | query | `{ sessionId, includeInactive?, limit? }` | Debriefs for session |
| `listRecent` | query | `{ limit }` | Recent debriefs |
| `markViewed` | mutation | `{ sessionId, debriefId? }` | Mark viewed |
| `togglePinned` | mutation | `{ sessionId, debriefId? }` | Toggle pin |
| `dismiss` | mutation | `{ sessionId, debriefId? }` | Dismiss |
| `bulkGenerate` | mutation | `{ sessionIds, locale? }` | Bulk generate |

**Service Layer**: `~/server/api/services/session-debrief.ts`

- `generateAndPersistDebrief()` - Main generation function
- `bulkGenerateAndPersistDebriefs()` - Bulk generation
- Uses Vercel AI SDK
- Context gathering via `gatherSessionDebriefContext`

**Rate Limiting**: Custom `AIDebriefRateLimitError`

---

### A.8: healthAdviceRouter

**Location**: `src/server/api/routers/health-advice.ts`

**Procedures**:
| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `save` | mutation | `{ sessionId, request, response, responseTimeMs?, modelUsed? }` | Save AI advice |
| `saveWithWellness` | mutation | `{ sessionId, request, response, wellnessDataId? }` | Save with wellness |
| `getBySessionId` | query | `{ sessionId }` | Get advice |
| `getHistory` | query | `{ limit, offset }` | Advice history |
| `updateAcceptedSuggestions` | mutation | `{ sessionId, acceptedCount }` | Update count |
| `delete` | mutation | `{ sessionId }` | Delete |
| `bulkSave` | mutation | `{ entries }` | Bulk save |

**Schemas**:

- `healthAdviceRequestSchema`, `healthAdviceResponseSchema`
- `enhancedHealthAdviceRequestSchema` (with wellness)

---

### A.9: wellnessRouter

**Location**: `src/server/api/routers/wellness.ts`

**Procedures**:
| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `save` | mutation | `{ sessionId, energyLevel, sleepQuality, deviceTimezone, notes?, hasWhoopData, whoopData? }` | Save wellness |
| `getBySessionId` | query | `{ sessionId }` | Get by session |
| `getHistory` | query | `{ limit, offset, startDate?, endDate? }` | History |
| `getStats` | query | `{ startDate?, endDate? }` | Stats |
| `getById` | query | `{ id }` | By ID |

**Rate Limiting**: Uses `rateLimitMiddleware` with `WELLNESS_RATE_LIMIT`

**Anti-backfill**: Validates dates are current/recent

---

### A.10: suggestionsRouter

**Location**: `src/server/api/routers/suggestions.ts`

**Procedures**:
| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `trackInteraction` | mutation | `{ sessionId, exerciseName, setId, setIndex, suggestedWeightKg?, suggestedReps?, suggestedRestSeconds?, suggestionRationale?, action, acceptedWeightKg?, acceptedReps?, progressionType?, readinessScore?, plateauDetected?, interactionTimeMs? }` | Track suggestion |
| `getAnalytics` | query | `{ days }` | Analytics |

**Analytics**: Acceptance rates, exercise stats

---

### A.11: insightsRouter

**Location**: `src/server/api/routers/insights.ts`

**Procedures**:
| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `getExerciseInsights` | query | `{ exerciseName, templateExerciseId?, unit, limitSessions, offsetSessions, excludeSessionId? }` | Exercise insights |
| `getSessionInsights` | query | `{ sessionId }` | Session insights |
| `exportWorkoutsCSV` | query | `{ startDate, endDate, exerciseName? }` | Export data |

**Key Logic**:

- 1RM estimation (Epley formula)
- Unit conversion (kg/lbs)
- Volume sparklines
- Recommendations based on history

---

### A.12: recoveryPlannerRouter

**Location**: `src/server/api/routers/recovery-planner.ts`

**Procedures**:
| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `generateRecommendation` | query | `{ templateId?, workoutDate, plannedWorkout, recoveryData, userPreferences }` | Generate recommendation |
| `getHistory` | query | `{ limit, offset }` | History |
| `recordUserAction` | mutation | `{ plannerId?, userAction, userActionReason?, recommendation?, intensityAdjustment?, volumeAdjustment?, reasoning?, confidence? }` | Record action |
| `saveRecommendation` | mutation | `{ sessionId, templateId?, recommendation, intensityAdjustment, volumeAdjustment, reasoning, recoveryData, strategy, sensitivity, plannedWorkoutJson? }` | Save |

**Utilities**: `generateSessionPlannerRecommendation`, `validateRecoveryData`

---

### A.13: plateauMilestoneRouter

**Location**: `src/server/api/routers/plateau-milestone.ts`

**Procedures**:
| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `getKeyLifts` | query | `{ limit, offset, trackingOnly? }` | Get key lifts |
| `addKeyLift` | mutation | `{ masterExerciseId, isTracking, maintenanceMode }` | Add key lift |
| `toggleKeyLiftTracking` | mutation | `{ id, isTracking }` | Toggle tracking |
| `removeKeyLift` | mutation | `{ id }` | Remove |
| `getPlateaus` | query | `{ limit, offset, status?, exerciseId? }` | Get plateaus |
| `detectPlateau` | mutation | `{ masterExerciseId }` | Detect plateau |
| `getMilestones` | query | `{ limit, offset, status?, exerciseId? }` | Get milestones |
| `createMilestone` | mutation | `{ definition }` | Create milestone |
| `updateMilestone` | mutation | `{ id, definition }` | Update |
| `deleteMilestone` | mutation | `{ id }` | Delete |
| `getForecasts` | query | `{ limit, exerciseId? }` | Get PR forecasts |
| `getDashboardCard` | query | - | Dashboard card data |
| `getRecommendations` | query | `{ plateauId? }` | Recommendations |
| `dismissPlateau` | mutation | `{ id }` | Dismiss plateau |

**Key Logic**:

- Plateau detection algorithms
- Milestone generation and tracking
- PR forecasting

**Utilities**:

- `plateau-detection.ts`
- `pr-forecasting.ts`
- `milestone-defaults.ts`
- `milestone-checking.ts`
- `plateau-recommendations.ts`

---

### A.14: preferencesRouter

**Location**: `src/server/api/routers/preferences.ts`

**Procedures**:
| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `get` | query | - | Get preferences |
| `update` | mutation | `{ defaultWeightUnit?, predictive_defaults_enabled?, right_swipe_action?, enable_manual_wellness?, progression_type?, linear_progression_kg?, percentage_progression?, targetWorkoutsPerWeek? }` | Update |

**Schemas**:

```typescript
progression_type: z.enum(["linear", "percentage", "adaptive"]);
right_swipe_action: z.enum(["collapse_expand", "none"]);
```

---

### A.15: webhooksRouter

**Location**: `src/server/api/routers/webhooks.ts`

**Procedures**:
| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `getRecentEvents` | query | `{ limit, provider? }` | Recent events |
| `getEventById` | query | `{ id }` | Event by ID |
| `getStats` | query | - | Statistics |

---

### A.16: Utility Files (Reusable Logic)

**Location**: `src/server/api/utils/`

| File                         | Purpose                                       |
| ---------------------------- | --------------------------------------------- |
| `exercise-calculations.ts`   | Volume, progression, consistency calculations |
| `plateau-detection.ts`       | Plateau detection algorithm                   |
| `pr-forecasting.ts`          | PR forecasting                                |
| `milestone-defaults.ts`      | Default milestone generation                  |
| `milestone-checking.ts`      | Milestone progress checking                   |
| `plateau-recommendations.ts` | Plateau recommendations                       |
| `algorithmic-planner.ts`     | Algorithmic workout planning                  |
| `playbook-context.ts`        | Context building for playbook                 |
| `recovery-planner.ts`        | Recovery-based recommendations                |
| `whoop-authorization.ts`     | WHOOP OAuth handling                          |
| `session-debrief.ts`         | Debrief context gathering                     |

---

### A.17: Service Files

**Location**: `src/server/api/services/`

| File                      | Purpose                    |
| ------------------------- | -------------------------- |
| `session-debrief.ts`      | Debrief generation with AI |
| `workout-save-service.ts` | Complex workout save logic |

---

## Appendix B: Rate Limiting Decision

**Decision**: Defer custom rate limiting to Phase 5.

**Rationale**: Use TanStack Start's built-in rate limiting for basic protection during migration.

**Required for Phase 5**:

- Port `templateRateLimit` from `~/lib/rate-limit-middleware`
- Port `workoutRateLimit`
- Port `apiCallRateLimit`
- Port `asTrpcMiddleware` wrapper
- Implement in TanStack Start middleware pattern

---

## Appendix C: Error Handling Pattern

Current tRPC uses `TRPCError` with custom formatting:

```typescript
// Error formatter sanitizes production messages
const sanitizeMessage = (message: string): string => {
  // Remove sensitive patterns
  const sensitivePatterns = [
    /invalid input syntax/i,
    /duplicate key value violates/i,
    // ... more patterns
  ];
  // Returns generic message in production
};
```

**Porting**: Create similar error handling in Server Functions

---

## Appendix D: Chunking Strategy (Keep Existing)

D1 has variable limit of ~100 per statement. Continue using:

- `chunkedBatch(db, items, callback, { limit: 90 })`
- `whereInChunks(ids, callback)` for IN clauses
- `getInsertChunkSize(items)` helper

**Location**: `src/server/db/chunk-utils.ts` - unchanged

---

## Appendix E: SuperJSON Replacement

Current: tRPC uses `superjson` for serialization

Replacement in TanStack Start:

- Use standard `JSON.stringify`/`JSON.parse`
- TanStack Query handles date serialization automatically
- Server Functions use native fetch (JSON-native)

---

## Appendix F: PostHog Analytics

Routers tracking events:

- `playbookRouter` - playbook.created, playbook.accepted, etc.
- `sessionDebriefRouter` - session_debrief interactions

**Porting**: Keep `getPosthog()` calls, update to work in Server Functions
