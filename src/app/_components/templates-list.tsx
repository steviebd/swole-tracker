"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import {
  TemplateFilters,
  type TemplateFiltersState,
} from "~/components/filters/template-filters";
import { EmptyState } from "~/components/ui/empty-state";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Toast } from "~/components/ui/toast";
import { analytics } from "~/lib/analytics";
import {
  upsertTemplateInCaches,
  removeTemplateFromCaches,
  snapshotTemplateCaches,
  restoreTemplateCaches,
  type TemplateCacheSnapshot,
} from "~/lib/template-cache-helpers";
import { api, type RouterOutputs } from "~/trpc/react";

const TAG_PATTERNS: Array<{ tag: string; keywords: RegExp }> = [
  {
    tag: "Upper body",
    keywords: /(bench|press|row|pull|push|curl|dip|shoulder|chest)/i,
  },
  {
    tag: "Lower body",
    keywords: /(squat|deadlift|leg|lunge|glute|hamstring|quad|calf)/i,
  },
  {
    tag: "Posterior chain",
    keywords: /(deadlift|row|pull|hip thrust|hinge|romanian)/i,
  },
  { tag: "Core", keywords: /(core|abs|plank|crunch|rollout|hollow)/i },
  {
    tag: "Conditioning",
    keywords: /(cardio|interval|bike|rower|erg|sprint|hiit|conditioning)/i,
  },
  { tag: "Olympic", keywords: /(clean|snatch|jerk)/i },
];

type TemplateRecord = RouterOutputs["templates"]["getAll"][number];

type TemplateWithMeta = TemplateRecord & {
  tags: string[];
  lastUsedDisplay: string | null;
  primaryTag: string; // For grouping
};

function deriveTags(exerciseNames: string[]): string[] {
  const found = new Set<string>();
  for (const exercise of exerciseNames) {
    for (const { tag, keywords } of TAG_PATTERNS) {
      if (keywords.test(exercise)) {
        found.add(tag);
      }
    }
  }

  if (found.size === 0) {
    found.add("General");
  }

  return Array.from(found);
}

// Column helper for type-safe column definitions
const columnHelper = createColumnHelper<TemplateWithMeta>();

