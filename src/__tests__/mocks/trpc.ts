import { vi } from "vitest";
import { mockDb } from "./db";

// Mock tRPC context
export const createMockTRPCContext = (userId = "test-user-id") => ({
  db: mockDb,
  user: {
    id: userId,
    email: "test@example.com",
    name: "Test User",
  },
  headers: new Headers(),
});

// Mock Next.js request/response for tRPC
export const createMockNextContext = () => ({
  req: {
    method: "GET",
    headers: new Headers(),
    url: "http://localhost:3000/api/trpc/test",
  } as any,
  res: {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
    getHeader: vi.fn(),
  } as any,
});

// Mock tRPC caller
export const createMockTRPCCaller = (context = createMockTRPCContext()) => ({
  context,
});
