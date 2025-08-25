"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

// Type for real templates from the database
type RealTemplate = {
  id: number;
  name: string;
  user_id: string;
  clientId: string | null;
  createdAt: string;
  updatedAt: string | null;
  exercises: Array<{
    id: number;
    user_id: string;
    createdAt: string;
    templateId: number;
    exerciseName: string;
    orderIndex: number;
    linkingRejected: number;
  }>;
};

// Type for the optimistic preview template
type OptimisticTemplate = {
  id: string; // clientId
  name: string;
  exercises: Array<{ exerciseName: string }>;
  createdAt: Date;
  isOptimistic: true;
};

// Union type for templates in the display
type DisplayTemplate = RealTemplate | OptimisticTemplate;

// Type for preview data stored in sessionStorage
type PreviewData = {
  clientId: string;
  name: string;
  exercises: string[];
  timestamp: number;
  isOptimistic: boolean;
  hasError?: boolean;
};

// Error state simplified - handled by sync indicators

// Optimistic preview configuration - simplified

export function TemplatesList() {
  const router = useRouter();
  const [previewTemplate, setPreviewTemplate] = useState<OptimisticTemplate | null>(null);
  // Simplified state - rely on existing sync indicators for status
  const utils = api.useUtils();
  
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

  // Function to read preview from sessionStorage
  const readPreviewFromStorage = (): OptimisticTemplate | null => {
    try {
      const stored = sessionStorage.getItem('template_creating_preview');
      if (!stored) return null;
      
      const previewData: PreviewData = JSON.parse(stored);
      
      // Check if preview template already exists in real data (by clientId)
      const existsInRealData = templatesRaw?.some(
        template => template.clientId === previewData.clientId
      );
      
      if (existsInRealData) {
        // Clean up preview since real data now exists
        sessionStorage.removeItem('template_creating_preview');
        return null;
      }
      
      // Format preview to match template structure
      return {
        id: previewData.clientId,
        name: previewData.name,
        exercises: previewData.exercises.map(exerciseName => ({ exerciseName })),
        createdAt: new Date(previewData.timestamp),
        isOptimistic: true,
      };
    } catch (error) {
      console.warn('Failed to read preview from storage:', error);
      return null;
    }
  };

  // Update preview when component mounts or data updates
  useEffect(() => {
    const preview = readPreviewFromStorage();
    setPreviewTemplate(preview);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatesRaw, dataUpdatedAt]);

  // Enhanced deduplication with stable sorting and better performance
  const templates = templatesRaw
    ? templatesRaw
        .filter(
          (template, index, array) =>
            array.findIndex(t => t.id === template.id) === index
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : undefined;

  // Merge preview template with real templates data
  const templatesWithPreview: DisplayTemplate[] = templates && previewTemplate
    ? [previewTemplate, ...templates]
    : templates ?? [];

  // Enhanced debug logging with cache timing information
  console.log("TemplatesList render:", {
    rawCount: templatesRaw?.length ?? 0,
    deduplicatedCount: templates?.length ?? 0,
    finalCount: templatesWithPreview?.length ?? 0,
    templates: templates?.map((t) => ({ id: t.id, name: t.name, createdAt: t.createdAt })) ?? [],
    previewTemplate: previewTemplate ? { id: previewTemplate.id, name: previewTemplate.name, isOptimistic: previewTemplate.isOptimistic } : null,
    duplicates: (templatesRaw?.length ?? 0) - (templates?.length ?? 0),
    isLoading,
    isRefetching,
    dataUpdatedAt: dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null,
    timestamp: new Date().toISOString(),
  });
  
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

  if (!templatesWithPreview?.length) {
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
      {templatesWithPreview.map((template) => {
        const isOptimistic = 'isOptimistic' in template && template.isOptimistic;
        return (
        <Card key={template.id} padding="md" className={isOptimistic ? "opacity-75 border-dashed" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {isOptimistic && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Preview
                  </span>
                )}
              </div>
              {!isOptimistic && (
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
                    onClick={() => handleDelete(template.id as number, template.name)}
                    disabled={deleteTemplate.isPending}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Delete
                  </Button>
                </div>
              )}
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
                  {template.exercises.map((ex: { exerciseName: string }) => ex.exerciseName).join(", ")}
                </>
              )}
            </p>
            
            {/* Error messaging handled by sync indicator */}
            {isOptimistic && (template as any).hasError && (
              <p className="text-red-600 text-sm mt-2">
                Preview - check sync status above
              </p>
            )}
          </CardContent>
          <CardFooter className="pt-0">
            {!isOptimistic && (
              <Button size="sm" asChild>
                <Link
                  href={`/workout/start?templateId=${template.id}`}
                  prefetch={false}
                >
                  Start Workout
                </Link>
              </Button>
            )}
            
            {/* Success state handled by sync indicator */}
          </CardFooter>
        </Card>
        );
      })}
    </div>
  );
}
