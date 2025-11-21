"use client";

import { useRouter } from "next/navigation";
import { Target, TrendingUp, Calendar, ArrowRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { EmptyState } from "~/components/ui/empty-state";
import { cn } from "~/lib/utils";

export function PlaybookProgressCard() {
  const router = useRouter();

  // Get active playbook
  const { data: playbooks, isLoading } = api.playbooks.listByUser.useQuery({
    status: "active",
    limit: 1,
    offset: 0,
  });

  const activePlaybook = playbooks?.[0];

  // Get adherence metrics if we have an active playbook
  const { data: adherenceMetrics } = api.playbooks.getAdherenceMetrics.useQuery(
    { playbookId: activePlaybook?.id ?? 0 },
    { enabled: !!activePlaybook?.id }
  );

  if (isLoading) {
    return (
      <Card variant="glass" className="animate-pulse">
        <CardHeader>
          <div className="bg-muted h-6 w-32 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted h-32 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!activePlaybook) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5 text-primary" />
            Playbook Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Target className="size-12 text-primary" />}
            title="No active playbook"
            description="Create a training playbook to track your structured progression"
            action={{
              label: "Create Playbook",
              onClick: () => router.push("/playbooks/new"),
            }}
          />
        </CardContent>
      </Card>
    );
  }

  // Calculate current week (simplified - would need actual logic)
  const currentWeek = 2; // Placeholder
  const progressPercent = (currentWeek / activePlaybook.duration) * 100;

  // Generate mock chart data (would come from actual metrics)
  const chartData = adherenceMetrics?.weeklyBreakdown.map((week) => ({
    week: week.weekNumber,
    planned: week.sessionsTotal * 100, // Mock volume
    actual: week.sessionsCompleted * 80, // Mock actual volume
  })) || [];

  return (
    <Card
      variant="glass"
      interactive
      onActivate={() => router.push(`/playbooks/${activePlaybook.id}`)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5 text-primary" />
            Playbook Progress
          </CardTitle>
          <Badge variant="default">Active</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Playbook Name & Goal */}
        <div>
          <h4 className="mb-1 font-semibold">{activePlaybook.name}</h4>
          {activePlaybook.goalText && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {activePlaybook.goalText}
            </p>
          )}
        </div>

        {/* Current Week Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Week Progress</span>
            <span className="font-medium">
              Week {currentWeek} of {activePlaybook.duration}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        {adherenceMetrics && (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Adherence</p>
              <p className="text-xl font-bold">{adherenceMetrics.adherencePercentage}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Sessions</p>
              <p className="text-xl font-bold">
                {adherenceMetrics.completedSessions}/{adherenceMetrics.totalSessions}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avg RPE</p>
              <p className="text-xl font-bold">
                {adherenceMetrics.averageRpe?.toFixed(1) || "N/A"}
              </p>
            </div>
          </div>
        )}

        {/* Volume Chart */}
        {chartData.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Weekly Volume</p>
              <div className="flex gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-primary"></div>
                  <span className="text-muted-foreground">Planned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-tertiary"></div>
                  <span className="text-muted-foreground">Actual</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="planned"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="hsl(var(--tertiary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* CTA */}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => router.push(`/playbooks/${activePlaybook.id}`)}
        >
          View Full Playbook
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
