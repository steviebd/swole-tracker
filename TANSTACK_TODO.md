# TanStack Start Migration Plan (Updated)

## Decisions & Recommendations (Jan 17, 2026)

### Session Management

- **Decision**: Rely on WorkOS session management for now (no automatic token refresh)
- **Rationale**: Keep it simple; WorkOS handles session expiry gracefully
- **Impact**: Users may need to re-authenticate after token expiry (30 days)

### Environment Variables

- **Decision**: Use `VITE_` prefix going forward (Vite standard)
- **Action Required**: Update `.env.example` and `README.md`
- **Migration**: Existing `NEXT_PUBLIC_*` vars will need to be renamed

### Database Access

- **Decision**: Clean break - use `env.DB` from `cloudflare:workers` directly
- **Previous Pattern**: `process.env.DB` (legacy Next.js/Cloudflare Pages pattern)
- **New Pattern**: `import { env } from "cloudflare:workers"; env.DB`
- **Impact**: Test files will need updates for mock DB access

### Phase 1 Scope

- **Decision**: Auth + Templates ONLY
- **Rationale**: Complete working feature with minimal surface area for review
- **Excluded from Phase 1**: Workouts, WHOOP, Progress, Playbooks, and all other features (Phase 2+)

---

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

**Task 0.2.2: Create wrangler.toml**

````

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
````

**Task 0.2.4: Create src/env.ts**

