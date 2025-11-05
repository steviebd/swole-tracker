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

interface MasterExercise {
  id: number;
  name: string;
  normalizedName: string;
  tags?: string | null;
  muscleGroup?: string | null;
  createdAt: Date;
  linkedCount: number;
}

const columnHelper = createColumnHelper<MasterExercise>();

export function useExerciseTable(data: MasterExercise[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: "Select",
        cell: "select",
        size: 50,
        enableResizing: false,
      }),
      columnHelper.accessor("name", {
        header: "Exercise Name",
        cell: "name",
        enableSorting: true,
        size: 200,
      }),
      columnHelper.accessor("createdAt", {
        header: "Created",
        cell: "createdAt",
        enableSorting: true,
        size: 120,
        meta: {
          className: "hidden sm:table-cell",
        },
      }),
      columnHelper.accessor("linkedCount", {
        id: "linkedTemplates",
        header: "Linked Templates",
        cell: "linkedCount",
        enableSorting: true,
        size: 140,
      }),
      columnHelper.accessor("tags", {
        header: "Tags",
        cell: "tags",
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: "includesString",
        size: 150,
      }),
      columnHelper.accessor("muscleGroup", {
        header: "Muscle Group",
        cell: "muscleGroup",
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: "includesString",
        size: 130,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: "actions",
        size: 200,
        enableResizing: false,
      }),
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      expanded,
      sorting,
      globalFilter: searchTerm,
      columnSizing,
      columnOrder,
      rowSelection,
      columnVisibility,
      columnFilters,
    },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onColumnOrderChange: setColumnOrder,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    enableColumnResizing: true,
    enableRowSelection: true,
    enableHiding: true,
    enableColumnFilters: true,
  });

  return {
    table,
    searchTerm,
    setSearchTerm,
    expanded,
    setExpanded,
    sorting,
    setSorting,
    columnSizing,
    setColumnSizing,
    columnOrder,
    setColumnOrder,
    rowSelection,
    setRowSelection,
    columnVisibility,
    setColumnVisibility,
    columnFilters,
    setColumnFilters,
  };
}