"use client";

import { api } from "~/trpc/react";

export function WhoopBodyMeasurements() {
  const { data: measurements, isLoading } =
    api.whoop.getBodyMeasurements.useQuery();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "--";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  };

  const formatHeight = (heightMeter: number | null) => {
    if (!heightMeter) return "--";
    const height = heightMeter;
    if (isNaN(height)) return "--";

    // Convert to feet and inches for display
    const totalInches = height * 39.3701;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);

    return `${height.toFixed(2)}m (${feet}′${inches}″)`;
  };

  const formatWeight = (weightKg: number | null) => {
    if (!weightKg) return "--";
    const weight = weightKg;
    if (isNaN(weight)) return "--";

    const weightLbs = weight * 2.20462;
    return `${weight.toFixed(1)} kg (${weightLbs.toFixed(1)} lbs)`;
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <p className="text-secondary">Loading body measurements...</p>
      </div>
    );
  }

  if (!measurements || measurements.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-secondary">
          No body measurements available. Try syncing your WHOOP data.
        </p>
      </div>
    );
  }

  const displayedMeasurements = measurements.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-semibold">Body Measurements</h3>
        <p className="text-secondary text-sm">
          Height, weight, and physiological metrics
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayedMeasurements.map((item) => (
          <div key={item.id} className="card p-6">
            <div className="space-y-3">
              <div className="text-muted text-sm">
                {formatDate(item.measurement_date?.toISOString() || null)}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-secondary mb-1 text-xs">Height</div>
                  <div className="text-sm font-medium">
                    {formatHeight(item.height_meter)}
                  </div>
                </div>

                <div>
                  <div className="text-secondary mb-1 text-xs">Weight</div>
                  <div className="text-sm font-medium">
                    {formatWeight(item.weight_kilogram)}
                  </div>
                </div>

                <div>
                  <div className="text-secondary mb-1 text-xs">
                    Max Heart Rate
                  </div>
                  <div className="text-sm font-medium">
                    {item.max_heart_rate ? `${item.max_heart_rate} bpm` : "--"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {measurements.length > 3 && (
        <div className="text-center">
          <p className="text-secondary text-sm">
            Showing 3 of {measurements.length} measurement records
          </p>
        </div>
      )}
    </div>
  );
}
