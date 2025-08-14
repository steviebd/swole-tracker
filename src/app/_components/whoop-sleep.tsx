"use client";

import { api } from "~/trpc/react";

export function WhoopSleep() {
  const { data: sleep, isLoading } = api.whoop.getSleep.useQuery();

  const formatDateTime = (start: Date | string, end: Date | string) => {
    const startTime = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(start));

    const endTime = new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(end));

    return `${startTime} - ${endTime}`;
  };

  const formatDuration = (milliseconds: number | null) => {
    if (!milliseconds) return "--";
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatPercentage = (value: string | null) => {
    if (!value) return "--";
    const num = parseFloat(value);
    return isNaN(num) ? "--" : `${num.toFixed(0)}%`;
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <p className="text-secondary">Loading sleep data...</p>
      </div>
    );
  }

  if (!sleep || sleep.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-secondary">No sleep data available. Try syncing your WHOOP data.</p>
      </div>
    );
  }

  const displayedSleep = sleep.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-semibold">Sleep Data</h3>
        <p className="text-secondary text-sm">Sleep performance and recovery metrics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayedSleep.map((item) => (
          <div key={item.id} className="card p-6">
            <div className="space-y-3">
              <div className="text-muted text-sm">
                {formatDateTime(item.start, item.end)}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Sleep Performance</span>
                  <span 
                    className="text-lg font-bold"
                    style={{
                      color: item.sleep_performance_percentage 
                        ? item.sleep_performance_percentage >= 80 
                          ? 'var(--color-success)'
                          : item.sleep_performance_percentage >= 60
                          ? 'var(--color-warning)'
                          : 'var(--color-danger)'
                        : 'var(--color-text)'
                    }}
                  >
                    {item.sleep_performance_percentage ? `${item.sleep_performance_percentage}%` : "--"}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-secondary">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{formatDuration(item.total_sleep_time_milli)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Efficiency:</span>
                    <span>{formatPercentage(item.sleep_efficiency_percentage)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>REM Sleep:</span>
                    <span>{formatDuration(item.rem_sleep_time_milli)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deep Sleep:</span>
                    <span>{formatDuration(item.slow_wave_sleep_time_milli)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Disturbances:</span>
                    <span>{item.disturbance_count || "--"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sleep.length > 3 && (
        <div className="text-center">
          <p className="text-secondary text-sm">
            Showing 3 of {sleep.length} sleep records
          </p>
        </div>
      )}
    </div>
  );
}