"use client";

import { useState } from "react";
import { useTheme } from "~/providers/ThemeProvider";
import { api } from "~/trpc/react";

export function RecentAchievements() {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme !== "system" || (theme === "system" && resolvedTheme === "dark");

  // Get recent data for current month
  const { data: personalRecords, isLoading: prLoading } = api.progress.getPersonalRecords.useQuery({
    timeRange: "month",
    recordType: "both",
  });

  const { data: consistencyData, isLoading: consistencyLoading } = api.progress.getConsistencyStats.useQuery({
    timeRange: "month",
  });

  const { data: volumeData, isLoading: volumeLoading } = api.progress.getVolumeProgression.useQuery({
    timeRange: "month",
  });

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

  const getBadgeEmoji = (category: string) => {
    switch (category) {
      case "strength": return "🏋️";
      case "consistency": return "🔥";
      case "volume": return "📈";
      case "pr": return "🏆";
      case "streak": return "⚡";
      default: return "⭐";
    }
  };

  const getBadgeColor = (level: "gold" | "silver" | "bronze") => {
    switch (level) {
      case "gold": return "from-yellow-400 to-yellow-600";
      case "silver": return "from-gray-300 to-gray-500";
      case "bronze": return "from-orange-400 to-orange-600";
    }
  };

  const getMotivationalMessage = () => {
    if (!consistencyData || !personalRecords || !volumeData) return null;

    const recentPRs = personalRecords.length;
    const currentStreak = consistencyData.currentStreak;
    const totalVolume = volumeData.reduce((sum, day) => sum + day.totalVolume, 0);

    if (recentPRs >= 3) {
      return {
        emoji: "🚀",
        title: "On Fire!",
        message: `${recentPRs} new PRs this month! You're crushing it!`,
        color: "text-green-500"
      };
    } else if (currentStreak >= 7) {
      return {
        emoji: "🔥",
        title: "Streak Master!",
        message: `${currentStreak} day streak! Consistency is key!`,
        color: "text-orange-500"
      };
    } else if (totalVolume > 10000) {
      return {
        emoji: "💪",
        title: "Volume Beast!",
        message: `${totalVolume.toLocaleString()}kg moved this month!`,
        color: "text-blue-500"
      };
    } else {
      return {
        emoji: "🎯",
        title: "Keep Going!",
        message: "Every workout counts. You're building something great!",
        color: "text-purple-500"
      };
    }
  };

  const motivationalMessage = getMotivationalMessage();

  // Calculate achievements
  const achievements = [];
  
  if (personalRecords && personalRecords.length > 0) {
    achievements.push({
      category: "pr",
      level: personalRecords.length >= 5 ? "gold" : personalRecords.length >= 3 ? "silver" : "bronze",
      title: `${personalRecords.length} New PRs`,
      description: "Personal records this month",
      value: personalRecords.length
    });
  }

  if (consistencyData?.currentStreak && consistencyData.currentStreak >= 3) {
    achievements.push({
      category: "streak",
      level: consistencyData.currentStreak >= 14 ? "gold" : consistencyData.currentStreak >= 7 ? "silver" : "bronze",
      title: `${consistencyData.currentStreak} Day Streak`,
      description: "Consecutive workout days",
      value: consistencyData.currentStreak
    });
  }

  if (consistencyData?.frequency && consistencyData.frequency >= 3) {
    achievements.push({
      category: "consistency",
      level: "gold",
      title: "Consistency Master",
      description: `${consistencyData.frequency}x per week average`,
      value: consistencyData.frequency
    });
  }

  if (volumeData) {
    const totalVolume = volumeData.reduce((sum, day) => sum + day.totalVolume, 0);
    if (totalVolume > 5000) {
      achievements.push({
        category: "volume",
        level: totalVolume >= 20000 ? "gold" : totalVolume >= 10000 ? "silver" : "bronze",
        title: "Volume Champion",
        description: `${totalVolume.toLocaleString()}kg total volume`,
        value: totalVolume
      });
    }
  }

  const isLoading = prLoading || consistencyLoading || volumeLoading;

  return (
    <div className={cardClass + " p-6"}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={titleClass}>This Month's Achievements</h2>
          <p className={subtitleClass}>Your progress highlights for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>
        
        {motivationalMessage && (
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{motivationalMessage.emoji}</span>
              <div>
                <p className={`font-bold ${motivationalMessage.color}`}>
                  {motivationalMessage.title}
                </p>
                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Keep it up!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-20 rounded-lg"></div>
          ))}
        </div>
      ) : (
        <>
          {/* Motivational Banner */}
          {motivationalMessage && (
            <div className={`mb-6 p-4 rounded-lg border-l-4 ${
              motivationalMessage.color.includes('green') ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
              motivationalMessage.color.includes('orange') ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' :
              motivationalMessage.color.includes('blue') ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
              'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            }`}>
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{motivationalMessage.emoji}</span>
                <div>
                  <h3 className={`font-bold ${motivationalMessage.color}`}>
                    {motivationalMessage.title}
                  </h3>
                  <p className={isDark ? "text-gray-300" : "text-gray-700"}>
                    {motivationalMessage.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Achievement Badges */}
          {achievements.length > 0 ? (
            <div className="mb-6">
              <h3 className={subtitleClass}>Achievement Badges</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.map((achievement, index) => (
                  <div 
                    key={index}
                    className={`relative p-4 rounded-xl border transition-all duration-200 hover:scale-105 ${
                      isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    {/* Badge Icon with Gradient */}
                    <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br ${getBadgeColor(achievement.level as "gold" | "silver" | "bronze")} flex items-center justify-center shadow-lg`}>
                      <span className="text-white text-xs font-bold">
                        {achievement.level === "gold" ? "🥇" : achievement.level === "silver" ? "🥈" : "🥉"}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getBadgeEmoji(achievement.category)}</span>
                      <div>
                        <h4 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                          {achievement.title}
                        </h4>
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Recent PRs Highlight */}
          {personalRecords && personalRecords.length > 0 && (
            <div className="mb-6">
              <h3 className={subtitleClass}>Recent Personal Records</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {personalRecords.slice(0, 5).map((record, index) => (
                  <div 
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                      isDark ? "bg-gray-800" : "bg-gray-50"
                    } hover:scale-[1.02]`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">
                        {record.recordType === "weight" ? "🏋️" : "📊"}
                      </span>
                      <div>
                        <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                          {record.exerciseName}
                        </p>
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          {record.recordType === "weight" ? "Weight PR" : "Volume PR"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                        {record.weight}kg × {record.reps}
                      </p>
                      {new Date(record.workoutDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                        <span className="text-xs text-green-500 animate-pulse">🆕 New!</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Summary Cards */}
          <div>
            <h3 className={subtitleClass}>Monthly Summary</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Workouts */}
              <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">🎯</span>
                  <h4 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Workouts
                  </h4>
                </div>
                <p className="text-2xl font-bold text-blue-500">
                  {consistencyData?.totalWorkouts || 0}
                </p>
              </div>

              {/* PRs This Month */}
              <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">🏆</span>
                  <h4 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    New PRs
                  </h4>
                </div>
                <p className="text-2xl font-bold text-green-500">
                  {personalRecords?.length || 0}
                </p>
              </div>

              {/* Current Streak */}
              <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">🔥</span>
                  <h4 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Streak
                  </h4>
                </div>
                <p className="text-2xl font-bold text-orange-500">
                  {consistencyData?.currentStreak || 0}
                </p>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                  days
                </p>
              </div>

              {/* Total Volume */}
              <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl">💪</span>
                  <h4 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Volume
                  </h4>
                </div>
                <p className="text-2xl font-bold text-purple-500">
                  {volumeData ? Math.round((volumeData.reduce((sum, day) => sum + day.totalVolume, 0) / 1000)) : 0}k
                </p>
                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                  kg moved
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!isLoading && achievements.length === 0 && (!personalRecords || personalRecords.length === 0) && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <p className={`text-lg font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            Start Your Achievement Journey
          </p>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Complete workouts this month to unlock achievements and track your progress.
          </p>
        </div>
      )}
    </div>
  );
}