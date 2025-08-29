import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { ensureUser } from "./users";

/**
 * Progress Tracking Functions
 * 
 * Provides comprehensive progress analytics including strength progression,
 * volume tracking, consistency metrics, and personal records.
 * 
 * Key Features:
 * - Strength progression over time (weight progression, 1RM estimates)
 * - Volume tracking and analytics 
 * - Workout consistency and frequency analysis
 * - Personal record tracking (weight and volume PRs)
 * - Comparative analysis (current vs previous periods)
 * - Exercise-specific analytics and insights
 */

// Time range enum for filtering
const TimeRange = v.union(v.literal("week"), v.literal("month"), v.literal("year"));

// Helper function to get date range based on time range selection
function getDateRange(
  timeRange: "week" | "month" | "year", 
  startDate?: number, 
  endDate?: number
): { startDate: number; endDate: number } {
  if (startDate && endDate) {
    return { startDate, endDate };
  }

  const now = Date.now();
  const end = now;
  let start: number;

  switch (timeRange) {
    case "week":
      start = now - (7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      start = now - (30 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      start = now - (365 * 24 * 60 * 60 * 1000);
      break;
  }

  return { startDate: start, endDate: end };
}

// Helper function to get previous period for comparison
function getPreviousPeriod(startDate: number, endDate: number): { startDate: number; endDate: number } {
  const periodLength = endDate - startDate;
  const prevEndDate = startDate - 1; // 1ms before current period starts
  const prevStartDate = prevEndDate - periodLength;
  
  return { startDate: prevStartDate, endDate: prevEndDate };
}

// Helper function to get linked exercise names for a template exercise
async function getLinkedExerciseNames(
  ctx: any,
  user: any,
  templateExerciseId: string
): Promise<string[]> {
  // Check if this template exercise is linked to a master exercise
  const exerciseLink = await ctx.db
    .query("exerciseLinks")
    .withIndex("by_templateExerciseId", (q: any) => q.eq("templateExerciseId", templateExerciseId))
    .filter((q: any) => q.eq(q.field("userId"), user._id))
    .unique();

  if (exerciseLink) {
    // Find all template exercises linked to the same master exercise
    const linkedExercises = await ctx.db
      .query("exerciseLinks")
      .withIndex("by_masterExerciseId", (q: any) => q.eq("masterExerciseId", exerciseLink.masterExerciseId))
      .filter((q: any) => q.eq(q.field("userId"), user._id))
      .collect();

    const exerciseNames = await Promise.all(
      linkedExercises.map(async (link: any) => {
        const templateExercise = await ctx.db.get(link.templateExerciseId);
        return templateExercise?.exerciseName;
      })
    );

    return exerciseNames.filter(name => name !== undefined);
  } else {
    // Fallback to getting exercise name from templateExerciseId
    const templateExercise = await ctx.db.get(templateExerciseId);
    return templateExercise ? [templateExercise.exerciseName] : [];
  }
}

// One-rep max calculation using Epley formula
function calculateOneRM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/**
 * Get strength progression data for top sets by exercise over time
 */
export const getStrengthProgression = query({
  args: {
    exerciseName: v.optional(v.string()),
    templateExerciseId: v.optional(v.id("templateExercises")),
    timeRange: v.optional(TimeRange),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    const timeRange = args.timeRange ?? "month";
    const { startDate, endDate } = getDateRange(timeRange, args.startDate, args.endDate);
    
    let exerciseNamesToSearch: string[] = [];
    
    // If templateExerciseId is provided, get linked exercises
    if (args.templateExerciseId) {
      const linkedExercises = await getLinkedExerciseNames(ctx, user, args.templateExerciseId);
      exerciseNamesToSearch = linkedExercises;
    } else if (args.exerciseName) {
      exerciseNamesToSearch = [args.exerciseName];
    }
    
    if (exerciseNamesToSearch.length === 0) {
      return [];
    }

    // Get all sessions in the date range
    const sessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .filter((q: any) => q.gte(q.field("workoutDate"), startDate) && q.lte(q.field("workoutDate"), endDate))
      .order("desc")
      .collect();

    // Get session exercises for the specified exercises
    const progressData = [];
    
    for (const session of sessions) {
      const sessionExercises = await ctx.db
        .query("sessionExercises")
        .withIndex("by_sessionId", (q: any) => q.eq("sessionId", session._id))
        .filter((q: any) => 
          exerciseNamesToSearch.some(name => q.eq(q.field("exerciseName"), name))
        )
        .collect();

      for (const sessionEx of sessionExercises) {
        const weight = parseFloat(String(sessionEx.weight || "0"));
        const reps = sessionEx.reps || 1;
        
        progressData.push({
          workoutDate: session.workoutDate,
          exerciseName: sessionEx.exerciseName,
          weight,
          reps,
          sets: sessionEx.sets || 1,
          unit: sessionEx.unit,
          oneRMEstimate: calculateOneRM(weight, reps),
        });
      }
    }

    // Process data to get top set per workout per exercise
    const topSets = processTopSets(progressData);
    
    return topSets;
  },
});

/**
 * Get volume tracking data (total weight moved, sets, reps)
 */
export const getVolumeProgression = query({
  args: {
    timeRange: v.optional(TimeRange),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    const timeRange = args.timeRange ?? "month";
    const { startDate, endDate } = getDateRange(timeRange, args.startDate, args.endDate);
    
    // Get all sessions in the date range
    const sessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .filter((q: any) => q.gte(q.field("workoutDate"), startDate) && q.lte(q.field("workoutDate"), endDate))
      .order("desc")
      .collect();

    // Get session exercises for all sessions
    const volumeData = [];
    
    for (const session of sessions) {
      const sessionExercises = await ctx.db
        .query("sessionExercises")
        .withIndex("by_sessionId", (q: any) => q.eq("sessionId", session._id))
        .collect();

      for (const sessionEx of sessionExercises) {
        volumeData.push({
          workoutDate: session.workoutDate,
          exerciseName: sessionEx.exerciseName,
          weight: parseFloat(String(sessionEx.weight || "0")),
          reps: sessionEx.reps || 0,
          sets: sessionEx.sets || 0,
        });
      }
    }

    // Calculate volume metrics by workout date
    const volumeByDate = calculateVolumeMetrics(volumeData);
    
    return volumeByDate;
  },
});

/**
 * Get consistency statistics (workout frequency, streaks)
 */
export const getConsistencyStats = query({
  args: {
    timeRange: v.optional(TimeRange),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    const timeRange = args.timeRange ?? "month";
    const { startDate, endDate } = getDateRange(timeRange, args.startDate, args.endDate);
    
    const workoutSessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .filter((q: any) => q.gte(q.field("workoutDate"), startDate) && q.lte(q.field("workoutDate"), endDate))
      .order("desc")
      .collect();

    const workoutDates = workoutSessions.map(session => session.workoutDate);
    const consistency = calculateConsistencyMetrics(workoutDates, startDate, endDate);
    
    return consistency;
  },
});

/**
 * Get workout dates for calendar display
 */
export const getWorkoutDates = query({
  args: {
    timeRange: v.optional(TimeRange),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    const timeRange = args.timeRange ?? "month";
    const { startDate, endDate } = getDateRange(timeRange, args.startDate, args.endDate);
    
    const workoutSessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .filter((q: any) => q.gte(q.field("workoutDate"), startDate) && q.lte(q.field("workoutDate"), endDate))
      .order("desc")
      .collect();
    
    return workoutSessions.map(session => new Date(session.workoutDate).toISOString().split('T')[0]!);
  },
});

/**
 * Get personal records (weight and volume PRs)
 */
export const getPersonalRecords = query({
  args: {
    exerciseName: v.optional(v.string()),
    templateExerciseId: v.optional(v.id("templateExercises")),
    timeRange: v.optional(TimeRange),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    recordType: v.optional(v.union(v.literal("weight"), v.literal("volume"), v.literal("both"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    const timeRange = args.timeRange ?? "month";
    const recordType = args.recordType ?? "both";
    const { startDate, endDate } = getDateRange(timeRange, args.startDate, args.endDate);
    
    let exerciseNamesToSearch: string[] = [];
    
    if (args.templateExerciseId) {
      const linkedExercises = await getLinkedExerciseNames(ctx, user, args.templateExerciseId);
      exerciseNamesToSearch = linkedExercises;
    } else if (args.exerciseName) {
      exerciseNamesToSearch = [args.exerciseName];
    }

    if (exerciseNamesToSearch.length === 0) {
      // Get PRs for all exercises
      const allSessionExercises = await ctx.db
        .query("sessionExercises")
        .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
        .collect();
      
      const uniqueExercises = new Set(allSessionExercises.map(ex => ex.exerciseName));
      exerciseNamesToSearch = Array.from(uniqueExercises);
    }

    const personalRecords = await calculatePersonalRecords(
      ctx, 
      user,
      exerciseNamesToSearch, 
      startDate, 
      endDate,
      recordType
    );
    
    return personalRecords;
  },
});

/**
 * Get comparative analysis (current vs previous period)
 */
export const getComparativeAnalysis = query({
  args: {
    timeRange: v.optional(TimeRange),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    const timeRange = args.timeRange ?? "month";
    const { startDate, endDate } = getDateRange(timeRange, args.startDate, args.endDate);
    const { startDate: prevStartDate, endDate: prevEndDate } = getPreviousPeriod(startDate, endDate);
    
    // Get current period data
    const currentData = await getVolumeAndStrengthData(ctx, user, startDate, endDate);
    
    // Get previous period data  
    const previousData = await getVolumeAndStrengthData(ctx, user, prevStartDate, prevEndDate);
    
    const comparison = {
      current: currentData,
      previous: previousData,
      changes: calculateChanges(currentData, previousData),
    };
    
    return comparison;
  },
});

/**
 * Get volume breakdown by exercise
 */
export const getVolumeByExercise = query({
  args: {
    timeRange: v.optional(TimeRange),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    const timeRange = args.timeRange ?? "month";
    const { startDate, endDate } = getDateRange(timeRange, args.startDate, args.endDate);
    
    // Get all sessions in the date range
    const sessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .filter((q: any) => q.gte(q.field("workoutDate"), startDate) && q.lte(q.field("workoutDate"), endDate))
      .order("desc")
      .collect();

    // Get session exercises for all sessions
    const volumeData = [];
    
    for (const session of sessions) {
      const sessionExercises = await ctx.db
        .query("sessionExercises")
        .withIndex("by_sessionId", (q: any) => q.eq("sessionId", session._id))
        .collect();

      for (const sessionEx of sessionExercises) {
        volumeData.push({
          exerciseName: sessionEx.exerciseName,
          weight: parseFloat(String(sessionEx.weight || "0")),
          reps: sessionEx.reps || 0,
          sets: sessionEx.sets || 0,
          workoutDate: session.workoutDate,
        });
      }
    }

    // Calculate volume metrics by exercise
    const volumeByExercise = calculateVolumeByExercise(volumeData);
    
    return volumeByExercise;
  },
});

/**
 * Get set/rep distribution analytics
 */
export const getSetRepDistribution = query({
  args: {
    timeRange: v.optional(TimeRange),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    const timeRange = args.timeRange ?? "month";
    const { startDate, endDate } = getDateRange(timeRange, args.startDate, args.endDate);
    
    // Get all sessions in the date range
    const sessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_user_date", (q: any) => q.eq("userId", user._id))
      .filter((q: any) => q.gte(q.field("workoutDate"), startDate) && q.lte(q.field("workoutDate"), endDate))
      .collect();

    // Get session exercises for all sessions
    const rawData = [];
    
    for (const session of sessions) {
      const sessionExercises = await ctx.db
        .query("sessionExercises")
        .withIndex("by_sessionId", (q: any) => q.eq("sessionId", session._id))
        .collect();

      for (const sessionEx of sessionExercises) {
        rawData.push({
          sets: sessionEx.sets || 0,
          reps: sessionEx.reps || 0,
        });
      }
    }

    // Calculate set/rep distribution
    const distribution = calculateSetRepDistribution(rawData);
    
    return distribution;
  },
});

/**
 * Get exercise list for dropdown/selection
 */
export const getExerciseList = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    
    const sessionExercises = await ctx.db
      .query("sessionExercises")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .collect();

    // Group by exercise name and find last used date and total sets
    const exerciseMap = new Map<string, { lastUsed: number; totalSets: number }>();
    
    for (const sessionEx of sessionExercises) {
      const session = await ctx.db.get(sessionEx.sessionId);
      if (!session) continue;
      
      const existing = exerciseMap.get(sessionEx.exerciseName);
      const workoutDate = session.workoutDate;
      
      if (!existing) {
        exerciseMap.set(sessionEx.exerciseName, {
          lastUsed: workoutDate,
          totalSets: 1,
        });
      } else {
        exerciseMap.set(sessionEx.exerciseName, {
          lastUsed: Math.max(existing.lastUsed, workoutDate),
          totalSets: existing.totalSets + 1,
        });
      }
    }

    const exercises = Array.from(exerciseMap.entries()).map(([exerciseName, data]) => ({
      exerciseName,
      lastUsed: data.lastUsed,
      totalSets: data.totalSets,
    }));

    return exercises.sort((a, b) => b.lastUsed - a.lastUsed);
  },
});

// Helper functions

type ProgressDataRow = {
  workoutDate: number;
  exerciseName: string;
  weight: number;
  reps: number;
  sets: number;
  unit: string;
  oneRMEstimate: number;
};

function processTopSets(progressData: ProgressDataRow[]): Array<{
  workoutDate: number;
  exerciseName: string;
  weight: number;
  reps: number;
  sets: number;
  unit: string;
  oneRMEstimate: number;
}> {
  // Group by workout date and exercise name, then get top set for each
  const grouped = progressData.reduce((acc, row) => {
    const key = `${row.workoutDate}-${row.exerciseName}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(row);
    return acc;
  }, {} as Record<string, ProgressDataRow[]>);

  const topSets = Object.values(grouped).map((group) => {
    // Sort by weight descending and get the top set
    const sortedByWeight = group.sort((a, b) => b.weight - a.weight);
    return sortedByWeight[0]!;
  });

  return topSets;
}

function calculateVolumeMetrics(volumeData: {
  workoutDate: number;
  exerciseName: string;
  weight: number;
  reps: number;
  sets: number;
}[]): Array<{
  workoutDate: number;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  uniqueExercises: number;
}> {
  // Group by workout date
  const grouped = volumeData.reduce((acc, row) => {
    const dateKey = new Date(row.workoutDate).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = {
        workoutDate: row.workoutDate,
        totalVolume: 0,
        totalSets: 0,
        totalReps: 0,
        exerciseCount: new Set<string>(),
      };
    }
    
    acc[dateKey].totalVolume += row.weight * row.reps * row.sets;
    acc[dateKey].totalSets += row.sets;
    acc[dateKey].totalReps += row.reps * row.sets;
    acc[dateKey].exerciseCount.add(row.exerciseName);
    
    return acc;
  }, {} as Record<string, {
    workoutDate: number;
    totalVolume: number;
    totalSets: number;
    totalReps: number;
    exerciseCount: Set<string>;
  }>);

  return Object.values(grouped).map(day => ({
    workoutDate: day.workoutDate,
    totalVolume: day.totalVolume,
    totalSets: day.totalSets,
    totalReps: day.totalReps,
    uniqueExercises: day.exerciseCount.size,
  }));
}

function calculateConsistencyMetrics(workoutDates: number[], startDate: number, endDate: number): {
  totalWorkouts: number;
  frequency: number;
  currentStreak: number;
  longestStreak: number;
  consistencyScore: number;
} {
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const workoutDays = workoutDates.length;
  
  // Calculate frequency (workouts per week)
  const weeks = Math.max(1, totalDays / 7);
  const frequency = workoutDays / weeks;
  
  // Calculate current streak
  const currentStreak = calculateCurrentStreak(workoutDates);
  
  // Calculate longest streak in period
  const longestStreak = calculateLongestStreak(workoutDates);
  
  return {
    totalWorkouts: workoutDays,
    frequency: Math.round(frequency * 10) / 10,
    currentStreak,
    longestStreak,
    consistencyScore: Math.min(100, Math.round((frequency / 3) * 100)), // Target 3x per week
  };
}

function calculateCurrentStreak(dates: number[]) {
  if (dates.length === 0) return 0;
  
  const today = Date.now();
  let streak = 0;
  let currentDate = today;
  
  // Sort dates descending
  const sortedDates = dates.sort((a, b) => b - a);
  
  for (const workoutDate of sortedDates) {
    const daysDiff = Math.floor((currentDate - workoutDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1) {
      streak++;
      currentDate = workoutDate;
    } else {
      break;
    }
  }
  
  return streak;
}

function calculateLongestStreak(dates: number[]) {
  if (dates.length === 0) return 0;
  
  const sortedDates = dates.sort((a, b) => a - b);
  let maxStreak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = sortedDates[i - 1]!;
    const currentDate = sortedDates[i]!;
    const daysDiff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) { // Within a week counts as continuing streak
      currentStreak++;
    } else {
      maxStreak = Math.max(maxStreak, currentStreak);
      currentStreak = 1;
    }
  }
  
  return Math.max(maxStreak, currentStreak);
}

async function calculatePersonalRecords(
  ctx: any,
  user: any,
  exerciseNames: string[],
  startDate: number,
  endDate: number,
  recordType: "weight" | "volume" | "both"
): Promise<Array<{
  exerciseName: string;
  recordType: "weight" | "volume";
  weight: number;
  reps: number;
  sets: number;
  unit: string;
  workoutDate: number;
  oneRMEstimate?: number;
  totalVolume?: number;
}>> {
  const records = [];
  
  for (const exerciseName of exerciseNames) {
    // Get all sessions in the date range
    const sessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_user_date", (q: any) => q.eq("userId", user._id))
      .filter((q: any) => q.gte(q.field("workoutDate"), startDate) && q.lte(q.field("workoutDate"), endDate))
      .collect();

    const exerciseData = [];
    
    for (const session of sessions) {
      const sessionExercises = await ctx.db
        .query("sessionExercises")
        .withIndex("by_sessionId", (q: any) => q.eq("sessionId", session._id))
        .filter((q: any) => q.eq(q.field("exerciseName"), exerciseName))
        .collect();

      for (const sessionEx of sessionExercises) {
        exerciseData.push({
          workoutDate: session.workoutDate,
          weight: parseFloat(String(sessionEx.weight || "0")),
          reps: sessionEx.reps || 0,
          sets: sessionEx.sets || 0,
          unit: sessionEx.unit,
        });
      }
    }

    if (exerciseData.length === 0) continue;

    // Find weight PR
    const weightPR = exerciseData.reduce((max, current) => {
      return current.weight > max.weight ? current : max;
    });

    // Find volume PR
    const volumePR = exerciseData.reduce((max, current) => {
      const currentVolume = current.weight * current.reps * current.sets;
      const maxVolume = max.weight * max.reps * max.sets;
      return currentVolume > maxVolume ? current : max;
    });

    if (recordType === "weight" || recordType === "both") {
      records.push({
        exerciseName,
        recordType: "weight" as const,
        weight: weightPR.weight,
        reps: weightPR.reps,
        sets: weightPR.sets,
        unit: weightPR.unit,
        workoutDate: weightPR.workoutDate,
        oneRMEstimate: calculateOneRM(weightPR.weight, weightPR.reps),
      });
    }

    if (recordType === "volume" || recordType === "both") {
      const volume = volumePR.weight * volumePR.reps * volumePR.sets;
      records.push({
        exerciseName,
        recordType: "volume" as const,
        weight: volumePR.weight,
        reps: volumePR.reps,
        sets: volumePR.sets,
        unit: volumePR.unit,
        workoutDate: volumePR.workoutDate,
        totalVolume: volume,
      });
    }
  }

  return records;
}

async function getVolumeAndStrengthData(
  ctx: any, 
  user: any, 
  startDate: number, 
  endDate: number
): Promise<{
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  uniqueExercises: number;
  workoutCount: number;
}> {
  // Get all sessions in the date range
  const sessions = await ctx.db
    .query("workoutSessions")
    .withIndex("by_user_date", (q: any) => q.eq("userId", user._id))
    .filter((q: any) => q.gte(q.field("workoutDate"), startDate) && q.lte(q.field("workoutDate"), endDate))
    .collect();

  const data = [];
  const uniqueExercises = new Set<string>();
  
  for (const session of sessions) {
    const sessionExercises = await ctx.db
      .query("sessionExercises")
      .withIndex("by_sessionId", (q: any) => q.eq("sessionId", session._id))
      .collect();

    for (const sessionEx of sessionExercises) {
      uniqueExercises.add(sessionEx.exerciseName);
      data.push({
        weight: parseFloat(String(sessionEx.weight || "0")),
        reps: sessionEx.reps || 0,
        sets: sessionEx.sets || 1,
      });
    }
  }

  const totalVolume = data.reduce((sum, row) => sum + (row.weight * row.reps * row.sets), 0);
  const totalSets = data.reduce((sum, row) => sum + row.sets, 0);
  const totalReps = data.reduce((sum, row) => sum + (row.reps * row.sets), 0);

  return {
    totalVolume,
    totalSets,
    totalReps,
    uniqueExercises: uniqueExercises.size,
    workoutCount: sessions.length,
  };
}

function calculateChanges(current: {
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  uniqueExercises: number;
}, previous: {
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  uniqueExercises: number;
}): {
  volumeChange: number;
  setsChange: number;
  repsChange: number;
} {
  const volumeChange = previous.totalVolume > 0 
    ? ((current.totalVolume - previous.totalVolume) / previous.totalVolume) * 100
    : 0;
    
  const setsChange = previous.totalSets > 0
    ? ((current.totalSets - previous.totalSets) / previous.totalSets) * 100
    : 0;
    
  const repsChange = previous.totalReps > 0
    ? ((current.totalReps - previous.totalReps) / previous.totalReps) * 100
    : 0;

  return {
    volumeChange: Math.round(volumeChange * 10) / 10,
    setsChange: Math.round(setsChange * 10) / 10,
    repsChange: Math.round(repsChange * 10) / 10,
  };
}

function calculateVolumeByExercise(volumeData: {
  exerciseName: string;
  weight: number;
  reps: number;
  sets: number;
  workoutDate: number;
}[]): Array<{
  exerciseName: string;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  sessions: number;
  averageVolume: number;
  percentOfTotal: number;
}> {
  // Group by exercise name
  const grouped = volumeData.reduce((acc, row) => {
    if (!acc[row.exerciseName]) {
      acc[row.exerciseName] = {
        exerciseName: row.exerciseName,
        totalVolume: 0,
        totalSets: 0,
        totalReps: 0,
        sessionDates: new Set<string>(),
      };
    }
    
    acc[row.exerciseName]!.totalVolume += row.weight * row.reps * row.sets;
    acc[row.exerciseName]!.totalSets += row.sets;
    acc[row.exerciseName]!.totalReps += row.reps * row.sets;
    acc[row.exerciseName]!.sessionDates.add(new Date(row.workoutDate).toDateString());
    
    return acc;
  }, {} as Record<string, {
    exerciseName: string;
    totalVolume: number;
    totalSets: number;
    totalReps: number;
    sessionDates: Set<string>;
  }>);

  const exercises = Object.values(grouped).map(exercise => ({
    exerciseName: exercise.exerciseName,
    totalVolume: exercise.totalVolume,
    totalSets: exercise.totalSets,
    totalReps: exercise.totalReps,
    sessions: exercise.sessionDates.size,
    averageVolume: exercise.totalVolume / exercise.sessionDates.size,
  }));

  // Calculate total volume across all exercises for percentage calculation
  const totalVolumeAll = exercises.reduce((sum, ex) => sum + ex.totalVolume, 0);

  return exercises
    .map(exercise => ({
      ...exercise,
      percentOfTotal: totalVolumeAll > 0 ? (exercise.totalVolume / totalVolumeAll) * 100 : 0,
    }))
    .sort((a, b) => b.totalVolume - a.totalVolume);
}

function calculateSetRepDistribution(rawData: {
  sets: number;
  reps: number;
}[]): {
  setDistribution: Array<{ sets: number; count: number; percentage: number }>;
  repDistribution: Array<{ reps: number; count: number; percentage: number }>;
  repRangeDistribution: Array<{ range: string; count: number; percentage: number }>;
  mostCommonSetRep: Array<{ sets: number; reps: number; count: number; percentage: number }>;
} {
  const totalEntries = rawData.length;

  // Sets distribution
  const setsCount = rawData.reduce((acc, row) => {
    const sets = row.sets || 0;
    acc[sets] = (acc[sets] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const setDistribution = Object.entries(setsCount)
    .map(([sets, count]) => ({
      sets: parseInt(sets),
      count: count as number,
      percentage: ((count as number) / totalEntries) * 100,
    }))
    .sort((a, b) => a.sets - b.sets);

  // Reps distribution
  const repsCount = rawData.reduce((acc, row) => {
    const reps = row.reps || 0;
    acc[reps] = (acc[reps] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const repDistribution = Object.entries(repsCount)
    .map(([reps, count]) => ({
      reps: parseInt(reps),
      count: count as number,
      percentage: ((count as number) / totalEntries) * 100,
    }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 10);

  // Rep range distribution
  const repRanges = rawData.reduce((acc, row) => {
    const reps = row.reps || 0;
    let range: string;
    
    if (reps <= 5) range = "1-5 reps (Strength)";
    else if (reps <= 8) range = "6-8 reps (Strength-Hypertrophy)";
    else if (reps <= 12) range = "9-12 reps (Hypertrophy)";
    else if (reps <= 15) range = "13-15 reps (Hypertrophy-Endurance)";
    else range = "16+ reps (Endurance)";
    
    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const repRangeDistribution = Object.entries(repRanges)
    .map(([range, count]) => ({
      range,
      count: count as number,
      percentage: ((count as number) / totalEntries) * 100,
    }))
    .sort((a, b) => (b.count as number) - (a.count as number));

  // Most common set/rep combinations
  const setRepCombos = rawData.reduce((acc, row) => {
    const key = `${row.sets || 0}x${row.reps || 0}`;
    const sets = row.sets || 0;
    const reps = row.reps || 0;
    
    if (!acc[key]) {
      acc[key] = { sets, reps, count: 0 };
    }
    acc[key].count++;
    return acc;
  }, {} as Record<string, { sets: number; reps: number; count: number }>);

  const mostCommonSetRep = (Object.values(setRepCombos) as { sets: number; reps: number; count: number }[])
    .map(combo => ({
      sets: combo.sets,
      reps: combo.reps,
      count: combo.count,
      percentage: (combo.count / totalEntries) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    setDistribution,
    repDistribution,
    repRangeDistribution,
    mostCommonSetRep,
  };
}