"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { PRHistoryModal } from "./PRHistoryModal";
import { vibrate } from "~/lib/client-telemetry";

type TimeRange = "week" | "month" | "year";
type RecordType = "weight" | "volume" | "both";

export function PersonalRecordsSection() {
  const [timeRange, setTimeRange] = useState<TimeRange>("year");
  const [recordType, setRecordType] = useState<RecordType>("both");
  const [showModal, setShowModal] = useState(false);

  const { data: personalRecords, isLoading: prLoading } =
    api.progress.getPersonalRecords.useQuery({
      timeRange,
      recordType,
    });

  const cardClass =
    "transition-all duration-300 rounded-xl border shadow-sm bg-card border-border";
  const titleClass = "text-xl font-bold mb-4 text-theme-primary";
  const subtitleClass = "text-sm font-medium mb-2 text-theme-secondary";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPRIcon = (recordType: string) => {
    switch (recordType) {
      case "weight":
        return "🏋️";
      case "volume":
        return "📊";
      default:
        return "🏆";
    }
  };

  const getPRBadgeColor = (recordType: string) => {
    switch (recordType) {
      case "weight":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "volume":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    }
  };

  return (
    <div className={cardClass + " p-6"}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h2 className={titleClass}>Personal Records</h2>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {/* Record Type Filter */}
          <div className="bg-muted flex flex-wrap gap-1 rounded-lg p-1 sm:w-auto">
            {(["both", "weight", "volume"] as RecordType[]).map((type) => (
              <button
                key={type}
                onClick={() => setRecordType(type)}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-all sm:flex-none ${
                  recordType === type
                    ? "bg-card text-foreground shadow-sm"
                    : "text-theme-secondary hover:text-theme-primary"
                }`}
              >
                {type === "both"
                  ? "All"
                  : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Time Range Selector */}
          <div className="bg-muted flex flex-wrap gap-1 rounded-lg p-1 sm:w-auto">
            {(["week", "month", "year"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-all sm:flex-none ${
                  timeRange === range
                    ? "bg-card text-foreground shadow-sm"
                    : "text-theme-secondary hover:text-theme-primary"
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {prLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-muted h-20 animate-pulse rounded-lg"
            ></div>
          ))}
        </div>
      ) : personalRecords && personalRecords.length > 0 ? (
        <div className="space-y-4">
          {/* PR Summary Stats */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="bg-surface rounded-lg p-4">
              <div className="mb-1 flex items-center space-x-2">
                <span className="text-2xl">🏆</span>
                <h3 className={subtitleClass}>Total PRs</h3>
              </div>
              <p className="text-2xl font-bold text-purple-500">
                {personalRecords.length}
              </p>
              <p className="text-theme-muted text-xs">this {timeRange}</p>
            </div>

            <div className="bg-surface rounded-lg p-4">
              <div className="mb-1 flex items-center space-x-2">
                <span className="text-2xl">🏋️</span>
                <h3 className={subtitleClass}>Weight PRs</h3>
              </div>
              <p className="text-2xl font-bold text-blue-500">
                {
                  personalRecords.filter((pr) => pr.recordType === "weight")
                    .length
                }
              </p>
              <p className="text-theme-muted text-xs">max weight</p>
            </div>

            <div className="bg-surface rounded-lg p-4">
              <div className="mb-1 flex items-center space-x-2">
                <span className="text-2xl">📊</span>
                <h3 className={subtitleClass}>Volume PRs</h3>
              </div>
              <p className="text-2xl font-bold text-green-500">
                {
                  personalRecords.filter((pr) => pr.recordType === "volume")
                    .length
                }
              </p>
              <p className="text-theme-muted text-xs">total volume</p>
            </div>
          </div>

          {/* PR Timeline */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className={subtitleClass}>Recent Achievements Timeline</h3>
              <button
                onClick={() => setShowModal(true)}
                className="btn-secondary"
              >
                View All History
              </button>
            </div>
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {personalRecords.map((record, index) => (
                <div
                  key={index}
                  className="bg-surface border-border hover:border-primary flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-all hover:shadow-md"
                  onClick={() => vibrate([10, 30, 10])}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">
                        {getPRIcon(record.recordType)}
                      </span>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center space-x-2">
                        <h4 className="text-theme-primary font-semibold">
                          {record.exerciseName}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getPRBadgeColor(record.recordType)}`}
                        >
                          {record.recordType === "weight"
                            ? "Weight PR"
                            : "Volume PR"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-theme-primary font-bold">
                          {record.weight}kg × {record.reps}
                        </span>

                        {record.recordType === "weight" &&
                          record.oneRMEstimate && (
                            <span className="bg-info-muted text-info rounded px-2 py-1">
                              ~{record.oneRMEstimate}kg 1RM
                            </span>
                          )}

                        {record.recordType === "volume" && (
                          <span className="bg-success-muted text-success rounded px-2 py-1">
                            {(record.weight * record.reps).toLocaleString()}kg
                            volume
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <p className="text-theme-secondary text-sm font-medium">
                      {formatDate(record.workoutDate.toISOString())}
                    </p>

                    {/* Celebration indicator for recent PRs */}
                    {new Date(record.workoutDate) >
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                      <div className="mt-1 flex items-center justify-end">
                        <span className="text-success animate-pulse text-xs font-medium">
                          🎉 New!
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center">
          <svg
            className="mx-auto mb-4 h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
          <p className="text-theme-secondary mb-2 text-lg font-medium">
            Your first PR awaits! 🏆
          </p>
          <p className="text-theme-muted text-sm">
            Every workout is an opportunity to set a new personal best. Let's
            make it happen! 🔥
          </p>
        </div>
      )}

      {/* PR History Modal */}
      <PRHistoryModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
