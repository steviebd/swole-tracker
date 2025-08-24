"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

export function TemplatesList() {
  const router = useRouter();
  const { 
    data: templatesRaw, 
    isLoading, 
    isRefetching,
    dataUpdatedAt 
  } = api.templates.getAll.useQuery(undefined, {
    // Enhanced query options for better cache management
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 300000, // Keep in garbage collection for 5 minutes
    refetchOnWindowFocus: false, // Prevent excessive refetching
    refetchOnMount: false, // Use cached data when possible
  });

  // Enhanced deduplication with stable sorting and better performance
  const templates = templatesRaw
    ? templatesRaw
        .filter(
          (template, index, array) =>
            array.findIndex(t => t.id === template.id) === index
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : undefined;

  // Enhanced debug logging with cache timing information
  console.log("TemplatesList render:", {
    rawCount: templatesRaw?.length ?? 0,
    deduplicatedCount: templates?.length ?? 0,
    templates: templates?.map((t) => ({ id: t.id, name: t.name, createdAt: t.createdAt })) ?? [],
    duplicates: (templatesRaw?.length ?? 0) - (templates?.length ?? 0),
    isLoading,
    isRefetching,
    dataUpdatedAt: dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null,
    timestamp: new Date().toISOString(),
  });
  const utils = api.useUtils();
  const deleteTemplate = api.templates.delete.useMutation({
    onMutate: async (deletedTemplate) => {
      // Cancel any outgoing refetches
      await utils.templates.getAll.cancel();

      // Snapshot the previous value
      const previousTemplates = utils.templates.getAll.getData();

      // Optimistically remove from cache
      utils.templates.getAll.setData(
        undefined,
        (old) =>
          old?.filter(
            (template) => template.id !== (deletedTemplate as any)?.id,
          ) ?? [],
      );

      return { previousTemplates };
    },
    onError: (err, deletedTemplate, context) => {
      // Rollback on error
      if (context?.previousTemplates) {
        utils.templates.getAll.setData(undefined, context.previousTemplates);
      }
    },
    onSettled: () => {
      // Always refetch to ensure we have the latest data
      void utils.templates.getAll.invalidate();
    },
  });

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteTemplate.mutateAsync({ id });
      } catch (error) {
        console.error("Error deleting template:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...(Array(3) as number[])].map((_, i) => (
          <Card key={i} padding="md">
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
      <Card padding="lg" className="text-center">
        <CardContent className="py-12">
          <div className="mb-4 text-6xl">📋</div>
          <CardTitle className="mb-2">No templates yet</CardTitle>
          <p className="text-muted-foreground mb-6">
            Create your first workout template to get started
          </p>
          <Button asChild>
            <Link href="/templates/new" prefetch={false}>
              Create Template
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {templates.map((template) => (
        <Card key={template.id} padding="md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/templates/${template.id}/edit`)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(template.id, template.name)}
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
                  {template.exercises.map((ex) => ex.exerciseName).join(", ")}
                </>
              )}
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button size="sm" asChild>
              <Link
                href={`/workout/start?templateId=${template.id}`}
                prefetch={false}
              >
                Start Workout
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
