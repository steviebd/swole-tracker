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

export function WorkoutDetailOverlay({ workout, isOpen, onClose, clickOrigin }: WorkoutDetailOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
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
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatScore = (score: WorkoutScore | null, scoreState: string | null) => {
    if (!score || typeof score !== "object") {
      return `-- (${scoreState?.replace("_", " ") || "UNKNOWN"})`;
    }
    
    const strainScore = score.strain;
    if (strainScore && typeof strainScore === "number") {
      return `${strainScore.toFixed(1)} (${scoreState?.replace("_", " ") || "UNKNOWN"})`;
    }
    
    return `-- (${scoreState?.replace("_", " ") || "UNKNOWN"})`;
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

  const renderMetricSection = (title: string, data: Record<string, unknown> | null) => {
    if (!data || typeof data !== "object") return null;

    return (
      <div className="card p-4">
        <h4 className="font-semibold text-sm text-secondary mb-3">{title}</h4>
        <div className="space-y-2">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-muted capitalize">
                {key.replace(/_/g, " ")}:
              </span>
              <span className="text-gray-900 dark:text-white">
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
      className="fixed inset-0 bg-black/40 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      style={{ animation: isOpen ? 'fadeIn 0.3s ease-out' : '' }}
    >
      <div
        ref={contentRef}
        className="card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          animation: isOpen ? 'scaleIn 0.3s ease-out' : '',
          ...animationOrigin
        }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl dark:bg-gray-900 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1 dark:text-white">
                {workout.sport_name || "Unknown Sport"}
              </h2>
              <p className="text-secondary text-sm">
                {formatDateTime(new Date(workout.start), new Date(workout.end))}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-900 transition-colors p-2 dark:text-gray-400 dark:hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4">
              <h4 className="font-semibold text-sm text-secondary mb-2">Duration</h4>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatDuration(new Date(workout.start), new Date(workout.end))}
              </p>
            </div>
            <div className="card p-4">
              <h4 className="font-semibold text-sm text-secondary mb-2">Score</h4>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatScore(workout.score, workout.score_state)}
              </p>
            </div>
            <div className="card p-4">
              <h4 className="font-semibold text-sm text-secondary mb-2">Whoop ID</h4>
              <p className="text-sm text-muted font-mono break-all">
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
            <h4 className="font-semibold text-sm text-secondary mb-3">Timestamps</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Started:</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(workout.start).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Ended:</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(workout.end).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Synced:</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(workout.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Help Text */}
        <div className="bg-white p-4 rounded-b-xl border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs text-muted text-center">
            Double-click, swipe any direction, or click outside to close
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.7);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
