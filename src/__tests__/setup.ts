import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Set required environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co"; // Keep for backward compatibility during migration
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key"; // Keep for backward compatibility during migration
process.env.WORKOS_API_KEY = "mock-workos-api-key";
process.env.WORKOS_CLIENT_ID = "mock-workos-client-id";
process.env.VERCEL_AI_GATEWAY_API_KEY = "mock-ai-key";

// JSDOM cleanup after each test
afterEach(() => {
  cleanup();
  // Restore all spies/mocks and globals between tests to prevent leaks
  try {
    vi.restoreAllMocks();
  } catch {}
  // Vitest provides unstubAllGlobals in v3; guard in case of version diff
  try {
    vi.unstubAllGlobals?.();
  } catch {}
});

// Mock AI SDK globally for jokes tests
vi.mock("@ai-sdk/xai", () => ({
  generateText: vi.fn(),
}));

// Mock WorkOS for authentication tests
vi.mock("~/lib/workos", () => ({
  getWorkOSClient: vi.fn(() => ({
    userManagement: {
      authenticateWithCode: vi.fn(),
      getUser: vi.fn(),
      refreshToken: vi.fn(),
    },
  })),
  getAuthorizationUrl: vi.fn(() => "https://api.workos.com/user_management/authorize?mock=true"),
  exchangeCodeForToken: vi.fn(async () => ({
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
    user: {
      id: "mock-user-id",
      email: "test@example.com",
      email_verified: true,
      first_name: "Test",
      last_name: "User",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      object: "user",
    },
  })),
  getUserFromToken: vi.fn(async () => ({
    id: "mock-user-id",
    email: "test@example.com",
    email_verified: true,
    first_name: "Test",
    last_name: "User",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    object: "user",
  })),
  refreshAccessToken: vi.fn(async () => ({
    accessToken: "mock-new-access-token",
    refreshToken: "mock-new-refresh-token",
  })),
  validateAccessToken: vi.fn(async () => ({
    id: "mock-user-id",
    email: "test@example.com",
    email_verified: true,
    first_name: "Test",
    last_name: "User",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    object: "user",
  })),
  getLogoutUrl: vi.fn(() => "https://api.workos.com/user_management/logout?mock=true"),
  getBaseRedirectUri: vi.fn(() => "http://localhost:3000"),
  SESSION_COOKIE_NAME: "workos-session",
  SESSION_COOKIE_OPTIONS: {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 604800,
    path: "/",
  },
}));

// Mock Cloudflare bindings for tests
globalThis.DB = {
  prepare: vi.fn(() => ({
    bind: vi.fn(() => ({
      all: vi.fn(() => Promise.resolve({ results: [], meta: {} })),
      first: vi.fn(() => Promise.resolve(null)),
      run: vi.fn(() => Promise.resolve({ success: true, meta: {} })),
    })),
    all: vi.fn(() => Promise.resolve({ results: [], meta: {} })),
    first: vi.fn(() => Promise.resolve(null)),
    run: vi.fn(() => Promise.resolve({ success: true, meta: {} })),
  })),
  exec: vi.fn(() => Promise.resolve({ results: [], meta: {} })),
  batch: vi.fn(() => Promise.resolve([])),
  dump: vi.fn(() => Promise.resolve(new ArrayBuffer(0))),
};

globalThis.RATE_LIMIT_KV = {
  get: vi.fn(() => Promise.resolve(null)),
  put: vi.fn(() => Promise.resolve()),
  delete: vi.fn(() => Promise.resolve()),
  list: vi.fn(() => Promise.resolve({ keys: [] })),
};

globalThis.CACHE_KV = {
  get: vi.fn(() => Promise.resolve(null)),
  put: vi.fn(() => Promise.resolve()),
  delete: vi.fn(() => Promise.resolve()),
  list: vi.fn(() => Promise.resolve({ keys: [] })),
};

// Mock rate limiting functions for tests
vi.mock("~/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({
    allowed: true,
    remaining: 10,
    resetTime: new Date(Date.now() + 3600000),
  })),
  cleanupExpiredRateLimits: vi.fn(async () => {}),
  getRateLimitStatus: vi.fn(async () => ({
    allowed: true,
    remaining: 10,
    resetTime: new Date(Date.now() + 3600000),
  })),
}));

// Mock tRPC API globally for all tests
vi.mock("~/trpc/react", () => ({
  api: {
    workouts: {
      getById: {
        useQuery: vi.fn(() => ({ data: null, isLoading: false })),
      },
      save: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
        })),
      },
      delete: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
        })),
      },
      getLastExerciseData: {
        fetch: vi.fn(),
      },
    },
    preferences: {
      get: {
        useQuery: vi.fn(() => ({ data: { defaultWeightUnit: "kg" } })),
      },
      update: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
        })),
      },
    },
    useUtils: vi.fn(() => ({
      workouts: {
        getRecent: {
          getData: vi.fn(),
          setData: vi.fn(),
          invalidate: vi.fn(),
        },
        getById: {
          getData: vi.fn(),
        },
      },
    })),
  },
}));

// Provide minimal browser globals as needed
// (Adjust/migrate if specific hooks need more shims)
vi.stubGlobal(
  "matchMedia",
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(), // deprecated but some libs still call
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
);

// Mock navigator.onLine for online status tests
Object.defineProperty(window.navigator, "onLine", {
  value: true,
  writable: true,
  configurable: true,
});

// Minimal jsdom setup for tests that don't have window/document available
if (typeof globalThis.window === "undefined") {
  const mockWindow = {
    localStorage: {
      getItem: vi.fn(),
      setItem: vi.fn(), 
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    navigator: {
      onLine: true,
    },
    document: {
      cookie: "",
    },
  };
  
  Object.defineProperty(globalThis, "window", {
    value: mockWindow,
    writable: true,
    configurable: true,
  });
  
  Object.defineProperty(globalThis, "document", {
    value: mockWindow.document,
    writable: true,
    configurable: true,
  });
}

// Ensure localStorage is available in all environments
const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(global, "localStorage", {
  value: mockStorage,
  writable: true,
  configurable: true,
});

// Also ensure it's available on window
Object.defineProperty(window, "localStorage", {
  value: mockStorage,
  writable: true,
  configurable: true,
});

// Ensure document.addEventListener is available for user-event
if (global.document && !global.document.addEventListener) {
  Object.defineProperty(global.document, "addEventListener", {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(global.document, "removeEventListener", {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
}
