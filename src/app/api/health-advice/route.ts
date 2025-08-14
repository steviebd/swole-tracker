import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { env } from '~/env';
import { healthAdviceRequestSchema } from '~/server/api/schemas/health-advice';
import { enhancedHealthAdviceRequestSchema } from '~/server/api/schemas/wellness';
import { 
  calculateReadiness, 
  calculateOverloadMultiplier,
  getExerciseHistory,
  roundToIncrement,
  calculateProgressionSuggestions
} from '~/lib/health-calculations';
import { ENHANCED_HEALTH_ADVICE_PROMPT } from '~/lib/ai-prompts/enhanced-health-advice';
import { db } from '~/server/db';
import { workoutSessions, sessionExercises, userIntegrations, exerciseLinks, whoopRecovery, whoopSleep, userPreferences } from '~/server/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { createServerSupabaseClient } from '~/lib/supabase-server';
import { logger } from '~/lib/logger';

// Removed edge runtime since we need database access for enhanced features

interface WorkoutSet {
  weight: number | null;
  reps: number | null;
  volume: number | null;
}

interface ExerciseSession {
  workoutDate: Date;
  sets: WorkoutSet[];
  templateId?: string | number;
  sessionId?: string | number;
}

interface ExerciseHistory {
  exerciseName: string;
  sessions: ExerciseSession[];
}

