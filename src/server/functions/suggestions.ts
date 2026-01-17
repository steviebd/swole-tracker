import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { aiSuggestionHistory } from "~/server/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { withAuth } from "./middleware";

// === GET EXERCISE SUGGESTIONS ===
export const getExerciseSuggestions = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      limit: z.number().int().positive().default(5),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { limit } = data ?? { limit: 5 };

    return [
      {
        id: "squat-variation",
        exerciseName: "Squat",
        suggestion: "Front Squat",
        rationale:
          "Switch to front squats for better squat depth and core engagement",
        priority: "high",
      },
      {
        id: "bench-variation",
        exerciseName: "Bench Press",
        suggestion: "Incline DB Press",
        rationale: "Add incline dumbbell press to target upper chest",
        priority: "medium",
      },
      {
        id: "deadlift-variation",
        exerciseName: "Deadlift",
        suggestion: "Romanian Deadlift",
        rationale: "Add RDL for hamstring focus",
        priority: "low",
      },
    ].slice(0, limit);
  });

// === GET WORKOUT SUGGESTIONS ===
export const getWorkoutSuggestions = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      limit: z.number().int().positive().default(3),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { limit } = data ?? { limit: 3 };

    return [
      {
        id: "push-pull-balance",
        title: "Push/Pull Balance",
        description:
          "Consider adding more pulling movements to balance your push volume",
        action: "Add 1-2 rowing variations per week",
        priority: "high",
      },
      {
        id: "leg-frequency",
        title: "Increase Leg Frequency",
        description: "You're only training legs once per week on average",
        action: "Try splitting into two shorter leg sessions",
        priority: "medium",
      },
      {
        id: "deload-week",
        title: "Consider a Deload",
        description: "High training volume accumulated over 8 weeks",
        action: "Reduce volume by 40% this week",
        priority: "low",
      },
    ].slice(0, limit);
  });

// === GET RECOVERY SUGGESTIONS ===
export const getRecoverySuggestions = createServerFn({ method: "GET" })
  .inputValidator(z.object({}))
  .middleware([withAuth])
  .handler(async () => {
    return {
      sleep: {
        score: 75,
        suggestions: [
          "Aim for 7-9 hours of sleep for optimal recovery",
          "Avoid caffeine after 2 PM",
          "Keep your bedroom cool and dark",
        ],
      },
      nutrition: {
        score: 80,
        suggestions: [
          "Consume 1.6-2.2g protein per kg bodyweight",
          "Eat complex carbs post-workout",
          "Stay hydrated - aim for 3-4L water daily",
        ],
      },
      stress: {
        score: 65,
        suggestions: [
          "Try 10 minutes of meditation daily",
          "Take regular breaks from screens",
          "Consider yoga or stretching for stress relief",
        ],
      },
    };
  });

// === DISMISS SUGGESTION ===
export const dismissSuggestion = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      suggestionId: z.string(),
      reason: z.string().optional(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { suggestionId, reason } = data!;

    await db.insert(aiSuggestionHistory).values({
      user_id: user.id,
      sessionId: 0,
      exerciseName: suggestionId,
      setId: "dismissed",
      setIndex: 0,
      suggested_weight_kg: null,
      suggested_reps: null,
      suggested_rest_seconds: null,
      suggestion_rationale: reason || "User dismissed suggestion",
      action: "rejected",
      accepted_weight_kg: null,
      accepted_reps: null,
      interaction_time_ms: 0,
    });

    return { success: true, dismissedId: suggestionId };
  });
