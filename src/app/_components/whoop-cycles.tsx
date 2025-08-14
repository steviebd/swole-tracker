"use client";

import { api } from "~/trpc/react";

export function WhoopCycles() {
  const { data: cycles, isLoading } = api.whoop.getCycles.useQuery();

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

  const formatEnergy = (kilojoules: string | null) => {
    if (!kilojoules) return "--";
    const kj = parseFloat(kilojoules);
    return isNaN(kj) ? "--" : `${kj.toFixed(0)} kJ`;
  };

  const formatStrain = (strain: string | null) => {
    if (!strain) return "--";
    const strainNum = parseFloat(strain);
    return isNaN(strainNum) ? "--" : strainNum.toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <p className="text-secondary">Loading cycles data...</p>
      </div>
    );
  }

  if (!cycles || cycles.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-secondary">No cycles data available. Try syncing your WHOOP data.</p>
      </div>
    );
  }

  const displayedCycles = cycles.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-semibold">Daily Strain Cycles</h3>
        <p className="text-secondary text-sm">Daily strain and physiological load</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayedCycles.map((item) => (
          <div key={item.id} className="card p-6">
            <div className="space-y-3">
              <div className="text-muted text-sm">
                {formatDateTime(item.start, item.end)}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Day Strain</span>
                  <span 
                    className="text-lg font-bold"
                    style={{
                      color: item.day_strain 
                        ? parseFloat(item.day_strain) >= 15 
                          ? 'var(--color-danger)'
                          : parseFloat(item.day_strain) >= 10
                          ? 'var(--color-warning)'
                          : 'var(--color-success)'
                        : 'var(--color-text)'
                    }}
                  >
                    {formatStrain(item.day_strain)}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-secondary">
                  <div className="flex justify-between">
                    <span>Avg HR:</span>
                    <span>{item.average_heart_rate ? `${item.average_heart_rate} bpm` : "--"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max HR:</span>
                    <span>{item.max_heart_rate ? `${item.max_heart_rate} bpm` : "--"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Energy:</span>
                    <span>{formatEnergy(item.kilojoule)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {cycles.length > 3 && (
        <div className="text-center">
          <p className="text-secondary text-sm">
            Showing 3 of {cycles.length} cycle records
          </p>
        </div>
      )}
    </div>
  );
}