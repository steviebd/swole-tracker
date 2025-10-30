/**
 * DataTable Component - Reusable TanStack Table wrapper with Material 3 theming
 *
 * A fully-featured, accessible data table component built on TanStack Table v8.
 * Includes sorting, filtering, pagination, keyboard navigation, and ARIA support.
 */

"use client";

import * as React from "react";
import {
  flexRender,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type PaginationState,
  type ExpandedState,
  type OnChangeFn,
  type TableOptions,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { cn } from "~/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  defaultTableConfig,
  getPaginationInfo,
  getSortLabel,
  getSortIcon,
  tableA11y,
} from "~/lib/tables/tanstack-table-config";

/**
 * DataTable Props
 */
export interface DataTableProps<TData, TValue = unknown> {
  /** Column definitions */
  columns: ColumnDef<TData, TValue>[];

  /** Data array */
  data: TData[];

  /** Loading state */
  isLoading?: boolean;

  /** Enable pagination (default: true) */
  enablePagination?: boolean;

  /** Enable sorting (default: true) */
  enableSorting?: boolean;

  /** Enable filtering (default: true) */
  enableFiltering?: boolean;

  /** Enable row selection (default: false) */
  enableRowSelection?: boolean;

  /** Enable column visibility toggle (default: false) */
  enableColumnVisibility?: boolean;

  /** Initial page size (default: 10) */
  pageSize?: number;

  /** Available page sizes (default: [5, 10, 20, 50, 100]) */
  pageSizeOptions?: number[];

  /** Custom empty state message */
  emptyMessage?: string;

  /** Show pagination info text (default: true) */
  showPaginationInfo?: boolean;

  /** Controlled sorting state */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;

  /** Controlled column filters state */
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;

  /** Controlled column visibility state */
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;

  /** Controlled pagination state */
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;

  /** Controlled expanded state (for expandable rows) */
  expanded?: ExpandedState;
  onExpandedChange?: OnChangeFn<ExpandedState>;

  /** Custom row click handler */
  onRowClick?: (row: TData) => void;

  /** Custom row className */
  rowClassName?: (row: TData) => string;

  /** Additional table options */
  tableOptions?: Partial<TableOptions<TData>>;

  /** Custom loading skeleton rows */
  loadingRows?: number;

  /** Compact mode (smaller padding) */
  compact?: boolean;

  /** Mobile responsive (hide columns on small screens) */
  responsive?: boolean;

  /** Custom table container className */
  className?: string;

  /** ARIA label for the table */
  ariaLabel?: string;
}

/**
 * DataTable Component
 */
