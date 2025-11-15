/**
 * Achievement System for Swole Tracker
 *
 * Provides badge calculation, streak tracking, and progress milestones
 * to enhance user motivation and engagement.
 */

export interface Achievement {
  id: string;
  title: string;
  description: string;
  badgeColor: string;
  threshold: number;
  type: "goal" | "streak" | "milestone" | "special";
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastWorkoutDate?: Date;
}

export interface ProgressMilestone {
  achievement: Achievement;
  isUnlocked: boolean;
  progress: number;
}

// Achievement definitions
const ACHIEVEMENTS: Achievement[] = [
  // Goal-based achievements
  {
    id: "perfect-week",
    title: "Perfect!",
    description: "Completed 100% of weekly goal",
    badgeColor: "gradient-stats-orange",
    threshold: 100,
    type: "goal",
  },
  {
    id: "exceeded-week",
    title: "Exceeded!",
    description: "Exceeded 110% of weekly goal",
    badgeColor: "gradient-stats-amber",
    threshold: 110,
    type: "goal",
  },
  {
    id: "nearly-perfect",
    title: "Almost There!",
    description: "Reached 90% of weekly goal",
    badgeColor: "gradient-stats-red",
    threshold: 90,
    type: "goal",
  },

  // Streak achievements
  {
    id: "streak-3",
    title: "Hat Trick",
    description: "3-day workout streak",
    badgeColor: "gradient-stats-orange",
    threshold: 3,
    type: "streak",
  },
  {
    id: "streak-7",
    title: "Week Warrior",
    description: "7-day workout streak",
    badgeColor: "gradient-stats-amber",
    threshold: 7,
    type: "streak",
  },
  {
    id: "streak-14",
    title: "Fortnight Fighter",
    description: "14-day workout streak",
    badgeColor: "gradient-stats-orange",
    threshold: 14,
    type: "streak",
  },
  {
    id: "streak-30",
    title: "Monthly Master",
    description: "30-day workout streak",
    badgeColor: "gradient-stats-red",
    threshold: 30,
    type: "streak",
  },

  // Progress milestones
  {
    id: "first-workout",
    title: "Getting Started",
    description: "Completed your first workout",
    badgeColor: "gradient-stats-orange",
    threshold: 1,
    type: "milestone",
  },
  {
    id: "volume-milestone-10k",
    title: "Heavy Lifter",
    description: "Lifted 10,000kg total volume",
    badgeColor: "gradient-stats-amber",
    threshold: 10000,
    type: "milestone",
  },
  {
    id: "volume-milestone-50k",
    title: "Volume Crusher",
    description: "Lifted 50,000kg total volume",
    badgeColor: "gradient-stats-red",
    threshold: 50000,
    type: "milestone",
  },
  {
    id: "consistency-champion",
    title: "Consistency Champion",
    description: "Maintained 80% weekly consistency for a month",
    badgeColor: "gradient-stats-orange",
    threshold: 80,
    type: "special",
  },
];

/**
 * Calculate achievements based on goal progress percentage
 */
export function calculateGoalAchievements(percentage: number): Achievement[] {
  return ACHIEVEMENTS.filter((achievement) => achievement.type === "goal")
    .filter((achievement) => percentage >= achievement.threshold)
    .sort((a, b) => b.threshold - a.threshold); // Return highest threshold first
}

/**
 * Get the best achievement for current progress (used for badges)
 */
export function getBestGoalAchievement(percentage: number): Achievement | null {
  const achievements = calculateGoalAchievements(percentage);
  return achievements.length > 0 ? achievements[0]! : null;
}

/**
 * Calculate streak-based achievements
 */
export function calculateStreakAchievements(
  streakInfo: StreakInfo,
): Achievement[] {
  return ACHIEVEMENTS.filter((achievement) => achievement.type === "streak")
    .filter((achievement) => streakInfo.current >= achievement.threshold)
    .sort((a, b) => b.threshold - a.threshold);
}

/**
 * Get current streak badge
 */
export function getStreakBadge(streakInfo: StreakInfo): Achievement | null {
  const achievements = calculateStreakAchievements(streakInfo);
  return achievements.length > 0 ? achievements[0]! : null;
}

/**
 * Calculate progress milestones
 */
