# Refactoring Plan for Improved Readability and Maintainability

This document outlines a series of proposed refactorings to reduce complexity and improve the readability and maintainability of the codebase. Each section is formatted as a Pull Request Description (PDR) that another developer can use to implement the changes.

## 1. Refactor `ExerciseManager` Component

### Problem

The `ExerciseManager` component (`src/app/_components/exercise-manager.tsx`) is a 700+ line monolith that is responsible for:

*   Managing a complex TanStack Table with sorting, filtering, and row selection.
*   Handling multiple dialogs for creating, editing, and merging exercises.
*   Managing several tRPC mutations for exercise management.

The component's state management is scattered, making it difficult to understand and maintain.

### Proposed Solution

I propose to refactor the `ExerciseManager` component by extracting its logic into custom hooks and breaking it down into smaller, more focused components.

#### a. Create `useExerciseTable` Hook

Create a new custom hook, `useExerciseTable`, to encapsulate all the logic related to the TanStack Table instance.

**`src/hooks/use-exercise-table.ts`**

```typescript
import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  createColumnHelper,
  type ExpandedState,
  type SortingState,
  type ColumnSizingState,
  type ColumnOrderState,
  type RowSelectionState,
  type VisibilityState,
  type ColumnFiltersState,
} from "@tanstack/react-table";

// ... (import other dependencies)

export function useExerciseTable(data: MasterExercise[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  // ... (other table state)

  const columns = useMemo(() => [
    // ... (column definitions)
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: {
      expanded,
      sorting,
      globalFilter: searchTerm,
      // ... (other table state)
    },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    // ... (other table handlers)
  });

  return { table, searchTerm, setSearchTerm };
}
```

#### b. Create `useExerciseMutations` Hook

Create a new custom hook, `useExerciseMutations`, to encapsulate all the tRPC mutations related to exercise management.

**`src/hooks/use-exercise-mutations.ts`**

```typescript
import { api } from "~/trpc/react";

export function useExerciseMutations(onSuccess: () => void) {
  const createMasterExercise = api.exercises.createMasterExercise.useMutation({
    onSuccess,
    // ... (other options)
  });

  const updateMasterExercise = api.exercises.updateMasterExercise.useMutation({
    onSuccess,
    // ... (other options)
  });

  // ... (other mutations)

  return {
    createMasterExercise,
    updateMasterExercise,
    // ... (other mutations)
  };
}
```

#### c. Break Down the Component

Break the `ExerciseManager` component into smaller, more focused components:

*   **`ExerciseTable`**: The main table component that uses the `useExerciseTable` hook.
*   **`ExerciseToolbar`**: The search bar and action buttons.
*   **`CreateEditExerciseDialog`**: The dialog for creating and editing exercises.
*   **`MergeExerciseDialog`**: The dialog for merging exercises.

### Action Items

*   [ ] Create `src/hooks/use-exercise-table.ts`.
*   [ ] Create `src/hooks/use-exercise-mutations.ts`.
*   [ ] Refactor `src/app/_components/exercise-manager.tsx` to use the new hooks and be broken down into smaller components.

## 2. Refactor `WorkoutSession` Component

### Problem

The `WorkoutSession` component (`src/app/_components/workout-session.tsx`) is another massive component (over 800 lines) that manages the entire workout session UI. While it uses a custom hook, `useWorkoutSessionState`, to manage the complex state of the workout, the component itself is still very large and difficult to follow.

### Proposed Solution

I propose to further refactor the `WorkoutSession` component by extracting more of its logic into custom hooks and breaking it down into smaller, more focused components.

#### a. Create `useWorkoutActions` Hook

Create a new custom hook, `useWorkoutActions`, to encapsulate the logic for the workout actions (e.g., saving, deleting, completing).

**`src/hooks/use-workout-actions.ts`**

```typescript
import { useWorkoutSessionState } from "./useWorkoutSessionState";

export function useWorkoutActions(state: WorkoutSessionState) {
  const { saveWorkout, deleteWorkout, buildSavePayload } = state;

  const handleSave = async () => {
    // ... (save logic)
  };

  const handleDelete = async () => {
    // ... (delete logic)
  };

  return { handleSave, handleDelete };
}
```

#### b. Break Down the Component

Break the `WorkoutSession` component into smaller, more focused components:

*   **`ExerciseCard`**: This component already exists, but it could be further simplified by extracting the logic for handling sets into its own component.
*   **`WorkoutActionBar`**: The action bar at the bottom of the screen.
*   **`DeleteWorkoutDialog`**: The confirmation dialog for deleting a workout.
*   **`CompleteWorkoutDialog`**: The dialog for completing a workout.

### Action Items

*   [ ] Create `src/hooks/use-workout-actions.ts`.
*   [ ] Refactor `src/app/_components/workout-session.tsx` to use the new hook and be broken down into smaller components.

