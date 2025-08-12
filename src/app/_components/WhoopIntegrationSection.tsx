"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function WhoopIntegrationSection() {

  // Check if WHOOP is connected (this would be a real API call)
  const { data: whoopStatus, isLoading } = api.whoop.getIntegrationStatus.useQuery();
  const isConnected = whoopStatus?.isConnected ?? false;

  const cardClass = "glass-surface transition-all duration-300 rounded-xl";

  const titleClass = "text-xl font-bold mb-4";

  const subtitleClass = "text-sm font-medium mb-2";

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
    { zone: "Zone 1", percentage: 25, color: "bg-gray-400", label: "50-60% (Recovery)" },
    { zone: "Zone 2", percentage: 35, color: "bg-blue-400", label: "60-70% (Base)" },
    { zone: "Zone 3", percentage: 20, color: "bg-green-400", label: "70-80% (Aerobic)" },
    { zone: "Zone 4", percentage: 15, color: "bg-yellow-400", label: "80-90% (Threshold)" },
    { zone: "Zone 5", percentage: 5, color: "bg-red-400", label: "90-100% (Max)" }
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
          <h2 
            className={titleClass}
            style={{ color: 'var(--color-text)' }}
          >
            WHOOP Integration
          </h2>
          <p 
            className={subtitleClass}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Recovery and performance insights
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full animate-pulse"
            style={{
              backgroundColor: isConnected ? 'var(--color-success)' : 'var(--color-text-muted)'
            }}
          ></div>
          <span 
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {isLoading ? 'Checking...' : isConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </div>

      {!isConnected ? (
        /* Connection Prompt */
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">W</span>
            </div>
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-text)' }}
            >
              Connect Your WHOOP Device
            </h3>
            <p 
              className="text-sm mb-6"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sync your recovery, strain, and sleep data to get personalized workout insights.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 95%, var(--color-border) 5%)' }}
            >
              <div className="text-2xl mb-2">💤</div>
              <h4 
                className="font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                Sleep Tracking
              </h4>
              <p 
                className="text-xs"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Monitor sleep quality and recovery
              </p>
            </div>
            
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 95%, var(--color-border) 5%)' }}
            >
              <div className="text-2xl mb-2">❤️</div>
              <h4 
                className="font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                Heart Rate Zones
              </h4>
              <p 
                className="text-xs"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Optimize training intensity
              </p>
            </div>
            
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 95%, var(--color-border) 5%)' }}
            >
              <div className="text-2xl mb-2">🔋</div>
              <h4 
                className="font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                Recovery Insights
              </h4>
              <p 
                className="text-xs"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Know when to push or recover
              </p>
            </div>
          </div>
          
          <button 
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
            disabled
          >
            Connect WHOOP (Coming Soon)
          </button>
        </div>
      ) : (
        /* Connected State - Mock Data Display */
        <>
          {/* Recovery Overview */}
          <div className="mb-6">
            <h3 
              className={subtitleClass}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Today's Recovery
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Recovery Score */}
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 95%, var(--color-border) 5%)' }}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">{getRecoveryEmoji(mockRecoveryData.recovery)}</span>
                  <h4 
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Recovery
                  </h4>
                </div>
                <p 
                  className="text-2xl font-bold"
                  style={{ color: getRecoveryColor(mockRecoveryData.recovery) }}
                >
                  {mockRecoveryData.recovery}%
                </p>
                <p 
                  className="text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Ready to train
                </p>
              </div>

              {/* Strain */}
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 95%, var(--color-border) 5%)' }}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">{getStrainEmoji(mockRecoveryData.strain)}</span>
                  <h4 
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Strain
                  </h4>
                </div>
                <p 
                  className="text-2xl font-bold"
                  style={{ color: 'var(--color-warning)' }}
                >
                  {mockRecoveryData.strain}
                </p>
                <p 
                  className="text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Target: 15-18
                </p>
              </div>

              {/* Sleep Score */}
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 95%, var(--color-border) 5%)' }}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">😴</span>
                  <h4 
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Sleep
                  </h4>
                </div>
                <p 
                  className="text-2xl font-bold"
                  style={{ color: 'var(--color-info)' }}
                >
                  {mockRecoveryData.sleep.score}%
                </p>
                <p 
                  className="text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {mockRecoveryData.sleep.hours}h slept
                </p>
              </div>

              {/* HRV */}
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 95%, var(--color-border) 5%)' }}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">📊</span>
                  <h4 
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    HRV
                  </h4>
                </div>
                <p 
                  className="text-2xl font-bold"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {mockRecoveryData.hrv}
                </p>
                <p 
                  className="text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  milliseconds
                </p>
              </div>
            </div>
          </div>

          {/* Heart Rate Zones */}
          <div className="mb-6">
            <h3 
              className={subtitleClass}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Heart Rate Zones (Last Workout)
            </h3>
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 95%, var(--color-border) 5%)' }}
            >
              <div className="space-y-3">
                {mockHeartRateZones.map((zone, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-4 h-4 rounded ${zone.color}`}></div>
                      <div>
                        <p 
                          className="text-sm font-medium"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {zone.zone}
                        </p>
                        <p 
                          className="text-xs"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {zone.label}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${zone.color}`}
                          style={{ width: `${zone.percentage}%` }}
                        ></div>
                      </div>
                      <span 
                        className="text-sm font-medium w-10 text-right"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
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
            <h3 
              className={subtitleClass}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Performance Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className="p-4 rounded-lg border-l-4"
                style={{
                  backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 95%, var(--color-border) 5%)',
                  borderLeftColor: 'var(--color-success)'
                }}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">💡</span>
                  <h4 
                    className="font-medium"
                    style={{ color: 'var(--color-text)' }}
                  >
                    Training Recommendation
                  </h4>
                </div>
                <p 
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Your recovery is good (68%). Today is a great day for strength training. 
                  Consider targeting 15-18 strain for optimal adaptation.
                </p>
              </div>

              <div 
                className="p-4 rounded-lg border-l-4"
                style={{
                  backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 95%, var(--color-border) 5%)',
                  borderLeftColor: 'var(--color-info)'
                }}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">📈</span>
                  <h4 
                    className="font-medium"
                    style={{ color: 'var(--color-text)' }}
                  >
                    Weekly Trend
                  </h4>
                </div>
                <p 
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Your average recovery this week is 64%, up 8% from last week. 
                  Great improvement in sleep consistency!
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Coming Soon Banner */}
      <div 
        className="mt-6 p-3 rounded-lg border-2 border-dashed"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-center space-x-2">
          <span className="text-lg">🚧</span>
          <p 
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            WHOOP Integration coming in a future update. This is a preview of planned features.
          </p>
        </div>
      </div>
    </div>
  );
}