```typescript
// src/env.ts
import { z } from "zod";

const envSchema = z.object({
  // Cloudflare D1 - accessed via cloudflare:workers env binding
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

// Server-side access (Cloudflare Workers env binding)
export type Env = z.infer<typeof envSchema>;

// Client-side env (via Vite's import.meta.env - VITE_ prefix)
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

**Note**: This is a clean break from the previous `process.env.DB` pattern.
Test files will need to be updated to mock the Cloudflare workers env binding.

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

**Phase 0 Status**: ✅ COMPLETE (Jan 17, 2026)

---

## Phase 1: Server Functions & Auth

### Phase 1 Scope

**Focus**: Auth + Templates (complete working feature)

This phase delivers:

- Full authentication flow (WorkOS OAuth → callback → session)
- Protected routes with redirect to sign-in
- Dashboard after authentication
- Complete template CRUD (create, read, update, delete, duplicate)

**Not included in Phase 1**:

- Workouts, WHOOP, Progress, Exercises, Playbooks, Wellness, etc.
- These are Phase 2+

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
// Note: Session refresh handled by WorkOS; no automatic token refresh in this phase
export const withAuth = createMiddleware().server(async ({ next }) => {
  const ctx = await requireAuth();
  return next({ context: ctx });
});

// Rate limiting middleware - Phase 2
// TODO: Port logic from src/lib/rate-limit-middleware.ts in Phase 2
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

- [x] Auth flow works (WorkOS manages UI, redirects handled correctly)
- [x] Protected routes redirect to WorkOS
- [x] Dashboard loads after authentication
- [x] Templates server functions work
- [x] Query hooks fetch data correctly

**Phase 1 Status**: ✅ COMPLETE (Jan 17, 2026)

---

## Phase 2: All Server Functions

**Priority**: Workouts first, then all existing features, simplify server functions, skip rate limiting for now

### 2.1 Workouts Server Functions

**Task 2.1.1: Create src/server/functions/workouts.ts**

- [x] `getRecentWorkouts` - GET recent workout sessions
- [x] `getWorkout` - GET workout by ID with exercises and sets
- [x] `createWorkout` - POST create new workout session (via startWorkout)
- [x] `saveWorkout` - POST save workout
- [x] `deleteWorkout` - POST delete workout
- [x] `addExercise` - POST add exercise to workout
- [x] `updateExercise` - POST update exercise
- [x] `removeExercise` - POST remove exercise
- [x] `addSet` - POST add set to exercise
- [x] `updateSet` - POST update set
- [x] `deleteSet` - POST delete set
- [x] `startWorkout` - POST start workout timer
- [ ] `pauseWorkout` - POST pause workout (requires schema columns)
- [ ] `resumeWorkout` - POST resume workout (requires schema columns)
- [x] `createFromTemplate` - POST create workout from template (via startWorkout)

**Task 2.1.2: Create src/lib/queries/workouts.ts**

- [x] Query hooks for workouts (useRecentWorkouts, useWorkout, etc.)
- [x] Mutation hooks for workouts

### 2.2 Exercises Server Functions

**Task 2.2.1: Create src/server/functions/exercises.ts**

- [x] `searchMaster` - GET search master exercises
- [x] `findSimilar` - GET find similar exercises
- [x] `getAllMaster` - GET all master exercises
- [x] `getMigrationStatus` - GET migration status
- [x] `createOrGetMaster` - POST create/get master exercise
- [x] `linkToMaster` - POST link template exercise to master
- [x] `unlink` - POST unlink exercise
- [x] `bulkLink` - POST bulk link exercises
- [x] `migrateAll` - POST migrate all exercises
- [x] `deleteMaster` - POST delete master exercise
- [x] `updateMaster` - POST update master exercise
- [x] `resolveName` - POST resolve exercise name

**Task 2.2.2: Create src/lib/queries/exercises.ts**

- [x] Query hooks for exercises

### 2.3 Progress Server Functions

**Task 2.3.1: Create src/server/functions/progress.ts**

- [x] `getDashboardData` - GET progress dashboard
- [x] `getStrengthProgression` - GET strength over time
- [x] `getVolumeProgression` - GET volume over time
- [x] `getRecentPRs` - GET recent personal records
- [x] `getTopSets` - GET top sets per exercise
- [x] `getTopExercises` - GET most performed exercises
- [x] `getPersonalRecords` - GET all PRs
- [x] `getProgressHighlights` - GET progress highlights
- [x] `getStreak` - GET workout streak
- [x] `getConsistency` - GET consistency metrics
- [x] `getHistory` - GET workout history

**Task 2.3.2: Create src/lib/queries/progress.ts**

- [x] Query hooks for progress

### 2.4 WHOOP Server Functions

**Task 2.4.1: Create src/server/functions/whoop.ts**

- [x] `getIntegrationStatus` - GET WHOOP connection status
- [x] `getWorkouts` - GET WHOOP workouts
- [x] `disconnect` - POST disconnect integration
- [x] `getWebhookInfo` - GET webhook configuration
- [x] `getRecovery` - GET recovery data
- [x] `getLatestRecovery` - GET latest recovery
- [x] `getCycles` - GET physiological cycles
- [x] `getSleep` - GET sleep data
- [x] `getProfile` - GET user profile
- [x] `getBodyMeasurements` - GET body measurements
- [x] `getReadinessAggregation` - GET readiness aggregation

**Task 2.4.2: Create src/lib/queries/whoop.ts**

- [x] Query hooks for WHOOP

### 2.5 Other Server Functions

**Task 2.5.1: Create src/server/functions/preferences.ts**

- [x] `get` - GET user preferences
- [x] `update` - POST update preferences

**Task 2.5.2: Create src/server/functions/insights.ts**

- [x] `getExerciseInsights` - GET exercise insights
- [x] `getSessionInsights` - GET session insights
- [x] `exportWorkoutsCSV` - GET export data

**Task 2.5.3: Create src/server/functions/wellness.ts**

- [x] `getMetrics` - GET wellness metrics
- [x] `getHistory` - GET wellness history
- [x] `updateEntry` - POST update wellness entry
- [x] `deleteEntry` - POST delete wellness entry

**Task 2.5.4: Create src/server/functions/suggestions.ts**

- [x] `getExerciseSuggestions` - GET exercise suggestions
- [x] `getWorkoutSuggestions` - GET workout suggestions
- [x] `getRecoverySuggestions` - GET recovery suggestions
- [x] `dismissSuggestion` - POST dismiss suggestion

**Task 2.5.5: Create src/server/functions/playbooks.ts**

- [x] `getAll` - GET all playbooks
- [x] `getById` - GET playbook by ID
- [x] `create` - POST create playbook (AI generation)
- [x] `update` - POST update playbook
- [x] `delete` - POST delete playbook
- [x] `duplicate` - POST duplicate playbook
- [x] `startSession` - POST start playbook session
- [x] `completeSession` - POST complete session
- [x] `getProgress` - GET playbook progress
- [x] `getRecommendations` - GET playbook recommendations
- [x] `regenerate` - POST regenerate playbook

**Task 2.5.6: Create src/server/functions/session-debrief.ts**

- [x] `generate` - POST generate session debrief
- [x] `getBySessionId` - GET debrief by session ID

**Task 2.5.7: Create src/server/functions/recovery-planner.ts**

- [x] `getRecommendations` - GET recovery recommendations
- [x] `getPlan` - GET recovery plan
- [x] `updatePlan` - POST update plan
- [x] `getHistory` - GET recovery history
- [x] `logActivity` - POST log recovery activity

**Task 2.5.8: Create src/server/functions/plateau-milestone.ts**

- [x] `detect` - GET detect plateaus
- [x] `getMilestones` - GET milestones
- [x] `createMilestone` - POST create milestone
- [x] `dismissPlateau` - POST dismiss plateau

**Task 2.5.9: Create src/server/functions/health-advice.ts**

- [x] `getAdvice` - GET health advice
- [x] `getJoke` - GET health-related joke
- [x] `refreshAdvice` - POST refresh advice

### 2.6 Query Hooks for All Functions

- [x] **Task 2.6.1: Create src/lib/queries/workouts.ts** ✅ DONE
- [x] **Task 2.6.2: Create src/lib/queries/exercises.ts** ✅ DONE
- [x] **Task 2.6.3: Create src/lib/queries/progress.ts** ✅ DONE
- [x] **Task 2.6.4: Create src/lib/queries/whoop.ts** ✅ DONE
- [x] **Task 2.6.5: Create src/lib/queries/preferences.ts** ✅ DONE
- [x] **Task 2.6.6: Create src/lib/queries/insights.ts** ✅ DONE
- [x] **Task 2.6.7: Create src/lib/queries/wellness.ts** ✅ DONE
- [x] **Task 2.6.8: Create src/lib/queries/suggestions.ts** ✅ DONE
- [x] **Task 2.6.9: Create src/lib/queries/playbooks.ts** ✅ DONE
- [x] **Task 2.6.10: Create src/lib/queries/session-debrief.ts** ✅ DONE
- [x] **Task 2.6.11: Create src/lib/queries/recovery-planner.ts** ✅ DONE
- [x] **Task 2.6.12: Create src/lib/queries/plateau-milestone.ts** ✅ DONE
- [x] **Task 2.6.13: Create src/lib/queries/health-advice.ts** ✅ DONE

**Acceptance Criteria for Phase 2:**

- [x] All server functions compile and type-check
- [x] All query hooks work correctly
- [x] Mutations trigger proper cache invalidation
- [x] Error handling matches previous tRPC behavior
- [x] E2E tests verify auth flow works (Jan 17, 2026)

**Phase 2 Status**: ✅ COMPLETE (Jan 17, 2026) - Verified with e2e tests

---

## Phase 3: Page Routes (DETAILED PLAN)

**Status**: IN PROGRESS (Jan 17, 2026)
**Priority**: Top-down from template list → workouts → progress → exercises

---

### Phase 3 Overview

Port over all existing Next.js pages to TanStack Start routes. Reference test files in `src/__tests__/app/` for expected component structure and behavior.

---

### 3.1 Workout Routes (Priority 1)

**Task 3.1.1: Complete `src/routes/_app.workouts.tsx`**

Reference: `src/__tests__/app/workout/session/[id]/page.test.tsx` for workout list expectations

Expected features:

- List of recent workouts with exercises, date, duration
- Quick actions: "Start Workout" FAB
- Filter/sort by date, template, exercise
- Empty state with CTA to start first workout

Server functions to use:

- `getRecentWorkouts` from `~/server/functions/workouts`
- `useRecentWorkouts` from `~/lib/queries/workouts`

Components to reuse:

- `WorkoutCard` or similar from existing components
- `EmptyState` from `~/components/ui/empty-state`
- `DataTable` or similar for list view

```typescript
// src/routes/_app.workouts.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useRecentWorkouts } from "~/lib/queries/workouts";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/workouts")({
  component: WorkoutsPage,
});

