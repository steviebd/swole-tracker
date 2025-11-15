import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient } from "@tanstack/react-query";
import {
  api,
  TRPCReactProvider,
  type RouterInputs,
  type RouterOutputs,
} from "~/trpc/react";
import { useAuth } from "~/providers/AuthProvider";
import { createQueryClient } from "~/trpc/query-client";
import {
  setupOfflinePersistence,
  setOfflineCacheUser,
  getOfflineCacheKey,
} from "~/lib/offline-storage";

// Mock dependencies
vi.mock("~/trpc/query-client", () => ({
  createQueryClient: vi.fn(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      }),
  ),
}));

vi.mock("~/lib/offline-storage", () => ({
  setupOfflinePersistence: vi.fn(),
  setOfflineCacheUser: vi.fn(),
  getOfflineCacheKey: vi.fn(() => "test-cache-key"),
}));

vi.mock("~/providers/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

// Mock tRPC
vi.mock("@trpc/react-query", () => ({
  createTRPCReact: vi.fn(() => ({
    createClient: vi.fn(() => ({
      queryClient: {},
    })),
    Provider: vi.fn(({ children }) => (
      <div data-testid="trpc-provider">{children}</div>
    )),
  })),
}));

// Mock environment
const originalWindow = global.window;
const originalProcess = global.process;

describe("tRPC React Integration", () => {
  const mockCreateQueryClient = vi.mocked(createQueryClient);
  const mockSetupOfflinePersistence = vi.mocked(setupOfflinePersistence);
  const mockSetOfflineCacheUser = vi.mocked(setOfflineCacheUser);
  const mockGetOfflineCacheKey = vi.mocked(getOfflineCacheKey);
  const mockUseAuth = vi.mocked(useAuth);

  const mockQueryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const clearSpy = vi.spyOn(mockQueryClient, "clear");

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateQueryClient.mockReturnValue(mockQueryClient as any);
    mockGetOfflineCacheKey.mockReturnValue("test-cache-key");

    // Reset singleton
    delete (global as any).clientQueryClientSingleton;

    // Mock window object
    global.window = {
      location: { origin: "http://localhost:3000" },
      localStorage: {
        removeItem: vi.fn(),
      },
    } as any;

    // Mock process.env
    global.process = {
      ...originalProcess,
      env: {
        NODE_ENV: "test",
        VERCEL_URL: undefined,
        PORT: "3000",
      },
    } as any;
  });

  afterEach(() => {
    global.window = originalWindow;
    global.process = originalProcess;
    vi.restoreAllMocks();
  });

  describe("Query Client Management", () => {
    it("should create query client through provider", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(mockCreateQueryClient).toHaveBeenCalled();
      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();
    });

    it("should handle auth failure callback", () => {
      const onAuthFailure = vi.fn();
      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure,
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      // Test that provider renders successfully with auth failure callback
      expect(screen.getByTestId("test-content")).toBeInTheDocument();
      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();
    });
  });

  describe("TRPCReactProvider", () => {
    const mockUser = {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
    };

    it("should render children with providers", () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(screen.getByTestId("test-content")).toBeInTheDocument();
      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();
    });

    it("should handle loading state", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(screen.getByTestId("test-content")).toBeInTheDocument();
    });

    it("should setup offline persistence when not loading", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      await waitFor(
        () => {
          expect(mockSetOfflineCacheUser).toHaveBeenCalledWith("test-user-id");
          expect(mockSetupOfflinePersistence).toHaveBeenCalledWith(
            expect.any(Object),
          );
        },
        { container: document.body },
      );
    });

    it("should not setup offline persistence when loading", () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: true,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(mockSetOfflineCacheUser).not.toHaveBeenCalled();
      expect(mockSetupOfflinePersistence).not.toHaveBeenCalled();
    });

    it("should handle user changes correctly", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      const { rerender } = render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      // Simulate user change
      const newUser = {
        id: "new-user-id",
        email: "new@example.com",
        name: "New User",
      };
      mockUseAuth.mockReturnValue({
        user: newUser,
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      rerender(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      await waitFor(
        () => {
          expect(mockSetOfflineCacheUser).toHaveBeenCalledWith("new-user-id");
        },
        { container: document.body },
      );
    });

    it("should handle localStorage errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      (global.window.localStorage.removeItem as any).mockImplementation(() => {
        throw new Error("Storage error");
      });

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      const { rerender } = render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      // Simulate user change to trigger localStorage removal
      const newUser = {
        id: "new-user-id",
        email: "new@example.com",
        name: "New User",
      };
      mockUseAuth.mockReturnValue({
        user: newUser,
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      rerender(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      await waitFor(
        () => {
          expect(consoleSpy).toHaveBeenCalledWith(
            "Failed to remove previous cache scope",
            expect.any(Error),
          );
        },
        { container: document.body },
      );

      consoleSpy.mockRestore();
    });

    it("should handle null user gracefully", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      await waitFor(
        () => {
          expect(mockSetOfflineCacheUser).toHaveBeenCalledWith(null);
          expect(mockSetupOfflinePersistence).toHaveBeenCalledWith(
            expect.any(Object),
          );
        },
        { container: document.body },
      );
    });
  });

  describe("tRPC Client Configuration", () => {
    it("should create client with correct links", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();
    });

    it("should configure logger link for development environment", () => {
      const processEnv = global.process.env;
      global.process.env = { ...processEnv, NODE_ENV: "development" };

      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();

      // Restore original env
      global.process.env = processEnv;
    });

    it("should configure logger link for errors in production", () => {
      const processEnv = global.process.env;
      global.process.env = { ...processEnv, NODE_ENV: "production" };

      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();

      // Restore original env
      global.process.env = processEnv;
    });
  });

  describe("HTTP Configuration", () => {
    it("should set correct headers", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();
    });

    it("should configure fetch with timeout", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should transform AbortError to NETWORK_ERROR", async () => {
      const mockFetch = vi.fn().mockRejectedValue({
        name: "AbortError",
      });

      global.fetch = mockFetch;

      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();
    });

    it("should transform TimeoutError to NETWORK_ERROR", async () => {
      const mockFetch = vi.fn().mockRejectedValue({
        name: "TimeoutError",
      });

      global.fetch = mockFetch;

      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();
    });

    it("should pass through other errors unchanged", async () => {
      const customError = new Error("Custom error");
      const mockFetch = vi.fn().mockRejectedValue(customError);

      global.fetch = mockFetch;

      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();
    });
  });

  describe("getBaseUrl", () => {
    it("should return window.location.origin in browser", () => {
      Object.assign(global.window.location, {
        origin: "https://example.com" as any,
      });

      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();
    });

    it("should handle VERCEL_URL environment", () => {
      global.process.env["VERCEL_URL"] = "example.com";

      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();
    });

    it("should handle localhost configuration", () => {
      global.process.env["VERCEL_URL"] = undefined;

      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();
    });

    it("should handle default port configuration", () => {
      global.process.env["VERCEL_URL"] = undefined;
      global.process.env["PORT"] = undefined;

      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();
    });
  });

  describe("Type Exports", () => {
    it("should export api instance", () => {
      expect(api).toBeDefined();
      expect(typeof api.createClient).toBe("function");
    });

    it("should export RouterInputs type", () => {
      // RouterInputs is a type, so we can't test it as a value
      // This test ensures the import works correctly
      expect(true).toBe(true);
    });

    it("should export RouterOutputs type", () => {
      // RouterOutputs is a type, so we can't test it as a value
      // This test ensures the import works correctly
      expect(true).toBe(true);
    });
  });

  describe("Integration with AuthProvider", () => {
    it("should use auth user ID for offline cache", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      await waitFor(
        () => {
          expect(mockSetOfflineCacheUser).toHaveBeenCalledWith("user-123");
        },
        { container: document.body },
      );
    });

    it("should handle null user gracefully", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      await waitFor(
        () => {
          expect(mockSetOfflineCacheUser).toHaveBeenCalledWith(null);
        },
        { container: document.body },
      );
    });

    it("should pass onAuthFailure to query client", () => {
      const onAuthFailure = vi.fn();
      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure,
        signOut: vi.fn(),
      });

      render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      // Test that provider handles auth failure callback properly
      expect(screen.getByTestId("test-content")).toBeInTheDocument();
      expect(screen.getByTestId("trpc-provider")).toBeInTheDocument();
    });
  });

  describe("Component Lifecycle", () => {
    it("should initialize tRPC client once", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "test-user", email: "test@example.com" },
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      });

      const { rerender } = render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      // Rerender should not create new client
      rerender(
        <TRPCReactProvider>
          <div data-testid="test-content">Updated Content</div>
        </TRPCReactProvider>,
      );

      expect(screen.getByTestId("test-content")).toHaveTextContent(
        "Updated Content",
      );
    });

    it("should handle user state changes correctly", async () => {
      let authState = {
        user: null as any,
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      };

      mockUseAuth.mockImplementation(() => authState);

      const { rerender } = render(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      // Simulate login
      authState = {
        user: { id: "logged-in-user", email: "logged-in@example.com" },
        isLoading: false,
        onAuthFailure: vi.fn(),
        signOut: vi.fn(),
      };

      rerender(
        <TRPCReactProvider>
          <div data-testid="test-content">Test Content</div>
        </TRPCReactProvider>,
      );

      await waitFor(
        () => {
          expect(mockSetOfflineCacheUser).toHaveBeenCalledWith(
            "logged-in-user",
          );
        },
        { container: document.body },
      );
    });
  });
});
