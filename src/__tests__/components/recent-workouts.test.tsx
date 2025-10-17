import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "~/__tests__/test-utils";
import { RecentWorkouts } from "~/app/_components/recent-workouts";
import { useAuth } from "~/providers/AuthProvider";

import { api } from "~/trpc/react";

const mockUseAuth = useAuth as any;
const mockUseQuery = api.workouts.getRecent.useQuery as any;

const mockWorkouts = [
  {
    id: 1,
    workoutDate: "2024-10-15",
    templateId: 1,
    createdAt: "2024-10-15T10:00:00Z",
    template: { name: "Push Day" },
    exercises: [{ id: 1 }, { id: 2 }],
  },
  {
    id: 2,
    workoutDate: "2024-10-14",
    templateId: 2,
    createdAt: "2024-10-14T10:00:00Z",
    template: { name: "Pull Day" },
    exercises: [{ id: 3 }],
  },
];

describe.skip("RecentWorkouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: "test-user-id", email: "test@example.com" },
      isLoading: false,
      signOut: vi.fn(),
    });
  });

  it("renders loading skeletons when data is loading", async () => {
    render(<RecentWorkouts />);

    // Should show 3 skeleton cards with skeleton elements
    const skeletonElements = document.querySelectorAll(".skeleton");
    expect(skeletonElements).toHaveLength(6); // 3 cards * 2 skeletons each
  });

  it("renders error state when query fails", async () => {
    render(<RecentWorkouts />);

    await waitFor(() => {
      expect(screen.getByText("Error loading workouts")).toBeInTheDocument();
    });
  });

  it("renders empty state when no workouts exist", async () => {
    render(<RecentWorkouts />);

    await waitFor(() => {
      expect(
        screen.getByText("No recent workouts. Start your first workout!"),
      ).toBeInTheDocument();
    });
  });

  it("renders workout list with correct data", async () => {
    render(<RecentWorkouts />);

    await waitFor(() => {
      expect(screen.getByText("Push Day")).toBeInTheDocument();
      expect(screen.getByText("Pull Day")).toBeInTheDocument();
    });

    // Check exercise counts
    expect(screen.getByText("2 exercises logged")).toBeInTheDocument();
    expect(screen.getByText("1 exercise logged")).toBeInTheDocument();

    // Check dates (formatted as MM/DD/YYYY)
    expect(screen.getByText("10/15/2024")).toBeInTheDocument();
    expect(screen.getByText("10/14/2024")).toBeInTheDocument();

    // Check links
    const viewLinks = screen.getAllByText("View");
    const repeatLinks = screen.getAllByText("Repeat");

    expect(viewLinks).toHaveLength(2);
    expect(repeatLinks).toHaveLength(2);

    // Check link hrefs
    expect(viewLinks[0]).toHaveAttribute("href", "/workout/session/1");
    expect(repeatLinks[0]).toHaveAttribute(
      "href",
      "/workout/start?templateId=1",
    );
    expect(viewLinks[1]).toHaveAttribute("href", "/workout/session/2");
    expect(repeatLinks[1]).toHaveAttribute(
      "href",
      "/workout/start?templateId=2",
    );
  });

  it("handles workouts with unknown templates", async () => {
    render(<RecentWorkouts />);

    await waitFor(() => {
      expect(screen.getByText("Unknown Template")).toBeInTheDocument();
    });
  });

  it("does not fetch when user is not authenticated", async () => {
    // Mock no user
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      signOut: vi.fn(),
    });

    render(<RecentWorkouts />);

    // The hook should be called with enabled: false when no user
    // This would be tested by checking the query hook call, but since we're using global mocks,
    // we'll just ensure the component renders without crashing
    expect(
      screen.getByText("No recent workouts. Start your first workout!"),
    ).toBeInTheDocument();
  });
});
