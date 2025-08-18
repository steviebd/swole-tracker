"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { PRHistoryModal } from "./PRHistoryModal";

type TimeRange = "week" | "month" | "year";
type RecordType = "weight" | "volume" | "both";

export function PersonalRecordsSection() {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [recordType, setRecordType] = useState<RecordType>("both");
  const [showModal, setShowModal] = useState(false);
  
  const { data: personalRecords, isLoading: prLoading } = api.progress.getPersonalRecords.useQuery({
    timeRange,
    recordType,
  });

  const cardClass = "transition-all duration-300 rounded-xl border shadow-sm bg-card border-border";
  const titleClass = "text-xl font-bold mb-4 text-theme-primary";
  const subtitleClass = "text-sm font-medium mb-2 text-theme-secondary";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPRIcon = (recordType: string) => {
    switch (recordType) {
      case "weight": return "🏋️";
      case "volume": return "📊";
      default: return "🏆";
    }
  };

  const getPRBadgeColor = (recordType: string) => {
    switch (recordType) {
      case "weight": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "volume": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default: return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    }
  };

  return (
    <div className={cardClass + " p-6"}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={titleClass}>Personal Records</h2>
        
        <div className="flex space-x-2">
          {/* Record Type Filter */}
          <div className="flex space-x-1 bg-muted rounded-lg p-1">
            {(["both", "weight", "volume"] as RecordType[]).map((type) => (
              <button
                key={type}
                onClick={() => setRecordType(type)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                  recordType === type
                    ? "bg-card text-foreground shadow-sm"
                    : "text-theme-secondary hover:text-theme-primary"
                }`}
              >
                {type === "both" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Time Range Selector */}
          <div className="flex space-x-1 bg-muted rounded-lg p-1">
            {(["week", "month", "year"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
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
            <div key={i} className="animate-pulse bg-muted h-20 rounded-lg"></div>
          ))}
        </div>
      ) : personalRecords && personalRecords.length > 0 ? (
        <div className="space-y-4">
          {/* PR Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-surface">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-2xl">🏆</span>
                <h3 className={subtitleClass}>Total PRs</h3>
              </div>
              <p className="text-2xl font-bold text-purple-500">
                {personalRecords.length}
              </p>
              <p className="text-xs text-theme-muted">
                this {timeRange}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-surface">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-2xl">🏋️</span>
                <h3 className={subtitleClass}>Weight PRs</h3>
              </div>
              <p className="text-2xl font-bold text-blue-500">
                {personalRecords.filter(pr => pr.recordType === "weight").length}
              </p>
              <p className="text-xs text-theme-muted">
                max weight
              </p>
            </div>

            <div className="p-4 rounded-lg bg-surface">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-2xl">📊</span>
                <h3 className={subtitleClass}>Volume PRs</h3>
              </div>
              <p className="text-2xl font-bold text-green-500">
                {personalRecords.filter(pr => pr.recordType === "volume").length}
              </p>
              <p className="text-xs text-theme-muted">
                total volume
              </p>
            </div>
          </div>

          {/* PR Timeline */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className={subtitleClass}>Recent Achievements Timeline</h3>
              <button
                onClick={() => setShowModal(true)}
                className="btn-secondary"
              >
                View All History
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {personalRecords.map((record, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border transition-all hover:shadow-md bg-surface border-border hover:border-primary"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">{getPRIcon(record.recordType)}</span>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-theme-primary">
                          {record.exerciseName}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPRBadgeColor(record.recordType)}`}>
                          {record.recordType === "weight" ? "Weight PR" : "Volume PR"}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="font-bold text-theme-primary">
                          {record.weight}kg × {record.reps}
                        </span>
                        
                        {record.recordType === "weight" && record.oneRMEstimate && (
                          <span className="px-2 py-1 rounded bg-info-muted text-info">
                            ~{record.oneRMEstimate}kg 1RM
                          </span>
                        )}
                        
                        {record.recordType === "volume" && (
                          <span className="px-2 py-1 rounded bg-success-muted text-success">
                            {(record.weight * record.reps).toLocaleString()}kg volume
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-theme-secondary">
                      {formatDate(record.workoutDate.toISOString())}
                    </p>
                    
                    {/* Celebration indicator for recent PRs */}
                    {new Date(record.workoutDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                      <div className="flex items-center justify-end mt-1">
                        <span className="text-xs text-success font-medium animate-pulse">
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
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <p className="text-lg font-medium mb-2 text-theme-secondary">
            No personal records found
          </p>
          <p className="text-sm text-theme-muted">
            Keep training to achieve new personal records for this {timeRange}.
          </p>
        </div>
      )}
      
      {/* PR History Modal */}
      <PRHistoryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}