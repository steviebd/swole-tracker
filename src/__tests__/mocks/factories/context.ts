import type { TRPCContext } from "~/server/api/trpc";

export const createMockContext = async (
  overrides: Partial<TRPCContext> = {},
) => {
  return {
    user: { id: "test-user" },
    db: {} as any, // Mock database
    requestId: "test-request-id",
    headers: new Headers(),
    timings: new Map(),
    ...overrides,
  };
};