export function DataTable<TData, TValue = unknown>({
  columns,
  data,
  isLoading = false,
  enablePagination = true,
  enableSorting = true,
  enableFiltering = true,
  enableRowSelection = false,
  enableColumnVisibility = false,
  pageSize = 10,
  pageSizeOptions = [5, 10, 20, 50, 100],
  emptyMessage = "No data available",
  showPaginationInfo = true,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  columnVisibility,
  onColumnVisibilityChange,
  pagination,
  onPaginationChange,
  expanded,
  onExpandedChange,
  onRowClick,
  rowClassName,
  tableOptions,
  loadingRows = 5,
  compact = false,
  responsive = true,
  className,
  ariaLabel = "Data table",
}: DataTableProps<TData, TValue>) {
  // Internal state (when not controlled)
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [internalColumnVisibility, setInternalColumnVisibility] = React.useState<VisibilityState>({});
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [internalExpanded, setInternalExpanded] = React.useState<ExpandedState>({});

  // Use controlled or internal state
  const tableSorting = sorting ?? internalSorting;
  const tableColumnFilters = columnFilters ?? internalColumnFilters;
  const tableColumnVisibility = columnVisibility ?? internalColumnVisibility;
  const tablePagination = pagination ?? internalPagination;
  const tableExpanded = expanded ?? internalExpanded;

  // Initialize table
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: tableSorting,
      columnFilters: tableColumnFilters,
      columnVisibility: tableColumnVisibility,
      pagination: tablePagination,
      expanded: tableExpanded,
    },
    onSortingChange: onSortingChange ?? setInternalSorting,
    onColumnFiltersChange: onColumnFiltersChange ?? setInternalColumnFilters,
    onColumnVisibilityChange: onColumnVisibilityChange ?? setInternalColumnVisibility,
    onPaginationChange: onPaginationChange ?? setInternalPagination,
    onExpandedChange: onExpandedChange ?? setInternalExpanded,
    enableSorting,
    enableFilters: enableFiltering,
    enableColumnFilters: enableFiltering,
    enableRowSelection,
    enableColumnResizing: false,
    enableHiding: enableColumnVisibility,
    manualPagination: false,
    manualSorting: false,
    manualFiltering: false,
    ...defaultTableConfig,
    ...tableOptions,
  });

  // Pagination info
  const paginationInfo = enablePagination ? getPaginationInfo(table) : null;

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      callback();
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Table */}
      <div className={cn("rounded-lg border", responsive && "overflow-x-auto")}>
        <Table aria-label={ariaLabel}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        compact && "py-2",
                        canSort && "cursor-pointer select-none",
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      onKeyDown={
                        canSort
                          ? (e) => handleKeyDown(e, () => header.column.toggleSorting())
                          : undefined
                      }
                      tabIndex={canSort ? 0 : undefined}
                      role={canSort ? "button" : undefined}
                      aria-sort={canSort ? tableA11y.getSortAriaSort(isSorted) : undefined}
                      aria-label={
                        canSort
                          ? `${header.column.columnDef.header as string}, ${getSortLabel(isSorted)}`
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-2">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span
                            className="text-muted-foreground text-xs"
                            aria-hidden="true"
                          >
                            {getSortIcon(isSorted)}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: loadingRows }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  {columns.map((column, colIndex) => (
                    <TableCell
                      key={`loading-${index}-${colIndex}`}
                      className={cn(compact && "py-2")}
                    >
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              // Data rows
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={cn(
                    onRowClick && "cursor-pointer",
                    rowClassName?.(row.original),
                  )}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  onKeyDown={
                    onRowClick ? (e) => handleKeyDown(e, () => onRowClick(row.original)) : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(compact && "py-2")}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              // Empty state
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <p className="text-muted-foreground">{emptyMessage}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {enablePagination && paginationInfo && (
        <div className="flex items-center justify-between gap-4 px-2">
          {/* Pagination info */}
          {showPaginationInfo && (
            <div className="text-muted-foreground text-sm">
              Showing {paginationInfo.startRow}-{paginationInfo.endRow} of{" "}
              {paginationInfo.totalRows} {paginationInfo.totalRows === 1 ? "row" : "rows"}
            </div>
          )}

          {/* Pagination controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!paginationInfo.canPreviousPage}
              aria-label={tableA11y.getPaginationLabel(
                "first",
                paginationInfo.currentPage,
                paginationInfo.totalPages,
              )}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!paginationInfo.canPreviousPage}
              aria-label={tableA11y.getPaginationLabel(
                "previous",
                paginationInfo.currentPage,
                paginationInfo.totalPages,
              )}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="text-muted-foreground text-sm">
              Page {paginationInfo.currentPage} of {paginationInfo.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!paginationInfo.canNextPage}
              aria-label={tableA11y.getPaginationLabel(
                "next",
                paginationInfo.currentPage,
                paginationInfo.totalPages,
              )}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!paginationInfo.canNextPage}
              aria-label={tableA11y.getPaginationLabel(
                "last",
                paginationInfo.currentPage,
                paginationInfo.totalPages,
              )}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Export for convenience
 */
export { createColumnHelper } from "@tanstack/react-table";
