import { expect } from "vitest";
import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll, vi } from "vitest";

// Make vi available globally for tests
(global as any).vi = vi;

// Ensure vi is available on global for all test files
Object.defineProperty(global, 'vi', {
  value: vi,
  writable: true,
  configurable: true,
});

// Also set vi on globalThis for module-level access
(globalThis as any).vi = vi;

// Export vi for direct import in test files
export { vi };

// Make vi available at module level for immediate access
if (typeof vi === 'undefined') {
  throw new Error('vi is not available');
}
import { setupServer } from "msw/node";
import { workosAuthHandlers } from "./mocks/workos-auth";

// Define mock objects
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

const mockWorkOSAuth = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    first_name: "Test",
    last_name: "User",
    profile_picture_url: null,
    user_metadata: {
      first_name: "Test",
      last_name: "User",
      display_name: "Test User",
    },
  },
};

// Mock D1 database
const mockD1Database = {
  prepare: vi.fn(() => ({
    bind: vi.fn(() => ({
      all: vi.fn(() => Promise.resolve({ results: [] })),
      run: vi.fn(() => Promise.resolve({})),
      first: vi.fn(() => Promise.resolve(null)),
    })),
  })),
};

const mockEnv = {
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_dummy",
    CLERK_SECRET_KEY: "sk_test_dummy",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    WORKOS_API_KEY: "wk_test_dummy",
    WORKOS_CLIENT_ID: "client_test_dummy",
    WORKER_SESSION_SECRET:
      "test_session_secret_32_chars_minimum_12345678901234567890123456789012",
    ENCRYPTION_MASTER_KEY: "test_encryption_key_32_chars_minimum_123456789",
    DB: mockD1Database,
    NODE_ENV: "test",
  },
};

const mockPosthog = {
  posthog: {
    capture: vi.fn(() => {}),
    identify: vi.fn(() => {}),
    reset: vi.fn(() => {}),
  },
};

const mockAnalytics = {
  trackEvent: vi.fn(() => {}),
  trackPageView: vi.fn(() => {}),
};

const mockRateLimit = {
  checkRateLimit: vi.fn(() => {}),
  cleanupExpiredRateLimits: vi.fn(() => {}),
};

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

// Setup MSW server for API mocking
export const server = setupServer(...workosAuthHandlers);

