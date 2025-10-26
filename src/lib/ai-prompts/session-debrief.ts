import { type SessionDebriefGenerationPayload } from "~/server/api/types/health-advice-debrief";

const OUTPUT_SCHEMA_SNIPPET = `{
  "summary": string,
  "prHighlights": Array<{
    "exerciseName": string,
    "metric": "weight" | "volume" | "reps" | "streak" | "consistency" | "readiness" | "other",
    "summary": string,
    "delta"?: number,
    "unit"?: string,
    "currentValue"?: number | string,
    "previousValue"?: number | string,
    "emoji"?: string
  }>,
  "adherenceScore"?: number,
  "focusAreas": Array<{
    "title": string,
    "description": string,
    "priority"?: "today" | "upcoming" | "longTerm",
    "actions"?: string[]
  }>,
  "streakContext"?: {
    "current": number,
    "longest"?: number,
    "message": string,
    "status"?: "building" | "hot" | "cooling" | "reset"
  },
  "overloadDigest"?: {
    "readiness"?: number,
    "recommendation"?: string,
    "nextSteps"?: string[],
    "cautionFlags"?: string[]
  },
  "metadata"?: Record<string, unknown>
}`;

export const SESSION_DEBRIEF_SYSTEM_PROMPT = `You are an elite strength coach producing concise post-workout debriefs.
Always respond with STRICT JSON matching the output schema.
No prose outside JSON. Keep tone constructive, motivational, and data-driven.
Highlight personal records, adherence trends, and next priorities.
If data is missing, acknowledge gracefully and rely on available metrics.
Leverage complete historic set logs to infer realistic 1RM estimates and prescribe progressive overload knobs (weight vs reps) for upcoming sessions.`;

export function buildSessionDebriefPrompt(payload: SessionDebriefGenerationPayload) {
  const { context, locale, timezone } = payload;

  const sanitizedContext = JSON.stringify(
    {
      ...context,
      exercises: context.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({
          ...set,
          // Remove undefined for cleaner prompt payloads
          intensity: typeof set.intensity === "number" ? set.intensity : undefined,
        })),
        historicalSets: exercise.historicalSets?.map((set) => ({
          ...set,
          intensity: typeof set.intensity === "number" ? set.intensity : undefined,
        })),
      })),
      adherence: context.adherence,
      streak: context.streak,
      healthAdvice: context.healthAdvice ?? undefined,
      previousDebrief: context.previousDebrief ?? undefined,
    },
    null,
    2,
  );

  const promptSections = [
    `LOCALE: ${locale}${timezone ? ` | TIMEZONE: ${timezone}` : ""}`,
    "SESSION CONTEXT:",
    sanitizedContext,
    "OUTPUT SCHEMA (follow exactly):",
    OUTPUT_SCHEMA_SNIPPET,
    "RESPONSE REQUIREMENTS:",
    "- Provide summary under 120 words.",
    "- Reference at most 3 PR highlights; if none, explain status.",
    "- Give 2-3 focus areas with actionable guidance.",
    "- Use historicalSets to compare current vs prior performance and mention estimated 1RM trajectories for key lifts.",
    "- Recommend a concrete progressive overload move for the next session (either add load or add reps) and capture it in focus areas or overloadDigest.nextSteps.",
    "- If readiness data missing, skip overload recommendations.",
    "- Populate metadata with useful tags such as { \"confidence\": number } when relevant.",
  ];

  return {
    system: SESSION_DEBRIEF_SYSTEM_PROMPT,
    prompt: promptSections.join("\n\n"),
  };
}
