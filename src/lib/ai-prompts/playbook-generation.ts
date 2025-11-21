import type { PlaybookGenerationContext } from "~/server/api/types/playbook";

const OUTPUT_SCHEMA_SNIPPET = `{
  "weeks": Array<{
    "weekNumber": number (1-6),
    "weekType": "training" | "deload" | "pr_attempt",
    "sessions": Array<{
      "sessionNumber": number (1-7),
      "dayOfWeek": string (optional, e.g., "Monday"),
      "exercises": Array<{
        "exerciseName": string,
        "warmupSets": Array<{
          "weight": number (in kg),
          "reps": number,
          "percentageOfTop": number (0-100, optional)
        }> (optional, 2-4 warm-up sets before working sets),
        "sets": number (working sets only),
        "reps": number (working reps),
        "weight": number | null (in kg, working weight),
        "restSeconds": number (optional),
        "rpe": number (1-10, optional),
        "notes": string (optional coaching cues)
      }>,
      "totalVolumeTarget": number (optional, sum of sets × reps × weight),
      "estimatedDurationMinutes": number (optional),
      "notes": string (optional session-level notes)
    }>,
    "volumeTarget": number (optional, weekly volume target),
    "coachingCues": string (motivational weekly guidance),
    "focusAreas": Array<string> (key focus for the week),
    "prAttemptExercises": Array<{
      "exerciseName": string,
      "targetWeight": number (in kg),
      "confidence": number (0-1, probability of success)
    }> (only for pr_attempt weeks)
  }>,
  "periodizationStrategy": string (explanation of chosen periodization model),
  "volumeProgressionGraph": Array<{
    "weekNumber": number,
    "totalVolume": number,
    "volumeChange": number (percentage change from previous week)
  }>,
  "metadata": {
    "estimatedDifficulty": "beginner" | "intermediate" | "advanced",
    "deloadWeeks": Array<number>,
    "prAttemptWeeks": Array<number>,
    "progressionRate": string (e.g., "2.5kg per week", "2.5% per week")
  }
}`;

export const PLAYBOOK_GENERATION_SYSTEM_PROMPT = `You are an expert strength and conditioning coach with deep knowledge of periodization models, progressive overload principles, and evidence-based training programming.

Your task is to generate comprehensive 4-6 week training programs that are:
1. **Safe and evidence-based**: Follow scientifically-backed progression rates (2.5-5% weekly increases for strength, appropriate volume adjustments for hypertrophy)
2. **Personalized**: Adapted to user's training history, current 1RMs, equipment constraints, and goals
3. **Periodized**: Choose appropriate periodization model (linear, DUP, block) based on user history and goals
4. **Progressive**: Systematically increase training stimulus while managing fatigue
5. **Structured**: Include deload weeks (typically week 4 for 6-week cycles) and PR attempt weeks

PERIODIZATION MODELS TO CONSIDER:
- **Linear Periodization**: Best for beginners, gradual increase in intensity with volume decrease
- **Daily Undulating Periodization (DUP)**: Vary intensity/volume session-to-session for intermediate lifters
- **Block Periodization**: Focus on specific adaptations per block (accumulation → intensification → realization)
- **Conjugate Method**: For advanced lifters, rotating exercises and training methods

PROGRESSION GUIDELINES:
- Strength focus: 2.5-5% weekly load increases, lower reps (1-6), higher intensity
- Hypertrophy focus: Volume progression, moderate reps (6-12), moderate intensity
- Powerlifting/Peaking: Build to singles/triples at high intensity in final weeks
- Include deload at 50-70% volume typically every 4 weeks
- PR attempts should have realistic confidence levels based on training trajectory

WARM-UP PROTOCOL:
- Generate 2-4 warm-up sets before working sets for all main compound exercises
- Progress from 40-50% → 80-90% of working weight
- Use user's historical warm-up pattern when available (provided in context below)
- Reduce reps as weight increases (e.g., 10 reps @ 40%, 6 reps @ 60%, 3 reps @ 80%)
- Warm-ups should prepare muscles without causing fatigue
- For isolation exercises or accessories, warm-ups are optional
- Include warm-ups in totalVolumeTarget calculations separately from working volume

Always respond with STRICT JSON matching the output schema.
No prose outside JSON. Provide clear coaching cues and rationale for programming decisions.`;

