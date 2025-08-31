"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Calendar, 
  Award, 
  Target, 
  BarChart3,
  Zap,
  Clock,
  Dumbbell,
  Trophy
} from "lucide-react";
import { api } from "~/convex/_generated/api";
import { Button } from "~/components/ui/button";
import { SkeletonScreen } from "~/components/ui/skeleton";
import { GlassSurface } from "~/components/ui/glass-surface";
import { StatCard } from "~/components/ui/stat-card";
import { useState } from "react";

/**
 * Progress Page Component
 * 
 * Features:
 * - Comprehensive progress analytics and insights
 * - Real-time workout consistency tracking  
 * - Volume progression and strength trends
 * - Personal records and achievements
 * - Comparative analysis (current vs previous periods)
 * - Exercise-specific progress tracking
 * - Mobile-first responsive design
 * - Integration with Convex backend for real-time data
 */

type TimeRange = "week" | "month" | "year";

// Main page content
function ProgressPageContent() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");

  // Fetch progress data from Convex
  const consistencyStats = useQuery(api.progress.getConsistencyStats, { timeRange });
  const comparativeAnalysis = useQuery(api.progress.getComparativeAnalysis, { timeRange });
  const personalRecords = useQuery(api.progress.getPersonalRecords, { timeRange });
  const volumeProgression = useQuery(api.progress.getVolumeProgression, { timeRange });
  const volumeByExercise = useQuery(api.progress.getVolumeByExercise, { timeRange });

  const isLoading = 
    consistencyStats === undefined ||
    comparativeAnalysis === undefined ||
    personalRecords === undefined ||
    volumeProgression === undefined ||
    volumeByExercise === undefined;

  // Format time range display
  const getTimeRangeLabel = (range: TimeRange) => {
    switch (range) {
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "year":
        return "This Year";
    }
  };

  // Calculate percentage change for display
  const getChangeDisplay = (current: number, previous: number): string | undefined => {
    if (previous === 0) return current > 0 ? "+100%" : undefined;
    const change = ((current - previous) / previous) * 100;
    return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Progress
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your fitness journey and celebrate your achievements
          </p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex gap-2 bg-muted p-1 rounded-lg">
          {(["week", "month", "year"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${
                timeRange === range 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {range === "week" ? "Week" : range === "month" ? "Month" : "Year"}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 bg-muted/20 animate-pulse rounded-lg" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-48 bg-muted/20 animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {/* Check if user has any workout data */}
      {!isLoading && (
        consistencyStats?.totalWorkouts === 0 ? (
          /* Empty State for New Users */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <GlassSurface className="p-12 text-center">
              <Trophy className="w-20 h-20 mx-auto text-muted-foreground mb-6" />
              <h2 className="text-2xl font-bold mb-4">Start Your Fitness Journey</h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Complete your first workout to see your progress analytics, strength trends, 
                and achievements. Every great journey starts with a single step!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => router.push('/templates')} 
                  size="lg"
                  haptic
                >
                  <Dumbbell className="w-5 h-5" />
                  Start Your First Workout
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/workouts')}
                  size="lg"
                >
                  View Workouts
                </Button>
              </div>
            </GlassSurface>
          </motion.div>
        ) : (
          /* Progress Content */
          <>
            {/* Main Statistics Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <StatCard
                label={`Workouts ${getTimeRangeLabel(timeRange)}`}
                value={consistencyStats?.totalWorkouts?.toString() ?? "0"}
                icon={<Calendar className="w-5 h-5" />}
                change={comparativeAnalysis ? getChangeDisplay(
                  comparativeAnalysis.current.workoutCount,
                  comparativeAnalysis.previous.workoutCount
                ) : undefined}
              />
              
              <StatCard
                label="Workout Frequency"
                value={`${consistencyStats?.frequency?.toFixed(1) ?? "0"}/wk`}
                icon={<Clock className="w-5 h-5" />}
              />
              
              <StatCard
                label="Current Streak"
                value={`${consistencyStats?.currentStreak ?? 0} days`}
                icon={<Zap className="w-5 h-5" />}
              />
              
              <StatCard
                label="Total Volume"
                value={comparativeAnalysis?.current.totalVolume ? 
                  `${Math.round(comparativeAnalysis.current.totalVolume).toLocaleString()}` : "0"
                }
                icon={<Dumbbell className="w-5 h-5" />}
                change={comparativeAnalysis ? getChangeDisplay(
                  comparativeAnalysis.current.totalVolume,
                  comparativeAnalysis.previous.totalVolume
                ) : undefined}
              />
            </motion.div>

            {/* Detailed Progress Sections */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Consistency Metrics */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <GlassSurface className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Consistency</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Consistency Score</span>
                        <span className="text-sm font-medium">{consistencyStats?.consistencyScore ?? 0}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${consistencyStats?.consistencyScore ?? 0}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <div className="text-xl font-bold text-primary">
                          {consistencyStats?.longestStreak ?? 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Longest Streak</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-primary">
                          {consistencyStats?.frequency?.toFixed(1) ?? "0"}
                        </div>
                        <div className="text-xs text-muted-foreground">Weekly Average</div>
                      </div>
                    </div>
                  </div>
                </GlassSurface>
              </motion.div>

              {/* Volume Progress */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <GlassSurface className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Volume Trends</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-primary">
                          {comparativeAnalysis?.current.totalSets ?? 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Sets</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">
                          {comparativeAnalysis?.current.totalReps ?? 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Reps</div>
                      </div>
                    </div>
                    
                    {comparativeAnalysis && (
                      <div className="pt-2 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Volume Change</span>
                          <span className={`font-medium ${
                            comparativeAnalysis.changes.volumeChange >= 0 
                              ? "text-green-600" 
                              : "text-red-600"
                          }`}>
                            {comparativeAnalysis.changes.volumeChange >= 0 ? "+" : ""}
                            {comparativeAnalysis.changes.volumeChange.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sets Change</span>
                          <span className={`font-medium ${
                            comparativeAnalysis.changes.setsChange >= 0 
                              ? "text-green-600" 
                              : "text-red-600"
                          }`}>
                            {comparativeAnalysis.changes.setsChange >= 0 ? "+" : ""}
                            {comparativeAnalysis.changes.setsChange.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </GlassSurface>
              </motion.div>
            </div>

            {/* Personal Records and Exercise Breakdown */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Personal Records */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <GlassSurface className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Award className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Recent PRs</h3>
                  </div>
                  
                  {personalRecords && personalRecords.length > 0 ? (
                    <div className="space-y-3">
                      {personalRecords.slice(0, 3).map((pr, index) => (
                        <div key={`${pr.exerciseName}-${pr.recordType}-${index}`} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{pr.exerciseName}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {pr.recordType} PR
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-primary">
                              {pr.recordType === "weight" ? `${pr.weight} ${pr.unit}` : `${pr.totalVolume}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(pr.workoutDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {personalRecords.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          Keep training to set new personal records!
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      Complete more workouts to track your personal records
                    </div>
                  )}
                </GlassSurface>
              </motion.div>

              {/* Top Exercises by Volume */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <GlassSurface className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Dumbbell className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">Top Exercises</h3>
                  </div>
                  
                  {volumeByExercise && volumeByExercise.length > 0 ? (
                    <div className="space-y-3">
                      {volumeByExercise.slice(0, 5).map((exercise, index) => (
                        <div key={`${exercise.exerciseName}-${index}`} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{exercise.exerciseName}</div>
                            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                              <div 
                                className="bg-primary h-1.5 rounded-full transition-all duration-1000"
                                style={{ width: `${exercise.percentOfTotal}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm font-bold text-primary">
                              {Math.round(exercise.totalVolume).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {exercise.sessions} sessions
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      Exercise data will appear after your first workout
                    </div>
                  )}
                </GlassSurface>
              </motion.div>
            </div>
          </>
        )
      )}
    </div>
  );
}

// Main page component - now always accessible
export default function ProgressPage() {
  return <ProgressPageContent />;
}