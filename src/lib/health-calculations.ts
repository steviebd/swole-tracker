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

export async function getExerciseHistory(
  db: any,
  userId: string,
  exerciseNames: string[],
  excludeSessionId?: number,
  limit = 2
): Promise<Array<{
  exerciseName: string;
  sessions: Array<{
    sessionId: number;
    templateId?: number;
    workoutDate: Date;
    sets: Array<{
      weight: number | null;
      reps: number | null;
      volume: number | null;
    }>;
  }>;
}>> {
  if (exerciseNames.length === 0) {
    return [];
  }

  const recentSessionsWithExercises = await db.query.workoutSessions.findMany({
    where: and(
      eq(db.schema.workoutSessions.user_id, userId),
      excludeSessionId ? ne(db.schema.workoutSessions.id, excludeSessionId) : undefined
    ),
    orderBy: [desc(db.schema.workoutSessions.workoutDate)],
    with: {
      exercises: {
        where: (exercises: any, { inArray }: any) => inArray(exercises.exerciseName, exerciseNames),
        orderBy: (exercises: any, { asc }: any) => [asc(exercises.setOrder)],
      },
      template: {
        columns: {
          id: true,
        },
      },
    },
    limit: 50,
  });

  const exerciseSessionMap = new Map<string, Array<any>>();

  for (const session of recentSessionsWithExercises) {
    for (const exercise of session.exercises) {
      if (!exerciseSessionMap.has(exercise.exerciseName)) {
        exerciseSessionMap.set(exercise.exerciseName, []);
      }

      const sessionsForExercise = exerciseSessionMap.get(exercise.exerciseName)!;
      
      let sessionGroup = sessionsForExercise.find(s => s.sessionId === session.id);
      if (!sessionGroup) {
        if (sessionsForExercise.length < limit) {
          sessionGroup = {
            sessionId: session.id,
            templateId: session.template?.id,
            workoutDate: session.workoutDate,
            sets: [],
          };
          sessionsForExercise.push(sessionGroup);
        } else {
          continue;
        }
      }

      sessionGroup.sets.push({
        weight: exercise.weight ? parseFloat(exercise.weight) : null,
        reps: exercise.reps,
        volume: exercise.weight && exercise.reps ? parseFloat(exercise.weight) * exercise.reps : null,
      });
    }
  }

  return Array.from(exerciseSessionMap.entries()).map(([exerciseName, sessions]) => ({
    exerciseName,
    sessions,
  }));
}

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
  progressionType: 'linear' | 'percentage' | 'adaptive' = 'adaptive',
  userPreferences: {
    linearIncrement?: number;
    percentageIncrement?: number;
    progressionModel?: 'reps' | 'weight';
  } = {}
): Array<{
  exerciseName: string;
  suggestions: Array<{
    type: 'weight' | 'reps' | 'volume';
    current: number;
    suggested: number;
    rationale: string;
    plateauDetected?: boolean;
  }>;
  plateauDetected: boolean;
}> {
  return exerciseHistory.map(exercise => {
    const suggestions: Array<{
      type: 'weight' | 'reps' | 'volume';
      current: number;
      suggested: number;
      rationale: string;
      plateauDetected?: boolean;
    }> = [];
    
    let plateauDetected = false;
    
    if (exercise.sessions.length === 0) {
      return {
        exerciseName: exercise.exerciseName,
        suggestions: [{
          type: 'weight' as const,
          current: 0,
          suggested: 20, // Conservative starting weight
          rationale: 'No historical data - starting with conservative weight'
        }],
        plateauDetected: false
      };
    }

    const recentSession = exercise.sessions[0];
    if (!recentSession?.sets.length) {
      return {
        exerciseName: exercise.exerciseName,
        suggestions: [],
        plateauDetected: false
      };
    }

    const bestRecentSet = recentSession.sets.reduce((best, set) => {
      const setVolume = set.volume || 0;
      const bestVolume = best.volume || 0;
      return setVolume > bestVolume ? set : best;
    });

    if (exercise.sessions.length >= 2) {
      const previousSession = exercise.sessions[1];
      if (previousSession?.sets.length) {
        const bestPreviousSet = previousSession.sets.reduce((best, set) => {
          const setVolume = set.volume || 0;
          const bestVolume = best.volume || 0;
          return setVolume > bestVolume ? set : best;
        });
        
        const currentVolume = bestRecentSet.volume || 0;
        const previousVolume = bestPreviousSet.volume || 0;
        const volumeChange = currentVolume - previousVolume;
        
        if (volumeChange <= previousVolume * 0.05) {
          plateauDetected = true;
        }
      }
    }

    if (bestRecentSet.weight && bestRecentSet.reps) {
      const baseWeight = bestRecentSet.weight;
      const baseReps = bestRecentSet.reps;
      let progressionFactor = 1.0;
      let rationale = '';
      
      switch (progressionType) {
        case 'linear':
          const linearIncrement = userPreferences.linearIncrement || 2.5;
          suggestions.push({
            type: 'weight',
            current: baseWeight,
            suggested: baseWeight + linearIncrement,
            rationale: `Linear progression: +${linearIncrement}kg from last session${plateauDetected ? ' (plateau detected - consider deload)' : ''}`,
            plateauDetected
          });
          break;
          
        case 'percentage':
          const percentageIncrement = (userPreferences.percentageIncrement || 2.5) / 100;
          progressionFactor = 1 + percentageIncrement;
          suggestions.push({
            type: 'weight',
            current: baseWeight,
            suggested: roundToIncrement(baseWeight * progressionFactor),
            rationale: `Percentage progression: +${(percentageIncrement * 100).toFixed(1)}% from last session${plateauDetected ? ' (plateau detected - consider deload)' : ''}`,
            plateauDetected
          });
          break;
          
        case 'adaptive':
        default:
          if (plateauDetected && readiness < 0.7) {
            progressionFactor = 0.9;
            rationale = 'Deload recommended: plateau detected with poor readiness';
          } else if (plateauDetected) {
            progressionFactor = 1.025;
            rationale = 'Light progression despite plateau (good readiness allows push)';
          } else {
            progressionFactor = readiness > 0.7 ? 1.05 : readiness > 0.5 ? 1.0 : 0.975;
            rationale = `Adaptive progression based on ${readiness > 0.7 ? 'excellent' : readiness > 0.5 ? 'good' : 'low'} readiness`;
          }

          const progressionModel = userPreferences.progressionModel || (progressionFactor === 1.0 ? 'reps' : 'weight');

          if (progressionModel === 'weight') {
            suggestions.push({
              type: 'weight',
              current: baseWeight,
              suggested: roundToIncrement(baseWeight * progressionFactor),
              rationale,
              plateauDetected
            });
          } else {
            suggestions.push({
              type: 'reps',
              current: baseReps,
              suggested: baseReps + 1,
              rationale: 'Volume progression: add 1 rep while maintaining weight',
              plateauDetected
            });
          }
          break;
      }
    }

    return {
      exerciseName: exercise.exerciseName,
      suggestions,
      plateauDetected
    };
  });
}