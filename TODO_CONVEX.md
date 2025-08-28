# Refactoring Plan: Supabase to Convex and WorkOS

This document outlines the plan for refactoring the application from a Supabase/Drizzle stack to a Convex/WorkOS stack.

**Note:** This plan assumes a fresh database setup. No data migration from Supabase to Convex will be performed.

## 1. Setup and Configuration

### 1.1. Create Convex Directory

- [ ] Create a new directory named `convex` in the root of the project.

### 1.2. Install Dependencies

- [ ] Install the necessary npm packages:
  ```bash
  bun add convex @convex-dev/workos sonner
  ```

### 1.3. Configure WorkOS Authentication

- [ ] Create a new file `convex/auth.config.ts` with the following content:

  ```typescript
  export default {
    providers: [
      {
        domain: process.env.WORKOS_DOMAIN,
        applicationID: process.env.WORKOS_CLIENT_ID,
      },
    ]
  };
  ```
  *Note: Add `WORKOS_DOMAIN` and `WORKOS_CLIENT_ID` to your environment variables.*

## 2. Schema Definition (in `convex/schema.ts`)

- [ ] Create a `convex/schema.ts` file.
- [ ] Define a `users` table to store user-specific data.
- [ ] Translate the Drizzle schema from `src/server/db/schema.ts` to a Convex schema.

### Best Practices to Follow:

*   **Primary Keys:** Use Convex's built-in `_id` field as the primary key for all documents.
*   **Relationships:** Model relationships between tables using `v.id("tableName")`. For example, `workoutTemplates` will have a `userId: v.id("users")` field.
*   **Timestamps:** Store all timestamps as `v.number()` (milliseconds since epoch). Use Convex's `_creationTime` for `createdAt` fields. Manually set `updatedAt` fields in mutations using `Date.now()`.
*   **JSON Fields:** Use `v.any()` for `raw_data` fields from third-party APIs. For structured JSON like `perf_metrics`, define a `v.object()` schema if possible.
*   **Indexes:** Create indexes for all fields that will be used for querying, especially for enforcing uniqueness.

### Example Schema:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    workosId: v.string(), // From identity.subject
  }).index("by_workosId", ["workosId"]),

  workoutTemplates: defineTable({
    name: v.string(),
    userId: v.id("users"),
    // ... other fields
  }).index("by_userId", ["userId"]),
  
  // ... other tables
});
```

## 3. Backend Implementation (in `convex/` directory)

### 3.1. User Management

- [ ] Create a `convex/users.ts` file.
- [ ] Implement a `getOrCreateUser` internal mutation that checks for an existing user by `workosId` and creates a new one if not found. This should be called from other mutations when a user performs an action for the first time.

### 3.2. Rewrite Data Access Logic

- [ ] For each table in your schema, create a corresponding file in the `convex/` directory (e.g., `convex/workouts.ts`, `convex/sessions.ts`).
- [ ] Rewrite all tRPC procedures as Convex queries or mutations.
- [ ] Set default values for fields at the application level within your mutations.

### 3.3. Enforce Unique Constraints

- [ ] For each field that requires a unique value, create an index in `convex/schema.ts`.
- [ ] In your "create" mutations, query for an existing document with the unique value before inserting a new one. If a document is found, throw a `ConvexError`.

**Example of a unique constraint:**
```typescript
// convex/masterExercises.ts
export const createMasterExercise = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const normalizedName = args.name.toLowerCase().trim();

    const existing = await ctx.db
      .query("masterExercises")
      .withIndex("by_user_normalized_name", (q) =>
        q.eq("userId", identity.subject).eq("normalizedName", normalizedName)
      )
      .unique();

    if (existing) {
      throw new ConvexError("An exercise with this name already exists.");
    }

    // ... insert new document
  },
});
```

### 3.4. Third-Party Integrations (Whoop)

- [ ] Create a `convex/integrations.ts` file.
- [ ] Implement mutations to store and manage Whoop OAuth tokens in the `userIntegrations` table.
- [ ] Create mutations to handle token refresh logic.

## 4. Frontend Implementation

### 4.1. Setup Convex Client

- [ ] In `src/app/layout.tsx`, wrap the application in the `ConvexProvider` component.
- [ ] Configure the `ConvexProvider` with your Convex URL.

### 4.2. Implement Authentication

- [ ] Use the `useConvexAuth()` hook to manage authentication state.
- [ ] Create login, logout, and signup components that use WorkOS for authentication.
- [ ] Use the `<Authenticated>`, `<Unauthenticated>`, and `<AuthLoading>` components from `convex/react` to render different UI based on auth state.

### 4.3. Update Data-Fetching Logic

- [ ] Replace all tRPC queries and mutations with Convex queries and mutations using the `useQuery` and `useMutation` hooks from `convex/react`.

### 4.4. Error Handling

- [ ] In `src/app/layout.tsx`, add a `<Toaster />` component from `sonner`.
- [ ] Create a custom hook (e.g., `useApiMutation`) that wraps `useMutation` and automatically displays a toast notification on error.

**Example `useApiMutation` hook:**
```typescript
// src/hooks/use-api-mutation.ts
import { useMutation } from "convex/react";
import { toast } from "sonner";

export const useApiMutation = (mutation: any) => {
  const apiMutation = useMutation(mutation);

  const mutate = (payload: any) => {
    return apiMutation(payload).catch((error) => {
      toast.error(error.data?.message || "An error occurred");
      throw error;
    });
  };

  return { mutate, ...apiMutation };
};
```

## 5. Cleanup

- [ ] Remove all Supabase-related code, configurations, and dependencies (`@supabase/ssr`, `@supabase/supabase-js`).
- [ ] Remove all Drizzle and PostgreSQL dependencies (`drizzle-orm`, `drizzle-kit`, `postgres`).
- [ ] Delete the `drizzle.config.ts` file.
- [ ] Delete the `drizzle/` directory.
- [ ] Delete the `supabase/` directory.
- [ ] Delete the `src/server/db` directory.
- [ ] Delete the `src/trpc` directory.
- [ ] Delete the `src/server/api` directory.