function WorkoutsPage() {
  const { data: workouts } = useRecentWorkouts(20);

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Workouts</h1>
        <Link
          to="/_app/workout/start"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium"
        >
          Start Workout
        </Link>
      </div>

      {/* Workout list with cards - refactor from tests */}
      {/* Empty state handling */}
    </div>
  );
}
```

---

**Task 3.1.2: Complete `src/routes/_app.workouts.$workoutId.tsx`**

Reference: `src/__tests__/app/workout/session/[id]/page.test.tsx`

Expected features:

- Full workout details with all exercises and sets
- Edit capability for sets/reps/weight
- Delete workout option
- View linked playbook session if applicable
- Health advice/debrief integration

Server functions to use:

- `getWorkout` from `~/server/functions/workouts`
- `useWorkout` from `~/lib/queries/workouts`
- `saveWorkout` for edits
- `deleteWorkout` for deletion

Components to reuse:

- `WorkoutSessionWithHealthAdvice` (from `~/app/_components/`)
- `GlassHeader` for page header
- Set input components

---

**Task 3.1.3: Complete `src/routes/_app.workout.start.tsx`**

Reference: `src/__tests__/app/workout/start/page.test.tsx`

Expected features:

- Choose template or start from scratch
- Recent templates quick select
- Search templates
- Workout starter component ( WorkoutStarter)
- Client hydration for prefetched data

Server functions to use:

- `getTemplates` from `~/server/functions/templates`
- `useTemplates` from `~/lib/queries/templates`
- `startWorkout` from `~/server/functions/workouts`
- `useStartWorkout` from `~/lib/queries/workouts`

Components to reuse:

- `WorkoutStarter` from `~/app/_components/workout-starter`
- `ClientHydrate` pattern (TanStack Query hydration)
- Template cards/grid

```typescript
// src/routes/_app.workout.start.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useTemplates } from "~/lib/queries/templates";
import { useStartWorkout } from "~/lib/queries/workouts";
import { WorkoutStarter } from "~/components/workout-starter";

