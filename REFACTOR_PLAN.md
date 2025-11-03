# Refactoring Plan for Improved Readability and Maintainability

This document outlines a series of proposed refactorings to reduce complexity and improve the readability and maintainability of the codebase. Each section is formatted as a Pull Request Description (PDR) that another developer can use to implement the changes.

## Table of Contents

1. [Refactor `ExerciseManager` Component](#1-refactor-exercisemanager-component)
2. [Refactor `WorkoutSession` Component](#2-refactor-workoutsession-component)
3. [Refactor `TemplateForm` Component](#3-refactor-templateform-component)
4. [Simplify Data Flow](#4-simplify-data-flow)
5. [Technology Best Practices](#5-technology-best-practices)
6. [Architectural Improvements](#6-architectural-improvements)
7. [Performance Optimizations](#7-performance-optimizations)
8. [Implementation Priorities](#8-implementation-priorities)
9. [Alignment with Project Principles](#9-alignment-with-project-principles)

---

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

#### b. Create `useTableStatePersistence` Hook

Create a new custom hook, `useTableStatePersistence`, to persist table state (sorting, filtering, column visibility) to localStorage.

**`src/hooks/use-table-state-persistence.ts`**

```typescript
import { useEffect, useState } from 'react';
import { useLocalStorage } from './use-local-storage';

interface TableState {
  sorting: SortingState;
  columnVisibility: VisibilityState;
  columnSizing: ColumnOrderState;
  rowSelection: RowSelectionState;
}

export function useTableStatePersistence(tableId: string, initialState: TableState) {
  const [state, setState] = useLocalStorage<TableState>(`table-state-${tableId}`, initialState);
  
  const updateState = (updates: Partial<TableState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  return { state, updateState };
}
```

#### c. Create `useExerciseFilters` Hook

Create a new custom hook, `useExerciseFilters`, to manage exercise filtering logic.

**`src/hooks/use-exercise-filters.ts`**

```typescript
import { useState, useMemo } from 'react';
import { MasterExercise } from '~/types/exercise';

interface ExerciseFilters {
  muscleGroups: string[];
  equipment: string[];
  difficulty: string[];
}

export function useExerciseFilters(exercises: MasterExercise[]) {
  const [filters, setFilters] = useState<ExerciseFilters>({
    muscleGroups: [],
    equipment: [],
    difficulty: [],
  });

  const filteredExercises = useMemo(() => {
    return exercises.filter(exercise => {
      // Apply filter logic
      return true;
    });
  }, [exercises, filters]);

  return { filters, setFilters, filteredExercises };
}
```

#### d. Create `useExerciseMutations` Hook

Create a new custom hook, `useExerciseMutations`, to encapsulate all the tRPC mutations related to exercise management.

**`src/hooks/use-exercise-mutations.ts`**

```typescript
import { api } from "~/trpc/react";
import { useCacheInvalidation } from './use-cache-invalidation';

export function useExerciseMutations(onSuccess: () => void) {
  const { invalidateExercises } = useCacheInvalidation();
  
  const createMasterExercise = api.exercises.createMasterExercise.useMutation({
    onSuccess: () => {
      invalidateExercises();
      onSuccess();
    },
    // ... (other options)
  });

  const updateMasterExercise = api.exercises.updateMasterExercise.useMutation({
    onSuccess: () => {
      invalidateExercises();
      onSuccess();
    },
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

#### e. Break Down the Component

Break the `ExerciseManager` component into smaller, more focused components:

*   **`ExerciseTable`**: The main table component that uses the `useExerciseTable` hook.
*   **`ExerciseToolbar`**: The search bar and action buttons.
*   **`CreateEditExerciseDialog`**: The dialog for creating and editing exercises.
*   **`MergeExerciseDialog`**: The dialog for merging exercises.
*   **`ExerciseFiltersPanel`**: A panel for advanced filtering options.

#### f. Create Reusable `DataTable` Component

Create a reusable `DataTable` component that can be used across the application.

**`src/components/ui/data-table.tsx`**

```typescript
import { flexRender } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

interface DataTableProps<T> {
  table: Table<T>;
  className?: string;
}

export function DataTable<T>({ table, className }: DataTableProps<T>) {
  return (
    <div className={`rounded-md border ${className || ''}`}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Action Items

*   [ ] Create `src/hooks/use-exercise-table.ts`.
*   [ ] Create `src/hooks/use-table-state-persistence.ts`.
*   [ ] Create `src/hooks/use-exercise-filters.ts`.
*   [ ] Create `src/hooks/use-exercise-mutations.ts`.
*   [ ] Create `src/components/ui/data-table.tsx`.
*   [ ] Refactor `src/app/_components/exercise-manager.tsx` to use the new hooks and be broken down into smaller components.

---

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
import { useOfflineSaveQueue } from './use-offline-save-queue';

export function useWorkoutActions(state: WorkoutSessionState) {
  const { saveWorkout, deleteWorkout, buildSavePayload } = state;
  const { addToQueue } = useOfflineSaveQueue();

  const handleSave = async () => {
    // ... (save logic)
  };

  const handleDelete = async () => {
    // ... (delete logic)
  };

  return { handleSave, handleDelete };
}
```

#### b. Create `useWorkoutTimer` Hook

Create a new custom hook, `useWorkoutTimer`, to manage workout timing functionality.

**`src/hooks/use-workout-timer.ts`**

```typescript
import { useState, useEffect, useRef } from 'react';

export function useWorkoutTimer(initialTime = 0) {
  const [elapsedTime, setElapsedTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);
  const reset = () => {
    setElapsedTime(0);
    setIsRunning(false);
  };

  return { elapsedTime, isRunning, start, pause, reset };
}
```

#### c. Create `useWorkoutValidation` Hook

Create a new custom hook, `useWorkoutValidation`, to handle workout form validation.

**`src/hooks/use-workout-validation.ts`**

```typescript
import { useMemo } from 'react';
import { WorkoutSessionState } from './useWorkoutSessionState';

export function useWorkoutValidation(state: WorkoutSessionState) {
  const errors = useMemo(() => {
    const validationErrors: Record<string, string> = {};
    
    // Validate workout data
    if (!state.workout.name.trim()) {
      validationErrors.name = 'Workout name is required';
    }
    
    // Validate exercises and sets
    state.exercises.forEach((exercise, exerciseIndex) => {
      if (!exercise.name.trim()) {
        validationErrors[`exercise-${exerciseIndex}-name`] = 'Exercise name is required';
      }
      
      exercise.sets.forEach((set, setIndex) => {
        if (set.reps <= 0) {
          validationErrors[`exercise-${exerciseIndex}-set-${setIndex}-reps`] = 'Reps must be greater than 0';
        }
      });
    });
    
    return validationErrors;
  }, [state]);

  const isValid = Object.keys(errors).length === 0;

  return { errors, isValid };
}
```

#### d. Break Down the Component

Break the `WorkoutSession` component into smaller, more focused components:

*   **`ExerciseCard`**: This component already exists, but it could be further simplified by extracting the logic for handling sets into its own component.
*   **`WorkoutActionBar`**: The action bar at the bottom of the screen.
*   **`DeleteWorkoutDialog`**: The confirmation dialog for deleting a workout.
*   **`CompleteWorkoutDialog`**: The dialog for completing a workout.
*   **`WorkoutTimer`**: A component to display and control the workout timer.
*   **`SetEditor`**: A component for editing individual sets.

#### e. Create Reusable `VirtualizedList` Component

Create a reusable `VirtualizedList` component for efficiently rendering large lists of exercises or sets.

**`src/components/ui/virtualized-list.tsx`**

```typescript
import { FixedSizeList as List } from 'react-window';
import { ReactNode } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (props: { index: number; style: React.CSSProperties }) => ReactNode;
}

export function VirtualizedList<T>({ items, itemHeight, height, renderItem }: VirtualizedListProps<T>) {
  return (
    <List
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      itemData={items}
    >
      {renderItem}
    </List>
  );
}
```

### Action Items

*   [ ] Create `src/hooks/use-workout-actions.ts`.
*   [ ] Create `src/hooks/use-workout-timer.ts`.
*   [ ] Create `src/hooks/use-workout-validation.ts`.
*   [ ] Create `src/components/ui/virtualized-list.tsx`.
*   [ ] Refactor `src/app/_components/workout-session.tsx` to use the new hooks and be broken down into smaller components.

---

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

#### b. Create `useFormNavigation` Hook

Create a new custom hook, `useFormNavigation`, to manage multi-step form navigation.

**`src/hooks/use-form-navigation.ts`**

```typescript
import { useState } from 'react';

export function useFormNavigation(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
  };
  
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };
  
  const goToStep = (step: number) => {
    setCurrentStep(Math.min(Math.max(step, 0), totalSteps - 1));
  };
  
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  
  return {
    currentStep,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep,
    isLastStep,
  };
}
```

#### c. Create `useFormPersistence` Hook

Create a new custom hook, `useFormPersistence`, to save and restore form state.

**`src/hooks/use-form-persistence.ts`**

```typescript
import { useEffect } from 'react';
import { useLocalStorage } from './use-local-storage';

export function useFormPersistence<T>(formId: string, formData: T) {
  const [savedData, setSavedData] = useLocalStorage<T>(`form-${formId}`, formData);
  
  useEffect(() => {
    // Save form data to localStorage whenever it changes
    setSavedData(formData);
  }, [formData, setSavedData]);
  
  const clearSavedData = () => {
    setSavedData({} as T);
  };
  
  return { savedData, clearSavedData };
}
```

#### d. Break Down the Component

Break the `TemplateForm` component into smaller, more focused components:

*   **`TemplateFormStep1`**: The first step of the form.
*   **`TemplateFormStep2`**: The second step of the form.
*   **`TemplateFormStep3`**: The third step of the form.
*   **`TemplateFormStepper`**: The stepper component that controls the flow of the form.
*   **`ExerciseSelector`**: A component for selecting exercises for the template.
*   **`TemplatePreview`**: A component for previewing the template before saving.

### Action Items

*   [ ] Create `src/hooks/use-template-form.ts`.
*   [ ] Create `src/hooks/use-form-navigation.ts`.
*   [ ] Create `src/hooks/use-form-persistence.ts`.
*   [ ] Refactor `src/app/_components/template-form.tsx` to use the new hooks and be broken down into smaller components.

---

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

#### c. Create `useCacheInvalidation` Hook

Create a new custom hook, `useCacheInvalidation`, to centralize cache invalidation logic.

**`src/hooks/use-cache-invalidation.ts`**

```typescript
import { api } from '~/trpc/react';
import { useQueryClient } from '@tanstack/react-query';

export function useCacheInvalidation() {
  const queryClient = useQueryClient();
  const utils = api.useUtils();
  
  const invalidateWorkouts = () => {
    utils.workouts.getAll.invalidate();
    utils.workouts.getRecent.invalidate();
  };
  
  const invalidateExercises = () => {
    utils.exercises.getAll.invalidate();
    utils.exercises.getMasterList.invalidate();
  };
  
  const invalidateTemplates = () => {
    utils.templates.getAll.invalidate();
    utils.templates.getById.invalidate();
  };
  
  const invalidateWhoopData = () => {
    utils.whoop.getRecovery.invalidate();
    utils.whoop.getWorkouts.invalidate();
  };
  
  const invalidateAll = () => {
    queryClient.invalidateQueries();
  };
  
  return {
    invalidateWorkouts,
    invalidateExercises,
    invalidateTemplates,
    invalidateWhoopData,
    invalidateAll,
  };
}
```

#### d. Create `useOptimisticUpdates` Hook

Create a new custom hook, `useOptimisticUpdates`, to handle optimistic updates in a standardized way.

**`src/hooks/use-optimistic-updates.ts`**

```typescript
import { useQueryClient } from '@tanstack/react-query';

export function useOptimisticUpdates() {
  const queryClient = useQueryClient();
  
  const updateQueryData = <T>(
    queryKey: unknown[],
    updater: (oldData: T | undefined) => T
  ) => {
    queryClient.setQueryData(queryKey, updater);
  };
  
  const removeQueryItem = <T>(
    queryKey: unknown[],
    itemId: string,
    idField: keyof T
  ) => {
    queryClient.setQueryData(queryKey, (oldData: T[] | undefined) => {
      if (!oldData) return [];
      return oldData.filter(item => item[idField] !== itemId);
    });
  };
  
  const addQueryItem = <T>(queryKey: unknown[], newItem: T) => {
    queryClient.setQueryData(queryKey, (oldData: T[] | undefined) => {
      if (!oldData) return [newItem];
      return [...oldData, newItem];
    });
  };
  
  return {
    updateQueryData,
    removeQueryItem,
    addQueryItem,
  };
}
```

### Action Items

*   [ ] Review all mutations that manually update the cache and refactor them to use `onSuccess` callbacks to invalidate queries.
*   [ ] Review all optimistic updates and refactor them to use the `initialData` option where possible.
*   [ ] Create `src/hooks/use-cache-invalidation.ts`.
*   [ ] Create `src/hooks/use-optimistic-updates.ts`.
*   [ ] Update all components to use the new cache management hooks.

---

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

The application makes many calls to the Whoop API. To reduce latency and avoid rate limiting, we should cache the data from the Whoop API in D1. This can be done by creating a new table in the D1 database to store the Whoop data and then using a tRPC resolver to fetch the data from the cache or the Whoop API as needed.

#### d. Create `useDatabaseQuery` Hook

Create a new custom hook, `useDatabaseQuery`, to standardize database queries with proper error handling and loading states.

**`src/hooks/use-database-query.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '~/trpc/react';

export function useDatabaseQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options?: {
    staleTime?: number;
    cacheTime?: number;
    refetchOnWindowFocus?: boolean;
  }
) {
  return useQuery({
    queryKey,
    queryFn,
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutes
    cacheTime: options?.cacheTime || 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: options?.refetchOnWindowFocus || false,
    ...options,
  });
}
```

#### e. Create `usePaginatedQuery` Hook

Create a new custom hook, `usePaginatedQuery`, to handle paginated data fetching.

**`src/hooks/use-paginated-query.ts`**

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface PaginatedQueryResult<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
}

export function usePaginatedQuery<T>(
  queryKey: unknown[],
  fetchPage: (page: number, limit: number) => Promise<{ data: T[]; hasMore: boolean }>,
  options?: {
    pageSize?: number;
    staleTime?: number;
  }
): PaginatedQueryResult<T> {
  const [page, setPage] = useState(0);
  const pageSize = options?.pageSize || 20;
  
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: [...queryKey, page, pageSize],
    queryFn: () => fetchPage(page, pageSize),
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutes
  });
  
  const allData = data?.data || [];
  const hasNextPage = data?.hasMore || false;
  
  const fetchNextPage = () => {
    if (hasNextPage && !isFetching) {
      setPage(prev => prev + 1);
    }
  };
  
  return {
    data: allData,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage: isFetching,
  };
}
```

### Action Items

*   [ ] Configure R2 for the incremental cache in `open-next.config.ts`.
*   [ ] Configure D1 for the tag cache in `open-next.config.ts`.
*   [ ] Review all database queries and optimize them for performance.
*   [ ] Implement a caching strategy for the Whoop API data.
*   [ ] Create `src/hooks/use-database-query.ts`.
*   [ ] Create `src/hooks/use-paginated-query.ts`.

---

## 6. Architectural Improvements

### Problem

The current architecture has some areas that could be improved to enhance maintainability, scalability, and developer experience. These include state management patterns, event handling, and component composition.

### Proposed Solution

I propose to implement several architectural improvements to address these issues.

#### a. Implement a Centralized State Management System

Create a lightweight state management system that complements React's built-in state management and TanStack Query's server state management.

**`src/lib/state-manager.ts`**

```typescript
import { createContext, useContext, useReducer, ReactNode } from 'react';

type State = {
  // Global application state
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  notifications: Notification[];
  // ... other global state
};

type Action = 
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  // ... other actions
;

const initialState: State = {
  theme: 'system',
  sidebarOpen: false,
  notifications: [],
};

function stateReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'ADD_NOTIFICATION':
      return { 
        ...state, 
        notifications: [...state.notifications, action.payload] 
      };
    case 'REMOVE_NOTIFICATION':
      return { 
        ...state, 
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload
        ) 
      };
    default:
      return state;
  }
}

const StateContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => null,
});

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(stateReducer, initialState);
  
  return (
    <StateContext.Provider value={{ state, dispatch }}>
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useAppState must be used within a StateProvider');
  }
  return context;
}
```

#### b. Implement an Event System

Create a lightweight event system to decouple components and enable better communication between them.

**`src/lib/event-system.ts`**

```typescript
type EventCallback<T = any> = (data: T) => void;

class EventEmitter {
  private events: Record<string, EventCallback[]> = {};
  
  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    
    this.events[event].push(callback);
    
    // Return a function to unsubscribe
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }
  
  emit<T = any>(event: string, data?: T): void {
    if (!this.events[event]) return;
    
    this.events[event].forEach(callback => callback(data));
  }
  
  off(event: string): void {
    delete this.events[event];
  }
}

export const eventEmitter = new EventEmitter();

// Define event types
export type AppEvents = {
  'workout:started': { workoutId: string };
  'workout:completed': { workoutId: string; duration: number };
  'exercise:added': { exerciseId: string; workoutId: string };
  'notification:show': { message: string; type: 'success' | 'error' | 'info' };
  // ... other events
};
```

#### c. Create `useEventEmitter` Hook

Create a custom hook to easily interact with the event system.

**`src/hooks/use-event-emitter.ts`**

```typescript
import { useEffect, useCallback } from 'react';
import { eventEmitter, AppEvents } from '~/lib/event-system';

export function useEventEmitter() {
  const emit = useCallback(<K extends keyof AppEvents>(
    event: K,
    data: AppEvents[K]
  ) => {
    eventEmitter.emit(event, data);
  }, []);
  
  const on = useCallback(<K extends keyof AppEvents>(
    event: K,
    callback: (data: AppEvents[K]) => void
  ) => {
    return eventEmitter.on(event, callback);
  }, []);
  
  const off = useCallback((event: keyof AppEvents) => {
    eventEmitter.off(event);
  }, []);
  
  return { emit, on, off };
}

export function useEventListener<K extends keyof AppEvents>(
  event: K,
  callback: (data: AppEvents[K]) => void,
  deps: React.DependencyList = []
) {
  const { on } = useEventEmitter();
  
  useEffect(() => {
    const unsubscribe = on(event, callback);
    return unsubscribe;
  }, deps);
}
```

#### d. Implement a Plugin System

Create a plugin system to allow for extensible functionality.

**`src/lib/plugin-system.ts`**

```typescript
interface Plugin {
  name: string;
  version: string;
  init: () => void | Promise<void>;
  destroy?: () => void | Promise<void>;
}

class PluginManager {
  private plugins: Record<string, Plugin> = {};
  
  register(plugin: Plugin): void {
    if (this.plugins[plugin.name]) {
      console.warn(`Plugin ${plugin.name} is already registered`);
      return;
    }
    
    this.plugins[plugin.name] = plugin;
    plugin.init();
  }
  
  unregister(name: string): void {
    const plugin = this.plugins[name];
    if (!plugin) return;
    
    if (plugin.destroy) {
      plugin.destroy();
    }
    
    delete this.plugins[name];
  }
  
  get(name: string): Plugin | undefined {
    return this.plugins[name];
  }
  
  getAll(): Plugin[] {
    return Object.values(this.plugins);
  }
}

export const pluginManager = new PluginManager();
```

### Action Items

*   [ ] Create `src/lib/state-manager.ts`.
*   [ ] Create `src/lib/event-system.ts`.
*   [ ] Create `src/hooks/use-event-emitter.ts`.
*   [ ] Create `src/lib/plugin-system.ts`.
*   [ ] Update the app to use the new state management system.
*   [ ] Implement event-driven communication between components.
*   [ ] Create example plugins to demonstrate the plugin system.

---

## 7. Performance Optimizations

### Problem

The application could benefit from several performance optimizations to improve user experience, especially on lower-end devices and slower network connections.

### Proposed Solution

I propose to implement several performance optimizations to address these issues.

#### a. Implement Code Splitting

Implement code splitting to reduce the initial bundle size and improve load times.

**`src/app/_components/lazy-components.tsx`**

```typescript
import { lazy } from 'react';

export const LazyExerciseManager = lazy(() => import('./exercise-manager'));
export const LazyWorkoutSession = lazy(() => import('./workout-session'));
export const LazyTemplateForm = lazy(() => import('./template-form'));
export const LazyDashboard = lazy(() => import('./dashboard'));
```

#### b. Implement Memoization

Implement memoization for expensive computations and components.

**`src/hooks/use-memoized-value.ts`**

```typescript
import { useMemo, useRef } from 'react';

export function useMemoizedValue<T>(value: T, deps: React.DependencyList = []): T {
  const ref = useRef<T>(value);
  
  return useMemo(() => {
    // Only update the value if dependencies have changed
    return value;
  }, deps);
}
```

#### c. Implement Virtual Scrolling

Implement virtual scrolling for large lists to improve performance.

**`src/components/ui/virtual-scroller.tsx`**

```typescript
import { FixedSizeList as List } from 'react-window';
import { ReactNode, ReactElement } from 'react';

interface VirtualScrollerProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (props: { index: number; style: React.CSSProperties; data: T[] }) => ReactElement;
  overscanCount?: number;
}

export function VirtualScroller<T>({ 
  items, 
  itemHeight, 
  height, 
  renderItem,
  overscanCount = 5
}: VirtualScrollerProps<T>) {
  return (
    <List
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      itemData={items}
      overscanCount={overscanCount}
    >
      {renderItem}
    </List>
  );
}
```

#### d. Implement Image Optimization

Implement image optimization to reduce load times.

**`src/components/ui/optimized-image.tsx`**

```typescript
import { useState, useRef, useEffect } from 'react';
import { cn } from '~/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  placeholder = 'empty',
  blurDataURL,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            img.src = src;
            observer.unobserve(img);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    observer.observe(img);
    
    return () => {
      observer.unobserve(img);
    };
  }, [src]);
  
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {placeholder === 'blur' && !isLoaded && (
        <div
          className="absolute inset-0 blur-sm"
          style={{
            backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined,
            backgroundColor: blurDataURL ? undefined : '#f3f4f6',
          }}
        />
      )}
      
      <img
        ref={imgRef}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsError(true)}
      />
      
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          Failed to load image
        </div>
      )}
    </div>
  );
}
```

#### e. Create `usePerformanceMonitor` Hook

Create a custom hook to monitor performance metrics.

**`src/hooks/use-performance-monitor.ts`**

```typescript
import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(name: string) {
  const startTimeRef = useRef<number>();
  
  useEffect(() => {
    startTimeRef.current = performance.now();
    
    return () => {
      if (startTimeRef.current) {
        const duration = performance.now() - startTimeRef.current;
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      }
    };
  }, [name]);
  
  const measure = (operationName: string, fn: () => void) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`[Performance] ${name}.${operationName}: ${(end - start).toFixed(2)}ms`);
  };
  
  return { measure };
}
```

### Action Items

*   [ ] Create `src/app/_components/lazy-components.tsx`.
*   [ ] Create `src/hooks/use-memoized-value.ts`.
*   [ ] Create `src/components/ui/virtual-scroller.tsx`.
*   [ ] Create `src/components/ui/optimized-image.tsx`.
*   [ ] Create `src/hooks/use-performance-monitor.ts`.
*   [ ] Implement code splitting throughout the application.
*   [ ] Add memoization to expensive computations and components.
*   [ ] Implement virtual scrolling for large lists.
*   [ ] Optimize images throughout the application.

---

## 8. Implementation Priorities

To ensure a smooth refactoring process, we should prioritize the implementation of these changes based on their impact and complexity.

### High Priority (Immediate Impact)

1. **Refactor `ExerciseManager` Component** - This component is used frequently and its refactoring will immediately improve developer experience.
2. **Implement `useCacheInvalidation` Hook** - Centralizing cache invalidation will reduce bugs and improve data consistency.
3. **Optimize Database Queries** - This will have a direct impact on application performance.
4. **Implement Code Splitting** - This will reduce the initial bundle size and improve load times.

### Medium Priority (Significant Impact)

1. **Refactor `WorkoutSession` Component** - This is a core component and its refactoring will improve maintainability.
2. **Implement Centralized State Management** - This will improve data flow and reduce prop drilling.
3. **Implement Event System** - This will decouple components and improve communication.
4. **Implement Memoization** - This will improve performance for expensive computations.

### Low Priority (Long-term Benefits)

1. **Refactor `TemplateForm` Component** - While important, this component is used less frequently than the others.
2. **Implement Plugin System** - This is a nice-to-have feature that will improve extensibility.
3. **Implement Virtual Scrolling** - This will improve performance for large lists, but may not be immediately necessary.
4. **Implement Image Optimization** - This will improve load times, but may not be a critical issue.

---

## 9. Alignment with Project Principles

All proposed refactorings align with the project's design principles:

### Energy Through Motion

*   **Smooth Transitions**: The new components will maintain the smooth transitions that are a core part of the application's design.
*   **Purposeful Animations**: The refactored components will continue to use animations that enhance the user experience without being distracting.

### Warm Motivation Over Cold Data

*   **Inspiring Experiences**: The refactored components will continue to transform data into inspiring experiences.
*   **User-Centric Design**: The new components will maintain the focus on the user's goals and motivations.

### Mobile-First, Touch-Optimized

*   **Thumb-Friendly Design**: The refactored components will continue to be designed with mobile usage in mind.
*   **Touch Interactions**: The new components will maintain the touch-optimized interactions that are a core part of the application.

### Glass Architecture

*   **Depth Through Layering**: The refactored components will continue to use the glass architecture to create depth and visual interest.
*   **Backdrop Blur Effects**: The new components will maintain the backdrop blur effects that are a key part of the application's design.

### Accessible Energy

*   **WCAG 2.2 AA Compliance**: The refactored components will continue to meet the WCAG 2.2 AA accessibility standards.
*   **High-Energy Design**: The new components will maintain the high-energy design that is a core part of the application's brand.

### Offline-First Functionality

*   **Full Offline Functionality**: The refactored components will continue to work offline and sync when online.
*   **Automatic Sync**: The new components will maintain the automatic sync functionality that is a key part of the application.

### Cross-Platform Support

*   **Web Application**: The refactored components will continue to work as a web application.
*   **Mobile PWA Capabilities**: The new components will maintain the mobile PWA capabilities that are a core part of the application.

### Real-time Sync

*   **Live Workout Session Updates**: The refactored components will continue to provide live workout session updates.
*   **Conflict Resolution**: The new components will maintain the conflict resolution functionality that is a key part of the application.

---

## Conclusion

This refactoring plan outlines a comprehensive approach to improving the readability and maintainability of the codebase. By extracting logic into custom hooks, breaking down large components into smaller, more focused components, and implementing best practices for the technologies used, we can create a more maintainable and scalable application.

The implementation priorities ensure that we focus on the changes that will have the most immediate impact first, while still working towards the long-term goals of the project. All proposed changes align with the project's design principles, ensuring that we maintain the unique character and user experience of the application.
