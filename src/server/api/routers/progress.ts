import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { 
  sessionExercises,
  workoutSessions, 
  exerciseLinks,
  templateExercises
} from "~/server/db/schema";
import { eq, desc, and, gte, lte, sql, inArray } from "drizzle-orm";

// Time range enum for filtering
const timeRangeSchema = z.enum(["week", "month", "year"]);

// Input schemas for progress queries
const timeRangeInputSchema = z.object({
  timeRange: timeRangeSchema.default("month"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

const exerciseProgressInputSchema = z.object({
  exerciseName: z.string().optional(),
  templateExerciseId: z.number().optional(),
  timeRange: timeRangeSchema.default("month"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export const progressRouter = createTRPCRouter({
  // Get strength progression data for top sets by exercise over time
  getStrengthProgression: protectedProcedure
    .input(exerciseProgressInputSchema)
    .query(async ({ input, ctx }) => {
      const { startDate, endDate } = getDateRange(input.timeRange, input.startDate, input.endDate);
      
      let exerciseNamesToSearch: string[] = [];
      
      // If templateExerciseId is provided, get linked exercises
      if (input.templateExerciseId) {
        const linkedExercises = await getLinkedExerciseNames(ctx, input.templateExerciseId);
        exerciseNamesToSearch = linkedExercises;
      } else if (input.exerciseName) {
        exerciseNamesToSearch = [input.exerciseName];
      }
      
      if (exerciseNamesToSearch.length === 0) {
        return [];
      }

      // Get all session exercises for the specified time range and exercises
      const whereConditions = [
        eq(sessionExercises.user_id, ctx.user.id),
        gte(workoutSessions.workoutDate, startDate),
        lte(workoutSessions.workoutDate, endDate)
      ];

      // Add exercise name filter
      const exerciseCondition = exerciseNamesToSearch.length === 1 
        ? eq(sessionExercises.exerciseName, exerciseNamesToSearch[0]!)
        : inArray(sessionExercises.exerciseName, exerciseNamesToSearch);

      whereConditions.push(exerciseCondition);

      const progressData = await ctx.db
        .select({
          workoutDate: workoutSessions.workoutDate,
          exerciseName: sessionExercises.exerciseName,
          weight: sessionExercises.weight,
          reps: sessionExercises.reps,
          sets: sessionExercises.sets,
          unit: sessionExercises.unit,
        })
        .from(sessionExercises)
        .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.sessionId))
        .where(and(...whereConditions))
        .orderBy(desc(workoutSessions.workoutDate), desc(sessionExercises.weight));

      // Process data to get top set per workout per exercise
      const topSets = processTopSets(progressData);
      
      return topSets;
    }),

  // Get volume tracking data (total weight moved, sets, reps)
  getVolumeProgression: protectedProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input, ctx }) => {
      const { startDate, endDate } = getDateRange(input.timeRange, input.startDate, input.endDate);
      
      const volumeData = await ctx.db
        .select({
          workoutDate: workoutSessions.workoutDate,
          exerciseName: sessionExercises.exerciseName,
          weight: sessionExercises.weight,
          reps: sessionExercises.reps,
          sets: sessionExercises.sets,
          unit: sessionExercises.unit,
        })
        .from(sessionExercises)
        .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.sessionId))
        .where(
          and(
            eq(sessionExercises.user_id, ctx.user.id),
            gte(workoutSessions.workoutDate, startDate),
            lte(workoutSessions.workoutDate, endDate)
          )
        )
        .orderBy(desc(workoutSessions.workoutDate));

      // Calculate volume metrics by workout date
      const volumeByDate = calculateVolumeMetrics(volumeData);
      
      return volumeByDate;
    }),

  // Get consistency statistics (workout frequency, streaks)
  getConsistencyStats: protectedProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input, ctx }) => {
      const { startDate, endDate } = getDateRange(input.timeRange, input.startDate, input.endDate);
      
      const workoutDates = await ctx.db
        .select({
          workoutDate: workoutSessions.workoutDate,
        })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.user_id, ctx.user.id),
            gte(workoutSessions.workoutDate, startDate),
            lte(workoutSessions.workoutDate, endDate)
          )
        )
        .orderBy(desc(workoutSessions.workoutDate));

      const consistency = calculateConsistencyMetrics(workoutDates, startDate, endDate);
      
      return consistency;
    }),

  // Get personal records (weight and volume PRs)
  getPersonalRecords: protectedProcedure
    .input(exerciseProgressInputSchema.extend({
      recordType: z.enum(["weight", "volume", "both"]).default("both"),
    }))
    .query(async ({ input, ctx }) => {
      const { startDate, endDate } = getDateRange(input.timeRange, input.startDate, input.endDate);
      
      let exerciseNamesToSearch: string[] = [];
      
      if (input.templateExerciseId) {
        const linkedExercises = await getLinkedExerciseNames(ctx, input.templateExerciseId);
        exerciseNamesToSearch = linkedExercises;
      } else if (input.exerciseName) {
        exerciseNamesToSearch = [input.exerciseName];
      }

      if (exerciseNamesToSearch.length === 0) {
        // Get PRs for all exercises
        const allExercises = await ctx.db
          .select({
            exerciseName: sessionExercises.exerciseName,
          })
          .from(sessionExercises)
          .where(eq(sessionExercises.user_id, ctx.user.id))
          .groupBy(sessionExercises.exerciseName);
        
        exerciseNamesToSearch = allExercises.map(e => e.exerciseName);
      }

      const personalRecords = await calculatePersonalRecords(
        ctx, 
        exerciseNamesToSearch, 
        startDate, 
        endDate,
        input.recordType
      );
      
      return personalRecords;
    }),

  // Get comparative analysis (current vs previous period)
  getComparativeAnalysis: protectedProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input, ctx }) => {
      const { startDate, endDate } = getDateRange(input.timeRange, input.startDate, input.endDate);
      const { startDate: prevStartDate, endDate: prevEndDate } = getPreviousPeriod(startDate, endDate);
      
      // Get current period data
      const currentData = await getVolumeAndStrengthData(ctx, startDate, endDate);
      
      // Get previous period data  
      const previousData = await getVolumeAndStrengthData(ctx, prevStartDate, prevEndDate);
      
      const comparison = {
        current: currentData,
        previous: previousData,
        changes: calculateChanges(currentData, previousData),
      };
      
      return comparison;
    }),

  // Get exercise list for dropdown/selection
  getExerciseList: protectedProcedure
    .query(async ({ ctx }) => {
      const exercises = await ctx.db
        .select({
          exerciseName: sessionExercises.exerciseName,
          lastUsed: sql<Date>`MAX(${workoutSessions.workoutDate})`,
          totalSets: sql<number>`COUNT(*)`,
        })
        .from(sessionExercises)
        .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.sessionId))
        .where(eq(sessionExercises.user_id, ctx.user.id))
        .groupBy(sessionExercises.exerciseName)
        .orderBy(desc(sql`MAX(${workoutSessions.workoutDate})`));

      return exercises;
    }),
});