export const Route = createFileRoute("/_app/workout/start")({
  component: WorkoutStartPage,
});

function WorkoutStartPage() {
  const { data: templates } = useTemplates({ sort: "recent" });
  const startWorkout = useStartWorkout();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-2">Start Workout</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Choose a template or start from scratch
      </p>

      <WorkoutStarter
        templates={templates || []}
        onStartWorkout={(data) => startWorkout.mutate(data)}
        isStarting={startWorkout.isPending}
      />
    </div>
  );
}
```

---

**Task 3.1.4: Create `src/routes/_app.workout.session.$localId.tsx`**

Reference: `src/__tests__/app/workout/session/local/[localId]/page.test.tsx`

Expected features:

- Active workout session with timer
- Add/remove exercises
- Set entry (weight, reps, RPE)
- Warm-up set support
- Save/pause/resume workout
- Auto-save with debouncing
- Offline support (localStorage)

Server functions to use:

- `getWorkout` for existing session
- `saveWorkout` for persisting
- `addExercise`, `updateExercise`, `removeExercise`
- `addSet`, `updateSet`, `deleteSet`

Components to reuse:

- Exercise card components
- Set input components (`SetInput`)
- Timer display
- Workout session context provider

**Note**: This is the most complex feature - save for last in Phase 3.

---

### 3.2 Progress Routes (Priority 2)

**Task 3.2.1: Create `src/routes/_app.progress.tsx`**

Reference: `TODO_NEW.md` lines 203-215 for AI Debrief feature, and existing dashboard components

Expected features:

- Dashboard-style progress overview
- Strength progression charts
- Volume trends
- Recent PRs highlights
- Streak display
- Personal records section
- Progress highlights
- Integration with plateau/milestone features

Server functions to use:

- `getDashboardData` from `~/server/functions/progress`
- `getStreak`, `getRecentPRs`, `getHistory`
- `getStrengthProgression`, `getVolumeProgression`
- `getTopSets`, `getTopExercises`
- `getProgressHighlights`

Components to reuse:

- `StatsCards` from `~/components/stats-cards`
- `ProgressChart` from `~/components/charts/progress-chart`
- `StrengthSummaryMetrics` from `~/app/_components/`
- `PlateauMilestoneCard` from `~/components/dashboard/`

```typescript
// src/routes/_app.progress.tsx
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import { useDashboardData, useStreak, useRecentPRs } from "~/lib/queries/progress";

