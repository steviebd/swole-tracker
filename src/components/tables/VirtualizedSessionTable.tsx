"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import type {
  ColumnDef,
  SortingState,
  OnChangeFn,
} from "@tanstack/react-table";
import { cn } from "~/lib/utils";

interface SessionRow {
  workoutDate: Date;
  date: Date;
  weight: number;
  sets: number;
  reps: number;
  oneRm: number;
  volume: number;
  intensityPct: number | null;
}

interface VirtualizedSessionTableProps {
  items: SessionRow[];
  containerHeight: number;
  trendSummary?: {
    currentOneRM: number;
  } | null;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
}

function SessionTags({
  intensityPct,
  oneRm,
  currentMax,
}: {
  intensityPct: number | null;
  oneRm: number;
  currentMax: number;
}) {
  const tags: Array<{ label: string; tone: "success" | "warning" | "info" }> =
    [];
  if (intensityPct != null && intensityPct >= 90) {
    tags.push({ label: "Goal hit", tone: "success" });
  } else if (intensityPct != null && intensityPct >= 80) {
    tags.push({ label: "Heavy", tone: "info" });
  }
  if (currentMax > 0 && oneRm >= currentMax * 0.95) {
    tags.push({ label: "Near max", tone: "warning" });
  }
  if (tags.length === 0) {
    tags.push({ label: "Builder", tone: "info" });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag.label}
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
            tag.tone === "success"
              ? "bg-emerald-500/15 text-emerald-600"
              : tag.tone === "warning"
                ? "bg-amber-500/15 text-amber-600"
                : "bg-sky-500/15 text-sky-600",
          )}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
}

export function VirtualizedSessionTable({
  items,
  containerHeight,
  trendSummary,
  sorting = [],
  onSortingChange,
}: VirtualizedSessionTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const columns: ColumnDef<SessionRow>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ getValue }) => {
        const date = getValue() as Date;
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      },
      sortingFn: "datetime",
      minSize: 80,
      maxSize: 120,
      size: 100,
    },
    {
      accessorKey: "weight",
      header: "Weight",
      cell: ({ getValue }) => `${getValue() as number} kg`,
      minSize: 70,
      maxSize: 90,
      size: 80,
    },
    {
      id: "setsReps",
      header: "Sets × Reps",
      cell: ({ row }) => `${row.original.sets} × ${row.original.reps}`,
      enableSorting: false,
      minSize: 80,
      maxSize: 110,
      size: 90,
    },
    {
      accessorKey: "oneRm",
      header: "e1RM",
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return `${Math.round(value)} kg`;
      },
      minSize: 70,
      maxSize: 90,
      size: 80,
    },
    {
      accessorKey: "volume",
      header: "Volume",
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return `${Math.round(value).toLocaleString()} kg`;
      },
      minSize: 90,
      maxSize: 130,
      size: 110,
    },
    {
      id: "tags",
      header: "Tags",
      cell: ({ row }) => (
        <SessionTags
          intensityPct={row.original.intensityPct}
          oneRm={row.original.oneRm}
          currentMax={trendSummary?.currentOneRM ?? 0}
        />
      ),
      enableSorting: false,
      minSize: 120,
      maxSize: 180,
      size: 150,
    },
  ];

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(onSortingChange && { onSortingChange }),
    state: {
      sorting,
    },
  });

  const virtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="border-border/60 w-full overflow-auto rounded-lg border"
      style={{ height: containerHeight }}
    >
      {/* Header */}
      <div
        className="text-muted-foreground bg-background/95 border-border/60 sticky top-0 z-10 w-full border-b text-left text-xs tracking-wide uppercase backdrop-blur-sm"
        style={{
          display: "grid",
          gridTemplateColumns: columns
            .map(
              (col) =>
                `minmax(${col.minSize ?? 80}px, ${col.maxSize ?? 200}px)`,
            )
            .join(" "),
          gap: "1rem",
        }}
      >
        {table.getHeaderGroups().map((headerGroup) =>
          headerGroup.headers.map((header) => (
            <div
              key={header.id}
              className="flex items-center justify-between px-3 py-2 font-normal"
              style={{
                cursor: header.column.getCanSort() ? "pointer" : "default",
                userSelect: header.column.getCanSort() ? "none" : "auto",
              }}
              onClick={header.column.getToggleSortingHandler()}
            >
              <span className="truncate">
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
              </span>
              {{
                asc: <span className="ml-1 text-xs">↑</span>,
                desc: <span className="ml-1 text-xs">↓</span>,
              }[header.column.getIsSorted() as string] ?? null}
            </div>
          )),
        )}
      </div>

      {/* Virtualized Body */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const row = table.getRowModel().rows[virtualItem.index]!;
          return (
            <div
              key={virtualItem.key}
              className="border-border/60 divide-y"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
                display: "grid",
                gridTemplateColumns: columns
                  .map(
                    (col) =>
                      `minmax(${col.minSize ?? 80}px, ${col.maxSize ?? 200}px)`,
                  )
                  .join(" "),
                gap: "1rem",
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <div
                  key={cell.id}
                  className="flex items-center px-3 py-3 text-sm"
                  style={{
                    justifyContent:
                      cell.column.id === "tags" ? "flex-start" : "center",
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