export function getProgressMilestone(
  totalWorkouts: number,
  totalVolume: number,
): Achievement | null {
  // Check workout milestones
  if (totalWorkouts >= 1) {
    const workoutMilestones = ACHIEVEMENTS.filter(
      (achievement) =>
        achievement.type === "milestone" && achievement.id.includes("workout"),
    )
      .filter((achievement) => totalWorkouts >= achievement.threshold)
      .sort((a, b) => b.threshold - a.threshold);

    if (workoutMilestones.length > 0) {
      return workoutMilestones[0]!;
    }
  }

  // Check volume milestones
  if (totalVolume > 0) {
    const volumeMilestones = ACHIEVEMENTS.filter(
      (achievement) =>
        achievement.type === "milestone" && achievement.id.includes("volume"),
    )
      .filter((achievement) => totalVolume >= achievement.threshold)
      .sort((a, b) => b.threshold - a.threshold);

    if (volumeMilestones.length > 0) {
      return volumeMilestones[0]!;
    }
  }

  return null;
}

/**
 * Calculate streak from workout dates
 * This is a placeholder implementation - in reality you'd want to query the database
 */
export function calculateStreak(workoutDates: Date[]): StreakInfo {
  if (workoutDates?.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Sort dates in descending order
  const sortedDates = workoutDates
    .map((date) => new Date(date))
    .sort((a, b) => b.getTime() - a.getTime());

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if the most recent workout was today or yesterday
  const mostRecent = sortedDates[0];
  if (!mostRecent) {
    return { current: 0, longest: 0 };
  }

  const isRecentEnough =
    isSameDay(mostRecent, today) || isSameDay(mostRecent, yesterday);

  if (isRecentEnough) {
    currentStreak = 1;

    // Calculate current streak
    for (let i = 1; i < sortedDates.length; i++) {
      const current = sortedDates[i - 1];
      const next = sortedDates[i];

      if (current && next && isConsecutiveDay(current, next)) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  for (let i = 1; i < sortedDates.length; i++) {
    const current = sortedDates[i - 1];
    const next = sortedDates[i];

    if (current && next && isConsecutiveDay(current, next)) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    current: currentStreak,
    longest: longestStreak,
    lastWorkoutDate: mostRecent,
  };
}

/**
 * Check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if two dates are consecutive days
 */
function isConsecutiveDay(laterDate: Date, earlierDate: Date): boolean {
  const dayBefore = new Date(laterDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  return isSameDay(dayBefore, earlierDate);
}

/**
 * Get all available achievements (for admin/debugging)
 */
export function getAllAchievements(): Achievement[] {
  return [...ACHIEVEMENTS];
}

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id);
}

/**
 * Create a progress milestone report
 */
export function createProgressReport(
  workoutGoalPercentage: number,
  volumeGoalPercentage: number,
  streakInfo: StreakInfo,
  totalWorkouts: number,
  totalVolume: number,
): {
  goalAchievement: Achievement | null;
  streakAchievement: Achievement | null;
  progressMilestone: Achievement | null;
  allUnlockedAchievements: Achievement[];
} {
  const goalAchievement = getBestGoalAchievement(workoutGoalPercentage);
  const streakAchievement = getStreakBadge(streakInfo);
  const progressMilestone = getProgressMilestone(totalWorkouts, totalVolume);

  const allUnlockedAchievements = [
    ...calculateGoalAchievements(workoutGoalPercentage),
    ...calculateStreakAchievements(streakInfo),
    ...(progressMilestone ? [progressMilestone] : []),
  ];

  return {
    goalAchievement,
    streakAchievement,
    progressMilestone,
    allUnlockedAchievements,
  };
}

/**
 * Format achievement for display (React component helper)
 */
export function formatAchievementBadge(
  achievement: Achievement,
  showIcon = true,
): {
  text: string;
  className: string;
  icon?: string;
} {
  const icons: Record<string, string> = {
    "perfect-week": "🎉",
    "exceeded-week": "💪",
    "nearly-perfect": "🔥",
    "streak-3": "🔥",
    "streak-7": "⚡",
    "streak-14": "💎",
    "streak-30": "👑",
    "first-workout": "🚀",
    "volume-milestone-10k": "💪",
    "volume-milestone-50k": "🏆",
    "consistency-champion": "⭐",
  };

  const result: { text: string; className: string; icon?: string } = {
    text: achievement.title,
    className: `${achievement.badgeColor} text-background px-2 py-1 rounded-full text-xs font-medium shadow-sm animate-badge-entrance`,
  };
  const iconValue = icons[achievement.id];
  if (showIcon && iconValue) {
    result.icon = iconValue;
  }
  return result;
}
