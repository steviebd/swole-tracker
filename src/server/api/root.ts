import { postRouter } from "~/server/api/routers/post";
import { templatesRouter } from "~/server/api/routers/templates";
import { workoutsRouter } from "~/server/api/routers/workouts";
import { preferencesRouter } from "~/server/api/routers/preferences";
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
