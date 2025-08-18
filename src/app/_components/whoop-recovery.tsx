"use client";

import { api } from "~/trpc/react";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";

export function WhoopRecovery() {
  const { data: recovery, isLoading } = api.whoop.getRecovery.useQuery();

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  };

  const formatHRV = (hrv: string | null) => {
    if (!hrv) return "--";
    const hrvNum = parseFloat(hrv);
    return isNaN(hrvNum) ? "--" : `${hrvNum.toFixed(1)}ms`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="mb-4">
          <h3 className="text-xl font-semibold">Recovery Data</h3>
          <p className="text-muted-foreground text-sm">Latest recovery scores from WHOOP</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-8 w-2/3" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!recovery || recovery.length === 0) {
    return (
      <div className="space-y-4">
        <div className="mb-4">
          <h3 className="text-xl font-semibold">Recovery Data</h3>
          <p className="text-muted-foreground text-sm">Latest recovery scores from WHOOP</p>
        </div>
        <Card className="py-8">
          <CardContent className="text-center">
            <p className="text-muted-foreground">No recovery data available. Try syncing your WHOOP data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayedRecovery = recovery.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-semibold">Recovery Data</h3>
        <p className="text-muted-foreground text-sm">Latest recovery scores from WHOOP</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayedRecovery.map((item) => (
          <Card key={item.id} className="p-6">
            <CardContent className="p-0">
              <div className="space-y-3">
                <div className="text-muted-foreground text-sm">
                  {formatDate(item.date)}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Recovery Score</span>
                    <Badge 
                      variant={
                        item.recovery_score 
                          ? item.recovery_score >= 67 
                            ? "default"
                            : item.recovery_score >= 34
                            ? "secondary"
                            : "destructive"
                          : "outline"
                      }
                      className="text-base font-bold"
                    >
                      {item.recovery_score ? `${item.recovery_score}%` : "--"}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>HRV:</span>
                      <span>{formatHRV(item.hrv_rmssd_milli)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>HRV Baseline:</span>
                      <span>{formatHRV(item.hrv_rmssd_baseline)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>RHR:</span>
                      <span>{item.resting_heart_rate ? `${item.resting_heart_rate} bpm` : "--"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>RHR Baseline:</span>
                      <span>{item.resting_heart_rate_baseline ? `${item.resting_heart_rate_baseline} bpm` : "--"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {recovery.length > 3 && (
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            Showing 3 of {recovery.length} recovery records
          </p>
        </div>
      )}
    </div>
  );
}