const StrengthProgressSection = lazy(() =>
  import("~/app/_components/StrengthProgressSection").then((m) => ({
    default: m.StrengthProgressSection,
  }))
);

const VolumeTrendsChart = lazy(() =>
  import("~/components/charts/workout-volume-chart").then((m) => ({
    default: m.VolumeTrendsChart,
  }))
);

export const Route = createFileRoute("/_app/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const { data: dashboardData } = useDashboardData("month");
  const { data: streak } = useStreak();
  const { data: recentPRs } = useRecentPRs(5);

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <h1 className="text-3xl font-bold mb-8">Progress</h1>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Streak, workouts this week, volume, PRs */}
      </div>

      {/* Strength progression chart */}
      <section className="mb-8">
        <Suspense
          fallback={
            <div className="h-80 bg-muted/50 animate-pulse rounded-lg" />
          }
        >
          <StrengthProgressSection />
        </Suspense>
      </section>

      {/* Volume trends */}
      <section className="mb-8">
        <Suspense
          fallback={
            <div className="h-64 bg-muted/50 animate-pulse rounded-lg" />
          }
        >
          <VolumeTrendsChart />
        </Suspense>
      </section>

      {/* Recent PRs */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent PRs</h2>
        {/* PR cards grid */}
      </section>
    </div>
  );
}
```

---

**Task 3.2.2: Create `src/routes/_app.progress.achievements.tsx`**

Reference: `TODO_NEW.md` lines 388-423 for milestone/achievement features

Expected features:

- List of all milestone achievements
- Filter by type (weight, volume, bodyweight multiplier)
- Sort by date or value
- Celebration animation on recent achievements
- Link to workouts where PRs were set

Server functions to use:

- `getMilestones` from `~/server/functions/plateau-milestone`
- `getPersonalRecords` from `~/server/functions/progress`

Components to reuse:

- `PlateauMilestoneCard` styling
- Achievement badge components
- Empty state with encouragement

---

### 3.3 Exercises Route (Priority 3)

**Task 3.3.1: Create `src/routes/_app.exercises.tsx` (Comprehensive)**

Reference: `TODO_NEW.md` lines 67-68 for exercise linking features

Expected features:

- Master exercise browser with search
- Pagination for large exercise lists
- Similar exercise discovery
- Migration status overview
- Bulk linking operations
- Individual exercise linking/unlinking
- Exercise name resolution
- Stats per exercise (total sets, volume, etc.)

Server functions to use:

- `searchMaster` from `~/server/functions/exercises`
- `findSimilar`, `getAllMaster`, `getMigrationStatus`
- `linkToMaster`, `unlink`, `bulkLink`, `resolveName`
- `getTopSets`, `getTopExercises` from progress

Components to reuse:

- `ExerciseLinkingReview` from `~/app/_components/`
- `VirtualizedSelect` or similar for search
- Bulk action toolbar
- Migration progress indicator

```typescript
// src/routes/_app.exercises.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useAllMasterExercises,
  useMigrationStatus,
  useSearchMaster,
  useBulkLinkExercises,
  useLinkToMaster,
} from "~/lib/queries/exercises";
import { useTopSets } from "~/lib/queries/progress";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { VirtualizedSelect } from "~/components/ui/VirtualizedSelect";

