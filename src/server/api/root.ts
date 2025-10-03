import { postRouter } from "~/server/api/routers/post";
import { templatesRouter } from "~/server/api/routers/templates";
import { workoutsRouter } from "~/server/api/routers/workouts";
import { preferencesRouter } from "~/server/api/routers/preferences";
import { jokesRouter } from "~/server/api/routers/jokes";
import { whoopRouter } from "~/server/api/routers/whoop";
import { webhooksRouter } from "~/server/api/routers/webhooks";
import { insightsRouter } from "~/server/api/routers/insights";
import { exercisesRouter } from "~/server/api/routers/exercises";
import { progressRouter } from "~/server/api/routers/progress";
import { healthAdviceRouter } from "~/server/api/routers/health-advice";
import { wellnessRouter } from "~/server/api/routers/wellness";
import { suggestionsRouter } from "~/server/api/routers/suggestions";
import { sessionDebriefRouter } from "~/server/api/routers/session-debrief";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  templates: templatesRouter,
  workouts: workoutsRouter,
  preferences: preferencesRouter,
  jokes: jokesRouter,
  whoop: whoopRouter,
  webhooks: webhooksRouter,
  exercises: exercisesRouter,
  insights: insightsRouter,
  progress: progressRouter,
  healthAdvice: healthAdviceRouter,
  wellness: wellnessRouter,
  suggestions: suggestionsRouter,
  sessionDebriefs: sessionDebriefRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