export function buildPlaybookGenerationPrompt(context: PlaybookGenerationContext) {
  const {
    userId,
    targetType,
    targetIds,
    goalText,
    goalPreset,
    duration,
    recentSessions,
    currentOneRmEstimates,
    preferences,
    volumeTrends,
    availableEquipment,
  } = context;

  // Summarize recent training history
  const sessionSummary = recentSessions.length > 0
    ? `User has completed ${recentSessions.length} sessions in recent history. Exercise frequency and volume trends are provided.`
    : "User is new to structured training. Recommend conservative starting weights based on 1RM estimates or general beginner programs (Starting Strength, 5/3/1 baseline).";

  // Summarize 1RM estimates
  const oneRmSummary = Object.keys(currentOneRmEstimates).length > 0
    ? `Current estimated 1RMs (kg): ${JSON.stringify(currentOneRmEstimates, null, 2)}`
    : "No 1RM data available. Use conservative estimates or recommend user input.";

  // Summarize volume trends
  const volumeTrendsSummary = volumeTrends.length > 0
    ? `Volume progression data shows: ${volumeTrends.map((trend) => `${trend.exerciseName}: ${trend.trendSlope > 0 ? "increasing" : trend.trendSlope < 0 ? "decreasing" : "stable"} trend`).join(", ")}`
    : "No volume trend data available.";

  // Summarize warmup patterns (if provided in context)
  const warmupPatternsSummary = context.warmupPatterns && context.warmupPatterns.length > 0
    ? `User's historical warm-up patterns: ${context.warmupPatterns.map((pattern) => `${pattern.exerciseName}: ${pattern.pattern.map((s: {weight: number, reps: number}) => `${s.weight}kg×${s.reps}`).join(" → ")} (${pattern.confidence} confidence, ${pattern.sessionCount} sessions)`).join(", ")}`
    : "No warm-up pattern history available. Use standard progressive warm-up protocol (40% → 60% → 80% of working weight).";

  const contextData = {
    userId,
    targetType,
    targetIds,
    goalText,
    goalPreset,
    duration,
    trainingHistory: {
      summary: sessionSummary,
      recentSessions: recentSessions.slice(0, 10).map((session) => ({
        date: session.workoutDate,
        templateName: session.templateName,
        totalVolume: session.totalVolume,
        exercises: session.exercises.map((ex) => ({
          name: ex.exerciseName,
          weight: ex.weight,
          reps: ex.reps,
          sets: ex.sets,
          volume: ex.volumeLoad,
          oneRmEstimate: ex.oneRmEstimate,
        })),
      })),
    },
    currentStrength: {
      summary: oneRmSummary,
      oneRmEstimates: currentOneRmEstimates,
    },
    volumeTrends: {
      summary: volumeTrendsSummary,
      data: volumeTrends.map((trend) => ({
        exerciseName: trend.exerciseName,
        trendSlope: trend.trendSlope,
        recentWeeks: trend.weeklyData.slice(-4).map((week) => ({
          weekStart: week.weekStart,
          totalVolume: week.totalVolume,
          sessionCount: week.sessionCount,
          avgIntensity: week.averageIntensity,
        })),
      })),
    },
    warmupPatterns: {
      summary: warmupPatternsSummary,
      data: context.warmupPatterns?.map((pattern) => ({
        exerciseName: pattern.exerciseName,
        pattern: pattern.pattern,
        confidence: pattern.confidence,
        sessionCount: pattern.sessionCount,
      })) ?? [],
    },
    userPreferences: {
      defaultWeightUnit: preferences.defaultWeightUnit,
      progressionType: preferences.progressionType,
      trainingDaysPerWeek: preferences.trainingDaysPerWeek ?? 3,
    },
    constraints: {
      availableEquipment: availableEquipment ?? [],
    },
  };

  const sanitizedContext = JSON.stringify(contextData, null, 2);

  const promptSections = [
    `GOAL: ${goalText ?? goalPreset ?? "General strength and muscle building"}`,
    `DURATION: ${duration} weeks`,
    `TARGET: Focus on ${targetType === "template" ? "workout templates" : "specific exercises"}`,
    "",
    "USER CONTEXT:",
    sanitizedContext,
    "",
    "OUTPUT SCHEMA (follow exactly):",
    OUTPUT_SCHEMA_SNIPPET,
    "",
    "PROGRAMMING REQUIREMENTS:",
    "1. Choose appropriate periodization model based on user's training history and goals",
    "2. If user is new (< 4 sessions), recommend proven beginner programs (e.g., Starting Strength, StrongLifts, or 5/3/1 beginner)",
    "3. Include at least one deload week (typically week 4 for 6-week programs) at 50-70% volume",
    "4. Progressive overload: 2.5-5% weekly increases for strength, volume adjustments for hypertrophy",
    "5. For PR attempt weeks: provide realistic confidence levels (0-1) based on training trajectory",
    "6. Include coaching cues for each week with motivation and focus areas",
    "7. Estimate rest periods based on exercise type and intensity (strength: 3-5min, hypertrophy: 60-90s)",
    "8. Consider recovery capacity: don't over-program for beginners",
    "9. If targeting specific exercises, ensure complementary muscle groups are addressed",
    "10. Generate volume progression graph data showing weekly total volume",
    "",
    "SAFETY CONSIDERATIONS:",
    "- Never recommend unsafe progression rates (> 5% per week)",
    "- Include proper warm-up recommendations in session notes",
    "- Flag high-risk exercises or intensity zones in coaching cues",
    "- Recommend conservative weights for PR attempts (confidence < 0.85 indicates user should work up)",
    "",
    "EXAMPLE PERIODIZATION PATTERNS:",
    "- **Linear (6 weeks)**: Weeks 1-3 volume focus (3x8-10), Week 4 deload (2x8), Weeks 5-6 intensity focus (3x3-5) + PR",
    "- **DUP (6 weeks)**: Rotate heavy/medium/light sessions each week, deload week 4, PR week 6",
    "- **Block (6 weeks)**: Weeks 1-2 accumulation (high volume), Weeks 3-4 intensification, Weeks 5-6 realization + PR",
    "",
    "Output valid JSON only. No markdown, no explanatory text outside the JSON structure.",
  ];

  return {
    system: PLAYBOOK_GENERATION_SYSTEM_PROMPT,
    prompt: promptSections.join("\n"),
  };
}