function getApiKey(): string {
  const key = env.AI_GATEWAY_API_KEY || env.VERCEL_AI_GATEWAY_API_KEY;
  if (!key) {
    throw new Error('Missing AI gateway API key');
  }
  return key;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Try enhanced schema first, fallback to basic schema
    let validatedInput: any;
    let hasManualWellness = false;
    
    try {
      validatedInput = enhancedHealthAdviceRequestSchema.parse(body);
      hasManualWellness = !!validatedInput.manual_wellness;
    } catch {
      validatedInput = healthAdviceRequestSchema.parse(body);
    }
    
    // Get authenticated user for WHOOP data fetching
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Enhanced: Fetch dynamic template exercises from session ID
    const sessionId = parseInt(validatedInput.session_id);
    let templateExercises: Array<{ exerciseName: string }> = [];
    let currentSession: any = null;
    
    // PHASE 0: Fetch WHOOP data from database (stored via webhooks) instead of real-time API calls
    // Ensure we always have a valid WHOOP data object with defaults
    const defaultWhoopData = {
      recovery_score: 50, // neutral recovery
      sleep_performance: 75, // reasonable sleep
      hrv_now_ms: 40, // average HRV
      hrv_baseline_ms: 40,
      rhr_now_bpm: 60, // average RHR
      rhr_baseline_bpm: 60,
      yesterday_strain: 10, // moderate strain
    };
    let realWhoopData = validatedInput.whoop || defaultWhoopData;
    try {
      // Check if user has active WHOOP integration
      const [whoopIntegration] = await db
        .select({
          isActive: userIntegrations.isActive,
        })
        .from(userIntegrations)
        .where(
          and(
            eq(userIntegrations.user_id, user.id),
            eq(userIntegrations.provider, "whoop"),
            eq(userIntegrations.isActive, true)
          ),
        );
      
      if (whoopIntegration?.isActive) {
        // Get date range for historical lookup (2 days as specified in requirements)
        const todayMinus2Days = new Date();
        todayMinus2Days.setDate(todayMinus2Days.getDate() - 2);
        const dateString = todayMinus2Days.toISOString().split('T')[0]!; // Convert to YYYY-MM-DD format
        
        // Fetch latest recovery data from database (stored via webhooks)
        const latestRecovery = await db.query.whoopRecovery.findFirst({
          where: and(
            eq(whoopRecovery.user_id, user.id),
            gte(whoopRecovery.date, dateString) // Look back 2 days for recent data
          ),
          orderBy: desc(whoopRecovery.date)
        });
        
        // Fetch latest sleep data from database (stored via webhooks)
        const latestSleep = await db.query.whoopSleep.findFirst({
          where: and(
            eq(whoopSleep.user_id, user.id),
            gte(whoopSleep.start, todayMinus2Days) // Sleep uses timestamp, can use Date object
          ),
          orderBy: desc(whoopSleep.start)
        });
        
        if (latestRecovery || latestSleep) {
          // Use database-stored WHOOP data instead of real-time API calls, with fallbacks to defaults
          realWhoopData = {
            recovery_score: latestRecovery?.recovery_score || realWhoopData.recovery_score || defaultWhoopData.recovery_score,
            sleep_performance: latestSleep?.sleep_performance_percentage || realWhoopData.sleep_performance || defaultWhoopData.sleep_performance,
            hrv_now_ms: latestRecovery?.hrv_rmssd_milli ? parseFloat(latestRecovery.hrv_rmssd_milli) : (realWhoopData.hrv_now_ms || defaultWhoopData.hrv_now_ms),
            hrv_baseline_ms: latestRecovery?.hrv_rmssd_baseline ? parseFloat(latestRecovery.hrv_rmssd_baseline) : (realWhoopData.hrv_baseline_ms || defaultWhoopData.hrv_baseline_ms),
            rhr_now_bpm: latestRecovery?.resting_heart_rate || realWhoopData.rhr_now_bpm || defaultWhoopData.rhr_now_bpm,
            rhr_baseline_bpm: latestRecovery?.resting_heart_rate_baseline || realWhoopData.rhr_baseline_bpm || defaultWhoopData.rhr_baseline_bpm,
            yesterday_strain: realWhoopData.yesterday_strain || defaultWhoopData.yesterday_strain, // Could be fetched from cycles table if needed
          };
          
          logger.info('using_stored_whoop_data', {
            userId: user?.id,
            recovery_score: realWhoopData.recovery_score,
            sleep_performance: realWhoopData.sleep_performance,
            data_sources: [latestRecovery ? 'recovery' : null, latestSleep ? 'sleep' : null].filter(Boolean)
          });
        } else {
          logger.warn('no_recent_whoop_data', { userId: user?.id });
        }
      }
    } catch (error) {
      logger.error('Failed to fetch WHOOP data from database, using fallback', error, { userId: user?.id });
      // Continue with fallback data
    }
    
    try {
      // Get the workout session and its template
      currentSession = await db.query.workoutSessions.findFirst({
        where: eq(workoutSessions.id, sessionId),
        with: {
          template: {
            with: {
              exercises: {
                orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
              },
            },
          },
          exercises: true, // Get existing session exercises for set count detection
        },
      });

      if (currentSession?.template?.exercises) {
        templateExercises = currentSession.template.exercises;
      }
    } catch (error) {
      console.error('Error fetching session template:', error);
      // Fall back to input exercises if session fetch fails
    }

    // Server-side safety checks using real WHOOP data or manual wellness
    let rho: number;
    let flags: string[];
    
    if (hasManualWellness && validatedInput.manual_wellness) {
      // Use manual wellness for readiness calculation
      const manualWellness = validatedInput.manual_wellness;
      const energyComponent = manualWellness.energy_level / 10; // Convert 1-10 to 0-1
      const sleepComponent = manualWellness.sleep_quality / 10; // Convert 1-10 to 0-1
      
      // Simplified readiness calculation based on manual wellness (more weight on user input)
      rho = Math.max(0, Math.min(1, 0.6 * energyComponent + 0.4 * sleepComponent));
      flags = [];
      
      // Add flags based on manual wellness thresholds
      if (manualWellness.energy_level <= 3) flags.push('low_energy');
      if (manualWellness.sleep_quality <= 3) flags.push('poor_sleep');
      if (manualWellness.notes?.toLowerCase().includes('stress')) flags.push('stress_noted');
      if (manualWellness.notes?.toLowerCase().includes('sick')) flags.push('illness_noted');
      
      flags.push('manual_wellness_input');
    } else {
      // Use standard WHOOP-based calculation
      const readinessData = calculateReadiness(realWhoopData);
      rho = readinessData.rho;
      flags = readinessData.flags;
    }
    
    const delta = calculateOverloadMultiplier(rho, validatedInput.user_profile.experience_level);
    
    // Block unsafe advice
    if (rho < 0.35) {
      return NextResponse.json({
        session_id: validatedInput.session_id,
        readiness: { rho, overload_multiplier: 1.0, flags: [...flags, 'unsafe_readiness'] },
        per_exercise: [],
        session_predicted_chance: 0.3,
        summary: 'Your recovery metrics suggest taking it easy today. Stick to your planned loads.',
        warnings: ['Low readiness detected - no overload recommended'],
      });
    }

    // Fetch user preferences for progression calculations
    let userProgressionPrefs = null;
    try {
      userProgressionPrefs = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.user_id, user.id)
      });
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }

    // Enhanced: Get historical data for template exercises
    const exerciseNames = templateExercises.map(ex => ex.exerciseName);
    let exerciseHistory: ExerciseHistory[] = [];
    
    if (exerciseNames.length > 0 && currentSession) {
      try {
        exerciseHistory = await getExerciseHistory(
          { query: db.query, schema: { workoutSessions, sessionExercises } },
          currentSession.user_id,
          exerciseNames,
          sessionId
        );
      } catch (error) {
        console.error('Error fetching exercise history:', error);
      }
    }

    // Apply enhanced progression calculations with user preferences
    let progressionSuggestions: Array<{
      exerciseName: string;
      suggestions: Array<{
        type: 'weight' | 'reps' | 'volume';
        current: number;
        suggested: number;
        rationale: string;
        plateauDetected?: boolean;
      }>;
      plateauDetected: boolean;
    }> = [];
    
    if (exerciseHistory.length > 0) {
      try {
        progressionSuggestions = calculateProgressionSuggestions(
          exerciseHistory,
          rho,
          (userProgressionPrefs?.progression_type as 'linear' | 'percentage' | 'adaptive') || 'adaptive',
          {
            linearIncrement: userProgressionPrefs?.linear_progression_kg ? parseFloat(userProgressionPrefs.linear_progression_kg) : 2.5,
            percentageIncrement: userProgressionPrefs?.percentage_progression ? parseFloat(userProgressionPrefs.percentage_progression) : 2.5,
          }
        );
      } catch (error) {
        console.error('Error calculating progression suggestions:', error);
      }
    }

    const modelId = env.AI_GATEWAY_MODEL_HEALTH || 'xai/grok-3-mini';
    const systemPrompt = ENHANCED_HEALTH_ADVICE_PROMPT;
    
    // Check if AI Gateway is configured
    let hasKey = false;
    try {
      getApiKey();
      hasKey = true;
    } catch {
      hasKey = false;
    }

    if (!hasKey || templateExercises.length === 0) {
      // Enhanced fallback: Use template exercises with historical data
      const exercisesToUse = templateExercises.length > 0 
        ? templateExercises 
        : validatedInput.workout_plan.exercises;

      const perExerciseAdvice = exercisesToUse.map((exercise: { exerciseName?: string; exercise_id?: string; id?: string }) => {
        // Determine set count: use existing session data or default to 3
        const existingExerciseSets = currentSession?.exercises?.filter(
          (ex: any) => ex.exerciseName === exercise.exerciseName || ex.exerciseName === exercise.exercise_id
        ) || [];
        
        const setCount = existingExerciseSets.length > 0 ? existingExerciseSets.length : 3;
        
        // Find historical data and progression suggestions for this exercise
        const exerciseHist = exerciseHistory.find(hist => 
          hist.exerciseName === exercise.exerciseName || hist.exerciseName === exercise.exercise_id
        );
        
        const progressionSuggestion = progressionSuggestions.find(prog =>
          prog.exerciseName === exercise.exerciseName || prog.exerciseName === exercise.exercise_id
        );

        let baseWeight = 20; // Default starting weight
        let baseReps = 8; // Default reps
        let suggestedWeight = baseWeight;
        let suggestedReps = baseReps;
        let plateauDetected = false;
        
        if (exerciseHist && exerciseHist.sessions.length > 0) {
          const recentSession = exerciseHist.sessions[0];
          if (recentSession?.sets && recentSession.sets.length > 0) {
            const bestSet = recentSession.sets.reduce((best: WorkoutSet, set: WorkoutSet) => {
              const setBest = best.weight || 0;
              const setWeight = set.weight || 0;
              return setWeight > setBest ? set : best;
            });
            baseWeight = bestSet.weight || baseWeight;
            baseReps = bestSet.reps || baseReps;
          }
        }

        // Use enhanced progression suggestions if available
        if (progressionSuggestion && progressionSuggestion.suggestions.length > 0) {
          const weightSuggestion = progressionSuggestion.suggestions.find(s => s.type === 'weight');
          const repsSuggestion = progressionSuggestion.suggestions.find(s => s.type === 'reps');
          
          suggestedWeight = weightSuggestion?.suggested || baseWeight;
          suggestedReps = repsSuggestion?.suggested || baseReps;
          plateauDetected = progressionSuggestion.plateauDetected;
          
          const primarySuggestion = progressionSuggestion.suggestions[0];
          if (primarySuggestion) {
            // Use primary suggestion for rationale
          }
        } else {
          // Fallback to simple delta calculation
          suggestedWeight = roundToIncrement(baseWeight * delta);
          suggestedReps = Math.round(baseReps * delta);
        }

        // Calculate rest recommendations based on readiness and exercise type
        const restSeconds = rho > 0.7 ? 120 : rho > 0.5 ? 150 : 180; // 2-3 minutes based on readiness
        
        const sets = Array.from({ length: setCount }, (_, index) => {
          // Apply progressive fatigue adjustment for later sets
          const fatigueMultiplier = index === 0 ? 1.0 : 1.0 - (index * 0.05); // 5% reduction per set
          const setWeight = roundToIncrement(suggestedWeight * fatigueMultiplier);
          const setReps = Math.max(1, Math.round(suggestedReps * fatigueMultiplier));
          const setRestSeconds = restSeconds + (index * 15); // Increase rest by 15s per set
          
          // Enhanced rationale with progression type and plateau information
          let rationale = `Set ${index + 1}: `;
          
          if (progressionSuggestion && progressionSuggestion.suggestions.length > 0) {
            const primarySuggestion = progressionSuggestion.suggestions[0];
            if (primarySuggestion) {
              rationale += primarySuggestion.rationale;
            }
            if (plateauDetected) {
              rationale += ` [Plateau Alert]`;
            }
            if (index > 0) {
              rationale += ` with ${Math.round((1-fatigueMultiplier)*100)}% fatigue adjustment`;
            }
            rationale += `. Rest ${Math.round(setRestSeconds/60)} minutes.`;
          } else if (exerciseHist?.sessions && exerciseHist.sessions.length > 0) {
            rationale += `Based on last session performance (${baseWeight}kg x ${baseReps}) with ${rho > 0.7 ? 'good' : rho > 0.5 ? 'moderate' : 'low'} readiness`;
            if (index > 0) {
              rationale += ` and ${Math.round((1-fatigueMultiplier)*100)}% fatigue adjustment`;
            }
            rationale += `. Rest ${Math.round(setRestSeconds/60)} minutes.`;
          } else {
            rationale += `Conservative estimate with readiness adjustment`;
            if (index > 0) {
              rationale += ` and fatigue consideration`;
            }
            rationale += `. Rest ${Math.round(setRestSeconds/60)} minutes.`;
          }
          
          return {
            set_id: `${exercise.id || exercise.exercise_id}_${index + 1}`,
            suggested_weight_kg: setWeight,
            suggested_reps: setReps,
            suggested_rest_seconds: setRestSeconds,
            rationale
          };
        });

        const bestVolume = exerciseHist?.sessions[0]?.sets.reduce((total: number, set: WorkoutSet) => 
          total + (set.volume || 0), 0) || 0;

        return {
          exercise_id: exercise.exerciseName || exercise.exercise_id,
          name: exercise.exerciseName || exercise.exercise_id, // Include display name
          predicted_chance_to_beat_best: rho > 0.7 ? 0.8 : rho > 0.5 ? 0.6 : 0.4,
          planned_volume_kg: null,
          best_volume_kg: bestVolume > 0 ? bestVolume : null,
          sets,
        };
      });

      // Calculate session duration estimate
      const totalSets = perExerciseAdvice.reduce((sum: number, ex: { sets: { length: number }[] }) => sum + ex.sets.length, 0);
      const avgRestTime = rho > 0.7 ? 120 : rho > 0.5 ? 150 : 180;
      const estimatedDuration = Math.round((totalSets * avgRestTime + totalSets * 60) / 60); // Rest + exercise time
      
      // Check for plateau warnings
      const plateauCount = progressionSuggestions.filter(p => p.plateauDetected).length;
      const plateauWarnings = plateauCount > 0 ? [`Plateau detected in ${plateauCount} exercise${plateauCount > 1 ? 's' : ''} - consider deload or variation`] : [];
      
      // Build progression type summary
      const progressionType = (userProgressionPrefs?.progression_type as 'linear' | 'percentage' | 'adaptive') || 'adaptive';
      let progressionSummary = '';
      switch (progressionType) {
        case 'linear':
          progressionSummary = `Using linear progression (+${userProgressionPrefs?.linear_progression_kg || '2.5'}kg per session)`;
          break;
        case 'percentage':
          progressionSummary = `Using percentage progression (+${userProgressionPrefs?.percentage_progression || '2.5'}% per session)`;
          break;
        case 'adaptive':
        default:
          progressionSummary = 'Using adaptive progression based on readiness and performance';
          break;
      }
      
      return NextResponse.json({
        session_id: validatedInput.session_id,
        readiness: { rho, overload_multiplier: delta, flags },
        per_exercise: perExerciseAdvice,
        session_predicted_chance: rho > 0.7 ? 0.75 : rho > 0.5 ? 0.6 : 0.45,
        summary: `Enhanced load recommendations based on ${hasManualWellness ? 'your wellness input' : 'readiness'} (${Math.round(rho * 100)}%) and ${exerciseHistory.length > 0 ? 'historical performance data' : 'conservative estimates'}. ${progressionSummary}. ${hasManualWellness && validatedInput.manual_wellness?.notes ? `Note: ${validatedInput.manual_wellness.notes.slice(0, 100)}${validatedInput.manual_wellness.notes.length > 100 ? '...' : ''}` : ''} Allow ${estimatedDuration} minutes for this session.`,
        warnings: [...(hasKey ? [] : ['AI Gateway not configured - using enhanced fallback calculations']), ...(hasManualWellness ? ['Recommendations based on manual wellness input'] : []), ...plateauWarnings],
        recovery_recommendations: {
          recommended_rest_between_sets: `${Math.round(avgRestTime/60)} minutes for strength exercises`,
          recommended_rest_between_sessions: rho > 0.7 ? '24-48 hours' : rho > 0.5 ? '48-72 hours' : '72+ hours for full recovery',
          session_duration_estimate: `${estimatedDuration} minutes`,
          additional_recovery_notes: [
            rho < 0.5 ? 'Consider active recovery or light cardio instead' : 'Monitor fatigue levels throughout session',
            'Prioritize sleep and nutrition for optimal recovery',
            exerciseHistory.length > 0 ? 'Track progression over multiple sessions' : 'Focus on movement quality'
          ],
        },
      });
    }

    // Enhanced AI prompt with dynamic template data, real WHOOP data, manual wellness, and full historical context
    const enhancedInput = {
      ...validatedInput,
      whoop: realWhoopData, // Use real WHOOP data instead of mock
      ...(hasManualWellness && { manual_wellness: validatedInput.manual_wellness }), // Include manual wellness if present
      workout_plan: {
        exercises: templateExercises.map((ex: any) => {
          const existingExerciseSets = currentSession?.exercises?.filter(
            (sessionEx: any) => sessionEx.exerciseName === ex.exerciseName
          ) || [];
          
          const setCount = existingExerciseSets.length > 0 ? existingExerciseSets.length : 3;
          
          // Get historical data for this specific exercise
          const exerciseHist = exerciseHistory.find(hist => 
            hist.exerciseName === ex.exerciseName
          );

          // Use actual historical data for targets if available
          let targetWeight = null;
          let targetReps = null;
          
          if (exerciseHist?.sessions && exerciseHist.sessions.length > 0) {
            const lastSession = exerciseHist.sessions[0];
            if (lastSession?.sets && lastSession.sets.length > 0) {
              const bestSet = lastSession.sets.reduce((best: WorkoutSet, set: WorkoutSet) => 
                (set.weight || 0) > (best.weight || 0) ? set : best
              );
              targetWeight = bestSet.weight;
              targetReps = bestSet.reps;
            }
          }
          
          return {
            exercise_id: ex.exerciseName.toLowerCase().replace(/\s+/g, '_'),
            name: ex.exerciseName,
            tags: ['strength'], // Default tag, could be enhanced later
            sets: Array.from({ length: setCount }, (_, index) => ({
              set_id: `${ex.id}_${index + 1}`, // Use consistent template exercise ID format
              target_reps: targetReps || 8,
              target_weight_kg: targetWeight || 20,
            })),
            // Include raw historical session data for AI analysis
            historical_sessions: exerciseHist?.sessions.map((session: any) => ({
              workout_date: session.workoutDate,
              sets: session.sets.map((set: any) => ({
                weight_kg: set.weight,
                reps: set.reps,
                volume_kg: set.volume,
                estimated_rpe: null, // Could be enhanced if available
                rest_seconds: null, // Could be enhanced if available
              }))
            })) || []
          };
        }),
      },
      // Include detailed exercise linking information with optimized batch queries
      exercise_linking: await (async () => {
        try {
          // templateExerciseIds not used in optimized query - removed for cleaner code
          
          // Batch query: Get all exercise links for template exercises in one query
          const exerciseLinksForTemplate = await db.query.exerciseLinks.findMany({
            where: and(
              eq(exerciseLinks.user_id, user.id)
            ),
            with: {
              templateExercise: {
                with: {
                  template: true
                }
              }
            }
          });
          
          // Create lookup maps for efficient processing
          const linksByTemplateId = new Map<number, (typeof exerciseLinksForTemplate)[0]>();
          const linksByMasterId = new Map<number, (typeof exerciseLinksForTemplate)[0][]>();
          
          exerciseLinksForTemplate.forEach(link => {
            linksByTemplateId.set(link.templateExerciseId, link);
            
            const masterId = link.masterExerciseId;
            if (!linksByMasterId.has(masterId)) {
              linksByMasterId.set(masterId, []);
            }
            linksByMasterId.get(masterId)!.push(link);
          });
          
          // Process each template exercise using the lookup maps
          return templateExercises.map((ex: any) => {
            const exerciseLink = linksByTemplateId.get(ex.id);
            
            if (exerciseLink) {
              const linkedExercises = linksByMasterId.get(exerciseLink.masterExerciseId) || [];
              
              return {
                template_exercise_id: ex.id,
                exercise_name: ex.exerciseName,
                master_exercise_id: exerciseLink.masterExerciseId,
                linked_across_templates: linkedExercises.length > 1,
                linked_templates: linkedExercises.map(link => ({
                  template_id: link.templateExercise?.template?.id,
                  template_name: link.templateExercise?.template?.name,
                  exercise_id: link.templateExerciseId
                })),
                total_linked_count: linkedExercises.length
              };
            }
            
            return {
              template_exercise_id: ex.id,
              exercise_name: ex.exerciseName,
              master_exercise_id: null,
              linked_across_templates: false,
              linked_templates: [],
              total_linked_count: 0
            };
          });
        } catch (error) {
          logger.error('Error fetching exercise linking data', error, { userId: user?.id });
          // Return fallback data for all exercises
          return templateExercises.map((ex: any) => ({
            template_exercise_id: ex.id,
            exercise_name: ex.exerciseName,
            master_exercise_id: null,
            linked_across_templates: false,
            linked_templates: [],
            total_linked_count: 0
          }));
        }
      })(),
      // Full historical context for AI analysis including cross-template data
      raw_exercise_history: exerciseHistory.map(hist => ({
        ...hist,
        // Add cross-template tracking info
        sessions: hist.sessions.map((session: ExerciseSession) => ({
          ...session,
          template_info: {
            template_id: session.templateId,
            session_id: session.sessionId
          }
        }))
      })),
    };

    // Dynamically import AI SDK (similar to jokes router pattern)
    const { generateText } = await import("ai");
    
    const result = await generateText({
      model: modelId,
      system: systemPrompt,
      prompt: JSON.stringify(enhancedInput),
    });

    const aiResponse = JSON.parse(result.text);
    
    // Server-side validation of AI response
    if (!aiResponse.session_id || !aiResponse.readiness) {
      throw new Error('Invalid AI response structure');
    }
    
    return NextResponse.json(aiResponse);
    
  } catch (error: any) {
    logger.error('Health advice API error', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate health advice', detail: error.message },
      { status: 500 }
    );
  }
}