import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll, vi } from "vitest";
import { setupServer } from "msw/node";

// Setup global DOM objects for Happy-DOM environment
const mockLocalStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(() => {}),
  removeItem: vi.fn(() => {}),
  clear: vi.fn(() => {}),
  key: vi.fn(() => null),
  get length() {
    return 0;
  },
};

// Enhance global objects for React and testing environment
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

Object.defineProperty(window, "matchMedia", {
  value: vi.fn(() => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
  configurable: true,
});

// Ensure document.body exists and is a proper DOM element
if (!document.body) {
  document.body = document.createElement("body");
}

// For components that need aria-live functionality
const ariaLiveRegion = document.createElement("div");
ariaLiveRegion.setAttribute("aria-live", "polite");
ariaLiveRegion.setAttribute("aria-atomic", "true");
document.body.appendChild(ariaLiveRegion);

// Mock Next.js router
const mockRouter = {
  useRouter: () => ({
    push: vi.fn(() => {}),
    replace: vi.fn(() => {}),
    back: vi.fn(() => {}),
    forward: vi.fn(() => {}),
    refresh: vi.fn(() => {}),
    prefetch: vi.fn(() => {}),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
};

vi.mock("next/navigation", () => mockRouter);

// Mock Clerk auth
const mockClerkAuth = {
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
};

vi.mock("@clerk/nextjs", () => mockClerkAuth);

// Mock environment variables
const mockEnv = {
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_dummy",
    CLERK_SECRET_KEY: "sk_test_dummy",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    WORKOS_API_KEY: "wk_test_dummy",
    WORKOS_CLIENT_ID: "client_test_dummy",
    WORKER_SESSION_SECRET: "test_session_secret_32_chars_minimum_123456789",
  },
};

vi.mock("~/env.js", () => mockEnv);

// Mock PostHog
const mockPosthog = {
  posthog: {
    capture: vi.fn(() => {}),
    identify: vi.fn(() => {}),
    reset: vi.fn(() => {}),
  },
};

vi.mock("~/lib/posthog", () => mockPosthog);

// Mock analytics
const mockAnalytics = {
  trackEvent: vi.fn(() => {}),
  trackPageView: vi.fn(() => {}),
};

vi.mock("~/lib/analytics", () => mockAnalytics);

// Mock posthog-js
vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(() => {}),
  },
}));

// Mock rate-limit
const mockRateLimit = {
  checkRateLimit: vi.fn(() => {}),
  cleanupExpiredRateLimits: vi.fn(() => {}),
};

vi.mock("~/lib/rate-limit", () => mockRateLimit);

// Mock workout-operations
const MockWorkoutOperationsClient = vi.fn(() => ({
  getWorkoutTemplates: vi.fn(() => []),
  createWorkoutTemplate: vi.fn(() => ({})),
  getRecentWorkouts: vi.fn(() => []),
  getWorkoutSession: vi.fn(() => ({})),
  createWorkoutSession: vi.fn(() => ({})),
  getSessionExercises: vi.fn(() => []),
  addSessionExercise: vi.fn(() => ({})),
}));

const mockWorkoutOps = {
  WorkoutOperationsClient: MockWorkoutOperationsClient,
};

vi.mock("~/lib/workout-operations", () => mockWorkoutOps);

// Mock logger
const mockLogger = {
  logger: {
    debug: vi.fn(() => {}),
    info: vi.fn(() => {}),
    warn: vi.fn(() => {}),
    error: vi.fn(() => {}),
  },
  logApiCall: vi.fn(() => {}),
  logWebhook: vi.fn(() => {}),
  logSecurityEvent: vi.fn(() => {}),
};

vi.mock("~/lib/logger", () => mockLogger);

// Create a comprehensive drizzle-orm query builder mock
const createDrizzleQueryBuilder = (result: any[] = []) => {
  const builder: any = {
    where: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    offset: vi.fn(() => builder),
    leftJoin: vi.fn(() => builder),
    innerJoin: vi.fn(() => builder),
    select: vi.fn(() => builder),
    from: vi.fn(() => builder),
    groupBy: vi.fn(() => builder),
    having: vi.fn(() => builder),
    // Execute methods
    execute: vi.fn(() => Promise.resolve(result)),
    then: vi.fn((resolve: any) => Promise.resolve(result).then(resolve)),
    catch: vi.fn(() => Promise.resolve(result)),
    finally: vi.fn(() => Promise.resolve(result)),
  };
  return builder;
};

const mockDb = {
  db: {
    // Basic query methods with proper drizzle interface
    select: vi.fn(() => createDrizzleQueryBuilder()),
    update: vi.fn((table) => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => createDrizzleQueryBuilder([{ id: 1 }])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => ({
          set: vi.fn(() => ({
            returning: vi.fn(() => createDrizzleQueryBuilder([{ id: 1 }])),
          })),
        })),
        returning: vi.fn(() => createDrizzleQueryBuilder([{ id: 1 }])),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => createDrizzleQueryBuilder()),
    })),

    // Legacy query interface for existing tests
    query: {
      workoutTemplates: {
        findMany: vi.fn(() => []),
        findFirst: vi.fn(() => null),
      },
      templateExercises: {
        findMany: vi.fn(() => []),
      },
      masterExercises: {
        findFirst: vi.fn(() => null),
        findMany: vi.fn(() => []),
      },
      exerciseLinks: {
        findFirst: vi.fn(() => null),
        findMany: vi.fn(() => []),
      },
      workoutSessions: {
        findMany: vi.fn(() => []),
        findFirst: vi.fn(() => null),
      },
      whoopData: {
        findMany: vi.fn(() => []),
        findFirst: vi.fn(() => null),
      },
      jokes: {
        findMany: vi.fn(() => []),
        findFirst: vi.fn(() => null),
      },
      healthAdvice: {
        findMany: vi.fn(() => []),
        findFirst: vi.fn(() => null),
      },
    },
  },
};

vi.mock("~/server/db", () => mockDb);

// Window mocks are set up at the top of the file

// Setup MSW server for API mocking
export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