## 3. Refactor `TemplateForm` Component

### Problem

The `TemplateForm` component (`src/app/_components/template-form.tsx`) is a complex, multi-step form for creating and editing workout templates. The component is over 600 lines long and contains a lot of logic for managing form state, validation, and optimistic updates.

### Proposed Solution

I propose to refactor the `TemplateForm` component by extracting its form logic into a custom hook and breaking the multi-step form into separate components.

#### a. Create `useTemplateForm` Hook

Create a new custom hook, `useTemplateForm`, to encapsulate the logic for the TanStack Form instance.

**`src/hooks/use-template-form.ts`**

```typescript
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { z } from "zod";

// ... (imports)

const templateFormSchema = z.object({
  // ... (schema)
});

export function useTemplateForm(template?: Template) {
  const form = useForm({
    // ... (form options)
  });

  // ... (mutations)

  const handleSubmit = async (data: TemplateFormData) => {
    // ... (submit logic)
  };

  return { form, handleSubmit };
}
```

#### b. Break Down the Component

Break the `TemplateForm` component into smaller, more focused components:

*   **`TemplateFormStep1`**: The first step of the form.
*   **`TemplateFormStep2`**: The second step of the form.
*   **`TemplateFormStep3`**: The third step of the form.
*   **`TemplateFormStepper`**: The stepper component that controls the flow of the form.

### Action Items

*   [ ] Create `src/hooks/use-template-form.ts`.
*   [ ] Refactor `src/app/_components/template-form.tsx` to use the new hook and be broken down into smaller components.

## 4. Simplify Data Flow

### Problem

The `workout-cache-helpers.ts` file contains a set of utility functions for managing the TanStack Query cache. While these functions are well-written, the fact that they are needed at all points to the complexity of the data flow in the application. Manually manipulating the cache can be error-prone and lead to inconsistencies.

### Proposed Solution

I propose to review the data flow and look for opportunities to simplify it by leveraging more of TanStack Query's built-in features for cache management.

#### a. Use `onSuccess` Callbacks

Instead of manually updating the cache in the `onMutate` callback of a mutation, we can use the `onSuccess` callback to invalidate the relevant queries. This will cause TanStack Query to automatically refetch the data and update the cache.

**Example:**

```typescript
const createTemplate = api.templates.create.useMutation({
  onSuccess: (data) => {
    // Invalidate the queries that need to be updated
    utils.templates.getAll.invalidate();
  },
});
```

#### b. Use `initialData` for Optimistic Updates

For optimistic updates, we can use the `initialData` option of a query to provide the initial data for the query. This is often simpler and less error-prone than manually updating the cache.

### Action Items

*   [ ] Review all mutations that manually update the cache and refactor them to use `onSuccess` callbacks to invalidate queries.
*   [ ] Review all optimistic updates and refactor them to use the `initialData` option where possible.

## 5. Technology Best Practices

### Problem

The project is not taking full advantage of the best practices for the technologies it uses, particularly in the areas of caching and database query optimization. This can lead to suboptimal performance and increased costs.

### Proposed Solution

I propose to implement the following best practices for Cloudflare Workers, D1, Drizzle, and OpenNext.

#### a. Implement Caching with R2 and D1

The `open-next.config.ts` file is currently configured with dummy caches. To improve performance and reduce costs, we should use R2 for the incremental cache and D1 for the tag cache.

**`open-next.config.ts`**

```typescript
import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: {
        type: "r2",
        bucketName: "my-app-cache", // Replace with your R2 bucket name
      },
      tagCache: {
        type: "d1",
        databaseId: "my-d1-database-id", // Replace with your D1 database ID
      },
      queue: "dummy",
    },
  },
  // ... (other config)
};

export default config;
```

#### b. Optimize Database Queries

We should review all database queries in the tRPC resolvers and ensure that they are optimized for performance. This includes:

*   **Using indexes**: Ensure that all frequently queried columns have indexes.
*   **Using `limit` and `offset` for pagination**: Use Drizzle's `limit` and `offset` methods to paginate large result sets.
*   **Avoiding N+1 queries**: Use Drizzle's `with` syntax to eager load related data and avoid N+1 queries.

**Example of pagination:**

```typescript
const users = await db.select().from(usersTable).limit(10).offset(20);
```

#### c. Cache Whoop API Data

The application makes many calls to the Whoop API. To reduce latency and avoid rate limiting, we should cache the data from the Whoop API in D1. This can be done by creating a new table in the D1 database to store the Who-op data and then using a tRPC resolver to fetch the data from the cache or the Whoop API as needed.

### Action Items

*   [ ] Configure R2 for the incremental cache in `open-next.config.ts`.
*   [ ] Configure D1 for the tag cache in `open-next.config.ts`.
*   [ ] Review all database queries and optimize them for performance.
*   [ ] Implement a caching strategy for the Whoop API data.
