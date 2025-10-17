// Auto-generated database mocks
// Generated from schema.ts on 2025-10-16T03:15:50.034Z
// DO NOT EDIT MANUALLY

import { vi } from "vitest";

export const createDatabaseMock = () => {
  const createQueryChain = <T = unknown>(result: T[] = []) => ({
    where: vi.fn(() => createQueryChain(result)),
    select: vi.fn(() => createQueryChain(result)),
    from: vi.fn(() => createQueryChain(result)),
    innerJoin: vi.fn(() => createQueryChain(result)),
    leftJoin: vi.fn(() => createQueryChain(result)),
    orderBy: vi.fn(() => createQueryChain(result)),
    groupBy: vi.fn(() => createQueryChain(result)),
    limit: vi.fn(() => createQueryChain(result)),
    offset: vi.fn(() => createQueryChain(result)),
    values: vi.fn(() => createQueryChain(result)),
    set: vi.fn(() => createQueryChain(result)),
    onConflictDoUpdate: vi.fn(() => createQueryChain(result)),
    returning: vi.fn(async () => result),
    execute: vi.fn(async () => result),
    all: vi.fn(async () => result),
    then: (
      resolve: (value: T[]) => void,
      reject: (reason?: unknown) => void,
    ) => Promise.resolve(result).then(resolve, reject),
  });

  return {
    select: vi.fn(() => createQueryChain()),
    insert: vi.fn(() => createQueryChain()),
    update: vi.fn(() => createQueryChain()),
    delete: vi.fn(() => createQueryChain()),
    // Add specific table mocks
  };
};

export const MOCK_VERSION = "1.0.0";
export const MOCK_GENERATED_AT = "2025-10-16T03:15:50.034Z";
