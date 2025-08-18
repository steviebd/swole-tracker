"use client";

import { api } from "~/trpc/react";
import Link from "next/link";

export function WhoopIntegrationSection() {

  // Check if WHOOP is connected (this would be a real API call)
  const { data: whoopStatus, isLoading } = api.whoop.getIntegrationStatus.useQuery();
  const isConnected = whoopStatus?.isConnected ?? false;

  const cardClass = "glass-surface transition-all duration-300 rounded-xl";
  const titleClass = "text-xl font-bold mb-4 text-theme-primary";
  const subtitleClass = "text-sm font-medium mb-2 text-theme-secondary";

  // Mock data for demonstration
  const mockRecoveryData = {
    recovery: 68,
    strain: 14.2,
    sleep: {
      score: 82,
      hours: 7.5,
      efficiency: 91
    },
    hrv: 45,
    restingHR: 52
  };

  const mockHeartRateZones = [
    { zone: "Zone 1", percentage: 25, color: "var(--color-chart-1)", label: "50-60% (Recovery)" },
    { zone: "Zone 2", percentage: 35, color: "var(--color-chart-2)", label: "60-70% (Base)" },
    { zone: "Zone 3", percentage: 20, color: "var(--color-chart-3)", label: "70-80% (Aerobic)" },
    { zone: "Zone 4", percentage: 15, color: "var(--color-chart-4)", label: "80-90% (Threshold)" },
    { zone: "Zone 5", percentage: 5, color: "var(--color-chart-5)", label: "90-100% (Max)" }
  ];

  const getRecoveryColor = (recovery: number) => {
    if (recovery >= 67) return 'var(--color-success)';
    if (recovery >= 34) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const getRecoveryEmoji = (recovery: number) => {
    if (recovery >= 67) return "🟢";
    if (recovery >= 34) return "🟡";
    return "🔴";
  };

  const getStrainEmoji = (strain: number) => {
    if (strain >= 18) return "🔥";
    if (strain >= 14) return "⚡";
    if (strain >= 10) return "💪";
    return "😌";
  };

  return (
    <div className={cardClass + " p-6"}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={titleClass}>
            WHOOP Integration
          </h2>
          <p className={subtitleClass}>
            Recovery and performance insights
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            isConnected ? 'bg-success' : 'bg-muted'
          }`}></div>
          <span className="text-sm font-medium text-theme-secondary">
            {isLoading ? 'Checking...' : isConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </div>

      {!isConnected ? (
        /* Connection Prompt */
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-background text-2xl font-bold">W</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-theme-primary">
              Connect Your WHOOP Device
            </h3>
            <p className="text-sm mb-6 text-theme-secondary">
              Sync your recovery, strain, and sleep data to get personalized workout insights.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-lg bg-surface">
              <div className="text-2xl mb-2">💤</div>
              <h4 className="font-medium text-theme-primary">
                Sleep Tracking
              </h4>
              <p className="text-xs text-theme-secondary">
                Monitor sleep quality and recovery
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-surface">
              <div className="text-2xl mb-2">❤️</div>
              <h4 className="font-medium text-theme-primary">
                Heart Rate Zones
              </h4>
              <p className="text-xs text-theme-secondary">
                Optimize training intensity
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-surface">
              <div className="text-2xl mb-2">🔋</div>
              <h4 className="font-medium text-theme-primary">
                Recovery Insights
              </h4>
              <p className="text-xs text-theme-secondary">
                Know when to push or recover
              </p>
            </div>
          </div>
          
          <Link 
            href="/connect-whoop"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-background font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
          >
            Connect WHOOP
          </Link>
        </div>
      ) : (
        /* Connected State - Mock Data Display */
        <>
          {/* Recovery Overview */}
          <div className="mb-6">
            <h3 className={subtitleClass}>
              Today's Recovery
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Recovery Score */}
              <div className="p-4 rounded-lg bg-surface">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">{getRecoveryEmoji(mockRecoveryData.recovery)}</span>
                  <h4 className="text-xs font-medium text-theme-secondary">
                    Recovery
                  </h4>
                </div>
                <p 
                  className="text-2xl font-bold"
                  style={{ color: getRecoveryColor(mockRecoveryData.recovery) }}
                >
                  {mockRecoveryData.recovery}%
                </p>
                <p className="text-xs text-theme-muted">
                  Ready to train
                </p>
              </div>

              {/* Strain */}
              <div className="p-4 rounded-lg bg-surface">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">{getStrainEmoji(mockRecoveryData.strain)}</span>
                  <h4 className="text-xs font-medium text-theme-secondary">
                    Strain
                  </h4>
                </div>
                <p className="text-2xl font-bold text-warning">
                  {mockRecoveryData.strain}
                </p>
                <p className="text-xs text-theme-muted">
                  Target: 15-18
                </p>
              </div>

              {/* Sleep Score */}
              <div className="p-4 rounded-lg bg-surface">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">😴</span>
                  <h4 className="text-xs font-medium text-theme-secondary">
                    Sleep
                  </h4>
                </div>
                <p className="text-2xl font-bold text-info">
                  {mockRecoveryData.sleep.score}%
                </p>
                <p className="text-xs text-theme-muted">
                  {mockRecoveryData.sleep.hours}h slept
                </p>
              </div>

              {/* HRV */}
              <div className="p-4 rounded-lg bg-surface">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">📊</span>
                  <h4 className="text-xs font-medium text-theme-secondary">
                    HRV
                  </h4>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {mockRecoveryData.hrv}
                </p>
                <p className="text-xs text-theme-muted">
                  milliseconds
                </p>
              </div>
            </div>
          </div>

          {/* Heart Rate Zones */}
          <div className="mb-6">
            <h3 className={subtitleClass}>
              Heart Rate Zones (Last Workout)
            </h3>
            <div className="p-4 rounded-lg bg-surface">
              <div className="space-y-3">
                {mockHeartRateZones.map((zone, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: zone.color }}></div>
                      <div>
                        <p className="text-sm font-medium text-theme-primary">
                          {zone.zone}
                        </p>
                        <p className="text-xs text-theme-secondary">
                          {zone.label}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="h-2 rounded-full"
                          style={{ width: `${zone.percentage}%`, backgroundColor: zone.color }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-10 text-right text-theme-secondary">
                        {zone.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Correlation */}
          <div>
            <h3 className={subtitleClass}>
              Performance Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border-l-4 bg-surface border-l-success">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">💡</span>
                  <h4 className="font-medium text-theme-primary">
                    Training Recommendation
                  </h4>
                </div>
                <p className="text-sm text-theme-secondary">
                  Your recovery is good (68%). Today is a great day for strength training. 
                  Consider targeting 15-18 strain for optimal adaptation.
                </p>
              </div>

              <div className="p-4 rounded-lg border-l-4 bg-surface border-l-info">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">📈</span>
                  <h4 className="font-medium text-theme-primary">
                    Weekly Trend
                  </h4>
                </div>
                <p className="text-sm text-theme-secondary">
                  Your average recovery this week is 64%, up 8% from last week. 
                  Great improvement in sleep consistency!
                </p>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}