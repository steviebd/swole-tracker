"use client";

import { useState } from "react";
import { useTheme } from "~/providers/ThemeProvider";
import { api } from "~/trpc/react";

export function WhoopIntegrationSection() {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme !== "system" || (theme === "system" && resolvedTheme === "dark");

  // Check if WHOOP is connected (this would be a real API call)
  const { data: whoopStatus, isLoading } = api.whoop.getIntegrationStatus.useQuery();
  const isConnected = whoopStatus?.isConnected ?? false;

  const cardClass = `transition-all duration-300 rounded-xl border shadow-sm ${
    isDark
      ? "bg-gray-900 border-gray-800 shadow-lg" 
      : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800"
  }`;

  const titleClass = `text-xl font-bold mb-4 ${
    isDark ? "text-white" : "text-gray-900 dark:text-white"
  }`;

  const subtitleClass = `text-sm font-medium mb-2 ${
    isDark ? "text-gray-300" : "text-gray-700 dark:text-gray-300"
  }`;

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
    if (recovery >= 67) return "text-green-500";
    if (recovery >= 34) return "text-yellow-500";
    return "text-red-500";
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
          <h2 className={titleClass}>WHOOP Integration</h2>
          <p className={subtitleClass}>Recovery and performance insights</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`}></div>
          <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
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
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              Connect Your WHOOP Device
            </h3>
            <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Sync your recovery, strain, and sleep data to get personalized workout insights.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
              <div className="text-2xl mb-2">💤</div>
              <h4 className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Sleep Tracking</h4>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Monitor sleep quality and recovery
              </p>
            </div>
            
            <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
              <div className="text-2xl mb-2">❤️</div>
              <h4 className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Heart Rate Zones</h4>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Optimize training intensity
              </p>
            </div>
            
            <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
              <div className="text-2xl mb-2">🔋</div>
              <h4 className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Recovery Insights</h4>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
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
            <h3 className={subtitleClass}>Today's Recovery</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Recovery Score */}
              <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">{getRecoveryEmoji(mockRecoveryData.recovery)}</span>
                  <h4 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Recovery
                  </h4>
                </div>
                <p className={`text-2xl font-bold ${getRecoveryColor(mockRecoveryData.recovery)}`}>
                  {mockRecoveryData.recovery}%
                </p>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                  Ready to train
                </p>
              </div>

              {/* Strain */}
              <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">{getStrainEmoji(mockRecoveryData.strain)}</span>
                  <h4 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Strain
                  </h4>
                </div>
                <p className="text-2xl font-bold text-orange-500">
                  {mockRecoveryData.strain}
                </p>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                  Target: 15-18
                </p>
              </div>

              {/* Sleep Score */}
              <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">😴</span>
                  <h4 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Sleep
                  </h4>
                </div>
                <p className="text-2xl font-bold text-blue-500">
                  {mockRecoveryData.sleep.score}%
                </p>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                  {mockRecoveryData.sleep.hours}h slept
                </p>
              </div>

              {/* HRV */}
              <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">📊</span>
                  <h4 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    HRV
                  </h4>
                </div>
                <p className="text-2xl font-bold text-purple-500">
                  {mockRecoveryData.hrv}
                </p>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                  milliseconds
                </p>
              </div>
            </div>
          </div>

          {/* Heart Rate Zones */}
          <div className="mb-6">
            <h3 className={subtitleClass}>Heart Rate Zones (Last Workout)</h3>
            <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
              <div className="space-y-3">
                {mockHeartRateZones.map((zone, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-4 h-4 rounded ${zone.color}`}></div>
                      <div>
                        <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                          {zone.zone}
                        </p>
                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
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
                      <span className={`text-sm font-medium w-10 text-right ${isDark ? "text-gray-300" : "text-gray-700"}`}>
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
            <h3 className={subtitleClass}>Performance Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border-l-4 border-green-500 ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">💡</span>
                  <h4 className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    Training Recommendation
                  </h4>
                </div>
                <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  Your recovery is good (68%). Today is a great day for strength training. 
                  Consider targeting 15-18 strain for optimal adaptation.
                </p>
              </div>

              <div className={`p-4 rounded-lg border-l-4 border-blue-500 ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">📈</span>
                  <h4 className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    Weekly Trend
                  </h4>
                </div>
                <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  Your average recovery this week is 64%, up 8% from last week. 
                  Great improvement in sleep consistency!
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Coming Soon Banner */}
      <div className={`mt-6 p-3 rounded-lg border-2 border-dashed ${isDark ? "border-gray-600" : "border-gray-300"}`}>
        <div className="flex items-center justify-center space-x-2">
          <span className="text-lg">🚧</span>
          <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            WHOOP Integration coming in a future update. This is a preview of planned features.
          </p>
        </div>
      </div>
    </div>
  );
}