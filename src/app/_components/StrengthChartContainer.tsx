"use client";

import { VIEW_CONFIG } from "./StrengthProgressSection";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ViewMode = "topSet" | "oneRm" | "intensity";

interface StrengthChartContainerProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  chartIsEmpty: boolean;
  chartPoints: Array<{ date: string; fullDate: string; value: number }>;
}

export function calculateYAxisDomain(values: number[]): [number, number] {
  if (values.length === 0) return [0, 100];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // Calculate padding based on range to make gradient steeper for smaller ranges
  let padding;
  if (range <= 10) {
    padding = range * 0.5; // For small ranges (e.g., 140-150kg), use 50% padding
  } else if (range <= 50) {
    padding = range * 0.3; // For medium ranges, use 30% padding
  } else {
    padding = range * 0.1; // For large ranges, use 10% padding
  }

  return [Math.max(0, min - padding), max + padding];
}

function StrengthTrendChart({
  data,
  color,
  unit,
}: {
  data: Array<{ date: string; fullDate: string; value: number }>;
  color: string;
  unit: string;
}) {
  // Virtualize large datasets - only show every nth point for performance
  const virtualizedData = useMemo(() => {
    const MAX_POINTS = 100; // Limit to 100 visible points for performance
    if (data.length <= MAX_POINTS) {
      return data;
    }

    const step = Math.ceil(data.length / MAX_POINTS);
    return data.filter((_, index) => index % step === 0);
  }, [data]);

  const values = virtualizedData.map((d) => d.value);
  const domain = calculateYAxisDomain(values);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={virtualizedData}
        margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.3}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={domain}
          tick={{ fontSize: 12, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload?.length) {
              const entry = payload[0]!.payload as {
                date: string;
                fullDate: string;
                value: number;
                weight?: number;
                oneRm?: number;
                volume?: number;
                reps?: number;
                sets?: number;
                exerciseName?: string;
              };

              console.log("Tooltip entry:", entry);

              return (
                <div className="border-border/60 bg-background/90 rounded-xl border px-3 py-2 text-xs shadow-md">
                  <p className="text-foreground font-semibold">{entry.date}</p>
                  {entry.exerciseName && (
                    <p className="text-muted-foreground text-[10px]">
                      {entry.exerciseName}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1">
                    {entry.value.toLocaleString()} {unit}
                  </p>
                  <div className="text-muted-foreground/70 mt-1 space-y-0.5 text-[10px]">
                    <div>Weight: {entry.weight} kg</div>
                    <div>1RM: {entry.oneRm?.toFixed(1)} kg</div>
                    <div>Volume: {entry.volume} kg</div>
                    <div>
                      Sets×Reps: {entry.sets}×{entry.reps}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Line
          type="linear"
          dataKey="value"
          stroke={color}
          strokeWidth={3}
          dot={{
            r: 4,
            fill: "var(--background)",
            stroke: color,
            strokeWidth: 2,
          }}
          activeDot={{
            r: 6,
            strokeWidth: 2,
            stroke: "var(--background)",
            fill: color,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StrengthChartContainer({
  viewMode,
  setViewMode,
  chartIsEmpty,
  chartPoints,
}: StrengthChartContainerProps) {
  return (
    <div className="border-border/70 bg-card/70 rounded-2xl border p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(VIEW_CONFIG) as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition ${
                viewMode === mode
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {VIEW_CONFIG[mode].label}
            </button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          {VIEW_CONFIG[viewMode].description}
        </p>
      </div>
      <div className="mt-4 h-72 w-full">
        {chartIsEmpty ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            Not enough sessions yet. Log a few workouts to unlock trend lines.
          </div>
        ) : (
          <StrengthTrendChart
            data={chartPoints}
            color={VIEW_CONFIG[viewMode].color}
            unit={VIEW_CONFIG[viewMode].unit}
          />
        )}
      </div>
    </div>
  );
}
