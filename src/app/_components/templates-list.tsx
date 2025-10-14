"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";

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

export function TemplatesList() {
  const [filters, setFilters] = useState<TemplateFiltersState>({
    search: "",
    sort: "recent",
    tag: null,
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    template?: { id: number; name: string };
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
        return {
          ...template,
          tags,
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

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!filters.tag) return templates;
    return templates.filter((template) => template.tags.includes(filters.tag!));
  }, [templates, filters.tag]);

  const groupedTemplates = useMemo(() => {
    const groups = new Map<string, TemplateWithMeta[]>();
    for (const template of filteredTemplates) {
      const key = template.tags.find((tag) => tag !== "General") ?? "General";
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
    onMutate: async (deletedTemplate) => {
      await utils.templates.getAll.cancel();
      const previousTemplates = utils.templates.getAll.getData(queryInput);
      utils.templates.getAll.setData(
        queryInput,
        (old) =>
          old?.filter((template) => template.id !== deletedTemplate.id) ?? [],
      );
      return { previousTemplates };
    },
    onError: (_error, _deletedTemplate, context) => {
      if (context?.previousTemplates) {
        utils.templates.getAll.setData(queryInput, context.previousTemplates);
      }
    },
    onSettled: () => {
      void utils.templates.getAll.invalidate();
    },
  });

  const duplicateTemplate = api.templates.duplicate.useMutation({
    onSuccess: () => {
      void utils.templates.getAll.invalidate();
    },
  });

  const createTemplate = api.templates.create.useMutation({
    onSuccess: () => {
      void utils.templates.getAll.invalidate();
    },
  });

  const handleDelete = (id: number, name: string) => {
    setDeleteDialog({ open: true, template: { id, name } });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.template) return;
    const { id, name } = deleteDialog.template;
    setDeleteDialog({ open: false });

    // Find the template data for undo
    const templateToDelete = templates?.find((t) => t.id === id);
    if (!templateToDelete) return;

    try {
      await deleteTemplate.mutateAsync({ id });
      analytics.templateDeleted(id.toString());
      setDeleteToast({
        open: true,
        template: { id, name, data: templateToDelete },
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      analytics.error(error as Error, {
        context: "template_delete",
        templateId: id.toString(),
      });
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
            <span aria-hidden className="text-5xl">
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
            <span aria-hidden className="text-5xl">
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
        <section key={groupName} className="space-y-4">
          <header className="flex items-center gap-2">
            <h3 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
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
                      >
                        Duplicate
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/templates/${template.id}/edit`}>
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          void handleDelete(template.id, template.name)
                        }
                        disabled={deleteTemplate.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pb-3">
                  <p className="text-muted-foreground text-sm">
                    {!template.exercises || template.exercises.length === 0 ? (
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
                    <span className="hidden sm:inline">•</span>
                    <span>Avg session: —</span>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-wrap gap-2 pt-0">
                  <Button size="sm" asChild>
                    <Link href={`/workout/start?templateId=${template.id}`}>
                      Start workout
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/templates/${template.id}/edit`}>
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
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open })}
      >
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
            <Button variant="destructive" onClick={confirmDelete}>
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
