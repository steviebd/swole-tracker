# Code Cleanup & Refactoring Plan

This document outlines the necessary steps to clean up the codebase, improve reusability, and complete the TanStack migrations based on the findings after the Phase 4 implementation.

## 1. Finalize TanStack Migration & Componentization

### 1.1. Refactor `StrengthProgressSection.tsx`

The `StrengthProgressSection.tsx` component is over 1000 lines long and contains multiple locally-defined components. It needs to be broken down for maintainability and reusability.

- [x] **Extract `VirtualizedExerciseList`:**
  - Move the `VirtualizedExerciseList` and its parent `VirtualizedExerciseSelect` components from `StrengthProgressSection.tsx` into a new reusable component (e.g., `src/components/ui/VirtualizedSelect.tsx`).
  - The new component should be generic to accept a list of items and render them, making it usable elsewhere in the app.

- [x] **Extract and Refactor `VirtualizedSessionTable`:**
  - Move the `VirtualizedSessionTable` component from `StrengthProgressSection.tsx` into its own file (e.g., `src/components/tables/VirtualizedSessionTable.tsx`).
  - **Crucially, refactor this new component to use `@tanstack/react-table` for its structure and logic**, combined with `@tanstack/react-virtual` for row virtualization. The current implementation manually recreates a table structure with `divs`, which is inconsistent with the project's goals.
  - Ensure the new component supports sorting, as the current implementation does.

- [x] **Standardize the Session Table:**
  - Replace both the virtualized and non-virtualized session tables in `StrengthProgressSection.tsx` with the new, reusable `VirtualizedSessionTable` component.
  - The component should handle the conditional virtualization internally (e.g., only virtualizing if `items.length > 50`).

- [x] **Decompose `StrengthProgressSection`:**
  - Break down the main component into smaller, focused child components:
    - `StrengthSummaryMetrics` (for the summary cards).
    - `StrengthChartContainer` (to encapsulate the Recharts logic).
    - `StrengthSessionList` (which will use the new table component).

### 1.2. Audit Other Table Implementations

The `TODO_TANSTACK.md` file mentioned enhancing other tables. We need to verify if this work was completed and ensure all tables are standardized.

- [x] **Audit `exercise-manager.tsx`:**
  - Verify that it uses `@tanstack/react-table`.
  - Check if the advanced features from Phase 4 (column resizing, reordering, bulk actions, expandable rows) were implemented.
  - If not, create a plan to implement them using standardized patterns.

- [x] **Audit `workout-history.tsx`:**
  - Verify that it uses `@tanstack/react-table`.
  - Check if the advanced features (column resizing, reordering, expandable rows, export) were implemented.
  - If not, create a plan to implement them.

## 2. General Code Cleanup

### 2.1. Remove Dead Code

- [x] **Delete `src/components/virtual-list.tsx`:**
  - This file is the old, custom virtual list implementation that has been replaced by `@tanstack/react-virtual`. It is no longer imported anywhere and should be deleted.

## 3. Identify Further Optimization Opportunities

### 3.1. Find New Virtualization Candidates

- [x] **Audit for missing virtualization:**
  - Search the codebase for list renderings (`.map()`) that could benefit from being converted to use the new virtualized components.
  - Pay special attention to lists that could grow, such as workout history, exercise lists, or set lists.
