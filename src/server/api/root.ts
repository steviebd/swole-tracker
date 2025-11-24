import { templatesRouter } from "~/server/api/routers/templates";
import { workoutsRouter } from "~/server/api/routers/workouts";
import { preferencesRouter } from "~/server/api/routers/preferences";
import { whoopRouter } from "~/server/api/routers/whoop";
import { webhooksRouter } from "~/server/api/routers/webhooks";
import { insightsRouter } from "~/server/api/routers/insights";
import { exercisesRouter } from "~/server/api/routers/exercises";
import { progressRouter } from "~/server/api/routers/progress";
import { healthAdviceRouter } from "~/server/api/routers/health-advice";
import { wellnessRouter } from "~/server/api/routers/wellness";
import { suggestionsRouter } from "~/server/api/routers/suggestions";
import { sessionDebriefRouter } from "~/server/api/routers/session-debrief";
import { playbookRouter } from "~/server/api/routers/playbook";
import { recoveryPlannerRouter } from "~/server/api/routers/recovery-planner";
import { plateauMilestoneRouter } from "~/server/api/routers/plateau-milestone";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  templates: templatesRouter,
  workouts: workoutsRouter,
  preferences: preferencesRouter,
  whoop: whoopRouter,
  webhooks: webhooksRouter,
  exercises: exercisesRouter,
  insights: insightsRouter,
  progress: progressRouter,
  healthAdvice: healthAdviceRouter,
  wellness: wellnessRouter,
  suggestions: suggestionsRouter,
  sessionDebriefs: sessionDebriefRouter,
  playbooks: playbookRouter,
  recoveryPlanner: recoveryPlannerRouter,
  plateauMilestone: plateauMilestoneRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.templates.all();
 *       ^? Template[]
 */
export const createCaller = createCallerFactory(appRouter);