export function TemplatesList() {
  console.log("TemplatesList render");
  const [filters, setFilters] = useState<TemplateFiltersState>({
    search: "",
    sort: "recent",
    tag: null,
  });
  const queryClient = useQueryClient();

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    template?: TemplateWithMeta;
  }>({ open: false });

  const [deleteToast, setDeleteToast] = useState<{
    open: boolean;
    template?: { id: number; name: string; data?: TemplateWithMeta };
  }>({ open: false });

  const queryInput = useMemo(
    () => ({ search: filters.search, sort: filters.sort }),
    [filters.search, filters.sort],
  );

  const { data: templatesRaw, isLoading } =
    api.templates.getAll.useQuery(queryInput);

  // Enrich templates with metadata
  const templates = useMemo<TemplateWithMeta[] | undefined>(() => {
    if (!templatesRaw) return undefined;
    return templatesRaw
      .filter(
        (template, index, array) =>
          array.findIndex((t) => t.id === template.id) === index,
      )
      .map((template) => {
        const exerciseNames =
          template.exercises?.map((ex) => ex.exerciseName) ?? [];
        const tags = deriveTags(exerciseNames);
        const primaryTag = tags.find((tag) => tag !== "General") ?? "General";
        return {
          ...template,
          tags,
          primaryTag,
          lastUsedDisplay: template.lastUsed
            ? formatDistanceToNow(new Date(template.lastUsed), {
                addSuffix: true,
              })
            : null,
        } satisfies TemplateWithMeta;
      });
  }, [templatesRaw]);

  const availableTags = useMemo(() => {
    if (!templates) return [];
    const tagSet = new Set<string>();
    for (const template of templates) {
      for (const tag of template.tags) {
        if (tag !== "General") {
          tagSet.add(tag);
        }
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [templates]);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    let filtered = templates;
    // Apply search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(search));
    }
    // Apply sort
    filtered = [...filtered].sort((a, b) => {
      if (filters.sort === "recent") {
        return (b.lastUsed?.getTime() ?? 0) - (a.lastUsed?.getTime() ?? 0);
      } else {
        return a.name.localeCompare(b.name);
      }
    });
    // Apply tag filter
    if (filters.tag) {
      filtered = filtered.filter((t) => t.tags.includes(filters.tag!));
    }
    return filtered;
  }, [templates, filters]);

  // Group templates by primary tag
  const groupedTemplates = useMemo(() => {
    const groups = new Map<string, TemplateWithMeta[]>();
    for (const template of filteredTemplates) {
      const key = template.primaryTag;
      const list = groups.get(key);
      if (list) {
        list.push(template);
      } else {
        groups.set(key, [template]);
      }
    }
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [filteredTemplates]);

  const utils = api.useUtils();

  const deleteTemplate = api.templates.delete.useMutation({
    onSettled: () => {
      void utils.templates.getAll.invalidate();
    },
  });

  const duplicateTemplate = api.templates.duplicate.useMutation({
    onSuccess: (newTemplate) => {
      if (newTemplate) {
        upsertTemplateInCaches(queryClient, newTemplate as TemplateRecord);
      }
      void utils.templates.getAll.invalidate();
    },
  });

  const createTemplate = api.templates.create.useMutation({
    onSuccess: (createdTemplate) => {
      if (createdTemplate) {
        upsertTemplateInCaches(queryClient, createdTemplate as TemplateRecord);
      }
      void utils.templates.getAll.invalidate();
    },
  });

  const handleDelete = useCallback((template: TemplateWithMeta) => {
    setDeleteDialog({ open: true, template });
  }, []);

  const confirmDelete = async () => {
    console.log("1. Starting confirmDelete");
    if (!deleteDialog.template) {
      console.log("1a. No deleteDialog.template");
      return;
    }
    const templateToDelete = deleteDialog.template;
    const { id, name } = templateToDelete;
    console.log("1b. Template from dialog", { id, name });
    setDeleteDialog({ open: false });
    console.log("2. Dialog closed");

    console.log("3. Template found");

    try {
      console.log("4. Calling mutation");
      // Don't await to prevent blocking the UI
      deleteTemplate
        .mutateAsync({ id })
        .then((result) => {
          console.log("5. Mutation completed", result);
          removeTemplateFromCaches(queryClient, id);
          analytics.templateDeleted(id.toString());
          setDeleteToast({
            open: true,
            template: { id, name, data: templateToDelete },
          });
          console.log("6. Toast set");
        })
        .catch((error) => {
          console.error("DEBUG: Error deleting template:", error);
          analytics.error(error as Error, {
            context: "template_delete",
            templateId: id.toString(),
          });
        });
    } catch (error) {
      console.error("DEBUG: Error starting mutation:", error);
    }
  };

  const undoDelete = async () => {
    if (!deleteToast.template?.data) return;

    try {
      // Recreate the template using the stored data
      await createTemplate.mutateAsync({
        name: deleteToast.template.data.name,
        exercises:
          deleteToast.template.data.exercises?.map((ex) => ex.exerciseName) ??
          [],
        dedupeKey: `undo-${deleteToast.template.id}-${Date.now()}`,
      });
      analytics.templateCreated(
        deleteToast.template.id.toString(),
        deleteToast.template.data.exercises?.length ?? 0,
      );
    } catch (error) {
      console.error("Error undoing delete:", error);
      analytics.error(error as Error, {
        context: "template_undo_delete",
        templateId: deleteToast.template.id.toString(),
      });
    }

    setDeleteToast({ open: false });
  };

  const handleDuplicate = async (id: number) => {
    try {
      await duplicateTemplate.mutateAsync({ id });
      analytics.templateDuplicated(id.toString());
    } catch (error) {
      console.error("Error duplicating template", error);
      analytics.error(error as Error, {
        context: "template_duplicate",
        templateId: id.toString(),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <TemplateFilters
          value={filters}
          onChange={setFilters}
          tags={availableTags}
        />
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} padding="md" className="bg-card/90">
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!templates?.length) {
    return (
      <div className="space-y-4">
        <TemplateFilters
          value={filters}
          onChange={setFilters}
          tags={availableTags}
        />
        <EmptyState
          icon={
            <span aria-hidden className="templates-list-icon">
              📋
            </span>
          }
          title="No templates yet"
          description="Create your first template or adjust your filters."
          action={{ label: "Create template", href: "/templates/new" }}
        />
      </div>
    );
  }

  if (filteredTemplates.length === 0) {
    return (
      <div className="space-y-4">
        <TemplateFilters
          value={filters}
          onChange={setFilters}
          tags={availableTags}
        />
        <EmptyState
          icon={
            <span aria-hidden className="templates-list-icon">
              🧭
            </span>
          }
          title="No templates match those filters"
          description="Try a different focus or clear the search to see all templates again."
          action={{
            label: "Clear filters",
            onClick: () =>
              setFilters({ search: "", sort: "recent", tag: null }),
            variant: "outline",
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TemplateFilters
        value={filters}
        onChange={setFilters}
        tags={availableTags}
      />

      {groupedTemplates.map(([groupName, groupTemplates]) => (
        <section
          key={groupName}
          className="space-y-4"
          role="region"
          aria-labelledby={`group-${groupName}`}
        >
          <header className="flex items-center gap-2">
            <h3
              id={`group-${groupName}`}
              className="text-muted-foreground text-sm font-semibold tracking-wide uppercase"
            >
              {groupName}
            </h3>
            {groupName !== "General" && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Focus
              </Badge>
            )}
          </header>

          <div className="space-y-4">
            {groupTemplates.map((template) => (
              <Card key={template.id} padding="md" className="bg-card/90">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-semibold">
                        {template.name}
                      </CardTitle>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                        {template.tags.map((label) => (
                          <Badge
                            key={label}
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {template.lastUsedDisplay ? (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary"
                        >
                          Last used {template.lastUsedDisplay}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Not used yet
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        {template.totalSessions} sessions
                      </Badge>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDuplicate(template.id)}
                        disabled={duplicateTemplate.isPending}
                        aria-label={`Duplicate ${template.name}`}
                      >
                        Duplicate
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/templates/${template.id}/edit`}
                          aria-label={`Edit ${template.name}`}
                        >
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(template)}
                        disabled={deleteTemplate.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Delete ${template.name}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pb-3">
                  <p className="text-muted-foreground text-sm">
                    {template.exercises?.length === 0 ? (
                      "No exercises"
                    ) : (
                      <>
                        {template.exercises.length} exercise
                        {template.exercises.length !== 1 ? "s" : ""}:{" "}
                        {template.exercises
                          .map((ex) => ex.exerciseName)
                          .join(", ")}
                      </>
                    )}
                  </p>
                  <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <span>
                      Exercises planned: {template.exercises?.length ?? 0}
                    </span>
                    <span
                      className="templates-list-separator"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>Avg session: —</span>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-wrap gap-2 pt-0">
                  <Button size="sm" asChild>
                    <Link
                      href={`/workout/start?templateId=${template.id}`}
                      aria-label={`Start workout with ${template.name}`}
                    >
                      Start workout
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`/templates/${template.id}/edit`}
                      aria-label={`Customize ${template.name}`}
                    >
                      Customize
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.template?.name}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteTemplate.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Success Toast */}
      <Toast
        open={deleteToast.open}
        type="success"
        message={`Template "${deleteToast.template?.name}" deleted successfully.`}
        onUndo={undoDelete}
        onClose={() => setDeleteToast({ open: false })}
      />
    </div>
  );
}
