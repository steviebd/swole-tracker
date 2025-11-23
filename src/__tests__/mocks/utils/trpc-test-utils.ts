import { appRouter } from "~/server/api/root";
import { createMockContext } from "../factories/context";
import type { TRPCContext } from "~/server/api/trpc";

export const createTestCaller = async (
  overrides: Partial<TRPCContext> = {},
) => {
  const ctx = await createMockContext(overrides);
  return appRouter.createCaller(ctx);
};
