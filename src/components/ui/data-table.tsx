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
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

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
  expandableTableConfig,
  getPaginationInfo,
  getSortLabel,
  getSortIcon,
  tableA11y,
} from "~/lib/tables/tanstack-table-config";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useEffect, useState, useCallback } from "react";

/**
 * Performance metrics interface for table monitoring
 */
export interface TablePerformanceMetrics {
  renderTime: number;
  scrollEvents: number;
  memoryUsage?: number;
  visibleRows: number;
  totalRows: number;
  sortTime?: number;
  filterTime?: number;
}

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

  /** Enable column resizing (default: false) */
  enableColumnResizing?: boolean;

  /** Enable column reordering (default: false) */
  enableColumnReordering?: boolean;

  /** Enable expandable rows (default: false) */
  enableExpandableRows?: boolean;

  /** Enable virtualization (default: false) */
  enableVirtualization?: boolean;

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

  /** Controlled row selection state */
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: OnChangeFn<Record<string, boolean>>;

  /** Custom row click handler */
  onRowClick?: (row: TData) => void;

  /** Custom row className */
  rowClassName?: (row: TData) => string;

  /** Render function for expanded row content */
  renderExpandedRow?: (row: TData) => React.ReactNode;

  /** Bulk actions for selected rows */
  bulkActions?: Array<{
    label: string;
    action: (selectedRows: TData[]) => void;
    variant?:
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link";
  }>;

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

  /** Virtualization container height (required if enableVirtualization is true) */
  virtualHeight?: number;

  /** Estimated row height for virtualization */
  estimatedRowHeight?: number;

  /** Enable touch optimization for mobile devices */
  enableTouchOptimization?: boolean;

  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean;

  /** Callback when performance metrics are collected */
  onPerformanceMetrics?: (metrics: TablePerformanceMetrics) => void;
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
  enableColumnResizing = false,
  enableColumnReordering = false,
  enableExpandableRows = false,
  enableVirtualization = false,
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
  rowSelection,
  onRowSelectionChange,
  onRowClick,
  rowClassName,
  renderExpandedRow,
  bulkActions,
  tableOptions,
  loadingRows = 5,
  compact = false,
  responsive = true,
  className,
  ariaLabel = "Data table",
  virtualHeight = 400,
  estimatedRowHeight = 50,
  enableTouchOptimization = true,
  enablePerformanceMonitoring = false,
  onPerformanceMetrics,
}: DataTableProps<TData, TValue>) {
  // Internal state (when not controlled)
  const [internalSorting, setInternalSorting] = React.useState<SortingState>(
    [],
  );
  const [internalColumnFilters, setInternalColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [internalColumnVisibility, setInternalColumnVisibility] =
    React.useState<VisibilityState>({});
  const [internalPagination, setInternalPagination] =
    React.useState<PaginationState>({
      pageIndex: 0,
      pageSize,
    });
  const [internalExpanded, setInternalExpanded] = React.useState<ExpandedState>(
    {},
  );
  const [internalRowSelection, setInternalRowSelection] = React.useState<
    Record<string, boolean>
  >({});

  // Performance monitoring state
  const [performanceMetrics, setPerformanceMetrics] =
    useState<TablePerformanceMetrics>({
      renderTime: 0,
      scrollEvents: 0,
      visibleRows: 0,
      totalRows: data.length,
    });
  const renderStartTime = useRef<number>(0);
  const scrollEventCount = useRef<number>(0);
  const virtualContainerRef = useRef<HTMLDivElement>(null);

  // Use controlled or internal state
  const tableSorting = sorting ?? internalSorting;
  const tableColumnFilters = columnFilters ?? internalColumnFilters;
  const tableColumnVisibility = columnVisibility ?? internalColumnVisibility;
  const tablePagination = pagination ?? internalPagination;
  const tableExpanded = expanded ?? internalExpanded;
  const tableRowSelection = rowSelection ?? internalRowSelection;

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
      rowSelection: tableRowSelection,
    },
    onSortingChange: onSortingChange ?? setInternalSorting,
    onColumnFiltersChange: onColumnFiltersChange ?? setInternalColumnFilters,
    onColumnVisibilityChange:
      onColumnVisibilityChange ?? setInternalColumnVisibility,
    onPaginationChange: onPaginationChange ?? setInternalPagination,
    onExpandedChange: onExpandedChange ?? setInternalExpanded,
    onRowSelectionChange: onRowSelectionChange ?? setInternalRowSelection,
    enableSorting,
    enableFilters: enableFiltering,
    enableColumnFilters: enableFiltering,
    enableRowSelection,
    enableColumnResizing,
    enableHiding: enableColumnVisibility,
    manualPagination: false,
    manualSorting: false,
    manualFiltering: false,
    ...defaultTableConfig,
    ...(enableExpandableRows && expandableTableConfig),
    ...tableOptions,
  });

  // Pagination info
  const paginationInfo = enablePagination ? getPaginationInfo(table) : null;

  // Virtualization setup
  const virtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => virtualContainerRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 5,
    // Enable smooth scrolling for better mobile experience
    scrollToFn: enableTouchOptimization
      ? (offset, { behavior = "smooth" } = {}) => {
          virtualContainerRef.current?.scrollTo({ top: offset, behavior });
        }
      : undefined,
  });

  // Performance monitoring
  useEffect(() => {
    if (enablePerformanceMonitoring) {
      renderStartTime.current = performance.now();
    }
  }, [data, enablePerformanceMonitoring]);

  const visibleRowsCount = enableVirtualization
    ? virtualizer.getVirtualItems().length
    : table.getRowModel().rows.length;

  useEffect(() => {
    if (enablePerformanceMonitoring && renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      const updatedMetrics = {
        ...performanceMetrics,
        renderTime,
        totalRows: data.length,
        visibleRows: visibleRowsCount,
      };
      setPerformanceMetrics(updatedMetrics);
      onPerformanceMetrics?.(updatedMetrics);

      // Track with analytics service
      import("~/lib/analytics").then(({ analytics }) => {
        analytics.trackTablePerformance({
          type: "table",
          componentName: "DataTable",
          renderTime,
          scrollEvents: scrollEventCount.current,
          visibleRows: updatedMetrics.visibleRows,
          totalRows: data.length,
        });
      });
    }
  }, [
    data.length,
    enablePerformanceMonitoring,
    onPerformanceMetrics,
    performanceMetrics,
    visibleRowsCount,
    table,
    virtualizer,
  ]);

  // Touch optimization: Handle scroll events for performance monitoring
  useEffect(() => {
    if (!enablePerformanceMonitoring || !virtualContainerRef.current) return;

    const handleScroll = () => {
      scrollEventCount.current += 1;
      setPerformanceMetrics((prev) => ({
        ...prev,
        scrollEvents: scrollEventCount.current,
      }));
    };

    const element = virtualContainerRef.current;
    element.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, [enablePerformanceMonitoring]);

  // Touch optimization: Add passive touch event listeners for better scroll performance
  useEffect(() => {
    if (!enableTouchOptimization || !virtualContainerRef.current) return;

    const element = virtualContainerRef.current;

    // Add touch-action CSS for better touch handling
    element.style.touchAction = "pan-y";

    // Add momentum scrolling for iOS
    (element.style as any).webkitOverflowScrolling = "touch";

    return () => {
      element.style.touchAction = "";
      (element.style as any).webkitOverflowScrolling = "";
    };
  }, [enableTouchOptimization]);

  // Enhanced keyboard navigation for tables
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, callback: () => void) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        callback();
      }
    },
    [],
  );

  // Table keyboard navigation handler
  const handleTableKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const currentCell = target.closest('[role="cell"], [role="columnheader"]')!;
    if (!currentCell) return;

    const currentRow = currentCell.closest('[role="row"]')!;
    if (!currentRow) return;

    let nextCell: HTMLElement | null = null;

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        nextCell = currentCell.nextElementSibling as HTMLElement;
        break;
      case "ArrowLeft":
        e.preventDefault();
        nextCell = currentCell.previousElementSibling as HTMLElement;
        break;
      case "ArrowDown":
        e.preventDefault();
        const nextRow = currentRow.nextElementSibling as HTMLElement;
        if (nextRow) {
          const cells = nextRow.querySelectorAll(
            '[role="cell"], [role="columnheader"]',
          );
          const currentIndex = Array.from(
            currentRow.querySelectorAll('[role="cell"], [role="columnheader"]'),
          ).indexOf(currentCell);
          nextCell = cells[currentIndex] as HTMLElement;
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        const prevRow = currentRow.previousElementSibling as HTMLElement;
        if (prevRow) {
          const cells = prevRow.querySelectorAll(
            '[role="cell"], [role="columnheader"]',
          );
          const currentIndex = Array.from(
            currentRow.querySelectorAll('[role="cell"], [role="columnheader"]'),
          ).indexOf(currentCell);
          nextCell = cells[currentIndex] as HTMLElement;
        }
        break;
      case "Home":
        if (e.ctrlKey) {
          e.preventDefault();
          // Go to first cell of first row
          const firstRow =
            virtualContainerRef.current?.querySelector('[role="row"]');
          nextCell =
            firstRow?.querySelector('[role="cell"], [role="columnheader"]') ??
            null;
        } else {
          e.preventDefault();
          // Go to first cell of current row
          nextCell =
            currentRow.querySelector('[role="cell"], [role="columnheader"]')! ||
            null;
        }
        break;
      case "End":
        if (e.ctrlKey) {
          e.preventDefault();
          // Go to last cell of last row
          const allRows =
            virtualContainerRef.current?.querySelectorAll('[role="row"]');
          const lastRow = allRows?.[allRows.length - 1] as HTMLElement;
          const cells = lastRow?.querySelectorAll(
            '[role="cell"], [role="columnheader"]',
          );
          nextCell = cells?.[cells.length - 1] as HTMLElement;
        } else {
          e.preventDefault();
          // Go to last cell of current row
          const cells = currentRow.querySelectorAll(
            '[role="cell"], [role="columnheader"]',
          );
          nextCell = cells[cells.length - 1] as HTMLElement;
        }
        break;
      case "PageUp":
        e.preventDefault();
        // Scroll up by viewport height
        if (virtualContainerRef.current) {
          virtualContainerRef.current.scrollTop -=
            virtualContainerRef.current.clientHeight;
        }
        break;
      case "PageDown":
        e.preventDefault();
        // Scroll down by viewport height
        if (virtualContainerRef.current) {
          virtualContainerRef.current.scrollTop +=
            virtualContainerRef.current.clientHeight;
        }
        break;
    }

    if (nextCell && nextCell !== currentCell) {
      nextCell.focus();
      nextCell.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Screen reader instructions for keyboard navigation */}
      <div
        id="table-keyboard-instructions"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {tableA11y.getKeyboardInstructions()}
      </div>

      {/* Bulk Actions */}
      {enableRowSelection &&
        bulkActions &&
        Object.keys(tableRowSelection).length > 0 && (
          <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-2">
            <span className="text-muted-foreground text-sm">
              {Object.keys(tableRowSelection).length} selected
            </span>
            {bulkActions.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant={action.variant || "default"}
                onClick={() => {
                  const selectedRows = table
                    .getSelectedRowModel()
                    .rows.map((row) => row.original);
                  action.action(selectedRows);
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

      {/* Table */}
      <div className={cn("rounded-lg border", responsive && "overflow-x-auto")}>
        {enableVirtualization && virtualizer ? (
          <div
            ref={virtualContainerRef}
            className="overflow-auto"
            style={{ height: virtualHeight }}
            role="table"
            aria-label={ariaLabel}
            aria-description={tableA11y.getVirtualTableDescription(
              virtualizer.getVirtualItems().length,
              table.getRowModel().rows.length,
            )}
            // Add data attributes for performance monitoring
            data-virtual-table="true"
            data-row-count={table.getRowModel().rows.length}
            data-visible-count={virtualizer.getVirtualItems().length}
            // Enhanced keyboard navigation
            tabIndex={0}
            onKeyDown={handleTableKeyDown}
            aria-describedby="table-keyboard-instructions"
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
              role="presentation"
            >
              {/* Virtualized Header */}
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  backgroundColor: "var(--background)",
                }}
                role="rowgroup"
              >
                {table.getHeaderGroups().map((headerGroup) => (
                  <div
                    key={headerGroup.id}
                    role="row"
                    style={{ display: "flex" }}
                  >
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const isSorted = header.column.getIsSorted();

                      return (
                        <div
                          key={header.id}
                          role="columnheader"
                          className={cn(
                            "border-border border-b px-3 py-3 text-left text-xs font-semibold tracking-wide uppercase",
                            compact && "py-2",
                            canSort && "cursor-pointer select-none",
                            enableColumnResizing && "relative",
                          )}
                          onClick={
                            canSort
                              ? header.column.getToggleSortingHandler()
                              : undefined
                          }
                          onKeyDown={
                            canSort
                              ? (e) =>
                                  handleKeyDown(e, () =>
                                    header.column.toggleSorting(),
                                  )
                              : undefined
                          }
                          tabIndex={canSort ? 0 : undefined}
                          aria-sort={
                            canSort
                              ? tableA11y.getSortAriaSort(isSorted)
                              : undefined
                          }
                          aria-label={
                            canSort
                              ? `${header.column.columnDef.header as string}, ${getSortLabel(isSorted)}`
                              : undefined
                          }
                          style={{
                            width: header.getSize(),
                            minWidth: header.getSize(),
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {enableRowSelection && header.id === "select" && (
                              <input
                                type="checkbox"
                                checked={table.getIsAllRowsSelected()}
                                onChange={table.getToggleAllRowsSelectedHandler()}
                                aria-label="Select all rows"
                                className="rounded border-gray-300"
                              />
                            )}
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                            {canSort && (
                              <span
                                className="text-muted-foreground text-xs"
                                aria-hidden="true"
                              >
                                {getSortIcon(isSorted)}
                              </span>
                            )}
                          </div>
                          {enableColumnResizing &&
                            header.column.getCanResize() && (
                              <div
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                className="bg-border absolute top-0 right-0 h-full w-1 cursor-col-resize opacity-0 hover:opacity-100"
                              />
                            )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Virtualized Body */}
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const row = table.getRowModel().rows[virtualItem.index]!;
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start + table.getHeaderGroups().length * 40}px)`,
                    }}
                    role="row"
                    aria-rowindex={virtualItem.index + 2} // +2 for header rows
                    tabIndex={-1} // Focusable but not in tab order
                  >
                    <React.Fragment>
                      <div
                        data-state={
                          row.getIsSelected() ? "selected" : undefined
                        }
                        className={cn(
                          "border-border flex border-b",
                          onRowClick && "cursor-pointer",
                          rowClassName?.(row.original as TData),
                        )}
                        onClick={
                          onRowClick
                            ? () => onRowClick(row.original as TData)
                            : undefined
                        }
                        onKeyDown={
                          onRowClick
                            ? (e) =>
                                handleKeyDown(e, () =>
                                  onRowClick(row.original as TData),
                                )
                            : undefined
                        }
                        tabIndex={onRowClick ? 0 : undefined}
                        role={onRowClick ? "button" : "row"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <div
                            key={cell.id}
                            className={cn(
                              "border-border border-r px-3 py-3 text-sm",
                              compact && "py-2",
                            )}
                            role="cell"
                            style={{
                              width: cell.column.getSize(),
                              minWidth: cell.column.getSize(),
                            }}
                            tabIndex={-1} // Focusable but not in tab order
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </div>
                        ))}
                      </div>
                      {/* Expanded row */}
                      {enableExpandableRows &&
                        row.getIsExpanded() &&
                        renderExpandedRow && (
                          <div
                            className="bg-muted/30 border-border border-b"
                            role="row"
                            style={{ width: "100%" }}
                          >
                            <div
                              className="p-4"
                              role="cell"
                              style={{
                                width: "100%",
                                gridColumn: `span ${columns.length}`,
                              }}
                            >
                              {renderExpandedRow(row.original as TData)}
                            </div>
                          </div>
                        )}
                    </React.Fragment>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
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
                          enableColumnResizing && "relative",
                        )}
                        onClick={
                          canSort
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                        onKeyDown={
                          canSort
                            ? (e) =>
                                handleKeyDown(e, () =>
                                  header.column.toggleSorting(),
                                )
                            : undefined
                        }
                        tabIndex={canSort ? 0 : undefined}
                        role={canSort ? "button" : undefined}
                        aria-sort={
                          canSort
                            ? tableA11y.getSortAriaSort(isSorted)
                            : undefined
                        }
                        aria-label={
                          canSort
                            ? `${header.column.columnDef.header as string}, ${getSortLabel(isSorted)}`
                            : undefined
                        }
                        style={{
                          width: header.getSize(),
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {enableRowSelection && header.id === "select" && (
                            <input
                              type="checkbox"
                              checked={table.getIsAllRowsSelected()}
                              onChange={table.getToggleAllRowsSelectedHandler()}
                              aria-label="Select all rows"
                              className="rounded border-gray-300"
                            />
                          )}
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                          {canSort && (
                            <span
                              className="text-muted-foreground text-xs"
                              aria-hidden="true"
                            >
                              {getSortIcon(isSorted)}
                            </span>
                          )}
                        </div>
                        {enableColumnResizing &&
                          header.column.getCanResize() && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className="bg-border absolute top-0 right-0 h-full w-1 cursor-col-resize opacity-0 hover:opacity-100"
                            />
                          )}
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
                  <React.Fragment key={row.id}>
                    <TableRow
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      className={cn(
                        onRowClick && "cursor-pointer",
                        rowClassName?.(row.original as TData),
                      )}
                      onClick={
                        onRowClick
                          ? () => onRowClick(row.original as TData)
                          : undefined
                      }
                      onKeyDown={
                        onRowClick
                          ? (e) =>
                              handleKeyDown(e, () =>
                                onRowClick(row.original as TData),
                              )
                          : undefined
                      }
                      tabIndex={onRowClick ? 0 : undefined}
                      role={onRowClick ? "button" : undefined}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(compact && "py-2")}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {/* Expanded row */}
                    {enableExpandableRows &&
                      row.getIsExpanded() &&
                      renderExpandedRow && (
                        <TableRow>
                          <TableCell
                            colSpan={columns.length}
                            className="bg-muted/30"
                          >
                            {renderExpandedRow(row.original as TData)}
                          </TableCell>
                        </TableRow>
                      )}
                  </React.Fragment>
                ))
              ) : (
                // Empty state
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <p className="text-muted-foreground">{emptyMessage}</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {enablePagination && paginationInfo && (
        <div className="flex items-center justify-between gap-4 px-2">
          {/* Pagination info */}
          {showPaginationInfo && (
            <div className="text-muted-foreground text-sm">
              Showing {paginationInfo.startRow}-{paginationInfo.endRow} of{" "}
              {paginationInfo.totalRows}{" "}
              {paginationInfo.totalRows === 1 ? "row" : "rows"}
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
