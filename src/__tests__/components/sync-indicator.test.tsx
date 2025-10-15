import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "~/__tests__/test-utils";
import { SyncIndicator } from "~/app/_components/sync-indicator";

// Mock the useSyncIndicator hook - declare mock before vi.mock
let mockUseSyncIndicator: any;
vi.mock("~/hooks/use-sync-indicator", () => ({
  useSyncIndicator: (...args: any[]) => mockUseSyncIndicator(...args),
}));
mockUseSyncIndicator = vi.fn();

describe("SyncIndicator", () => {
  it("does not render when idle and not active", () => {
    mockUseSyncIndicator.mockReturnValue({
      status: "idle",
      isActive: false,
      badgeText: "All synced",
      tone: "success",
      description: "All changes are synced and ready.",
      pendingOperations: 0,
      failedOperations: 0,
      isOnline: true,
      isBusy: false,
      manualSync: vi.fn(),
      canManualSync: false,
    });

    const { container } = render(<SyncIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("renders with saving state", () => {
    mockUseSyncIndicator.mockReturnValue({
      status: "saving",
      isActive: true,
      badgeText: "Saving...",
      tone: "info",
      description: "Saving updates locally before syncing.",
      pendingOperations: 1,
      failedOperations: 0,
      isOnline: true,
      isBusy: true,
      manualSync: vi.fn(),
      canManualSync: false,
    });

    render(<SyncIndicator />);

    expect(screen.getByText("Saving...")).toBeInTheDocument();
    const indicator = screen.getByText("Saving...").closest("div");
    expect(indicator).toHaveClass("bg-blue-600");

    // Should have animated dots
    const dots = document.querySelectorAll('[data-testid="animated-dot"]');
    expect(dots).toHaveLength(3);
  });

  it("renders with syncing state", () => {
    mockUseSyncIndicator.mockReturnValue({
      status: "syncing",
      isActive: true,
      badgeText: "Syncing...",
      tone: "info",
      description: "Syncing queued updates with the server.",
      pendingOperations: 2,
      failedOperations: 0,
      isOnline: true,
      isBusy: true,
      manualSync: vi.fn(),
      canManualSync: false,
    });

    render(<SyncIndicator />);

    expect(screen.getByText("Syncing...")).toBeInTheDocument();
    const indicator = screen.getByText("Syncing...").closest("div");
    expect(indicator).toHaveClass("bg-blue-600");

    // Should have animated dots
    const dots = document.querySelectorAll('[data-testid="animated-dot"]');
    expect(dots).toHaveLength(3);
  });

  it("renders with offline state", () => {
    mockUseSyncIndicator.mockReturnValue({
      status: "offline",
      isActive: true,
      badgeText: "Offline",
      tone: "warning",
      description:
        "You're offline. We'll queue updates until you're back online.",
      pendingOperations: 0,
      failedOperations: 0,
      isOnline: false,
      isBusy: false,
      manualSync: vi.fn(),
      canManualSync: false,
    });

    render(<SyncIndicator />);

    expect(screen.getByText("Offline")).toBeInTheDocument();
    const indicator = screen.getByText("Offline").closest("div");
    expect(indicator).toHaveClass("bg-orange-600");

    // Should have pulsing dot
    const pulseDot = document.querySelector('[data-testid="pulse-dot"]');
    expect(pulseDot).toBeInTheDocument();
  });

  it("renders with error state", () => {
    mockUseSyncIndicator.mockReturnValue({
      status: "error",
      isActive: true,
      badgeText: "Needs attention",
      tone: "danger",
      description: "Some updates need attention. Retry sync when you're ready.",
      pendingOperations: 1,
      failedOperations: 1,
      isOnline: true,
      isBusy: false,
      manualSync: vi.fn(),
      canManualSync: true,
    });

    render(<SyncIndicator />);

    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    const indicator = screen.getByText("Needs attention").closest("div");
    expect(indicator).toHaveClass("bg-red-600");

    // Should have error indicator
    const errorIndicator = document.querySelector(
      '[data-testid="error-indicator"]',
    );
    expect(errorIndicator).toBeInTheDocument();
  });

  it("renders with offline state and pending operations", () => {
    mockUseSyncIndicator.mockReturnValue({
      status: "offline",
      isActive: true,
      badgeText: "Offline (3)",
      tone: "warning",
      description:
        "You're offline. We'll queue updates until you're back online.",
      pendingOperations: 3,
      failedOperations: 0,
      isOnline: false,
      isBusy: false,
      manualSync: vi.fn(),
      canManualSync: false,
    });

    render(<SyncIndicator />);

    expect(screen.getByText("Offline (3)")).toBeInTheDocument();
  });

  it("renders with error state and pending operations", () => {
    mockUseSyncIndicator.mockReturnValue({
      status: "error",
      isActive: true,
      badgeText: "2 to retry",
      tone: "danger",
      description: "Some updates need attention. Retry sync when you're ready.",
      pendingOperations: 2,
      failedOperations: 1,
      isOnline: true,
      isBusy: false,
      manualSync: vi.fn(),
      canManualSync: true,
    });

    render(<SyncIndicator />);

    expect(screen.getByText("2 to retry")).toBeInTheDocument();
  });
});
