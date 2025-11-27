"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  createColumnHelper,
  flexRender,
  type ExpandedState,
  type SortingState,
  type ColumnSizingState,
  type ColumnOrderState,
  type RowSelectionState,
  type VisibilityState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { api } from "~/trpc/react";
import { useBulkOperations } from "~/hooks/use-bulk-operations";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

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

export function ExerciseManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingExercise, setEditingExercise] = useState<MasterExercise | null>(
    null,
  );
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseTags, setExerciseTags] = useState("");
  const [exerciseMuscleGroup, setExerciseMuscleGroup] = useState("");
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<MasterExercise[]>(
    [],
  );
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { handleBulkDelete } = useBulkOperations(() => {
    void invalidateExerciseDependents();
    setRowSelection({});
  });

  const utils = api.useUtils();
  const invalidateExerciseDependents = () => {
    void utils.templates.getAll.invalidate();
    void utils.progress.getExerciseList.invalidate();
    void utils.exercises.getAllMaster.invalidate();
  };

  const {
    data: exercises,
    isLoading,
    refetch,
  } = api.exercises.getAllMaster.useQuery();

  const { data: migrationStatus } = api.exercises.getMigrationStatus.useQuery();

  // Ensure client-side rendering after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  const migrateExistingExercises =
    api.exercises.migrateExistingExercises.useMutation({
      onSuccess: (result) => {
        alert(
          `Migration completed! Created ${result.createdMasterExercises} master exercises and ${result.createdLinks} links for ${result.migratedExercises} exercises.`,
        );
        void refetch();
        invalidateExerciseDependents();
      },
      onError: (error) => {
        alert(`Migration failed: ${error.message}`);
      },
    });

  const createMasterExercise = api.exercises.createMasterExercise.useMutation({
    onSuccess: () => {
      void refetch();
      invalidateExerciseDependents();
      setShowCreateDialog(false);
      setExerciseName("");
      setExerciseTags("");
      setExerciseMuscleGroup("");
    },
    onError: (error) => {
      alert(`Failed to create exercise: ${error.message}`);
    },
  });

  const updateMasterExercise = api.exercises.updateMasterExercise.useMutation({
    onSuccess: () => {
      void refetch();
      invalidateExerciseDependents();
      setEditingExercise(null);
      setExerciseName("");
      setExerciseTags("");
      setExerciseMuscleGroup("");
    },
    onError: (error) => {
      alert(`Failed to update exercise: ${error.message}`);
    },
  });

  const mergeMasterExercises = api.exercises.mergeMasterExercises.useMutation({
    onSuccess: (result) => {
      alert(
        `Successfully merged "${result.sourceName}" into "${result.targetName}". Moved ${result.movedLinks} links, skipped ${result.skippedLinks} duplicates.`,
      );
      void refetch();
      invalidateExerciseDependents();
      setMergeMode(false);
      setSelectedForMerge([]);
      setShowMergeDialog(false);
    },
    onError: (error) => {
      alert(`Failed to merge exercises: ${error.message}`);
    },
  });

  const filteredExercises = useMemo(() => {
    return (
      (exercises as MasterExercise[] | undefined)?.filter((exercise) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          exercise.name.toLowerCase().includes(searchLower) ||
          exercise.tags?.toLowerCase().includes(searchLower) ||
          exercise.muscleGroup?.toLowerCase().includes(searchLower)
        );
      }) ?? []
    );
  }, [exercises, searchTerm]);

  const handleEditExercise = useCallback((exercise: MasterExercise) => {
    setEditingExercise(exercise);
    setExerciseName(exercise.name);
    setExerciseTags(exercise.tags || "");
    setExerciseMuscleGroup(exercise.muscleGroup || "");
  }, []);

  const handleMergeSelection = useCallback(
    (exercise: MasterExercise) => {
      if (selectedForMerge.find((e) => e.id === exercise.id)) {
        // Deselect
        setSelectedForMerge(
          selectedForMerge.filter((e) => e.id !== exercise.id),
        );
      } else {
        // Select (max 2)
        if (selectedForMerge.length < 2) {
          setSelectedForMerge([...selectedForMerge, exercise]);
        }
      }
    },
    [selectedForMerge],
  );

  const handleMergeExercises = () => {
    if (selectedForMerge.length === 2) {
      setShowMergeDialog(true);
    }
  };

  const confirmMerge = () => {
    if (selectedForMerge.length === 2) {
      const [source, target] = selectedForMerge;
      if (source!.id === target!.id) {
        alert("Cannot merge an exercise with itself");
        return;
      }
      console.log("Merging exercises:", { source, target });
      mergeMasterExercises.mutate({
        sourceId: source!.id,
        targetId: target!.id,
      });
    }
  };

  const cancelMerge = () => {
    setMergeMode(false);
    setSelectedForMerge([]);
  };

  // Define columns
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            aria-label="Select all rows"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            aria-label={`Select row ${row.original.name}`}
          />
        ),
        size: 50,
        enableResizing: false,
      }),
      columnHelper.accessor("name", {
        header: "Exercise Name",
        cell: (info) => {
          const exercise = info.row.original;
          const isSelectedForMerge = selectedForMerge.some(
            (e) => e.id === exercise.id,
          );
          return (
            <div>
              <div className="font-medium">
                {isSelectedForMerge && "✓ "}
                {info.getValue()}
              </div>
              <div className="text-muted-foreground text-sm sm:hidden">
                Created {new Date(exercise.createdAt).toLocaleDateString()}
              </div>
            </div>
          );
        },
        enableSorting: true,
        size: 200,
      }),
      columnHelper.accessor("createdAt", {
        header: "Created",
        cell: (info) => (
          <span className="text-muted-foreground text-sm">
            {new Date(info.getValue()).toLocaleDateString()}
          </span>
        ),
        enableSorting: true,
        size: 120,
        meta: {
          className: "hidden sm:table-cell",
        },
      }),
      columnHelper.accessor("linkedCount", {
        id: "linkedTemplates",
        header: "Linked Templates",
        cell: (info) => {
          const count = info.getValue();
          return (
            <div className="text-sm">
              {count} template{count !== 1 ? "s" : ""}
            </div>
          );
        },
        enableSorting: true,
        size: 140,
      }),
      columnHelper.accessor("tags", {
        header: "Tags",
        cell: (info) => (
          <span className="text-sm">{info.getValue() || "—"}</span>
        ),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: "includesString",
        size: 150,
      }),
      columnHelper.accessor("muscleGroup", {
        header: "Muscle Group",
        cell: (info) => (
          <span className="text-sm">{info.getValue() || "—"}</span>
        ),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: "includesString",
        size: 130,
      }),
      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: (info) => {
          const exercise = info.row.original;
          const isSelectedForMerge = selectedForMerge.some(
            (e) => e.id === exercise.id,
          );
          return (
            <div className="flex items-center justify-end gap-1">
              {mergeMode ? (
                <Button
                  variant={isSelectedForMerge ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleMergeSelection(exercise)}
                  aria-label={`${isSelectedForMerge ? "Deselect" : "Select"} ${exercise.name} for merge`}
                >
                  {isSelectedForMerge ? "Selected" : "Select"}
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => info.row.toggleExpanded()}
                    aria-expanded={info.row.getIsExpanded()}
                    aria-label={`${info.row.getIsExpanded() ? "Hide" : "Show"} details for ${exercise.name}`}
                    aria-controls={`exercise-details-${exercise.id}`}
                  >
                    {info.row.getIsExpanded() ? "Hide" : "Details"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditExercise(exercise)}
                    aria-label={`Edit ${exercise.name}`}
                  >
                    ✏️
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMergeSelection(exercise)}
                    aria-label={`Merge ${exercise.name}`}
                  >
                    🔗
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      alert("Favorite functionality coming soon");
                    }}
                    aria-label={`Mark ${exercise.name} as favorite`}
                  >
                    ⭐
                  </Button>
                </>
              )}
            </div>
          );
        },
        size: 200,
        enableResizing: false,
      }),
    ],
    [selectedForMerge, mergeMode, handleEditExercise, handleMergeSelection],
  );

  // Table state persistence
  const TABLE_STATE_KEY = "exercise-manager-table-state";

  const saveTableState = useCallback(() => {
    const state = {
      columnSizing,
      columnOrder,
      columnVisibility,
      sorting,
    };
    localStorage.setItem(TABLE_STATE_KEY, JSON.stringify(state));
  }, [columnSizing, columnOrder, columnVisibility, sorting]);

  const loadTableState = useCallback(() => {
    try {
      const saved = localStorage.getItem(TABLE_STATE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.columnSizing) setColumnSizing(state.columnSizing);
        if (state.columnOrder) setColumnOrder(state.columnOrder);
        if (state.columnVisibility) setColumnVisibility(state.columnVisibility);
        if (state.sorting) setSorting(state.sorting);
      }
    } catch (error) {
      console.warn("Failed to load table state:", error);
    }
  }, []);

  // Load state on mount
  useEffect(() => {
    loadTableState();
  }, [loadTableState]);

  // Save state when it changes
  useEffect(() => {
    saveTableState();
  }, [saveTableState]);

  // Create table instance
  const table = useReactTable({
    data: filteredExercises,
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

  // Show loading state during SSR and initial client render
  if (!isClient || isLoading) {
    return (
      <div className="space-y-4">
        {[...(Array(5) as number[])].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="bg-muted mb-2 h-4 w-1/4 rounded"></div>
              <div className="bg-muted h-3 w-1/6 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!exercises?.length) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-6xl">💪</div>
        <h3 className="mb-2 text-xl font-semibold">No exercises yet</h3>
        <p className="text-secondary mb-6">
          Exercises will appear here as you create workout templates and link
          them together.
        </p>
        <Button
          onClick={() => migrateExistingExercises.mutate()}
          disabled={migrateExistingExercises.isPending}
          size="lg"
          aria-label="Migrate existing exercises to linkable master exercises"
        >
          {migrateExistingExercises.isPending
            ? "Migrating..."
            : "Migrate Existing Exercises"}
        </Button>
        <p className="text-muted mt-2 text-xs">
          This will convert your existing template exercises into linkable
          master exercises.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Actions */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="Search exercises, tags, or muscle groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
            aria-label="Search exercises"
          />
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            Create Exercise
          </Button>
          <Button
            onClick={() => {
              if (mergeMode) {
                cancelMerge();
              } else {
                setMergeMode(true);
              }
            }}
            variant={mergeMode ? "destructive" : "outline"}
            size="sm"
          >
            {mergeMode ? "Cancel Merge" : "Merge Exercises"}
          </Button>
          {Object.keys(rowSelection).length > 0 && (
            <Button onClick={handleBulkDelete} variant="destructive" size="sm">
              Delete Selected ({Object.keys(rowSelection).length})
            </Button>
          )}
          <Button
            onClick={() => {
              // Reset table state
              setColumnSizing({});
              setColumnOrder([]);
              setColumnVisibility({});
              setSorting([]);
              setRowSelection({});
              setColumnFilters([]);
              localStorage.removeItem(TABLE_STATE_KEY);
            }}
            variant="outline"
            size="sm"
            title="Reset table to default state"
          >
            Reset Table
          </Button>
        </div>

        {/* Merge Mode Instructions */}
        {mergeMode && (
          <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-950/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Merge Mode Active
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Select 2 exercises to merge. The first selected will be merged
                  into the second.
                </p>
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                  Selected: {selectedForMerge.map((e) => e.name).join(", ")}
                </p>
              </div>
              <Button
                onClick={handleMergeExercises}
                disabled={selectedForMerge.length !== 2}
                size="sm"
              >
                Merge Selected ({selectedForMerge.length}/2)
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            {migrationStatus ? (
              <>
                {migrationStatus.needsMigration ? (
                  <>
                    {migrationStatus.unlinkedCount} unlinked exercise
                    {migrationStatus.unlinkedCount !== 1 ? "s" : ""} found
                    {migrationStatus.lastMigrationAt && (
                      <span className="ml-2">
                        • Last migration:{" "}
                        {new Date(
                          migrationStatus.lastMigrationAt,
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    All exercises are linked
                    {migrationStatus.lastMigrationAt && (
                      <span className="ml-2">
                        • Last migration:{" "}
                        {new Date(
                          migrationStatus.lastMigrationAt,
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </>
                )}
              </>
            ) : (
              "Checking migration status..."
            )}
          </div>
          <Button
            onClick={() => migrateExistingExercises.mutate()}
            disabled={
              migrateExistingExercises.isPending ||
              !migrationStatus?.needsMigration
            }
            size="sm"
            aria-label="Migrate unlinked exercises to master exercises"
          >
            {migrateExistingExercises.isPending
              ? "Migrating..."
              : migrationStatus?.needsMigration
                ? "Migrate Unlinked Exercises"
                : "No Migration Needed"}
          </Button>
        </div>
      </div>

      {/* Exercise List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            {filteredExercises.length} exercise
            {filteredExercises.length !== 1 ? "s" : ""} found
            {Object.keys(rowSelection).length > 0 && (
              <span className="text-primary ml-2">
                • {Object.keys(rowSelection).length} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Column visibility toggle */}
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground mr-2 text-xs">
                Columns:
              </span>
              {table.getAllLeafColumns().map((column) => {
                if (!column.getCanHide()) return null;
                return (
                  <label
                    key={column.id}
                    className="flex items-center gap-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                      className="h-3 w-3"
                    />
                    {column.columnDef.header as string}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-md border">
          <Table role="table" aria-label="Exercise management table">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as
                      | { className?: string }
                      | undefined;
                    return (
                      <TableHead
                        key={header.id}
                        className={meta?.className}
                        onClick={
                          header.column.getCanSort()
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                        style={{
                          cursor: header.column.getCanSort()
                            ? "pointer"
                            : "default",
                          width: header.getSize(),
                          position: "relative",
                        }}
                        aria-sort={
                          header.column.getIsSorted()
                            ? header.column.getIsSorted() === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex items-center gap-2">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {header.column.getCanSort() && (
                              <span className="text-muted-foreground">
                                {header.column.getIsSorted() === "asc"
                                  ? "↑"
                                  : header.column.getIsSorted() === "desc"
                                    ? "↓"
                                    : "↕"}
                              </span>
                            )}
                          </div>
                        )}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className="bg-border hover:bg-primary absolute top-0 right-0 h-full w-1 cursor-col-resize"
                          />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => {
                  const exercise = row.original;
                  const isSelectedForMerge = selectedForMerge.some(
                    (e) => e.id === exercise.id,
                  );
                  return (
                    <Fragment key={row.id}>
                      <TableRow
                        className={
                          isSelectedForMerge
                            ? "bg-blue-50 dark:bg-blue-950/50"
                            : row.getIsSelected()
                              ? "bg-muted/50"
                              : ""
                        }
                      >
                        {row.getVisibleCells().map((cell) => {
                          const meta = cell.column.columnDef.meta as
                            | { className?: string }
                            | undefined;
                          return (
                            <TableCell
                              key={cell.id}
                              className={meta?.className}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {row.getIsExpanded() && (
                        <TableRow>
                          <TableCell
                            colSpan={table.getVisibleLeafColumns().length}
                            className="p-0"
                            id={`exercise-details-${exercise.id}`}
                          >
                            <div className="bg-muted/50 border-t p-4">
                              <ExerciseDetails
                                masterExerciseId={exercise.id}
                                masterExerciseName={exercise.name}
                                normalizedName={exercise.normalizedName}
                                onUpdate={() => {
                                  void refetch();
                                  invalidateExerciseDependents();
                                }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No exercises found matching your search
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create/Edit Exercise Dialog */}
      <Dialog
        open={showCreateDialog || !!editingExercise}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingExercise(null);
            setExerciseName("");
            setExerciseTags("");
            setExerciseMuscleGroup("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExercise ? "Edit Exercise" : "Create New Exercise"}
            </DialogTitle>
            <DialogDescription>
              {editingExercise
                ? "Update the exercise details below."
                : "Add a new master exercise that can be linked to workout templates."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="exercise-name">Exercise Name</Label>
              <Input
                id="exercise-name"
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                placeholder="e.g., Bench Press"
              />
            </div>
            <div>
              <Label htmlFor="exercise-tags">Tags (comma-separated)</Label>
              <Input
                id="exercise-tags"
                value={exerciseTags}
                onChange={(e) => setExerciseTags(e.target.value)}
                placeholder="e.g., compound, chest, pressing"
              />
            </div>
            <div>
              <Label htmlFor="exercise-muscle-group">
                Primary Muscle Group
              </Label>
              <Select
                value={exerciseMuscleGroup}
                onValueChange={setExerciseMuscleGroup}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select muscle group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chest">Chest</SelectItem>
                  <SelectItem value="back">Back</SelectItem>
                  <SelectItem value="shoulders">Shoulders</SelectItem>
                  <SelectItem value="arms">Arms</SelectItem>
                  <SelectItem value="legs">Legs</SelectItem>
                  <SelectItem value="core">Core</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setEditingExercise(null);
                setExerciseName("");
                setExerciseTags("");
                setExerciseMuscleGroup("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingExercise) {
                  updateMasterExercise.mutate({
                    id: editingExercise.id,
                    name: exerciseName,
                    tags: exerciseTags || undefined,
                    muscleGroup: exerciseMuscleGroup || undefined,
                  });
                } else {
                  createMasterExercise.mutate({
                    name: exerciseName,
                    tags: exerciseTags || undefined,
                    muscleGroup: exerciseMuscleGroup || undefined,
                  });
                }
              }}
              disabled={
                !exerciseName.trim() ||
                createMasterExercise.isPending ||
                updateMasterExercise.isPending
              }
            >
              {createMasterExercise.isPending || updateMasterExercise.isPending
                ? "Saving..."
                : editingExercise
                  ? "Update Exercise"
                  : "Create Exercise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Confirmation Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Merge</DialogTitle>
            <DialogDescription>
              This will merge "{selectedForMerge[0]?.name}" into "
              {selectedForMerge[1]?.name}". All linked template exercises will
              be moved to the target exercise, and the source exercise will be
              deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-md p-3">
              <div className="text-sm">
                <div className="font-medium">
                  Source exercise: {selectedForMerge[0]?.name}
                </div>
                <div className="text-muted-foreground">
                  {selectedForMerge[0]?.linkedCount} linked template
                  {selectedForMerge[0]?.linkedCount !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="mt-2 text-sm">
                <div className="font-medium">
                  Target exercise: {selectedForMerge[1]?.name}
                </div>
                <div className="text-muted-foreground">
                  {selectedForMerge[1]?.linkedCount} linked template
                  {selectedForMerge[1]?.linkedCount !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmMerge}
              disabled={mergeMasterExercises.isPending}
            >
              {mergeMasterExercises.isPending ? "Merging..." : "Confirm Merge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ExerciseDetailsProps {
  masterExerciseId: number;
  masterExerciseName: string;
  normalizedName: string;
  onUpdate: () => void;
}

function ExerciseDetails({
  masterExerciseId,
  masterExerciseName,
  normalizedName,
  onUpdate,
}: ExerciseDetailsProps) {
  const [showConfirmUnlinkAll, setShowConfirmUnlinkAll] = useState(false);

  const {
    data: linkingDetails,
    isLoading: detailsLoading,
    refetch: refetchDetails,
  } = api.exercises.getLinkingDetails.useQuery({ masterExerciseId });

  const { data: latestPerformanceData } =
    api.exercises.getLatestPerformance.useQuery({
      masterExerciseId,
    });

  type LatestPerformanceDetails = {
    weight: number | null;
    unit: string | null;
    reps: number | null;
    sets: number | null;
    workoutDate: Date;
  };

  const latestPerformance =
    latestPerformanceData as LatestPerformanceDetails | null;

  const unlinkExercise = api.exercises.unlink.useMutation({
    onSuccess: () => {
      void refetchDetails();
      onUpdate();
    },
  });

  const linkToMaster = api.exercises.linkToMaster.useMutation({
    onSuccess: () => {
      void refetchDetails();
      onUpdate();
    },
  });

  const bulkLinkSimilar = api.exercises.bulkLinkSimilar.useMutation({
    onSuccess: (result) => {
      alert(`Successfully linked ${result.linkedCount} similar exercises!`);
      void refetchDetails();
      onUpdate();
    },
  });

  const bulkUnlinkAll = api.exercises.bulkUnlinkAll.useMutation({
    onSuccess: (result) => {
      alert(`Successfully unlinked ${result.unlinkedCount} exercises!`);
      void refetchDetails();
      onUpdate();
      setShowConfirmUnlinkAll(false);
    },
  });

  if (detailsLoading) {
    return (
      <div className="border-border mt-4 space-y-3 border-t pt-4">
        <div className="text-secondary animate-pulse text-sm">
          Loading linking details...
        </div>
      </div>
    );
  }

  if (!linkingDetails) {
    return (
      <div className="border-border mt-4 space-y-3 border-t pt-4">
        <div className="text-sm text-red-600 dark:text-red-400">
          Failed to load linking details
        </div>
      </div>
    );
  }

  const { linkedExercises, potentialLinks } = linkingDetails;
  const similarPotentialLinks = potentialLinks.filter(
    (link) => link.similarity >= 0.6 && !link.linkingRejected,
  );

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card className="bg-muted/30">
        <CardContent className="p-3">
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Normalized name:</span>
              <span className="bg-muted ml-2 rounded px-2 py-1 font-mono text-xs">
                {normalizedName}
              </span>
            </div>
            {/* Latest Performance */}
            {latestPerformance && (
              <div>
                <span className="text-muted-foreground">
                  Latest performance:
                </span>
                <div className="mt-1 ml-2">
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {latestPerformance.weight} {latestPerformance.unit} ×{" "}
                    {latestPerformance.reps} reps × {latestPerformance.sets}{" "}
                    sets
                  </span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    (
                    {new Date(
                      latestPerformance.workoutDate,
                    ).toLocaleDateString()}
                    )
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <div className="flex gap-2">
        {similarPotentialLinks.length > 0 && (
          <Button
            onClick={() => bulkLinkSimilar.mutate({ masterExerciseId })}
            disabled={bulkLinkSimilar.isPending}
            size="sm"
            aria-label={`Link all ${similarPotentialLinks.length} similar exercises to ${masterExerciseName}`}
          >
            {bulkLinkSimilar.isPending
              ? "Linking..."
              : `Link All Similar (${similarPotentialLinks.length})`}
          </Button>
        )}

        {linkedExercises.length > 0 && (
          <Button
            onClick={() => setShowConfirmUnlinkAll(true)}
            variant="destructive"
            size="sm"
            aria-label={`Unlink all ${linkedExercises.length} linked exercises from ${masterExerciseName}`}
          >
            Unlink All ({linkedExercises.length})
          </Button>
        )}
      </div>

      {/* Confirm Unlink All Dialog */}
      <Dialog
        open={showConfirmUnlinkAll}
        onOpenChange={setShowConfirmUnlinkAll}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Unlink All</DialogTitle>
            <DialogDescription>
              This will unlink all {linkedExercises.length} exercises from
              &quot;
              {masterExerciseName}&quot;. Historical data will be separated and
              this action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmUnlinkAll(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => bulkUnlinkAll.mutate({ masterExerciseId })}
              disabled={bulkUnlinkAll.isPending}
            >
              {bulkUnlinkAll.isPending ? "Unlinking..." : "Confirm Unlink All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Linked Exercises */}
      {linkedExercises.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-green-700 dark:text-green-400">
            🔗 Linked Template Exercises ({linkedExercises.length})
          </h4>
          <div className="space-y-2">
            {linkedExercises.map((linked) => (
              <Card
                key={linked.templateExerciseId}
                className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50"
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium">{linked.exerciseName}</span>
                      <span className="text-muted-foreground ml-2">
                        from {linked.templateName}
                      </span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        unlinkExercise.mutate({
                          templateExerciseId: linked.templateExerciseId,
                        })
                      }
                      disabled={unlinkExercise.isPending}
                      className="h-7 px-2 text-xs"
                      aria-label={`Unlink ${linked.exerciseName} from ${linked.templateName}`}
                    >
                      {unlinkExercise.isPending ? "..." : "Unlink"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Potential Links */}
      {potentialLinks.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-blue-700 dark:text-blue-400">
            🔍 Potential Links ({potentialLinks.length})
          </h4>
          <div className="space-y-2">
            {potentialLinks.map((potential) => (
              <Card
                key={potential.templateExerciseId}
                className={
                  potential.linkingRejected
                    ? "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/50"
                    : potential.similarity >= 0.7
                      ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50"
                      : "border-border bg-muted/50"
                }
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium">
                        {potential.exerciseName}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        from {potential.templateName}
                      </span>
                      <span
                        className={`ml-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          potential.similarity >= 0.7
                            ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400"
                        }`}
                      >
                        {Math.round(potential.similarity * 100)}% match
                      </span>
                      {potential.linkingRejected && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/50 dark:text-orange-400">
                          rejected
                        </span>
                      )}
                    </div>
                    {!potential.linkingRejected && (
                      <Button
                        size="sm"
                        onClick={() =>
                          linkToMaster.mutate({
                            templateExerciseId: potential.templateExerciseId,
                            masterExerciseId,
                          })
                        }
                        disabled={linkToMaster.isPending}
                        className="h-7 px-2 text-xs"
                        aria-label={`Link ${potential.exerciseName} from ${potential.templateName} to master exercise`}
                      >
                        {linkToMaster.isPending ? "..." : "Link"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No potential links message */}
      {potentialLinks.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <div className="text-muted-foreground text-sm">
              All template exercises are linked! Great job staying organized. 🎯
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
