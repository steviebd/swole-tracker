import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Set required environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
process.env.VERCEL_AI_GATEWAY_API_KEY = 'mock-ai-key';

// JSDOM cleanup after each test
afterEach(() => {
  cleanup();
  // Restore all spies/mocks and globals between tests to prevent leaks
  try {
    vi.restoreAllMocks();
  } catch {}
  // Vitest provides unstubAllGlobals in v3; guard in case of version diff
  try {
    // @ts-expect-error - not always typed
    vi.unstubAllGlobals?.();
  } catch {}
});

// Mock AI SDK globally for jokes tests
vi.mock('@ai-sdk/xai', () => ({
  generateText: vi.fn(),
}));

// Mock tRPC API globally for all tests
vi.mock('~/trpc/react', () => ({
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
        useQuery: vi.fn(() => ({ data: { defaultWeightUnit: 'kg' } })),
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
vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(), // deprecated but some libs still call
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
})));
