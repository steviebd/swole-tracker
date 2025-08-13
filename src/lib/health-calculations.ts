import type { WhoopMetrics } from "~/server/api/schemas/health-advice";
import { eq, desc, and, ne } from 'drizzle-orm';

export function clip(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateReadiness(whoop: WhoopMetrics): {
  rho: number;
  flags: string[];
} {
  const flags: string[] = [];
  
  // Component calculations with fallbacks
  const c = whoop.recovery_score != null ? whoop.recovery_score / 100 : 0.5;
  const s = whoop.sleep_performance != null ? whoop.sleep_performance / 100 : 0.5;
  
  let h = 1.0;
  if (whoop.hrv_now_ms && whoop.hrv_baseline_ms) {
    h = clip(whoop.hrv_now_ms / whoop.hrv_baseline_ms, 0.8, 1.2);
  } else {
    flags.push('missing_hrv');
  }
  
  let r = 1.0;
  if (whoop.rhr_now_bpm && whoop.rhr_baseline_bpm) {
    r = clip(whoop.rhr_baseline_bpm / whoop.rhr_now_bpm, 0.8, 1.2);
  } else {
    flags.push('missing_rhr');
  }
  
  let rho = clip(0.4 * c + 0.3 * s + 0.15 * h + 0.15 * r, 0, 1);
  
  // Optional strain adjustment
  if (whoop.yesterday_strain && whoop.yesterday_strain > 14) {
    rho = Math.max(0, rho - 0.05);
    flags.push('high_strain_yesterday');
  }
  
  // Add descriptive flags
  if (c < 0.6) flags.push('low_recovery');
  if (s < 0.6) flags.push('poor_sleep');
  if (c >= 0.8) flags.push('good_recovery');
  if (s >= 0.8) flags.push('good_sleep');
  
  return { rho, flags };
}

export function calculateOverloadMultiplier(
  rho: number,
  experienceLevel: string
): number {
  let delta = clip(1 + 0.3 * (rho - 0.5), 0.9, 1.1);
  
  // Beginner safety cap
  if (experienceLevel === 'beginner') {
    delta = Math.min(delta, 1.05);
  }
  
  return delta;
}

export function roundToIncrement(
  weight: number,
  increment = 2.5
): number {
  return Math.round(weight / increment) * increment;
}

// Enhanced function to get historical exercise data for the last 2 sessions
export async function getExerciseHistory(
  db: any,
  userId: string,
  exerciseNames: string[],
  excludeSessionId?: number,
  limit = 2
): Promise<Array<{
  exerciseName: string;
  sessions: Array<{
    workoutDate: Date;
    sets: Array<{
      weight: number | null;
      reps: number | null;
      volume: number | null;
    }>;
  }>;
}>> {
  const results = [];
  
  for (const exerciseName of exerciseNames) {
    // Get recent sessions for this exercise
    const sessionData = await db.query.workoutSessions.findMany({
      where: and(
        eq(db.schema.workoutSessions.user_id, userId),
        excludeSessionId ? ne(db.schema.workoutSessions.id, excludeSessionId) : undefined
      ),
      orderBy: [desc(db.schema.workoutSessions.workoutDate)],
      with: {
        exercises: {
          where: eq(db.schema.sessionExercises.exerciseName, exerciseName),
        },
      },
      limit: 20, // Search more sessions to find 2 with this exercise
    });

    // Filter to sessions that actually have this exercise
    const sessionsWithExercise = sessionData
      .filter((session: any) => session.exercises.length > 0)
      .slice(0, limit);

    const sessions = sessionsWithExercise.map((session: any) => ({
      workoutDate: session.workoutDate,
      sets: session.exercises.map((ex: any) => ({
        weight: ex.weight ? parseFloat(ex.weight) : null,
        reps: ex.reps,
        volume: ex.weight && ex.reps ? parseFloat(ex.weight) * ex.reps * (ex.sets || 1) : null,
      })),
    }));

    results.push({
      exerciseName,
      sessions,
    });
  }

  return results;
}

// Calculate progression recommendations based on historical data
export function calculateProgressionSuggestions(
  exerciseHistory: Array<{
    exerciseName: string;
    sessions: Array<{
      workoutDate: Date;
      sets: Array<{
        weight: number | null;
        reps: number | null;
        volume: number | null;
      }>;
    }>;
  }>,
  readiness: number,
  preferredProgression: 'weight' | 'reps' = 'weight'
): Array<{
  exerciseName: string;
  suggestions: Array<{
    type: 'weight' | 'reps';
    current: number;
    suggested: number;
    rationale: string;
  }>;
}> {
  return exerciseHistory.map(exercise => {
    const suggestions: Array<{
      type: 'weight' | 'reps';
      current: number;
      suggested: number;
      rationale: string;
    }> = [];
    
    if (exercise.sessions.length === 0) {
      return {
        exerciseName: exercise.exerciseName,
        suggestions: [{
          type: 'weight' as const,
          current: 0,
          suggested: 20, // Conservative starting weight
          rationale: 'No historical data - starting with conservative weight'
        }]
      };
    }

    // Get most recent session's best performance
    const recentSession = exercise.sessions[0];
    if (!recentSession?.sets.length) {
      return {
        exerciseName: exercise.exerciseName,
        suggestions: []
      };
    }

    const bestRecentSet = recentSession.sets.reduce((best, set) => {
      const setVolume = set.volume || 0;
      const bestVolume = best.volume || 0;
      return setVolume > bestVolume ? set : best;
    });

    if (bestRecentSet.weight && bestRecentSet.reps) {
      const baseWeight = bestRecentSet.weight;
      const baseReps = bestRecentSet.reps;
      
      // Apply readiness-based progression
      const progressionFactor = readiness > 0.7 ? 1.025 : readiness > 0.5 ? 1.0 : 0.975;
      
      if (preferredProgression === 'weight') {
        suggestions.push({
          type: 'weight',
          current: baseWeight,
          suggested: roundToIncrement(baseWeight * progressionFactor),
          rationale: `Based on ${readiness > 0.7 ? 'good' : readiness > 0.5 ? 'moderate' : 'low'} readiness, suggesting ${readiness > 0.7 ? 'progressive overload' : readiness > 0.5 ? 'maintenance' : 'deload'}`
        });
      } else {
        suggestions.push({
          type: 'reps',
          current: baseReps,
          suggested: Math.round(baseReps * progressionFactor),
          rationale: `Based on ${readiness > 0.7 ? 'good' : readiness > 0.5 ? 'moderate' : 'low'} readiness, suggesting ${readiness > 0.7 ? 'increased' : readiness > 0.5 ? 'same' : 'reduced'} reps`
        });
      }
    }

    return {
      exerciseName: exercise.exerciseName,
      suggestions
    };
  });
}