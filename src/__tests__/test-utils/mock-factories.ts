import { vi } from 'vitest';

// Database mock factory
export function createDrizzleMock() {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
            execute: vi.fn().mockResolvedValue([]),
          })),
          limit: vi.fn().mockResolvedValue([]),
          execute: vi.fn().mockResolvedValue([]),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
          execute: vi.fn().mockResolvedValue([]),
        })),
        limit: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue([]),
      })),
      where: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
          execute: vi.fn().mockResolvedValue([]),
        })),
        limit: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue([]),
      })),
      orderBy: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue([]),
      })),
      limit: vi.fn().mockResolvedValue([]),
      execute: vi.fn().mockResolvedValue([]),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => ({
          set: vi.fn(() => ({
            returning: vi.fn().mockResolvedValue([]),
            execute: vi.fn().mockResolvedValue([]),
          })),
          returning: vi.fn().mockResolvedValue([]),
          execute: vi.fn().mockResolvedValue([]),
        })),
        returning: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue([]),
      })),
      returning: vi.fn().mockResolvedValue([]),
      execute: vi.fn().mockResolvedValue([]),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([]),
          execute: vi.fn().mockResolvedValue([]),
        })),
        returning: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue([]),
      })),
      returning: vi.fn().mockResolvedValue([]),
      execute: vi.fn().mockResolvedValue([]),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        execute: vi.fn().mockResolvedValue([]),
      })),
      execute: vi.fn().mockResolvedValue([]),
    })),
  };
}

// Browser API mock factory
export function createBrowserAPIMock() {
  const mockMatchMedia = vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  return {
    matchMedia: mockMatchMedia,
    localStorage: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      get length() { return 0; },
    },
    sessionStorage: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      get length() { return 0; },
    },
  };
}

// React hook mock factory
export function createReactHookMock<T>(defaultValue: T) {
  const mockHook = vi.fn(() => defaultValue);
  return {
    hook: mockHook,
    setValue: (value: T) => mockHook.mockReturnValue(value),
    getCalls: () => mockHook.mock.calls,
    reset: () => mockHook.mockReset(),
  };
}

// Test data factories
export function createWorkoutData(overrides = {}) {
  return {
    id: 'workout-123',
    user_id: 'user-123',
    template_id: 'template-123',
    start: new Date('2024-01-01T10:00:00Z'),
    end: new Date('2024-01-01T11:00:00Z'),
    duration: 3600,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createUserData(overrides = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    ...overrides,
  };
}

// Mock setup utilities
export function setupGlobalMocks() {
  // Setup browser APIs
  const browserMock = createBrowserAPIMock();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: browserMock.matchMedia,
  });

  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: browserMock.localStorage,
  });

  // Setup crypto for encryption tests
  if (!globalThis.crypto) {
    const cryptoMock = {
      randomUUID: () => "00000000-0000-0000-0000-000000000000",
      getRandomValues: vi.fn((array: ArrayBufferView) => array),
      subtle: {} as Record<string, unknown>,
    } as unknown as Crypto;

    globalThis.crypto = cryptoMock;
  }
}

export function createTRPCMockContext(user = createUserData()) {
  const dbMock = createDrizzleMock();

  return {
    db: dbMock,
    user,
    requestId: 'test-request-id',
    headers: new Headers(),
    req: { headers: new Headers() } as any,
    res: {} as any,
  };
}
