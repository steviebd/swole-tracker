# Refactoring Plan: Supabase to Convex and WorkOS

This document outlines the plan for refactoring the application from a Supabase/Drizzle stack to a Convex/WorkOS stack.

## 1. Setup and Configuration

### 1.1. Create Convex Directory

- [ ] Create a new directory named `convex` in the root of the project.

### 1.2. Install Dependencies

- [ ] Install the necessary npm packages:
  ```bash
  bun add convex @convex-dev/workos
  ```

### 1.3. Configure WorkOS Authentication

- [ ] Create a new file `convex/auth.config.ts` with the following content:

  ```typescript
  export default {
    providers: [
      {
        domain: "https://<YOUR_WORKOS_DOMAIN>",
        applicationID: "<YOUR_WORKOS_CLIENT_ID>",
      },
    ]
  };
  ```

  *Note: Replace `<YOUR_WORKOS_DOMAIN>` and `<YOUR_WORKOS_CLIENT_ID>` with your actual WorkOS credentials.*

## 2. Schema Migration

- [ ] Translate the Drizzle schema from `src/server/db/schema.ts` to a Convex schema in `convex/schema.ts`.
- [ ] For each table in the Drizzle schema, create a corresponding table in the Convex schema using `defineTable`.
- [ ] Use the `v` validator builder from `convex/values` to define the fields and their types.
- [ ] Model relationships between tables using `v.id("tableName")`.

**Example:**

*Drizzle schema (`src/server/db/schema.ts`):*

```typescript
export const workoutTemplates = createTable(
  "workout_template",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }).notNull(),
    user_id: d.varchar({ length: 256 }).notNull(),
    // ...
  }),
);
```

*Convex schema (`convex/schema.ts`):*

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workoutTemplates: defineTable({
    name: v.string(),
    userId: v.string(), // Will be populated from the authenticated user
    // ...
  }).index("by_userId", ["userId"]),
  // ... other tables
});
```

## 3. Backend Implementation

### 3.1. Rewrite Data Access Logic

- [ ] For each server-side function that interacts with the database, rewrite it as a Convex query or mutation.
- [ ] Create new files in the `convex/` directory for your queries and mutations (e.g., `convex/workouts.ts`, `convex/users.ts`).
- [ ] Use the `query` and `mutation` functions from `convex/server` to define your server-side logic.

**Example:**

*Current tRPC route:*

```typescript
// src/server/api/routers/post.ts
// ...
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // ...
    }),
// ...
```

*New Convex mutation:*

```typescript
// convex/workouts.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createWorkoutTemplate = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;
    await ctx.db.insert("workoutTemplates", {
      name: args.name,
      userId: userId,
    });
  },
});
```

### 3.2. Implement Authorization

- [ ] In each Convex query and mutation, add authorization checks to ensure the user is authenticated and has the necessary permissions.
- [ ] Use `ctx.auth.getUserIdentity()` to get the current user's identity.
- [ ] Throw an error if the user is not authenticated or not authorized.

### 3.3. Handle Third-Party Integrations

- [ ] Investigate how to handle third-party OAuth integrations (like Whoop) with WorkOS.
- [ ] Create Convex mutations to store and manage OAuth tokens in the `userIntegrations` table.

## 4. Frontend Implementation

### 4.1. Replace Supabase Client with Convex Client

- [ ] Remove the Supabase client from your frontend code.
- [ ] Install and configure the `convex/react` package.
- [ ] Wrap your application in the `ConvexProvider` component.

*File to modify: `src/app/layout.tsx`*

### 4.2. Integrate WorkOS Authentication

- [ ] Use the `useConvexAuth()` hook to manage authentication state.
- [ ] Create login, logout, and signup components that use WorkOS for authentication.
- [ ] Update your UI to show different content based on the user's authentication state.

### 4.3. Update Data-Fetching Logic

- [ ] Replace your tRPC queries and mutations with Convex queries and mutations.
- [ ] Use the `useQuery` and `useMutation` hooks from `convex/react` to interact with your Convex backend.

*Files to modify: All files that currently use tRPC.*

## 5. Cleanup

- [ ] Remove all Supabase-related code, configurations, and dependencies.
    -   `@supabase/ssr`
    -   `@supabase/supabase-js`
- [ ] Remove all Clerk-related code, configurations, and dependencies.
- [ ] Remove Drizzle and PostgreSQL dependencies.
    -   `drizzle-orm`
    -   `drizzle-kit`
    -   `postgres`
- [ ] Delete the `drizzle.config.ts` file.
- [ ] Delete the `drizzle/` directory.
- [ ] Delete the `supabase/` directory.
- [ ] Delete the `src/server/db` directory.
- [ ] Delete the `src/trpc` directory.
- [ ] Delete the `src/server/api` directory.
