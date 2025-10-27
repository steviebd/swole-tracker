import { memo, useMemo } from "react";
import { cn } from "~/lib/utils";

type SparkPoint = {
  value: number;
  label?: string;
};

export interface TinySparklineProps {
  data: SparkPoint[];
  className?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  color?: string;
  showGradient?: boolean;
  ariaLabel?: string;
}

/**
 * TinySparkline renders a lightweight inline chart that mirrors our Material 3 "energy"
 * system. It avoids heavy chart libs for hero KPI cards, while staying accessible.
 */
export const TinySparkline = memo(function TinySparkline({
  data,
  className,
  width = 120,
  height = 40,
  strokeWidth = 2,
  color = "var(--md-sys-color-primary)",
  showGradient = true,
  ariaLabel = "trend sparkline",
}: TinySparklineProps) {
  const prepared = useMemo(() => {
    if (!data?.length) {
      return {
        path: "",
        areaPath: "",
        points: [] as Array<{ x: number; y: number }>,
        min: 0,
        max: 0,
      };
    }

    const values = data.map((point) => point.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    const points = data.map((point, index) => {
      const x =
        data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
      const normalized = (point.value - minValue) / range;
      const y = height - normalized * height;
      return { x, y };
    });

    const path = points
      .map((point, index) =>
        index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
      )
      .join(" ");

    const areaPath = showGradient
      ? [
          `M ${points[0]?.x ?? 0} ${height}`,
          ...points.map((point) => `L ${point.x} ${point.y}`),
          `L ${points.at(-1)?.x ?? width} ${height}`,
          "Z",
        ].join(" ")
      : "";

    return { path, areaPath, points, min: minValue, max: maxValue };
  }, [data, height, showGradient, width]);

  if (!data?.length) {
    return (
      <div
        aria-label={`${ariaLabel} unavailable`}
        className={cn(
          "from-muted/60 to-muted/30 h-10 w-28 rounded-full bg-gradient-to-r",
          className,
        )}
      />
    );
  }

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      className={cn("overflow-visible", className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {showGradient && (
        <path d={prepared.areaPath} fill={`${color}20`} stroke="none" />
      )}
      <path
        d={prepared.path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {prepared.points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={strokeWidth}
          fill="var(--md-sys-color-surface)"
          stroke={color}
          strokeWidth={strokeWidth / 1.5}
          opacity={index === prepared.points.length - 1 ? 1 : 0.4}
        >
          {data[index]?.label && (
            <title>{`${data[index]?.label}: ${data[index]?.value}`}</title>
          )}
        </circle>
      ))}
    </svg>
  );
});
