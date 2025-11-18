"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Target, TrendingUp, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import { api } from "~/trpc/react";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { EmptyState } from "~/components/ui/empty-state";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { cn } from "~/lib/utils";
import { useToast } from "~/hooks/use-toast";

type PlaybookStatus = "draft" | "active" | "completed" | "archived";

const STATUS_LABELS: Record<PlaybookStatus, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

const STATUS_VARIANTS: Record<PlaybookStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  active: "default",
  completed: "secondary",
  archived: "destructive",
};

export function PlaybooksListView() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [selectedFilter, setSelectedFilter] = useState<PlaybookStatus | "all">("all");
  const { toast } = useToast();
  const utils = api.useUtils();

  const { data: playbooks, isLoading } = api.playbooks.listByUser.useQuery({
    status: selectedFilter === "all" ? undefined : selectedFilter,
    limit: 50,
    offset: 0,
  });

  const deletePlaybook = api.playbooks.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Playbook deleted",
        description: "The playbook has been successfully removed.",
      });
      // Invalidate query to refresh the list
      void utils.playbooks.listByUser.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Failed to delete playbook",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreatePlaybook = () => {
    router.push("/playbooks/new");
  };

  const handleViewPlaybook = (id: number) => {
    router.push(`/playbooks/${id}`);
  };

  const handleDeletePlaybook = (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation(); // Prevent card click

    if (confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      deletePlaybook.mutate({ id });
    }
  };

  const filters: Array<{ label: string; value: PlaybookStatus | "all" }> = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Draft", value: "draft" },
    { label: "Completed", value: "completed" },
  ];

  return (
    <PageShell
      title="Training Playbooks"
      description="Structured progression plans tailored to your goals"
      headerActions={
        <Button
          onClick={handleCreatePlaybook}
          size="default"
          haptic
          className="gap-2"
        >
          <Plus className="size-4" />
          Create Playbook
        </Button>
      }
    >
      {/* Filter Chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setSelectedFilter(filter.value)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-all",
              "touch-target",
              selectedFilter === filter.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card text-card-foreground hover:bg-muted"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Playbooks Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="bg-muted h-6 w-3/4 rounded"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted h-4 w-full rounded"></div>
                <div className="bg-muted h-4 w-2/3 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !playbooks || playbooks.length === 0 ? (
        <EmptyState
          icon={<Target className="size-12 text-primary" />}
          title={
            selectedFilter === "all"
              ? "No playbooks yet"
              : `No ${selectedFilter} playbooks`
          }
          description={
            selectedFilter === "all"
              ? "Create your first training playbook to get started with structured progression"
              : `You don't have any ${selectedFilter} playbooks right now`
          }
          action={{
            label: "Create Playbook",
            onClick: handleCreatePlaybook,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {playbooks.map((playbook, index) => {
            const MotionCard = prefersReducedMotion ? Card : motion.div;
            const motionProps = prefersReducedMotion
              ? {}
              : {
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 },
                  transition: { delay: index * 0.05, duration: 0.3 },
                };

            return (
              <MotionCard
                key={playbook.id}
                {...motionProps}
                className={cn(
                  !prefersReducedMotion && "card",
                  prefersReducedMotion && ""
                )}
              >
                <Card
                  variant="glass"
                  interactive
                  onActivate={() => handleViewPlaybook(playbook.id)}
                  className="h-full"
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-semibold line-clamp-2">
                      {playbook.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANTS[playbook.status as PlaybookStatus]}>
                        {STATUS_LABELS[playbook.status as PlaybookStatus]}
                      </Badge>
                      {(playbook.status === "draft" || playbook.status === "archived") && (
                        <button
                          onClick={(e) => handleDeletePlaybook(e, playbook.id, playbook.name)}
                          className={cn(
                            "touch-target rounded-md p-1.5 transition-colors",
                            "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          )}
                          aria-label="Delete playbook"
                          disabled={deletePlaybook.isPending}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Goal Text */}
                    {playbook.goalText && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {playbook.goalText}
                      </p>
                    )}

                    {/* Duration & Target Type */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="size-4 text-primary" />
                        <span className="text-muted-foreground">
                          {playbook.duration} weeks
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Target className="size-4 text-secondary" />
                        <span className="text-muted-foreground capitalize">
                          {playbook.targetType}
                        </span>
                      </div>
                    </div>

                    {/* Progress (if active) */}
                    {playbook.status === "active" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">Week 2 of {playbook.duration}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
                            style={{ width: `${(2 / playbook.duration) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Created Date */}
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(playbook.createdAt).toLocaleDateString("en-AU", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </CardContent>
                </Card>
              </MotionCard>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