// Helper functions
function getDateRange(timeRange: "week" | "month" | "year", startDate?: Date, endDate?: Date) {
  if (startDate && endDate) {
    return { startDate, endDate };
  }

  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (timeRange) {
    case "week":
      start.setDate(end.getDate() - 7);
      break;
    case "month":
      start.setMonth(end.getMonth() - 1);
      break;
    case "year":
      start.setFullYear(end.getFullYear() - 1);
      break;
  }

  return { startDate: start, endDate: end };
}

function getPreviousPeriod(startDate: Date, endDate: Date): { startDate: Date; endDate: Date } {
  const periodLength = endDate.getTime() - startDate.getTime();
  const prevEndDate = new Date(startDate.getTime() - 1); // 1ms before current period starts
  const prevStartDate = new Date(prevEndDate.getTime() - periodLength);
  
  return { startDate: prevStartDate, endDate: prevEndDate };
}

async function getLinkedExerciseNames(ctx: any, templateExerciseId: number): Promise<string[]> {
  // Check if this template exercise is linked to a master exercise
  const exerciseLink = await ctx.db.query.exerciseLinks.findFirst({
    where: eq(exerciseLinks.templateExerciseId, templateExerciseId),
    with: {
      masterExercise: true,
    },
  });

  if (exerciseLink) {
    // Find all template exercises linked to the same master exercise
    const linkedExercises = await ctx.db.query.exerciseLinks.findMany({
      where: eq(exerciseLinks.masterExerciseId, exerciseLink.masterExerciseId),
      with: {
        templateExercise: true,
      },
    });

    return linkedExercises.map((link: typeof linkedExercises[0]) => link.templateExercise.exerciseName);
  } else {
    // Fallback to getting exercise name from templateExerciseId
    const templateExercise = await ctx.db.query.templateExercises.findFirst({
      where: eq(templateExercises.id, templateExerciseId),
    });
    
    return templateExercise ? [templateExercise.exerciseName] : [];
  }
}

