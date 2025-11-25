"use client";

import React, { useState, useMemo } from "react";
import { Trophy, Target, Calendar, Filter, ChevronDown } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import { PageShell } from "~/components/layout/page-shell";
import { format } from "date-fns";

interface AchievementGroup {
  date: string;
  achievements: Array<{
    id: number;
    exerciseName?: string;
    milestoneType: "absolute_weight" | "bodyweight_multiplier" | "volume";
    achievedValue?: number;
    targetValue: number;
    achievedAt?: Date;
    milestoneId: number;
    masterExerciseId?: number | null;
  }>;
}

export function AchievementsPage() {
  const [filter, setFilter] = useState<
    "all" | "absolute_weight" | "bodyweight_multiplier" | "volume"
  >("all");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch milestone achievements
  const { data: milestoneData, isLoading } =
    api.plateauMilestone.getMilestones.useQuery({
      limit: 100,
      achievedOnly: true,
    });

  // Enhance achievements with exercise names
  const achievements = useMemo(() => {
    if (!milestoneData?.milestones) return [];

    return milestoneData.milestones.map((achievement: any) => {
      return {
        id: achievement.milestone.id,
        exerciseName: achievement.exerciseName || "Unknown Exercise",
        milestoneType: achievement.milestone.type,
        achievedValue: achievement.achievedAt
          ? achievement.currentValue
          : undefined,
        targetValue: achievement.milestone.targetValue,
        achievedAt: achievement.achievedAt,
        milestoneId: achievement.milestone.id,
        masterExerciseId: achievement.milestone.masterExerciseId,
      };
    });
  }, [milestoneData]);

  // Filter achievements based on selected filter
  const filteredAchievements = useMemo(() => {
    if (!achievements || filter === "all") return achievements;

    return achievements.filter(
      (achievement: any) => achievement.milestoneType === filter,
    );
  }, [achievements, filter]);

  // Group achievements by date
  const groupedAchievements = useMemo(() => {
    if (!filteredAchievements) return [];

    const groups: Record<string, AchievementGroup["achievements"]> = {};

    filteredAchievements.forEach((achievement: any) => {
      if (!achievement.achievedAt) return;

      const dateKey = format(achievement.achievedAt!, "yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(achievement);
    });

    return Object.entries(groups)
      .map(([date, achievementList]) => ({
        date,
        achievements: achievementList.sort(
          (a: any, b: any) =>
            new Date(b.achievedAt!).getTime() -
            new Date(a.achievedAt!).getTime(),
        ),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredAchievements]);

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case "absolute_weight":
        return "🏋️";
      case "relative_weight":
        return "⚖️";
      case "volume":
        return "📊";
      default:
        return "🎯";
    }
  };

  const getMilestoneLabel = (type: string) => {
    switch (type) {
      case "absolute_weight":
        return "Absolute Weight";
      case "relative_weight":
        return "Relative Weight";
      case "volume":
        return "Volume";
      default:
        return "Milestone";
    }
  };

  const getMilestoneDescription = (achievement: any) => {
    const { milestoneType, achievedValue, targetValue } = achievement;

    switch (milestoneType) {
      case "absolute_weight":
        return `Lifted ${achievedValue}kg (target: ${targetValue}kg)`;
      case "relative_weight":
        return `Achieved ${achievedValue}x bodyweight (target: ${targetValue}x)`;
      case "volume":
        return `Moved ${achievedValue.toLocaleString()}kg (target: ${targetValue.toLocaleString()}kg)`;
      default:
        return `Achieved ${achievedValue} (target: ${targetValue})`;
    }
  };

  const filterOptions = [
    { value: "all", label: "All Milestones", icon: Target },
    { value: "absolute_weight", label: "Absolute Weight", icon: Trophy },
    { value: "relative_weight", label: "Relative Weight", icon: Target },
    { value: "volume", label: "Volume", icon: Target },
  ];

  return (
    <PageShell
      title="Achievements"
      description="Track your milestone accomplishments and fitness journey"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filter</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </Button>

            {filter !== "all" && (
              <Badge
                variant="secondary"
                className="flex items-center space-x-1"
              >
                <span>{getMilestoneLabel(filter)}</span>
                <button
                  onClick={() => setFilter("all")}
                  className="hover:text-destructive ml-1"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>

          <div className="text-muted-foreground text-sm">
            {filteredAchievements?.length || 0} achievements
          </div>
        </div>

        {/* Filter Dropdown */}
        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {filterOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.value}
                    variant={filter === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFilter(option.value as any);
                      setShowFilters(false);
                    }}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </Button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="bg-muted h-6 w-32 animate-pulse rounded" />
                <div className="space-y-2">
                  {[...Array(2)].map((_, j) => (
                    <div
                      key={j}
                      className="bg-muted h-20 animate-pulse rounded-lg"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Achievements Timeline */}
        {!isLoading && groupedAchievements.length > 0 && (
          <div className="space-y-8">
            {groupedAchievements.map((group) => (
              <div key={group.date} className="space-y-4">
                {/* Date Header */}
                <div className="flex items-center space-x-3">
                  <Calendar className="text-muted-foreground h-5 w-5" />
                  <h3 className="text-lg font-semibold">
                    {format(new Date(group.date), "EEEE, MMMM d, yyyy")}
                  </h3>
                  <Badge variant="secondary">
                    {group.achievements.length} milestone
                    {group.achievements.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

                {/* Achievement Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.achievements.map((achievement) => (
                    <Card
                      key={achievement.id}
                      className="relative overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                    >
                      {/* Achievement Icon */}
                      <div className="absolute top-3 right-3 text-2xl">
                        {getMilestoneIcon(achievement.milestoneType)}
                      </div>

                      <div className="p-6">
                        <div className="mb-3">
                          <Badge variant="outline" className="mb-2">
                            {getMilestoneLabel(achievement.milestoneType)}
                          </Badge>
                          <h4 className="text-lg font-semibold">
                            {achievement.exerciseName}
                          </h4>
                        </div>

                        <div className="space-y-2">
                          <p className="text-muted-foreground text-sm">
                            {getMilestoneDescription(achievement)}
                          </p>

                          <div className="text-muted-foreground flex items-center justify-between text-xs">
                            <span>
                              Achieved{" "}
                              {format(achievement.achievedAt!, "h:mm a")}
                            </span>
                            <div className="flex items-center space-x-1">
                              <Trophy className="h-3 w-3" />
                              <span>Milestone</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && groupedAchievements.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-6 max-w-sm">
              <Trophy className="text-muted-foreground mx-auto h-16 w-16" />
              <h3 className="mt-4 text-lg font-semibold">No Milestones Yet</h3>
              <p className="text-muted-foreground mt-2">
                {filter === "all"
                  ? "Start working towards your fitness goals and milestones will appear here as you achieve them."
                  : `No ${getMilestoneLabel(filter).toLowerCase()} milestones yet. Keep training to unlock them!`}
              </p>
            </div>

            {filter !== "all" && (
              <Button
                variant="outline"
                onClick={() => setFilter("all")}
                className="mt-4"
              >
                View All Milestones
              </Button>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
