"use client";

import { api } from "~/trpc/react";

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
      <div className="py-8 text-center">
        <p className="text-secondary">Loading recovery data...</p>
      </div>
    );
  }

  if (!recovery || recovery.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-secondary">No recovery data available. Try syncing your WHOOP data.</p>
      </div>
    );
  }

  const displayedRecovery = recovery.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-semibold">Recovery Data</h3>
        <p className="text-secondary text-sm">Latest recovery scores from WHOOP</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayedRecovery.map((item) => (
          <div key={item.id} className="card p-6">
            <div className="space-y-3">
              <div className="text-muted text-sm">
                {formatDate(item.date)}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Recovery Score</span>
                  <span 
                    className="text-lg font-bold"
                    style={{
                      color: item.recovery_score 
                        ? item.recovery_score >= 67 
                          ? 'var(--color-success)'
                          : item.recovery_score >= 34
                          ? 'var(--color-warning)'
                          : 'var(--color-danger)'
                        : 'var(--color-text)'
                    }}
                  >
                    {item.recovery_score ? `${item.recovery_score}%` : "--"}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-secondary">
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
          </div>
        ))}
      </div>

      {recovery.length > 3 && (
        <div className="text-center">
          <p className="text-secondary text-sm">
            Showing 3 of {recovery.length} recovery records
          </p>
        </div>
      )}
    </div>
  );
}