"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "~/convex/_generated/api";
import { analytics } from "~/lib/analytics";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "sonner";
import type { Id } from "~/convex/_generated/dataModel";

export function TemplatesList() {
  const templatesRaw = useQuery(api.templates.getTemplates);
  const isLoading = templatesRaw === undefined;

  // Deduplicate templates by ID to prevent any rendering duplicates
  const templates = templatesRaw
    ? templatesRaw.filter(
        (template, index, array) =>
          array.findIndex((t) => t._id === template._id) === index,
      )
    : undefined;

  // Debug logging to track template duplication
  console.log("TemplatesList render:", {
    rawCount: templatesRaw?.length ?? 0,
    deduplicatedCount: templates?.length ?? 0,
    templates: templates?.map((t) => ({ id: t._id, name: t.name })) ?? [],
    duplicates: (templatesRaw?.length ?? 0) - (templates?.length ?? 0),
    timestamp: new Date().toISOString(),
  });
  const deleteTemplate = useMutation(api.templates.deleteTemplate);

  const handleDelete = async (id: Id<"workoutTemplates">, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteTemplate({ id });
        analytics.templateDeleted(id);
        toast.success(`Deleted template "${name}"`);
      } catch (error) {
        console.error("Error deleting template:", error);
        toast.error("Failed to delete template");
        analytics.error(error as Error, {
          context: "template_delete",
          templateId: id,
        });
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
            <Link href="/templates/new">
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
        <Card key={template._id} padding="md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/templates/${template._id}/edit`}>
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(template._id, template.name)}
                  disabled={false}
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
              <Link href={`/workout/start?templateId=${template._id}`}>
                Start Workout
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
