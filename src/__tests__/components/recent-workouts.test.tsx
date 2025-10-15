import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "~/__tests__/test-utils";
import { RecentWorkouts } from "~/app/_components/recent-workouts";

// Mock tRPC - declare mock before vi.mock
let mockUseQuery: any;
vi.mock("~/trpc/react", () => ({
  api: {
    workouts: {
      getRecent: {
        useQuery: (...args: any[]) => mockUseQuery(...args),
      },
    },
  },
  TRPCReactProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
mockUseQuery = vi.fn();

// Mock AuthProvider
const mockUseAuth = vi.fn(() => ({
  user: { id: "test-user-id" },
  isLoading: false,
}));
vi.mock("~/providers/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useAuth: () => mockUseAuth(),
}));

const mockWorkouts = [
  {
    id: 1,
    workoutDate: "2024-10-15",
    templateId: 1,
    createdAt: "2024-10-15T10:00:00Z",
    template: {
      id: 1,
      name: "Push Day",
    },
    exercises: [
      { id: 1, exerciseName: "Bench Press" },
      { id: 2, exerciseName: "Shoulder Press" },
    ],
  },
  {
    id: 2,
    workoutDate: "2024-10-14",
    templateId: 2,
    createdAt: "2024-10-14T10:00:00Z",
    template: {
      id: 2,
      name: "Pull Day",
    },
    exercises: [{ id: 3, exerciseName: "Deadlift" }],
  },
];

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

describe("RecentWorkouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeletons when data is loading", async () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      trpc: {},
    });

    render(
      <TestWrapper>
        <RecentWorkouts />
      </TestWrapper>,
    );

    // Should show 3 skeleton cards with skeleton elements
    const skeletonElements = document.querySelectorAll(".skeleton");
    expect(skeletonElements).toHaveLength(6); // 3 cards * 2 skeletons each
  });

  it("renders error state when query fails", async () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "Network error" },
      trpc: {},
    });

    render(
      <TestWrapper>
        <RecentWorkouts />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Error loading workouts")).toBeInTheDocument();
    });
  });

  it("renders empty state when no workouts exist", async () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      trpc: {},
    });

    render(
      <TestWrapper>
        <RecentWorkouts />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("No recent workouts. Start your first workout!"),
      ).toBeInTheDocument();
    });
  });

  it("renders workout list with correct data", async () => {
    mockUseQuery.mockReturnValue({
      data: mockWorkouts,
      isLoading: false,
      error: null,
      trpc: {},
    });

    render(
      <TestWrapper>
        <RecentWorkouts />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Push Day")).toBeInTheDocument();
      expect(screen.getByText("Pull Day")).toBeInTheDocument();
    });

    // Check exercise counts
    expect(screen.getByText("2 exercises logged")).toBeInTheDocument();
    expect(screen.getByText("1 exercise logged")).toBeInTheDocument();

    // Check dates (formatted as DD/MM/YYYY)
    expect(screen.getByText("15/10/2024")).toBeInTheDocument();
    expect(screen.getByText("14/10/2024")).toBeInTheDocument();

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
    const workoutWithoutTemplate = [
      {
        id: 3,
        workoutDate: "2024-10-13",
        templateId: null,
        createdAt: "2024-10-13T10:00:00Z",
        template: null,
        exercises: [{ id: 4, exerciseName: "Squat" }],
      },
    ];

    mockUseQuery.mockReturnValue({
      data: workoutWithoutTemplate,
      isLoading: false,
      error: null,
      trpc: {},
    });

    render(
      <TestWrapper>
        <RecentWorkouts />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Unknown Template")).toBeInTheDocument();
    });
  });

  it("does not fetch when user is not authenticated", async () => {
    // Mock no user
    mockUseAuth.mockReturnValue({ user: null as any, isLoading: false });

    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      trpc: {},
    });

    render(
      <TestWrapper>
        <RecentWorkouts />
      </TestWrapper>,
    );

    // The hook should be called with enabled: false when no user
    expect(mockUseQuery).toHaveBeenCalledWith({ limit: 3 }, { enabled: false });

    // Reset the mock for other tests
    mockUseAuth.mockReturnValue({
      user: { id: "test-user-id" },
      isLoading: false,
    });
  });
});
