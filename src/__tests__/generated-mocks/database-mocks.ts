// Auto-generated database mocks
// Generated from schema.ts on 2025-10-16T03:15:50.034Z
// DO NOT EDIT MANUALLY

import { vi } from "vitest";

export const createDatabaseMock = () => {
  const createQueryChain = <T = unknown>() => {
    let chainResult: T[] = [];
    
    return {
      where: vi.fn(() => createQueryChain()),
      select: vi.fn(() => createQueryChain()),
      from: vi.fn(() => createQueryChain()),
      innerJoin: vi.fn(() => createQueryChain()),
      leftJoin: vi.fn(() => createQueryChain()),
      orderBy: vi.fn(() => createQueryChain()),
      groupBy: vi.fn(() => createQueryChain()),
      limit: vi.fn(() => createQueryChain()),
      offset: vi.fn(() => createQueryChain()),
      values: vi.fn(() => createQueryChain()),
      set: vi.fn(() => createQueryChain()),
      onConflictDoUpdate: vi.fn(() => createQueryChain()),
      returning: vi.fn(() => createQueryChain()),
      execute: vi.fn(async () => chainResult),
      all: vi.fn(async () => chainResult),
      then: (
        resolve: (value: T[]) => void,
        reject: (reason?: unknown) => void,
      ) => Promise.resolve(chainResult as T[]).then(resolve, reject),
      // Helper method to set result for this specific chain
      _setResult: (result: T[]) => {
        chainResult = result;
        return chainResult;
      },
    };
  };

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
