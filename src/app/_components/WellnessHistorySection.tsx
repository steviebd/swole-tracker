'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
// Using native JavaScript date formatting to avoid additional dependencies

interface WellnessHistorySectionProps {
  timeRange?: 'week' | 'month' | 'year';
}

interface WellnessTrendData {
  date: string;
  energyLevel: number;
  sleepQuality: number;
  hasNotes: boolean;
}

export function WellnessHistorySection({ timeRange = 'month' }: WellnessHistorySectionProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Fetch user preferences to check if manual wellness is enabled
  const { data: preferences } = api.preferences.get.useQuery();
  const isManualWellnessEnabled = !!(preferences?.enable_manual_wellness ?? false);

  // Calculate date range for querying
  const getDaysForTimeRange = (range: string) => {
    switch (range) {
      case 'week': return 7;
      case 'month': return 30;
      case 'year': return 365;
      default: return 30;
    }
  };

  // Fetch wellness data and stats
  const { data: wellnessHistory, isLoading: historyLoading } = api.wellness.getHistory.useQuery(
    {
      limit: 50,
      offset: 0,
      startDate: new Date(Date.now() - getDaysForTimeRange(timeRange) * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    },
    { enabled: isManualWellnessEnabled }
  );

  const { data: wellnessStats, isLoading: statsLoading } = api.wellness.getStats.useQuery(
    { days: getDaysForTimeRange(timeRange) },
    { enabled: isManualWellnessEnabled }
  );

  // Don't render if manual wellness is not enabled
  if (!isManualWellnessEnabled) {
    return null;
  }

  // Process data for trend visualization
  const trendData: WellnessTrendData[] = wellnessHistory?.map(entry => ({
    date: entry.date,
    energyLevel: entry.energy_level || 0,
    sleepQuality: entry.sleep_quality || 0,
    hasNotes: !!(entry.notes && entry.notes.trim().length > 0),
  })) || [];

  // Calculate trend direction
  const calculateTrend = (values: number[]) => {
    if (values.length < 2) return 'stable';
    const recent = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
    const earlier = values.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, values.length - 3);
    const diff = recent - earlier;
    if (diff > 0.5) return 'improving';
    if (diff < -0.5) return 'declining';
    return 'stable';
  };

  const energyTrend = calculateTrend(trendData.map(d => d.energyLevel));
  const sleepTrend = calculateTrend(trendData.map(d => d.sleepQuality));

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'var(--color-success)';
      case 'declining': return 'var(--color-danger)';
      default: return 'var(--color-text-muted)';
    }
  };

  const cardClass = "transition-all duration-300 glass-surface";

  return (
    <div className={cardClass + " p-6"}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          🎯 Wellness Tracking
        </h2>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm px-3 py-1 rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Average Energy */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Avg Energy Level
            </h3>
            <span style={{ color: getTrendColor(energyTrend) }}>
              {getTrendIcon(energyTrend)}
            </span>
          </div>
          {statsLoading ? (
            <div className="animate-pulse h-6 w-12 rounded" style={{ backgroundColor: 'var(--color-border)' }}></div>
          ) : (
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                {wellnessStats?.period.avgEnergyLevel?.toFixed(1) || '0.0'}
              </span>
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>/10</span>
            </div>
          )}
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Recent: {wellnessStats?.recent.avgEnergyLevel?.toFixed(1) || '0.0'}
          </div>
        </div>

        {/* Average Sleep */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Avg Sleep Quality
            </h3>
            <span style={{ color: getTrendColor(sleepTrend) }}>
              {getTrendIcon(sleepTrend)}
            </span>
          </div>
          {statsLoading ? (
            <div className="animate-pulse h-6 w-12 rounded" style={{ backgroundColor: 'var(--color-border)' }}></div>
          ) : (
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                {wellnessStats?.period.avgSleepQuality?.toFixed(1) || '0.0'}
              </span>
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>/10</span>
            </div>
          )}
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Recent: {wellnessStats?.recent.avgSleepQuality?.toFixed(1) || '0.0'}
          </div>
        </div>

        {/* Total Entries */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Wellness Entries
          </h3>
          {statsLoading ? (
            <div className="animate-pulse h-6 w-8 rounded" style={{ backgroundColor: 'var(--color-border)' }}></div>
          ) : (
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                {wellnessStats?.period.totalEntries || 0}
              </span>
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                entries
              </span>
            </div>
          )}
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Recent week: {wellnessStats?.recent.totalEntries || 0}
          </div>
        </div>
      </div>

      {/* Detailed History */}
      {showDetails && (
        <div>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            Recent Wellness History
          </h3>
          
          {historyLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-16 rounded" style={{ backgroundColor: 'var(--color-border)' }}></div>
              ))}
            </div>
          ) : trendData.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {trendData.slice(0, 10).map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        {new Date(entry.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                      {entry.hasNotes && (
                        <span className="text-xs px-2 py-1 rounded" style={{ 
                          backgroundColor: 'color-mix(in oklab, var(--color-primary) 10%, var(--color-bg-surface))',
                          color: 'var(--color-primary)'
                        }}>
                          📝 Notes
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    {/* Energy Level */}
                    <div className="text-center">
                      <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Energy</div>
                      <div className="flex items-center space-x-1">
                        <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                          {entry.energyLevel}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>/10</span>
                      </div>
                      {/* Visual indicator */}
                      <div className="w-16 h-2 rounded-full mt-1" style={{ backgroundColor: 'var(--color-border)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(entry.energyLevel / 10) * 100}%`,
                            backgroundColor: entry.energyLevel >= 7 ? 'var(--color-success)' : 
                                           entry.energyLevel >= 4 ? 'var(--color-warning)' : 'var(--color-danger)'
                          }}
                        />
                      </div>
                    </div>

                    {/* Sleep Quality */}
                    <div className="text-center">
                      <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Sleep</div>
                      <div className="flex items-center space-x-1">
                        <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                          {entry.sleepQuality}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>/10</span>
                      </div>
                      {/* Visual indicator */}
                      <div className="w-16 h-2 rounded-full mt-1" style={{ backgroundColor: 'var(--color-border)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(entry.sleepQuality / 10) * 100}%`,
                            backgroundColor: entry.sleepQuality >= 7 ? 'var(--color-success)' : 
                                           entry.sleepQuality >= 4 ? 'var(--color-warning)' : 'var(--color-danger)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎯</div>
              <p className="text-lg font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                No wellness data yet
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Start logging your wellness during workouts to see trends and insights here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick Insights */}
      {!showDetails && trendData.length > 0 && (
        <div className="mt-4 p-4 rounded-lg" style={{ 
          backgroundColor: 'color-mix(in oklab, var(--color-primary) 5%, var(--color-bg-surface))',
          borderColor: 'var(--color-primary)'
        }}>
          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
            💡 Quick Insights
          </h4>
          <div className="space-y-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <div>
              Energy trend: <span style={{ color: getTrendColor(energyTrend) }}>
                {getTrendIcon(energyTrend)} {energyTrend}
              </span>
            </div>
            <div>
              Sleep trend: <span style={{ color: getTrendColor(sleepTrend) }}>
                {getTrendIcon(sleepTrend)} {sleepTrend}
              </span>
            </div>
            <div>
              Latest entry: {trendData.length > 0 && trendData[0] ? 
                new Date(trendData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
                'None'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}