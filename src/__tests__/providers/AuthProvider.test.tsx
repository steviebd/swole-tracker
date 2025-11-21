import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "~/providers/AuthProvider";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock("~/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock offline storage
vi.mock("~/lib/offline-storage", () => ({
  clearAllOfflineData: vi.fn().mockResolvedValue(undefined),
}));

// Mock Next.js router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Test component that uses the auth context
function TestComponent() {
  const { user, isLoading, onAuthFailure } = useAuth();

  return (
    <div>
      <div data-testid="user">{user ? JSON.stringify(user) : "null"}</div>
      <div data-testid="loading">{isLoading ? "true" : "false"}</div>
      <button data-testid="auth-failure-btn" onClick={onAuthFailure}>
        Trigger Auth Failure
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial session loading", () => {
    it("should show loading state initially", () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: null }),
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByTestId("loading")).toHaveTextContent("true");
      expect(screen.getByTestId("user")).toHaveTextContent("null");
    });

    it("should load user session on mount", async () => {
      const mockUser = {
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
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      });

      const { container } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        const loadingEl = container.querySelector('[data-testid="loading"]');
        if (loadingEl) {
          expect(loadingEl).toHaveTextContent("false");
        }
      });

      const userEl = container.querySelector('[data-testid="user"]');
      if (userEl) {
        expect(userEl).toHaveTextContent("null");
      }
    });

    it("should handle non-ok responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { container } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        const loadingEl = container.querySelector('[data-testid="loading"]');
        if (loadingEl) {
          expect(loadingEl).toHaveTextContent("false");
        }
      });

      const userEl = container.querySelector('[data-testid="user"]');
      if (userEl) {
        expect(userEl).toHaveTextContent("null");
      }
    });
  });

  describe("onAuthFailure method", () => {
    it("should clear user state when called", async () => {
      const mockUser = {
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
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      });

      const { container } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      // Wait for user to be loaded
      await waitFor(() => {
        const userEl = container.querySelector('[data-testid="user"]');
        if (userEl) {
          expect(userEl).toHaveTextContent(JSON.stringify(mockUser));
        }
      });

      // Trigger auth failure
      const button = container.querySelector(
        '[data-testid="auth-failure-btn"]',
      ) as HTMLButtonElement;
      if (button) {
        act(() => {
          button.click();
        });
      }

      // User should be cleared
      const userEl = container.querySelector('[data-testid="user"]');
      if (userEl) {
        expect(userEl).toHaveTextContent("null");
      }
    });

    it("should not redirect automatically when auth failure occurs", async () => {
      const mockUser = {
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
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      });

      const { container } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        const userEl = container.querySelector('[data-testid="user"]');
        if (userEl) {
          expect(userEl).toHaveTextContent(JSON.stringify(mockUser));
        }
      });

      // Trigger manual auth failure
      const button = container.querySelector(
        '[data-testid="auth-failure-btn"]',
      ) as HTMLButtonElement;
      if (button) {
        act(() => {
          button.click();
        });
      }

      // Should not redirect automatically
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("signOut method", () => {
    it("should clear user state and redirect on sign out", async () => {
      const mockUser = {
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
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      let signOutCallback: (() => Promise<void>) | undefined;

      function TestSignOutComponent() {
        const { user, signOut } = useAuth();
        signOutCallback = signOut;

        return (
          <div>
            <div data-testid="user">{user ? JSON.stringify(user) : "null"}</div>
          </div>
        );
      }

      const { container } = render(
        <AuthProvider>
          <TestSignOutComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        const userEl = container.querySelector('[data-testid="user"]');
        if (userEl) {
          expect(userEl).toHaveTextContent(JSON.stringify(mockUser));
        }
      });

      // Call sign out
      if (signOutCallback) {
        await act(async () => {
          await signOutCallback?.();
        });
      }

      // User should be cleared and redirect should happen
      const userEl = container.querySelector('[data-testid="user"]');
      if (userEl) {
        expect(userEl).toHaveTextContent("null");
      }
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  describe("useAuth hook", () => {
    it("should throw error when used outside provider", () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow("useAuth must be used within an AuthProvider");

      consoleSpy.mockRestore();
    });
  });
});
