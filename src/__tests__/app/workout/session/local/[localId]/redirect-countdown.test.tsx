import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { useRouter } from "next/navigation";
import { RedirectCountdown } from "~/app/workout/session/local/[localId]/redirect-countdown";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("RedirectCountdown", () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  const mockRouter = { push: mockPush, replace: mockReplace };
  const mockUseRouter = vi.mocked(useRouter);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUseRouter.mockReturnValue(mockRouter as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Default Behavior", () => {
    it("should render with default 5 seconds", () => {
      render(<RedirectCountdown href="/test" />);

      expect(
        screen.getByText("Redirecting to your workout history in 5 seconds."),
      ).toBeInTheDocument();
    });

    it("should render with custom seconds", () => {
      render(<RedirectCountdown href="/test" seconds={10} />);

      expect(
        screen.getByText("Redirecting to your workout history in 10 seconds."),
      ).toBeInTheDocument();
    });

    it("should render with singular 'second' when 1 second remains", () => {
      render(<RedirectCountdown href="/test" seconds={1} />);

      expect(
        screen.getByText("Redirecting to your workout history in 1 second."),
      ).toBeInTheDocument();
    });

    it("should render with plural 'seconds' when multiple seconds remain", () => {
      render(<RedirectCountdown href="/test" seconds={3} />);

      expect(
        screen.getByText("Redirecting to your workout history in 3 seconds."),
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have correct role attribute", () => {
      render(<RedirectCountdown href="/test" />);

      const countdownElement = screen.getByRole("status");
      expect(countdownElement).toBeInTheDocument();
    });

    it("should have aria-live attribute set to polite", () => {
      render(<RedirectCountdown href="/test" />);

      const countdownElement = screen.getByRole("status");
      expect(countdownElement).toHaveAttribute("aria-live", "polite");
    });

    it("should have correct CSS classes", () => {
      render(<RedirectCountdown href="/test" />);

      const countdownElement = screen.getByRole("status");
      expect(countdownElement).toHaveClass(
        "mt-6",
        "text-sm",
        "text-muted-foreground",
      );
    });
  });

  describe("Countdown Functionality", () => {
    it("should countdown from 5 to 1", async () => {
      render(<RedirectCountdown href="/test" seconds={5} />);

      // Initial state
      expect(
        screen.getByText("Redirecting to your workout history in 5 seconds."),
      ).toBeInTheDocument();

      // Advance time by 1 second
      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(
          screen.getByText("Redirecting to your workout history in 4 seconds."),
        ).toBeInTheDocument();
      });

      // Advance to 3 seconds
      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(
          screen.getByText("Redirecting to your workout history in 3 seconds."),
        ).toBeInTheDocument();
      });

      // Advance to 2 seconds
      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(
          screen.getByText("Redirecting to your workout history in 2 seconds."),
        ).toBeInTheDocument();
      });

      // Advance to 1 second
      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(
          screen.getByText("Redirecting to your workout history in 1 second."),
        ).toBeInTheDocument();
      });
    });

    it("should handle countdown from custom starting value", async () => {
      render(<RedirectCountdown href="/test" seconds={3} />);

      expect(
        screen.getByText("Redirecting to your workout history in 3 seconds."),
      ).toBeInTheDocument();

      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(
          screen.getByText("Redirecting to your workout history in 2 seconds."),
        ).toBeInTheDocument();
      });

      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(
          screen.getByText("Redirecting to your workout history in 1 second."),
        ).toBeInTheDocument();
      });
    });

    it("should stop at 0 and not show negative numbers", async () => {
      render(<RedirectCountdown href="/test" seconds={2} />);

      expect(
        screen.getByText("Redirecting to your workout history in 2 seconds."),
      ).toBeInTheDocument();

      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(
          screen.getByText("Redirecting to your workout history in 1 second."),
        ).toBeInTheDocument();
      });

      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(
          screen.getByText("Redirecting to your workout history in 0 seconds."),
        ).toBeInTheDocument();
      });

      // Should not go below 0
      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(
          screen.getByText("Redirecting to your workout history in 0 seconds."),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Redirect Functionality", () => {
    it("should call router.replace after countdown completes", async () => {
      render(<RedirectCountdown href="/target-page" seconds={2} />);

      // Fast-forward to completion
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/target-page");
      });
    });

    it("should call router.replace with correct href", async () => {
      const testHref = "/workouts/history";
      render(<RedirectCountdown href={testHref} seconds={1} />);

      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(testHref);
      });
    });

    it("should not redirect before countdown completes", async () => {
      render(<RedirectCountdown href="/test" seconds={3} />);

      vi.advanceTimersByTime(2000); // Only 2 seconds passed

      await waitFor(() => {
        expect(mockReplace).not.toHaveBeenCalled();
      });
    });

    it("should redirect exactly at the specified time", async () => {
      render(<RedirectCountdown href="/test" seconds={5} />);

      vi.advanceTimersByTime(4999); // Just before completion

      await waitFor(() => {
        expect(mockReplace).not.toHaveBeenCalled();
      });

      vi.advanceTimersByTime(1); // Complete

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/test");
      });
    });
  });

  describe("Cleanup", () => {
    it("should clear interval and timeout on unmount", () => {
      const clearIntervalSpy = vi.spyOn(window, "clearInterval");
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

      const { unmount } = render(
        <RedirectCountdown href="/test" seconds={5} />,
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    });

    it("should not redirect after unmount", async () => {
      const { unmount } = render(
        <RedirectCountdown href="/test" seconds={2} />,
      );

      // Unmount before countdown completes
      unmount();

      // Advance time beyond what would have been the redirect
      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockReplace).not.toHaveBeenCalled();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle 0 seconds as starting value", () => {
      render(<RedirectCountdown href="/test" seconds={0} />);

      expect(
        screen.getByText("Redirecting to your workout history in 0 seconds."),
      ).toBeInTheDocument();
    });

    it("should redirect immediately when starting with 0 seconds", async () => {
      render(<RedirectCountdown href="/test" seconds={0} />);

      vi.advanceTimersByTime(0);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/test");
      });
    });

    it("should handle negative seconds gracefully", () => {
      render(<RedirectCountdown href="/test" seconds={-1} />);

      // Should still render without crashing
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should handle very large countdown values", async () => {
      render(<RedirectCountdown href="/test" seconds={100} />);

      expect(
        screen.getByText("Redirecting to your workout history in 100 seconds."),
      ).toBeInTheDocument();

      // Test a few increments to ensure it works with large numbers
      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(
          screen.getByText(
            "Redirecting to your workout history in 99 seconds.",
          ),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Timer Precision", () => {
    it("should use 1000ms intervals", async () => {
      render(<RedirectCountdown href="/test" seconds={3} />);

      expect(
        screen.getByText("Redirecting to your workout history in 3 seconds."),
      ).toBeInTheDocument();

      // Test exact 1000ms intervals
      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(
          screen.getByText("Redirecting to your workout history in 2 seconds."),
        ).toBeInTheDocument();
      });

      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(
          screen.getByText("Redirecting to your workout history in 1 second."),
        ).toBeInTheDocument();
      });
    });

    it("should handle sub-second timing correctly", async () => {
      render(<RedirectCountdown href="/test" seconds={2} />);

      // Advance less than 1 second - should not change
      vi.advanceTimersByTime(500);
      await waitFor(() => {
        expect(
          screen.getByText("Redirecting to your workout history in 2 seconds."),
        ).toBeInTheDocument();
      });

      // Advance the remaining 500ms - should change
      vi.advanceTimersByTime(500);
      await waitFor(() => {
        expect(
          screen.getByText("Redirecting to your workout history in 1 second."),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Component Re-rendering", () => {
    it("should handle prop changes correctly", async () => {
      const { rerender } = render(
        <RedirectCountdown href="/test1" seconds={3} />,
      );

      expect(
        screen.getByText("Redirecting to your workout history in 3 seconds."),
      ).toBeInTheDocument();

      // Advance time
      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(
          screen.getByText("Redirecting to your workout history in 2 seconds."),
        ).toBeInTheDocument();
      });

      // Rerender with new props
      rerender(<RedirectCountdown href="/test2" seconds={5} />);

      // Should reset with new props
      expect(
        screen.getByText("Redirecting to your workout history in 5 seconds."),
      ).toBeInTheDocument();
    });

    it("should cleanup previous timers on prop changes", async () => {
      const { rerender } = render(
        <RedirectCountdown href="/test1" seconds={2} />,
      );

      // Advance time partially
      vi.advanceTimersByTime(1000);

      // Rerender with different href
      rerender(<RedirectCountdown href="/test2" seconds={2} />);

      // Complete the countdown
      vi.advanceTimersByTime(2000);

      // Should redirect to the new href
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/test2");
      });
    });
  });
});
