import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import LocalWorkoutSessionPage from "~/app/workout/session/local/[localId]/page";
import { SessionCookie } from "~/lib/session-cookie";
import { RedirectCountdown } from "~/app/workout/session/local/[localId]/redirect-countdown";

// Mock dependencies
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("~/lib/session-cookie", () => ({
  SessionCookie: {
    get: vi.fn(),
    isExpired: vi.fn(),
  },
}));

vi.mock("~/app/workout/session/local/[localId]/redirect-countdown", () => ({
  RedirectCountdown: vi.fn(({ href, seconds = 5 }) => (
    <div data-testid="redirect-countdown">
      <span data-testid="redirect-href">{href}</span>
      <span data-testid="redirect-seconds">{seconds}</span>
      <p>Redirecting in {seconds} seconds...</p>
    </div>
  )),
}));

describe("LocalWorkoutSessionPage", () => {
  const mockHeaders = vi.mocked(headers);
  const mockRedirect = vi.mocked(redirect);
  const mockSessionCookieGet = vi.mocked(SessionCookie.get);
  const mockSessionCookieIsExpired = vi.mocked(SessionCookie.isExpired);
  const mockRedirectCountdown = vi.mocked(RedirectCountdown);

  const mockHeadersList = new Map([
    ["cookie", "session=test-session"],
    ["user-agent", "test-agent"],
  ]);

  const mockSession = {
    userId: "test-user-id",
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    accessTokenExpiresAt: Math.floor((Date.now() + 3600000) / 1000),
    sessionExpiresAt: Math.floor((Date.now() + 7200000) / 1000),
    expiresAt: Math.floor((Date.now() + 3600000) / 1000),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(mockHeadersList as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("should redirect to login when no session exists", async () => {
      mockSessionCookieGet.mockResolvedValue(null);

      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
      });
    });

    it("should redirect to login when session is expired", async () => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(true);

      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
      });
    });

    it("should not redirect when session is valid", async () => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);

      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        expect(mockRedirect).not.toHaveBeenCalled();
      });
    });
  });

  describe("Page Content", () => {
    beforeEach(() => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);
    });

    it("should render main container with correct classes", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        const container = screen
          .getByText("Local Session Not Found")
          .closest(".flex");
        expect(container).toHaveClass(
          "min-h-screen",
          "items-center",
          "justify-center",
          "px-4",
        );
      });
    });

    it("should render error title", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        const title = screen.getByText("Local Session Not Found");
        expect(title).toBeInTheDocument();
        expect(title).toHaveClass(
          "text-destructive",
          "mb-4",
          "text-2xl",
          "font-bold",
        );
      });
    });

    it("should render error message about local sessions", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        const message = screen.getByText(
          /Local workout sessions are no longer supported/,
        );
        expect(message).toBeInTheDocument();
        expect(message).toHaveClass("text-muted-foreground", "mb-6");
      });
    });

    it("should display the local session ID", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id-123" }),
      });
      render(Component);

      await waitFor(() => {
        const sessionId = screen.getByText("Session ID: test-local-id-123");
        expect(sessionId).toBeInTheDocument();
        expect(sessionId).toHaveClass(
          "text-muted-foreground",
          "mt-4",
          "text-xs",
        );
      });
    });
  });

  describe("Next Steps Section", () => {
    beforeEach(() => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);
    });

    it("should render next steps container", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        const nextSteps = screen
          .getByText("Next steps")
          .closest(".border-border\\/60");
        expect(nextSteps).toBeInTheDocument();
        expect(nextSteps).toHaveClass(
          "border-border/60",
          "bg-muted/20",
          "text-muted-foreground",
          "mb-6",
          "rounded-lg",
          "border",
          "p-4",
          "text-left",
          "text-sm",
        );
      });
    });

    it("should render next steps title", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        const title = screen.getByText("Next steps");
        expect(title).toBeInTheDocument();
        expect(title).toHaveClass("text-foreground", "mb-2", "font-semibold");
      });
    });

    it("should render sync tray instruction", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        const syncInstruction = screen.getByText(
          /Open the sync tray in the header/,
        );
        expect(syncInstruction).toBeInTheDocument();
      });
    });

    it("should render stable connection instruction", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        const connectionInstruction = screen.getByText(
          /If the workout still appears as pending/,
        );
        expect(connectionInstruction).toBeInTheDocument();
      });
    });
  });

  describe("Action Buttons", () => {
    beforeEach(() => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);
    });

    it("should render View Workout History button", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        const historyButton = screen.getByText("View Workout History");
        expect(historyButton).toBeInTheDocument();
        expect(historyButton.closest("a")).toHaveAttribute("href", "/workouts");
        expect(historyButton.closest("a")).toHaveClass("btn-primary");
      });
    });

    it("should render Start New Workout button", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        const startButton = screen.getByText("Start New Workout");
        expect(startButton).toBeInTheDocument();
        expect(startButton.closest("a")).toHaveAttribute(
          "href",
          "/workout/start",
        );
        expect(startButton.closest("a")).toHaveClass(
          "btn-secondary",
          "px-4",
          "py-2",
        );
      });
    });

    it("should render button container with correct classes", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        const buttonContainer = screen
          .getByText("View Workout History")
          .closest(".flex");
        expect(buttonContainer).toHaveClass(
          "flex",
          "flex-wrap",
          "items-center",
          "justify-center",
          "gap-3",
        );
      });
    });
  });

  describe("Redirect Countdown", () => {
    beforeEach(() => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);
    });

    it("should render RedirectCountdown component", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        const countdown = screen.getByTestId("redirect-countdown");
        expect(countdown).toBeInTheDocument();
      });
    });

    it("should pass correct href to RedirectCountdown", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        const href = screen.getByTestId("redirect-href");
        expect(href).toHaveTextContent("/workouts");
      });
    });

    it("should pass default seconds to RedirectCountdown", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        const seconds = screen.getByTestId("redirect-seconds");
        expect(seconds).toHaveTextContent("5");
      });
    });

    it("should call RedirectCountdown with correct props", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        expect(mockRedirectCountdown).toHaveBeenCalledWith(
          {
            href: "/workouts",
          },
          undefined,
        );
      });
    });
  });

  describe("Support Link", () => {
    beforeEach(() => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);
    });

    it("should render support link", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        const supportLink = screen.getByText("Need help? Contact support");
        expect(supportLink).toBeInTheDocument();
        expect(supportLink.closest("a")).toHaveAttribute("href", "/support");
        expect(supportLink.closest("a")).toHaveClass(
          "text-primary",
          "mt-3",
          "inline-flex",
          "items-center",
          "justify-center",
          "text-sm",
          "font-medium",
          "underline",
        );
      });
    });
  });

  describe("Parameter Handling", () => {
    beforeEach(() => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);
    });

    it("should handle different localId values", async () => {
      const testCases = [
        "local-123",
        "abc-def-456",
        "12345",
        "special-chars_!@",
      ];

      for (const localId of testCases) {
        vi.clearAllMocks();
        mockSessionCookieGet.mockResolvedValue(mockSession);
        mockSessionCookieIsExpired.mockReturnValue(false);

        const Component = await LocalWorkoutSessionPage({
          params: Promise.resolve({ localId }),
        });
        render(Component);

        await waitFor(() => {
          const sessionId = screen.getByText(`Session ID: ${localId}`);
          expect(sessionId).toBeInTheDocument();
        });
      }
    });

    it("should handle empty localId", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "" }),
      });
      render(Component);

      await waitFor(() => {
        const sessionId = screen.getByText(/Session ID:/);
        expect(sessionId).toBeInTheDocument();
        expect(sessionId).toHaveTextContent("Session ID:");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle headers() errors gracefully", async () => {
      mockHeaders.mockRejectedValue(new Error("Headers error"));

      // Should handle the error and not crash
      await expect(
        LocalWorkoutSessionPage({
          params: Promise.resolve({ localId: "test-local-id" }),
        }),
      ).resolves.toBeDefined();
    });

    it("should handle params parsing errors", async () => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);

      // Should handle the error and not crash
      await expect(
        LocalWorkoutSessionPage({
          params: Promise.reject(new Error("Params error")),
        }),
      ).resolves.toBeDefined();
    });
  });

  describe("Component Integration", () => {
    beforeEach(() => {
      mockSessionCookieGet.mockResolvedValue(mockSession);
      mockSessionCookieIsExpired.mockReturnValue(false);
    });

    it("should integrate all components correctly", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "integration-test" }),
      });
      render(Component);

      await waitFor(() => {
        // Check all main elements are rendered
        expect(screen.getByText("Local Session Not Found")).toBeInTheDocument();
        expect(screen.getByText("Next steps")).toBeInTheDocument();
        expect(screen.getByText("View Workout History")).toBeInTheDocument();
        expect(screen.getByText("Start New Workout")).toBeInTheDocument();
        expect(screen.getByTestId("redirect-countdown")).toBeInTheDocument();
        expect(
          screen.getByText("Session ID: integration-test"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("Need help? Contact support"),
        ).toBeInTheDocument();
      });
    });

    it("should maintain responsive design classes", async () => {
      const Component = await LocalWorkoutSessionPage({
        params: Promise.resolve({ localId: "test-local-id" }),
      });
      render(Component);

      await waitFor(() => {
        const mainContainer = screen
          .getByText("Local Session Not Found")
          .closest(".flex");
        expect(mainContainer).toHaveClass("px-4"); // Responsive padding

        const buttonContainer = screen
          .getByText("View Workout History")
          .closest(".flex");
        expect(buttonContainer).toHaveClass("flex-wrap"); // Responsive wrapping
      });
    });
  });
});
