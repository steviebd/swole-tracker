import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import posthog from "posthog-js";
import { PostHogProvider } from "~/providers/PostHogProvider";
import { env } from "~/env";

// Mock posthog-js
vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    reset: vi.fn(),
    identify: vi.fn(),
    capture: vi.fn(),
  },
}));

// Mock the env module
vi.mock("~/env", () => ({
  env: {
    NEXT_PUBLIC_POSTHOG_KEY: "test-key",
    NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
  },
}));

// Mock the AuthProvider context
const mockAuthContext = {
  user: null as any,
  isLoading: false,
  signOut: vi.fn(),
};

vi.mock("~/providers/AuthProvider", () => ({
  useAuth: () => mockAuthContext,
}));

describe("PostHogProvider", () => {
  const mockPosthog = posthog as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.location for tests
    delete (global as any).window;
    global.window = {
      location: { hostname: "example.com" },
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render children", () => {
    render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("should initialize PostHog with correct config when enabled", () => {
    render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(mockPosthog.init).toHaveBeenCalledWith("test-key", {
      api_host: "https://us.i.posthog.com",
      ui_host: "https://us.posthog.com",
      defaults: "2025-05-24",
      capture_exceptions: true,
      debug: false,
      capture_pageview: false,
    });
  });

  it("should not initialize PostHog on localhost", () => {
    global.window.location.hostname = "localhost";

    render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(mockPosthog.init).not.toHaveBeenCalled();
  });

  it("should not initialize PostHog with placeholder key", () => {
    vi.mocked(env).NEXT_PUBLIC_POSTHOG_KEY = "phc_test_dummy";

    render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(mockPosthog.init).not.toHaveBeenCalled();

    // Reset the env for subsequent tests
    vi.mocked(env).NEXT_PUBLIC_POSTHOG_KEY = "test-key";
  });

  it("should identify user when user is available", () => {
    mockAuthContext.user = {
      id: "user-123",
      email: "test@example.com",
      first_name: "John",
      last_name: "Doe",
      user_metadata: { display_name: "Johnny" },
    };

    render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(mockPosthog.identify).toHaveBeenCalledWith("user-123", {
      email: "test@example.com",
      name: "Johnny",
      first_name: "John",
      last_name: "Doe",
    });
    expect(mockPosthog.capture).toHaveBeenCalledWith("user_signed_in", {
      userId: "user-123",
      email: "test@example.com",
      timestamp: expect.any(String),
    });
  });

  it("should construct name from first and last name when no display_name", () => {
    mockAuthContext.user = {
      id: "user-123",
      email: "test@example.com",
      first_name: "Jane",
      last_name: "Smith",
      user_metadata: {},
    };

    render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(mockPosthog.identify).toHaveBeenCalledWith("user-123", {
      email: "test@example.com",
      name: "Jane Smith",
      first_name: "Jane",
      last_name: "Smith",
    });
  });

  it("should use email as name when no names available", () => {
    mockAuthContext.user = {
      id: "user-123",
      email: "test@example.com",
      first_name: null,
      last_name: null,
      user_metadata: {},
    };

    render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(mockPosthog.identify).toHaveBeenCalledWith("user-123", {
      email: "test@example.com",
      name: "test@example.com",
      first_name: null,
      last_name: null,
    });
  });

  it("should reset analytics when user logs out", () => {
    mockAuthContext.user = {
      id: "user-123",
      email: "test@example.com",
    };

    const { rerender } = render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    // User logs out
    mockAuthContext.user = null;

    rerender(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(mockPosthog.reset).toHaveBeenCalled();
  });

  it("should not re-identify same user", () => {
    mockAuthContext.user = {
      id: "user-123",
      email: "test@example.com",
    };

    const { rerender } = render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    expect(mockPosthog.identify).toHaveBeenCalledTimes(1);

    // Re-render with same user
    rerender(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    // Should not identify again
    expect(mockPosthog.identify).toHaveBeenCalledTimes(1);
  });

  it("should reset PostHog on unmount", () => {
    const { unmount } = render(
      <PostHogProvider>
        <div>Test Child</div>
      </PostHogProvider>,
    );

    unmount();

    expect(mockPosthog.reset).toHaveBeenCalled();
  });

  it("should handle PostHog initialization errors gracefully", () => {
    mockPosthog.init.mockImplementation(() => {
      throw new Error("PostHog init failed");
    });

    // Should not throw
    expect(() => {
      render(
        <PostHogProvider>
          <div>Test Child</div>
        </PostHogProvider>,
      );
    }).not.toThrow();

    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("should handle user identification errors gracefully", () => {
    mockPosthog.identify.mockImplementation(() => {
      throw new Error("Identification failed");
    });

    mockAuthContext.user = {
      id: "user-123",
      email: "test@example.com",
    };

    // Should not throw
    expect(() => {
      render(
        <PostHogProvider>
          <div>Test Child</div>
        </PostHogProvider>,
      );
    }).not.toThrow();

    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });
});