function processTopSets(progressData: any[]): Array<{
  workoutDate: Date;
  exerciseName: string;
  weight: number;
  reps: number;
  sets: number;
  unit: string;
  oneRMEstimate: number;
}> {
  // Group by workout date and exercise name, then get top set for each
  const grouped = progressData.reduce((acc, row) => {
    const key = `${row.workoutDate.toISOString()}-${row.exerciseName}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(row);
    return acc;
  }, {} as Record<string, any[]>);

  const topSets = (Object.values(grouped) as any[][]).map((group) => {
    // Sort by weight descending and get the top set
    const sortedByWeight = group.sort((a, b) => {
      const weightA = parseFloat(a.weight || "0");
      const weightB = parseFloat(b.weight || "0");
      return weightB - weightA;
    });
    
    return sortedByWeight[0];
  });

  return topSets.map(set => ({
    workoutDate: set.workoutDate,
    exerciseName: set.exerciseName,
    weight: parseFloat(set.weight || "0"),
    reps: set.reps || 0,
    sets: set.sets || 1,
    unit: set.unit,
    oneRMEstimate: calculateOneRM(parseFloat(set.weight || "0"), set.reps || 1),
  }));
}

function calculateVolumeMetrics(volumeData: any[]): Array<{
  workoutDate: Date;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  uniqueExercises: number;
}> {
  // Group by workout date
  const grouped = volumeData.reduce((acc, row) => {
    const dateKey = row.workoutDate.toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = {
        workoutDate: row.workoutDate,
        totalVolume: 0,
        totalSets: 0,
        totalReps: 0,
        exerciseCount: new Set(),
      };
    }
    
    const weight = parseFloat(row.weight || "0");
    const reps = row.reps || 0;
    const sets = row.sets || 1;
    
    acc[dateKey].totalVolume += weight * reps * sets;
    acc[dateKey].totalSets += sets;
    acc[dateKey].totalReps += reps * sets;
    acc[dateKey].exerciseCount.add(row.exerciseName);
    
    return acc;
  }, {} as Record<string, any>);

  return Object.values(grouped).map((day: any) => ({
    workoutDate: day.workoutDate,
    totalVolume: day.totalVolume,
    totalSets: day.totalSets,
    totalReps: day.totalReps,
    uniqueExercises: day.exerciseCount.size,
  }));
}

function calculateConsistencyMetrics(workoutDates: any[], startDate: Date, endDate: Date): {
  totalWorkouts: number;
  frequency: number;
  currentStreak: number;
  longestStreak: number;
  consistencyScore: number;
} {
  const dates = workoutDates.map(w => new Date(w.workoutDate.toDateString()));
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const workoutDays = dates.length;
  
  // Calculate frequency (workouts per week)
  const weeks = Math.max(1, totalDays / 7);
  const frequency = workoutDays / weeks;
  
  // Calculate current streak
  const currentStreak = calculateCurrentStreak(dates);
  
  // Calculate longest streak in period
  const longestStreak = calculateLongestStreak(dates);
  
  return {
    totalWorkouts: workoutDays,
    frequency: Math.round(frequency * 10) / 10, // Round to 1 decimal
    currentStreak,
    longestStreak,
    consistencyScore: Math.min(100, Math.round((frequency / 3) * 100)), // Target 3x per week
  };
}

function calculateCurrentStreak(dates: Date[]) {
  if (dates.length === 0) return 0;
  
  const today = new Date();
  let streak = 0;
  let currentDate = new Date(today);
  
  // Sort dates descending
  const sortedDates = dates.sort((a, b) => b.getTime() - a.getTime());
  
  for (const workoutDate of sortedDates) {
    const daysDiff = Math.floor((currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1) {
      streak++;
      currentDate = new Date(workoutDate);
    } else {
      break;
    }
  }
  
  return streak;
}

function calculateLongestStreak(dates: Date[]) {
  if (dates.length === 0) return 0;
  
  const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
  let maxStreak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = sortedDates[i - 1];
    const currentDate = sortedDates[i];
    const daysDiff = Math.floor((currentDate!.getTime() - prevDate!.getTime()) / (1000 * 60 * 60 * 24));
    
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
  exerciseNames: string[],
  startDate: Date,
  endDate: Date,
  recordType: "weight" | "volume" | "both"
): Promise<Array<{
  exerciseName: string;
  recordType: "weight" | "volume";
  weight: number;
  reps: number;
  sets: number;
  unit: string;
  workoutDate: Date;
  oneRMEstimate?: number;
  totalVolume?: number;
}>> {
  const records = [];
  
  for (const exerciseName of exerciseNames) {
    const exerciseData = await ctx.db
      .select({
        workoutDate: workoutSessions.workoutDate,
        weight: sessionExercises.weight,
        reps: sessionExercises.reps,
        sets: sessionExercises.sets,
        unit: sessionExercises.unit,
      })
      .from(sessionExercises)
      .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.sessionId))
      .where(
        and(
          eq(sessionExercises.user_id, ctx.user.id),
          eq(sessionExercises.exerciseName, exerciseName),
          gte(workoutSessions.workoutDate, startDate),
          lte(workoutSessions.workoutDate, endDate)
        )
      )
      .orderBy(desc(workoutSessions.workoutDate));

    if (exerciseData.length === 0) continue;

    const weightPR = exerciseData.reduce((max: any, current: any) => {
      const currentWeight = parseFloat(current.weight || "0");
      const maxWeight = parseFloat(max.weight || "0");
      return currentWeight > maxWeight ? current : max;
    });

    const volumePR = exerciseData.reduce((max: any, current: any) => {
      const currentVolume = parseFloat(current.weight || "0") * (current.reps || 0) * (current.sets || 1);
      const maxVolume = parseFloat(max.weight || "0") * (max.reps || 0) * (max.sets || 1);
      return currentVolume > maxVolume ? current : max;
    });

    if (recordType === "weight" || recordType === "both") {
      records.push({
        exerciseName,
        recordType: "weight" as const,
        weight: parseFloat(weightPR.weight || "0"),
        reps: weightPR.reps,
        sets: weightPR.sets,
        unit: weightPR.unit,
        workoutDate: weightPR.workoutDate,
        oneRMEstimate: calculateOneRM(parseFloat(weightPR.weight || "0"), weightPR.reps || 1),
      });
    }

    if (recordType === "volume" || recordType === "both") {
      const volume = parseFloat(volumePR.weight || "0") * (volumePR.reps || 0) * (volumePR.sets || 1);
      records.push({
        exerciseName,
        recordType: "volume" as const,
        weight: parseFloat(volumePR.weight || "0"),
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

async function getVolumeAndStrengthData(ctx: any, startDate: Date, endDate: Date): Promise<{
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  uniqueExercises: number;
  workoutCount: number;
}> {
  const data = await ctx.db
    .select({
      exerciseName: sessionExercises.exerciseName,
      weight: sessionExercises.weight,
      reps: sessionExercises.reps,
      sets: sessionExercises.sets,
      unit: sessionExercises.unit,
    })
    .from(sessionExercises)
    .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.sessionId))
    .where(
      and(
        eq(sessionExercises.user_id, ctx.user.id),
        gte(workoutSessions.workoutDate, startDate),
        lte(workoutSessions.workoutDate, endDate)
      )
    );

  const totalVolume = data.reduce((sum: number, row: any) => {
    return sum + (parseFloat(row.weight || "0") * (row.reps || 0) * (row.sets || 1));
  }, 0);

  const totalSets = data.reduce((sum: number, row: any) => sum + (row.sets || 1), 0);
  const totalReps = data.reduce((sum: number, row: any) => sum + ((row.reps || 0) * (row.sets || 1)), 0);
  const uniqueExercises = new Set(data.map((row: any) => row.exerciseName)).size;

  return {
    totalVolume,
    totalSets,
    totalReps,
    uniqueExercises,
    workoutCount: data.length > 0 ? Math.ceil(data.length / (totalSets / data.length)) : 0,
  };
}

function calculateChanges(current: any, previous: any): {
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

function calculateOneRM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  // Epley formula: 1RM = weight * (1 + reps/30)
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}