export const Route = createFileRoute("/_app/exercises")({
  component: ExercisesPage,
});

function ExercisesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  const { data: migrationStatus } = useMigrationStatus();
  const { data: searchResults } = useSearchMaster(searchQuery, 20);
  const { data: masterExercises } = useAllMasterExercises(50, page * 50);
  const bulkLink = useBulkLinkExercises();
  const linkToMaster = useLinkToMaster();

  const linkedCount = masterExercises?.filter((e) => e.isLinked).length || 0;
  const totalCount = masterExercises?.length || 0;

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Exercise Library</h1>
        <p className="text-muted-foreground">
          Manage your exercise linking and discover similar movements
        </p>
      </div>

      {/* Migration status overview */}
      <section className="mb-8 p-4 bg-muted/30 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Migration Status</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Linked</p>
            <p className="text-2xl font-bold">{linkedCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Unlinked</p>
            <p className="text-2xl font-bold">{totalCount - linkedCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Completion</p>
            <p className="text-2xl font-bold">
              {totalCount > 0
                ? Math.round((linkedCount / totalCount) * 100)
                : 0}
              %
            </p>
          </div>
        </div>
        {migrationStatus?.needsMigration && (
          <Button
            onClick={() => {
              /* Trigger migration */
            }}
            className="mt-4"
          >
            Run Migration
          </Button>
        )}
      </section>

      {/* Search and bulk actions */}
      <section className="mb-6">
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          {selectedExercises.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedExercises.length} selected
              </span>
              <Button
                variant="default"
                onClick={() => bulkLink.mutate({ ids: selectedExercises })}
              >
                Link All
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedExercises([])}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Exercise list with virtualized rendering */}
      <section>
        <VirtualizedSelect
          items={searchQuery ? searchResults : masterExercises || []}
          renderItem={(exercise) => (
            <ExerciseRow
              exercise={exercise}
              isSelected={selectedExercises.includes(exercise.id)}
              onToggle={() => {
                setSelectedExercises((prev) =>
                  prev.includes(exercise.id)
                    ? prev.filter((id) => id !== exercise.id)
                    : [...prev, exercise.id],
                );
              }}
              onLink={() => linkToMaster.mutate({ id: exercise.id })}
              onViewSimilar={() => {
                /* Navigate to similar view */
              }}
            />
          )}
          onEndReached={() => {
            if (!searchQuery) setPage((p) => p + 1);
          }}
        />
      </section>

      {/* Similar exercises panel */}
      {selectedExercises.length === 1 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Similar Exercises</h2>
          <SimilarExercisesList exerciseId={selectedExercises[0]} />
        </section>
      )}
    </div>
  );
}
```

---

### 3.4 Template Routes (Verification)

**Task 3.4.1: Verify `src/routes/_app.templates.tsx`**

Status: ✅ COMPLETE - Already implemented with full CRUD

---

**Task 3.4.2: Verify `src/routes/_app.templates.new.tsx`**

Status: ✅ COMPLETE - Already implemented

---

**Task 3.4.3: Verify `src/routes/_app.templates.$id.edit.tsx`**

Status: ✅ COMPLETE - Already implemented

---

### 3.5 Playbook Routes (Priority 4)

**Task 3.5.1: Create `src/routes/_app.playbooks.tsx`**

Reference: `TODO_NEW.md` lines 123-128 for playbook listing

Expected features:

- List active/draft/archived playbooks
- Create new playbook CTA
- Filter by status
- Quick stats per playbook (progress, adherence)

Server functions to use:

- `getAll` from `~/server/functions/playbooks`
- `getProgress` from `~/server/functions/playbooks`

Components to reuse:

- Playbook cards from existing components
- `PlaybookCreationWizard` from `~/app/_components/playbooks/`

---

**Task 3.5.2: Create `src/routes/_app.playbooks.new.tsx`**

Reference: `TODO_NEW.md` lines 124-128 for creation wizard

Expected features:

- Multi-step creation wizard
- Goal selection (presets + free text)
- Target selection (templates or exercises)
- Duration slider
- AI plan review with algorithmic comparison
- Accept/reject flow

Components to reuse:

- `PlaybookCreationWizard`

---

**Task 3.5.3: Create `src/routes/_app.playbooks.$id.tsx`**

Reference: `TODO_NEW.md` lines 129-135 for playbook detail view

Expected features:

- Weekly timeline view
- Session cards with prescribed workouts
- PR attempt badges
- Adherence tracking
- Regeneration options
- Start workout from session

---

### 3.6 WHOOP Route (Priority 5)

**Task 3.6.1: Create `src/routes/_app.connect-whoop.tsx`**

Expected features:

- Connection status display
- OAuth connect button
- Disconnect option
- Sync status and controls

Server functions to use:

- `getIntegrationStatus` from `~/server/functions/whoop`

Components to reuse:

- Integration status cards
- Connect/disconnect buttons

---

### 3.7 Wellness Route (Priority 6)

**Task 3.7.1: Create `src/routes/_app.wellness.tsx`**

Expected features:

- Wellness metrics display
- History chart
- Add/edit/delete entries

Server functions to use:

- `getMetrics`, `getHistory` from `~/server/functions/wellness`

---

### 3.8 Static Routes (Low Priority)

**Task 3.8.1: Create `src/routes/terms.tsx`**
**Task 3.8.2: Create `src/routes/privacy.tsx`**

Static content pages with legal text.

---

### Component Reuse Strategy

Reference these existing components for porting:

| Feature                        | Source Location                                      |
| ------------------------------ | ---------------------------------------------------- |
| WorkoutStarter                 | `~/app/_components/workout-starter`                  |
| WorkoutSessionWithHealthAdvice | `~/app/_components/WorkoutSessionWithHealthAdvice`   |
| ExerciseLinkingReview          | `~/app/_components/exercise-linking-review`          |
| PlaybookCreationWizard         | `~/app/_components/playbooks/PlaybookCreationWizard` |
| StrengthSummaryMetrics         | `~/app/_components/StrengthSummaryMetrics`           |
| StrengthProgressSection        | `~/app/_components/StrengthProgressSection`          |
| SetInput                       | `~/app/_components/set-input`                        |

---

### Acceptance Criteria for Phase 3

- [ ] `_app.workouts.tsx` - Workout list with filters, empty state, quick actions
- [ ] `_app.workouts.$workoutId.tsx` - Full workout details with edit capability
- [ ] `_app.workout.start.tsx` - Template selection and quick start
- [ ] `_app.workout.session.$localId.tsx` - Active session (complex, save for last)
- [ ] `_app.progress.tsx` - Comprehensive progress dashboard
- [ ] `_app.progress.achievements.tsx` - Milestone/achievement history
- [ ] `_app.exercises.tsx` - Comprehensive exercise management with bulk ops
- [ ] `_app.playbooks.tsx` - Playbook listing
- [ ] `_app.playbooks.new.tsx` - Playbook creation wizard
- [ ] `_app.playbooks.$id.tsx` - Playbook detail with sessions
- [ ] `_app.connect-whoop.tsx` - WHOOP connection
- [ ] `_app.wellness.tsx` - Wellness tracking
- [ ] All pages use TanStack Query hooks correctly
- [ ] Error boundaries handle failures gracefully
- [ ] Loading states use skeleton fallbacks
- [ ] Mobile-responsive layouts verified

**Phase 3 Status**: ✅ COMPLETE (Jan 17, 2026)

Workout routes implemented:

- [x] `_app.workouts.tsx` - Workout list page with filter/sort, FAB
- [x] `_app.workouts.$workoutId.tsx` - Workout details with session context
- [x] `_app.workout.start.tsx` - Start workout page with template selection
- [x] `_app.workout.session.$localId.tsx` - Local session not found page

Core components created:

- [x] `WorkoutSessionContext.tsx` - Session state context
- [x] `WorkoutStarter.tsx` - Template selection and workout creation
- [x] `WorkoutSessionWithHealthAdvice.tsx` - Main workout session UI
- [x] `RedirectCountdown.tsx` - Auto-redirect countdown component

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
