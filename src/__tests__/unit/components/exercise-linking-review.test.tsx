import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExerciseLinkingReview } from "~/app/_components/exercise-linking-review";
import { api } from "~/trpc/react";
import {
  type MasterExercise,
  type TemplateExercise,
} from "~/app/_components/exercise-linking-review";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock tRPC API
vi.mock("~/trpc/react", () => ({
  api: {
    exercises: {
      getAllMaster: {
        useQuery: vi.fn(),
      },
    },
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const mockApi = api as any;

describe("ExerciseLinkingReview", () => {
  let queryClient: QueryClient;

  const mockMasterExercises: MasterExercise[] = [
    {
      id: 1,
      user_id: "user1",
      name: "Bench Press",
      normalizedName: "bench press",
      tags: "chest,compound",
      muscleGroup: "Chest",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      user_id: "user1",
      name: "Squat",
      normalizedName: "squat",
      tags: "legs,compound",
      muscleGroup: "Legs",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      user_id: "user1",
      name: "Deadlift",
      normalizedName: "deadlift",
      tags: "back,compound",
      muscleGroup: "Back",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const templateExercises: TemplateExercise[] = [
    { name: "Bench Press", tempId: "temp1" },
    { name: "Squat", tempId: "temp2" },
    { name: "Unknown Exercise", tempId: "temp3" },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    mockApi.exercises.getAllMaster.useQuery.mockReturnValue({
      data: mockMasterExercises,
      isLoading: false,
    });
  });

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof ExerciseLinkingReview>> = {},
  ) => {
    const defaultProps = {
      templateName: "Test Template",
      exercises: templateExercises,
      onDecisionsChange: vi.fn(),
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <ExerciseLinkingReview {...defaultProps} {...props} />
      </QueryClientProvider>,
    );
  };

  describe("Initial Loading and Auto-Selection", () => {
    it("should show loading state while fetching master exercises", () => {
      mockApi.exercises.getAllMaster.useQuery.mockReturnValue({
        data: [],
        isLoading: true,
      });

      renderComponent();

      expect(screen.getByText("Loading exercises...")).toBeInTheDocument();
    });

    it("should auto-select exact matches", async () => {
      const onDecisionsChange = vi.fn();
      renderComponent({ onDecisionsChange });

      await waitFor(() => {
        expect(onDecisionsChange).toHaveBeenCalledWith({
          temp1: "1", // Bench Press -> Bench Press (exact match)
          temp2: "2", // Squat -> Squat (exact match)
        });
      });
    });

    it("should not auto-select exercises with no good matches", async () => {
      const onDecisionsChange = vi.fn();
      renderComponent({ onDecisionsChange });

      await waitFor(() => {
        // temp3 (Unknown Exercise) should not be in decisions since no good match
        expect(onDecisionsChange).toHaveBeenCalledWith({
          temp1: "1",
          temp2: "2",
        });
      });
    });

    it("should show correct summary statistics", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("3")).toBeInTheDocument(); // Total exercises
        expect(screen.getByText("2")).toBeInTheDocument(); // Auto-linked
        expect(screen.getByText("2")).toBeInTheDocument(); // Will link
        expect(screen.getByText("1")).toBeInTheDocument(); // Creating new
      });
    });

    it("should auto-select exact matches", async () => {
      const onDecisionsChange = vi.fn();
      renderComponent({ onDecisionsChange });

      await waitFor(() => {
        expect(onDecisionsChange).toHaveBeenCalledWith({
          temp1: "1", // Bench Press -> Bench Press (exact match)
          temp2: "2", // Squat -> Squat (exact match)
        });
      });
    });

    it("should not auto-select exercises with no good matches", async () => {
      const onDecisionsChange = vi.fn();
      renderComponent({ onDecisionsChange });

      await waitFor(() => {
        // temp3 (Unknown Exercise) should not be in the decisions since no good match
        expect(onDecisionsChange).toHaveBeenCalledWith({
          temp1: "1",
          temp2: "2",
        });
      });
    });

    it("should show correct summary statistics", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("3")).toBeInTheDocument(); // Total exercises
        expect(screen.getByText("2")).toBeInTheDocument(); // Auto-linked
        expect(screen.getByText("2")).toBeInTheDocument(); // Will link
        expect(screen.getByText("1")).toBeInTheDocument(); // Creating new
      });
    });
  });

  describe("Exercise Display and Interaction", () => {
    it("should display exercises with their match status", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Bench Press")).toBeInTheDocument();
        expect(screen.getByText("Squat")).toBeInTheDocument();
        expect(screen.getByText("Unknown Exercise")).toBeInTheDocument();
      });

      // Check for auto-matched badges
      expect(screen.getByText("Auto-matched")).toBeInTheDocument();
    });

    it("should show match percentages and muscle groups", async () => {
      renderComponent();

      await waitFor(() => {
        // Should show match percentage for exact matches
        expect(screen.getByText("100%")).toBeInTheDocument();
        // Should show muscle group info
        expect(screen.getByText("Chest")).toBeInTheDocument();
        expect(screen.getByText("Legs")).toBeInTheDocument();
      });
    });

    it("should allow selecting different master exercises", async () => {
      const onDecisionsChange = vi.fn();
      renderComponent({ onDecisionsChange });

      await waitFor(() => {
        // Initially Bench Press is linked to Bench Press (id: 1)
        expect(
          screen.getByText("Linking to: Bench Press (100% match)"),
        ).toBeInTheDocument();
      });

      // Click on Deadlift option for Bench Press exercise
      const deadliftButtons = screen.getAllByText("Deadlift");
      fireEvent.click(deadliftButtons[0]);

      await waitFor(() => {
        expect(onDecisionsChange).toHaveBeenCalledWith({
          temp1: "3", // Now linked to Deadlift
          temp2: "2",
        });
      });
    });

    it("should allow creating new exercises instead of linking", async () => {
      const onDecisionsChange = vi.fn();
      renderComponent({ onDecisionsChange });

      await waitFor(() => {
        // Should show "Create New Instead" button for linked exercises
        expect(screen.getByText("Create New Instead")).toBeInTheDocument();
      });

      // Click "Create New Instead" for Bench Press
      fireEvent.click(screen.getByText("Create New Instead"));

      await waitFor(() => {
        expect(onDecisionsChange).toHaveBeenCalledWith({
          temp2: "2", // Only Squat remains linked
        });
      });

      // Should show "Creating new master exercise" message
      expect(
        screen.getByText("Creating new master exercise"),
      ).toBeInTheDocument();
    });

    it("should handle exercises with no matches", async () => {
      renderComponent();

      await waitFor(() => {
        // Unknown Exercise should show no matches message
        expect(
          screen.getByText("No similar exercises found - will create as new"),
        ).toBeInTheDocument();
      });
    });

    it("should allow creating new exercises instead of linking", async () => {
      const onDecisionsChange = vi.fn();
      renderComponent({ onDecisionsChange });

      await waitFor(() => {
        // Should show "Create New Instead" button for linked exercises
        expect(screen.getByText("Create New Instead")).toBeInTheDocument();
      });

      // Click "Create New Instead" for Bench Press
      fireEvent.click(screen.getByText("Create New Instead"));

      await waitFor(() => {
        expect(onDecisionsChange).toHaveBeenCalledWith({
          temp2: "2", // Only Squat remains linked
        });
      });

      // Should show "Creating new master exercise" message
      expect(
        screen.getByText("Creating new master exercise"),
      ).toBeInTheDocument();
    });

    it("should handle exercises with no matches", async () => {
      renderComponent();

      await waitFor(() => {
        // Unknown Exercise should show no matches message
        expect(
          screen.getByText("No similar exercises found - will create as new"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Match Quality and Colors", () => {
    it("should display correct match quality badges", async () => {
      renderComponent();

      await waitFor(() => {
        // Exact matches should show 100%
        const percentages = screen.getAllByText("100%");
        expect(percentages.length).toBeGreaterThan(0);
      });
    });

    it("should show appropriate visual indicators for match types", async () => {
      renderComponent();

      await waitFor(() => {
        // Auto-matched exercises should have green badge
        const autoMatchedBadges = screen.getAllByText("Auto-matched");
        expect(autoMatchedBadges.length).toBeGreaterThan(0);

        const autoMatchedBadge = autoMatchedBadges[0];
        expect(autoMatchedBadge.closest("div")).toHaveClass("bg-green-50");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty exercises array", () => {
      renderComponent({ exercises: [] });

      expect(screen.getByText("0")).toBeInTheDocument(); // Total exercises
      expect(screen.getByText("0")).toBeInTheDocument(); // Auto-linked
      expect(screen.getByText("0")).toBeInTheDocument(); // Will link
      expect(screen.getByText("0")).toBeInTheDocument(); // Creating new
    });

    it("should handle missing onDecisionsChange callback", () => {
      expect(() => {
        renderComponent({ onDecisionsChange: undefined });
      }).not.toThrow();
    });

    it("should handle API error gracefully", () => {
      mockApi.exercises.getAllMaster.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error("API Error"),
      });

      renderComponent();

      // Should not crash and should show empty state
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("Decision State Management", () => {
    it("should maintain decisions when switching between options", async () => {
      const onDecisionsChange = vi.fn();
      renderComponent({ onDecisionsChange });

      await waitFor(() => {
        // Initial auto-selection
        expect(onDecisionsChange).toHaveBeenCalledWith({
          temp1: "1",
          temp2: "2",
        });
      });

      // Switch Bench Press to create new
      fireEvent.click(screen.getByText("Create New Instead"));

      await waitFor(() => {
        expect(onDecisionsChange).toHaveBeenCalledWith({
          temp2: "2",
        });
      });

      // Switch back to linking
      const benchPressButtons = screen.getAllByText("Bench Press");
      fireEvent.click(benchPressButtons[0]);

      await waitFor(() => {
        expect(onDecisionsChange).toHaveBeenCalledWith({
          temp1: "1",
          temp2: "2",
        });
      });
    });

    it("should handle multiple rapid selections", async () => {
      const onDecisionsChange = vi.fn();
      renderComponent({ onDecisionsChange });

      await waitFor(() => {
        expect(screen.getByText("Bench Press")).toBeInTheDocument();
      });

      // Rapidly switch between options
      const deadliftButtons = screen.getAllByText("Deadlift");
      const squatButtons = screen.getAllByText("Squat");

      fireEvent.click(deadliftButtons[0]);
      fireEvent.click(squatButtons[1]); // This should be for a different exercise
      fireEvent.click(screen.getByText("Create New Instead"));

      await waitFor(() => {
        // Should handle all changes without crashing
        expect(onDecisionsChange).toHaveBeenCalledTimes(4); // Initial + 3 changes
      });
    });
  });
});
