/**
 * TanStack Table Configuration Utilities
 *
 * Provides shared configuration and helpers for TanStack Table v8
 * integration across the Swole Tracker application.
 */

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  type ColumnDef,
  type Table,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type PaginationState,
  type ExpandedState,
  type GroupingState,
} from "@tanstack/react-table";

/**
 * Default table configuration for common use cases
 */
export const defaultTableConfig = {
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
};

/**
 * Configuration with expandable rows support (for Exercise Manager)
 */
export const expandableTableConfig = {
  ...defaultTableConfig,
  getExpandedRowModel: getExpandedRowModel(),
};

/**
 * Configuration with grouping support (for Templates List)
 */
export const groupedTableConfig = {
  ...defaultTableConfig,
  getGroupedRowModel: getGroupedRowModel(),
};

/**
 * Default pagination options
 */
export const defaultPaginationOptions = {
  pageSize: 10,
  pageSizeOptions: [5, 10, 20, 50, 100],
};

/**
 * Helper to create type-safe column definitions
 */
export function createColumnHelper<TData>() {
  return {
    accessor: (accessor: keyof TData, column: Partial<ColumnDef<TData>>) => ({
      id: String(accessor),
      accessorKey: accessor,
      ...column,
    }),
    display: (column: ColumnDef<TData>) => column,
  };
}

/**
 * Helper to get pagination info for display
 */
export function getPaginationInfo<TData>(table: Table<TData>) {
  const pageSize = table.getState().pagination.pageSize;
  const pageIndex = table.getState().pagination.pageIndex;
  const totalRows = table.getFilteredRowModel().rows.length;

  const startRow = pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  return {
    startRow,
    endRow,
    totalRows,
    currentPage: pageIndex + 1,
    totalPages: table.getPageCount(),
    canPreviousPage: table.getCanPreviousPage(),
    canNextPage: table.getCanNextPage(),
  };
}

/**
 * Helper to create accessible sort label
 */
export function getSortLabel(isSorted: false | "asc" | "desc"): string {
  if (!isSorted) return "Sort ascending";
  return isSorted === "asc" ? "Sort descending" : "Clear sort";
}

/**
 * Helper to get sort icon based on state
 */
export function getSortIcon(isSorted: false | "asc" | "desc"): "↑" | "↓" | "↕" {
  if (!isSorted) return "↕";
  return isSorted === "asc" ? "↑" : "↓";
}

/**
 * Default initial state for tables
 */
export const defaultTableState = {
  sorting: [] as SortingState,
  columnFilters: [] as ColumnFiltersState,
  columnVisibility: {} as VisibilityState,
  pagination: {
    pageIndex: 0,
    pageSize: 10,
  } as PaginationState,
  expanded: {} as ExpandedState,
  grouping: [] as GroupingState,
};

/**
 * Mobile responsive column visibility helper
 * Returns default hidden columns for mobile viewports
 */
export function getMobileHiddenColumns(isMobile: boolean): VisibilityState {
  if (!isMobile) return {};

  // Common columns to hide on mobile
  return {
    createdAt: false,
    updatedAt: false,
    tags: false,
    linkedCount: false,
  };
}

/**
 * Accessibility helpers for table interactions
 */
export const tableA11y = {
  /**
   * Get ARIA sort attribute for column header
   */
  getSortAriaSort(isSorted: false | "asc" | "desc"): "ascending" | "descending" | "none" {
    if (!isSorted) return "none";
    return isSorted === "asc" ? "ascending" : "descending";
  },

  /**
   * Get ARIA label for pagination button
   */
  getPaginationLabel(action: "first" | "previous" | "next" | "last", currentPage: number, totalPages: number): string {
    switch (action) {
      case "first":
        return "Go to first page";
      case "previous":
        return `Go to previous page (page ${currentPage - 1} of ${totalPages})`;
      case "next":
        return `Go to next page (page ${currentPage + 1} of ${totalPages})`;
      case "last":
        return "Go to last page";
    }
  },

  /**
   * Get ARIA label for row expansion
   */
  getExpandLabel(isExpanded: boolean, rowName: string): string {
    return isExpanded ? `Collapse ${rowName}` : `Expand ${rowName}`;
  },
};

/**
 * Filter function helpers
 */
export const filterFns = {
  /**
   * Case-insensitive text search
   */
  fuzzyText: (row: any, columnId: string, filterValue: string) => {
    const cellValue = row.getValue(columnId);
    if (cellValue == null) return false;
    return String(cellValue).toLowerCase().includes(String(filterValue).toLowerCase());
  },

  /**
   * Array contains search (for tags, muscle groups, etc.)
   */
  arrayIncludes: (row: any, columnId: string, filterValue: string) => {
    const cellValue = row.getValue(columnId);
    if (!Array.isArray(cellValue)) return false;
    return cellValue.some((item) =>
      String(item).toLowerCase().includes(String(filterValue).toLowerCase())
    );
  },
};

/**
 * Export types for convenience
 */
export type {
  ColumnDef,
  Table,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  PaginationState,
  ExpandedState,
  GroupingState,
};
