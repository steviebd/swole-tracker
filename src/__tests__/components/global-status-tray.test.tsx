import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GlobalStatusTray } from "~/components/global-status-tray";

// Mock the hooks and providers
vi.mock("~/hooks/use-sync-indicator", () => ({
  useSyncIndicator: () => ({
    status: "idle",
    tone: "success",
    badgeText: "Synced",
    description: "All data is up to date",
    isOnline: true,
    isBusy: false,
    canManualSync: true,
    pendingOperations: 0,
    failedOperations: 0,
    lastSync: new Date(),
    manualSync: vi.fn(),
  }),
}));

vi.mock("~/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "test-user" },
  }),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    healthAdvice: {
      getHistory: {
        useQuery: () => ({
          data: [{ readiness_rho: 0.8, createdAt: new Date() }],
          isLoading: false,
        }),
      },
    },
  },
}));

vi.mock("~/lib/readiness", () => ({
  getReadinessSummary: () => ({
    label: "Good",
    message: "You're in good shape",
    tone: "success" as const,
  }),
}));

describe("GlobalStatusTray", () => {
  it("exports a component", async () => {
    const module = await import("~/components/global-status-tray");
    expect(typeof module.GlobalStatusTray).toBe("function");
  });

  it("renders without crashing", () => {
    render(<GlobalStatusTray />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows sync status", () => {
    render(<GlobalStatusTray />);
    expect(screen.getByText("Synced")).toBeInTheDocument();
  });
});
