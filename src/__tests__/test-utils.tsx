import React, { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { AuthContext } from "~/providers/AuthProvider";
import { api } from "~/trpc/react";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import SuperJSON from "superjson";

// Mock implementations for common testing scenarios
export const mockUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
};

// Mock Auth Provider for testing
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const authContextValue = {
    user: mockUser,
    isLoading: false,
    signOut: vi.fn(),
    onAuthFailure: vi.fn(),
  };

  return React.createElement(
    AuthContext.Provider,
    { value: authContextValue },
    children,
  );
};

// Mock TRPC Provider for testing
const MockTRPCProvider = ({ children }: { children: React.ReactNode }) => {
  // For testing, we'll use a simple wrapper that doesn't require actual tRPC setup
  // This avoids issues with api.Provider being undefined in test environment
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MockAuthProvider>
        <MockTRPCProvider>{children}</MockTRPCProvider>
      </MockAuthProvider>
    </QueryClientProvider>
  );
};

// Simplified providers without TRPC for components that don't need it
const SimpleProviders = ({ children }: { children: React.ReactNode }) => {
  return <MockAuthProvider>{children}</MockAuthProvider>;
};

// Minimal providers for basic component testing
const MinimalProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: AllTheProviders, ...options });

const simpleRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: SimpleProviders, ...options });

const minimalRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: MinimalProviders, ...options });

export const mockWorkout = {
  id: "workout-123",
  name: "Push Day",
  exercises: [
    {
      id: "exercise-1",
      name: "Bench Press",
      sets: [
        { id: "set-1", weight: 80, reps: 8, unit: "kg" },
        { id: "set-2", weight: 80, reps: 6, unit: "kg" },
      ],
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockTRPCContext = {
  db: {
    select: vi.fn(() => {}),
    insert: vi.fn(() => {}),
    update: vi.fn(() => {}),
    delete: vi.fn(() => {}),
    from: vi.fn(() => {}),
    where: vi.fn(() => {}),
    values: vi.fn(() => {}),
    returning: vi.fn(() => {}),
  },
  user: mockUser,
  headers: new Headers(),
  requestId: "test-request",
};

// Database mocking utilities
export const createMockDb = () => ({
  select: vi.fn(() => ({})),
  insert: vi.fn(() => ({})),
  update: vi.fn(() => ({})),
  delete: vi.fn(() => ({})),
  from: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  values: vi.fn(() => ({})),
  returning: vi.fn(async () => []),
});

// Local storage mocking utilities
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
  };
};

// Async utilities
export const waitForNextTick = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Date utilities for testing
export const createMockDate = (dateString: string) => new Date(dateString);

// Export everything
export * from "@testing-library/react";
export {
  customRender as render,
  simpleRender,
  minimalRender,
  MockTRPCProvider,
};
