import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll, vi } from "vitest";
import { setupServer } from "msw/node";

// Setup global window object for jsdom environment
(globalThis as any).window = {
  navigator: {
    onLine: true,
  },
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  },
  location: {
    href: "http://localhost:3000",
  },
};

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock Clerk auth
vi.mock("@clerk/nextjs", () => ({
  auth: () => ({
    userId: "test-user-id",
    sessionId: "test-session-id",
  }),
  currentUser: () => ({
    id: "test-user-id",
    emailAddresses: [{ emailAddress: "test@example.com" }],
    firstName: "Test",
    lastName: "User",
  }),
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    userId: "test-user-id",
    sessionId: "test-session-id",
  }),
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: "test-user-id",
      emailAddresses: [{ emailAddress: "test@example.com" }],
      firstName: "Test",
      lastName: "User",
    },
  }),
}));

// Mock environment variables
vi.mock("~/env.js", () => ({
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_dummy",
    CLERK_SECRET_KEY: "sk_test_dummy",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_KEY: "test-key",
  },
}));

// Mock PostHog
vi.mock("~/lib/posthog", () => ({
  posthog: {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  },
}));

// Mock analytics
vi.mock("~/lib/analytics", () => ({
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
}));

// Mock posthog-js
vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

// Mock rate-limit
vi.mock("~/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  cleanupExpiredRateLimits: vi.fn(),
}));

// Mock supabase-browser
vi.mock("~/lib/supabase-browser", () => ({
  createBrowserSupabaseClient: vi.fn(),
}));

// Mock workout-operations
vi.mock("~/lib/workout-operations", () => ({
  WorkoutOperationsClient: vi.fn().mockImplementation(() => ({
    getWorkoutTemplates: vi.fn(),
    createWorkoutTemplate: vi.fn(),
    getRecentWorkouts: vi.fn(),
    getWorkoutSession: vi.fn(),
    createWorkoutSession: vi.fn(),
    getSessionExercises: vi.fn(),
    addSessionExercise: vi.fn(),
  })),
}));

// Mock logger
vi.mock("~/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  logApiCall: vi.fn(),
  logWebhook: vi.fn(),
  logSecurityEvent: vi.fn(),
}));

// Mock database
vi.mock("~/server/db", () => ({
  db: {
    query: {
      workoutTemplates: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      templateExercises: {
        findMany: vi.fn(),
      },
      masterExercises: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      exerciseLinks: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      workoutSessions: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      whoopData: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      jokes: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      healthAdvice: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn(),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    values: vi.fn(),
    onConflictDoUpdate: vi.fn(),
    returning: vi.fn(),
  },
}));

// Window mocks are set up at the top of the file

// Setup MSW server for API mocking
export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
