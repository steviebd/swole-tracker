/// <reference types="vitest" />
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "~/__tests__/test-utils";
import { SyncIndicator } from "~/app/_components/sync-indicator";
import { type UseSyncIndicatorResult } from "~/hooks/use-sync-indicator";

const useSyncIndicatorMock = vi.fn<() => UseSyncIndicatorResult>();

const createIndicatorState = (
  overrides: Partial<UseSyncIndicatorResult> = {},
): UseSyncIndicatorResult => ({
  status: "idle",
  isActive: false,
  tone: "success",
  badgeText: "All synced",
  description: "All changes are synced and ready.",
  pendingOperations: 0,
  failedOperations: 0,
  lastSync: undefined,
  nextRetry: undefined,
  isOnline: true,
  isBusy: false,
  manualSync: vi.fn(),
  canManualSync: false,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  useSyncIndicatorMock.mockReturnValue(createIndicatorState());
});

describe("SyncIndicator", () => {
  it("does not render when idle and not active", () => {
    useSyncIndicatorMock.mockReturnValue(
      createIndicatorState({ status: "idle", isActive: false }),
    );

    render(
      <SyncIndicator useSyncIndicatorHook={useSyncIndicatorMock} />,
    );

    expect(screen.queryByText("All synced")).not.toBeInTheDocument();
  });

  it("renders saving state with animated dots", () => {
    useSyncIndicatorMock.mockReturnValue(
      createIndicatorState({
        status: "saving",
        isActive: true,
        tone: "info",
        badgeText: "Saving...",
        isBusy: true,
      }),
    );

    render(
      <SyncIndicator useSyncIndicatorHook={useSyncIndicatorMock} />,
    );

    expect(screen.getByText("Saving...")).toBeInTheDocument();
    const indicator = screen.getByText("Saving...").closest("div");
    expect(indicator).toHaveClass("bg-blue-600");
    expect(document.querySelectorAll('[data-testid="animated-dot"]')).toHaveLength(3);
  });

  it("renders syncing state with animated dots", () => {
    useSyncIndicatorMock.mockReturnValue(
      createIndicatorState({
        status: "syncing",
        isActive: true,
        tone: "info",
        badgeText: "Syncing...",
        isBusy: true,
      }),
    );

    render(
      <SyncIndicator useSyncIndicatorHook={useSyncIndicatorMock} />,
    );

    expect(screen.getByText("Syncing...")).toBeInTheDocument();
    const indicator = screen.getByText("Syncing...").closest("div");
    expect(indicator).toHaveClass("bg-blue-600");
    expect(document.querySelectorAll('[data-testid="animated-dot"]')).toHaveLength(3);
  });

  it("renders offline state with pulse indicator", () => {
    useSyncIndicatorMock.mockReturnValue(
      createIndicatorState({
        status: "offline",
        isActive: true,
        tone: "warning",
        badgeText: "Offline",
        isOnline: false,
      }),
    );

    render(
      <SyncIndicator useSyncIndicatorHook={useSyncIndicatorMock} />,
    );

    expect(screen.getByText("Offline")).toBeInTheDocument();
    const indicator = screen.getByText("Offline").closest("div");
    expect(indicator).toHaveClass("bg-orange-600");
    expect(document.querySelector('[data-testid="pulse-dot"]')).toBeInTheDocument();
  });

  it("renders error state with indicator", () => {
    useSyncIndicatorMock.mockReturnValue(
      createIndicatorState({
        status: "error",
        isActive: true,
        tone: "danger",
        badgeText: "Needs attention",
        failedOperations: 1,
      }),
    );

    render(
      <SyncIndicator useSyncIndicatorHook={useSyncIndicatorMock} />,
    );

    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    const indicator = screen.getByText("Needs attention").closest("div");
    expect(indicator).toHaveClass("bg-red-600");
    expect(document.querySelector('[data-testid="error-indicator"]')).toBeInTheDocument();
  });

  it("renders offline state with pending operations", () => {
    useSyncIndicatorMock.mockReturnValue(
      createIndicatorState({
        status: "offline",
        isActive: true,
        tone: "warning",
        badgeText: "Offline (3)",
        pendingOperations: 3,
        isOnline: false,
      }),
    );

    render(
      <SyncIndicator useSyncIndicatorHook={useSyncIndicatorMock} />,
    );

    expect(screen.getByText("Offline (3)")).toBeInTheDocument();
  });

  it("renders error state with retry count", () => {
    useSyncIndicatorMock.mockReturnValue(
      createIndicatorState({
        status: "error",
        isActive: true,
        tone: "danger",
        badgeText: "2 to retry",
        pendingOperations: 2,
        failedOperations: 1,
      }),
    );

    render(
      <SyncIndicator useSyncIndicatorHook={useSyncIndicatorMock} />,
    );

    expect(screen.getByText("2 to retry")).toBeInTheDocument();
  });
});
