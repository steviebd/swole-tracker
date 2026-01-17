import { createMiddleware } from "@tanstack/react-start";
import { getServerContext, requireAuth } from "~/server/context";

export const withContext = createMiddleware().server(async ({ next }) => {
  const ctx = await getServerContext();
  return next({ context: ctx });
});

export const withAuth = createMiddleware().server(async ({ next }) => {
  const ctx = await requireAuth();
  return next({ context: ctx });
});