beforeAll(() => {
  // Set up environment variables
  process.env.ENCRYPTION_MASTER_KEY =
    "test_encryption_key_32_chars_minimum_12345678901234567890123456789012";
  process.env.WORKER_SESSION_SECRET =
    "test_session_secret_32_chars_minimum_12345678901234567890123456789012";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_dummy";
  process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";

  // Ensure atob and btoa are available globally
  if (typeof global.atob === "undefined") {
    global.atob = (str: string) =>
      Buffer.from(str, "base64").toString("binary");
  }
  if (typeof global.btoa === "undefined") {
    global.btoa = (str: string) =>
      Buffer.from(str, "binary").toString("base64");
  }

  // Mock Web Crypto API with proper encryption simulation
  const mockCryptoStore = new Map<string, string>();
  let cryptoCounter = 0;

  Object.defineProperty(global, "crypto", {
    value: {
      randomUUID: vi.fn(
        () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`,
      ),
      getRandomValues: vi.fn((array) => {
        // Fill array with random values for testing
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      }),
      subtle: {
        importKey: vi.fn(() =>
          Promise.resolve({
            type: "secret",
            algorithm: { name: "AES-GCM" },
          }),
        ),
        deriveKey: vi.fn(() =>
          Promise.resolve({
            type: "secret",
            algorithm: { name: "AES-GCM" },
          }),
        ),
        encrypt: vi.fn((algorithm, key, data) => {
          // Simulate encryption by creating a unique encrypted output with counter
          const plaintext = new TextDecoder().decode(data);
          const uniqueId = `${cryptoCounter++}_${Date.now()}_${Math.random()}`;
          // Use a safe base64 encoding that handles all characters
          const safeB64 = btoa(unescape(encodeURIComponent(plaintext)));
          const mockEncrypted = `encrypted_${safeB64}_${uniqueId}`;
          mockCryptoStore.set(mockEncrypted, plaintext);
          // Return a properly formatted encrypted blob (salt + iv + tag + ciphertext)
          const salt = new Uint8Array(32);
          const iv = new Uint8Array(16);
          const tag = new Uint8Array(16);
          // Fill with random data
          for (let i = 0; i < salt.length; i++)
            salt[i] = Math.floor(Math.random() * 256);
          for (let i = 0; i < iv.length; i++)
            iv[i] = Math.floor(Math.random() * 256);
          for (let i = 0; i < tag.length; i++)
            tag[i] = Math.floor(Math.random() * 256);
          const ciphertext = new TextEncoder().encode(mockEncrypted);
          return Promise.resolve(
            new Uint8Array([...salt, ...iv, ...tag, ...ciphertext]),
          );
        }),
        decrypt: vi.fn((algorithm, key, data) => {
          // For decryption, we need to extract the actual encrypted data from the combined array
          // The last part after tag should contain our mock encrypted string
          const dataView = new Uint8Array(data);
          const tagStart = 32 + 16; // salt + iv
          const ciphertextStart = tagStart + 16; // tag length
          const ciphertext = dataView.subarray(ciphertextStart);
          const encryptedStr = new TextDecoder().decode(ciphertext);

          if (encryptedStr.startsWith("encrypted_")) {
            const parts = encryptedStr.split("_");
            if (parts.length >= 3) {
              const b64Data = parts[1];
              if (b64Data) {
                try {
                  // Decode the safe base64
                  const plaintext = decodeURIComponent(escape(atob(b64Data)));
                  return Promise.resolve(new TextEncoder().encode(plaintext));
                } catch (e) {
                  // Fallback to return the original encrypted string as plaintext for testing
                  return Promise.resolve(new TextEncoder().encode(encryptedStr));
                }
              }
            }
          }
          // Fallback for tests that expect "test"
          return Promise.resolve(new TextEncoder().encode("test"));
        }),
        sign: vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3, 4]))),
        verify: vi.fn(() => Promise.resolve(true)),
      },
    },
    writable: true,
  });

  // Mock Buffer for Node.js compatibility - ensure it's a proper constructor
  const MockBuffer = class Buffer {
    static from(data: any, encoding?: string) {
      if (encoding === "base64") {
        // Simple base64 decode simulation for testing
        try {
          const decoded = atob(data);
          const buffer = new Uint8Array(decoded.length);
          for (let i = 0; i < decoded.length; i++) {
            buffer[i] = decoded.charCodeAt(i);
          }
          // Add length property to make it Buffer-like
          Object.defineProperty(buffer, "length", { value: buffer.length });
          return buffer;
        } catch {
          throw new Error("Invalid base64");
        }
      }
      return new Uint8Array();
    }

    static isBuffer(obj: any) {
      return (
        obj &&
        typeof obj === "object" &&
        obj.constructor &&
        obj.constructor.name === "Uint8Array"
      );
    }
  };

  Object.defineProperty(global, "Buffer", {
    value: MockBuffer,
    writable: true,
  });

  // Setup global DOM objects for jsdom environment
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
  if (typeof window !== "undefined") {
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
  }

  // Also set on global for tests that access it directly
  Object.defineProperty(global, "localStorage", {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });

  // Mock posthog on window for analytics tests
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "posthog", {
      value: mockPosthog.posthog,
      writable: true,
      configurable: true,
    });
  }

  // Ensure document.body exists for React Testing Library
  if (typeof document !== "undefined") {
    if (!document.body) {
      document.body = document.createElement("body");
    }
    // Ensure document.body is properly attached to document
    if (!document.body.parentNode) {
      document.appendChild(document.body);
    }
  }

  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());
