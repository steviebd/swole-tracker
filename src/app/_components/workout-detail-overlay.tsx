"use client";

import { useEffect, useRef } from "react";

interface WorkoutScore {
  strain: number;
  average_heart_rate?: number;
  max_heart_rate?: number;
  kilojoule?: number;
  percent_recorded?: number;
  distance_meter?: number;
  altitude_gain_meter?: number;
  altitude_change_meter?: number;
  zone_durations?: Record<string, number>;
  [key: string]: unknown;
}

type DuringMetrics = Record<string, number | string | null | undefined>;

type ZoneDuration = Record<string, number>;

interface WorkoutDetailOverlayProps {
  workout: {
    id: number;
    whoopWorkoutId: string;
    start: Date;
    end: Date;
    sport_name: string | null;
    score_state: string | null;
    score: WorkoutScore | null;
    during: DuringMetrics | null;
    zone_duration: ZoneDuration | null;
    createdAt: Date;
  };
  isOpen: boolean;
  onClose: () => void;
  clickOrigin?: { x: number; y: number };
}

export function WorkoutDetailOverlay({
  workout,
  isOpen,
  onClose,
  clickOrigin,
}: WorkoutDetailOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const formatDateTime = (start: Date, end: Date) => {
    const startTime = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(start);

    const endTime = new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(end);

    return `${startTime} - ${endTime}`;
  };

  const formatDuration = (start: Date, end: Date) => {
    const duration = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60),
    ); // minutes
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatScore = (
    score: WorkoutScore | null,
    scoreState: string | null,
  ) => {
    if (!score || typeof score !== "object") {
      return `-- (${scoreState?.replace("_", " ") ?? "UNKNOWN"})`;
    }

    const strainScore = score.strain;
    if (strainScore && typeof strainScore === "number") {
      return `${strainScore.toFixed(1)} (${scoreState?.replace("_", " ") ?? "UNKNOWN"})`;
    }

    return `-- (${scoreState?.replace("_", " ") ?? "UNKNOWN"})`;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const handleDoubleClick = () => {
    onClose();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const swipeThreshold = 50;

    if (deltaX > swipeThreshold || deltaY > swipeThreshold) {
      onClose();
    }

    touchStartRef.current = null;
  };

  const renderMetricSection = (
    title: string,
    data: Record<string, unknown> | null,
  ) => {
    if (!data || typeof data !== "object") return null;

    return (
      <div className="card p-4">
        <h4 className="text-secondary mb-3 text-sm font-semibold">{title}</h4>
        <div className="space-y-2">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-muted capitalize">
                {key.replace(/_/g, " ")}:
              </span>
              <span className="text-foreground">
                {typeof value === "number" ? value.toFixed(2) : String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  const animationOrigin = clickOrigin
    ? { transformOrigin: `${clickOrigin.x}px ${clickOrigin.y}px` }
    : {};

  return (
    <div
      ref={overlayRef}
      className={`bg-background/40 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${
        isOpen ? "animate-[fadeIn_0.3s_ease-out]" : ""
      }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={contentRef}
        className={`card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl shadow-2xl ${
          isOpen ? "animate-[scaleIn_0.3s_ease-out]" : ""
        }`}
        style={animationOrigin}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="border-border bg-background sticky top-0 rounded-t-xl border-b p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-foreground mb-1 text-2xl font-bold">
                {workout.sport_name ?? "Unknown Sport"}
              </h2>
              <p className="text-secondary text-sm">
                {formatDateTime(new Date(workout.start), new Date(workout.end))}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-secondary hover:text-foreground p-2 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="card p-4">
              <h4 className="text-secondary mb-2 text-sm font-semibold">
                Duration
              </h4>
              <p className="text-foreground text-xl font-bold">
                {formatDuration(new Date(workout.start), new Date(workout.end))}
              </p>
            </div>
            <div className="card p-4">
              <h4 className="text-secondary mb-2 text-sm font-semibold">
                Score
              </h4>
              <p className="text-foreground text-xl font-bold">
                {formatScore(workout.score, workout.score_state)}
              </p>
            </div>
            <div className="card p-4">
              <h4 className="text-secondary mb-2 text-sm font-semibold">
                Whoop ID
              </h4>
              <p className="text-muted font-mono text-sm break-all">
                {workout.whoopWorkoutId}
              </p>
            </div>
          </div>

          {/* Score Details */}
          {renderMetricSection("Score Details", workout.score)}

          {/* During Metrics */}
          {renderMetricSection("During Workout", workout.during)}

          {/* Zone Duration */}
          {renderMetricSection("Zone Duration", workout.zone_duration)}

          {/* Timestamps */}
          <div className="card p-4">
            <h4 className="text-secondary mb-3 text-sm font-semibold">
              Timestamps
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Started:</span>
                <span className="text-foreground">
                  {new Date(workout.start).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Ended:</span>
                <span className="text-foreground">
                  {new Date(workout.end).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Synced:</span>
                <span className="text-foreground">
                  {new Date(workout.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Help Text */}
        <div className="border-border bg-background rounded-b-xl border-t p-4">
          <p className="text-muted text-center text-xs">
            Double-click, swipe any direction, or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
}
