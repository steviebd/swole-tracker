import React from "react";
// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import WorkoutSessionPage from "~/app/workout/session/[id]/page";
import { api } from "~/trpc/react";
import { useWorkoutSessionState } from "~/hooks/useWorkoutSessionState";
import { useWorkoutSessionContext } from "~/contexts/WorkoutSessionContext";
import { WorkoutSessionWithHealthAdvice } from "~/app/_components/WorkoutSessionWithHealthAdvice";
import { GlassHeader } from "~/components/ui/glass-header";
import { Button } from "~/components/ui/button";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    workouts: {
      getById: {
        useQuery: vi.fn(() => ({
          data: undefined,
          error: null,
          isLoading: false,
        })),
      },
    },
    preferences: {
      get: {
        useQuery: vi.fn(() => ({
          data: { unit: "kg" },
          error: null,
          isLoading: false,
        })),
      },
    },
    useUtils: vi.fn(() => ({
      workouts: {
        getById: {
          invalidate: vi.fn(),
        },
      },
      preferences: {
        get: {
          invalidate: vi.fn(),
        },
      },
    })),
  },
}));

vi.mock("~/hooks/useWorkoutSessionState", () => ({
  useWorkoutSessionState: vi.fn(),
}));

vi.mock("~/contexts/WorkoutSessionContext", () => ({
  useWorkoutSessionContext: vi.fn(),
  WorkoutSessionContext: {
    Provider: vi.fn(({ children, value }) => (
      <div
        data-testid="workout-session-context-provider"
        data-value={JSON.stringify(value)}
      >
        {children}
      </div>
    )),
  },
}));

vi.mock("~/app/_components/WorkoutSessionWithHealthAdvice", () => ({
  WorkoutSessionWithHealthAdvice: vi.fn(({ sessionId, onAcceptSuggestion }) => (
    <div data-testid="workout-session-with-health-advice">
      <span data-testid="session-id">{sessionId}</span>
      <button
        data-testid="accept-suggestion"
        onClick={() =>
          onAcceptSuggestion?.({
            exerciseName: "Test Exercise",
            setIndex: 0,
            suggestion: { weight: 100, reps: 10 },
          })
        }
      >
        Accept Suggestion
      </button>
    </div>
  )),
}));

vi.mock("~/components/ui/glass-header", () => ({
  GlassHeader: vi.fn(({ title, subtitle, actions }) => (
    <header data-testid="glass-header">
      <h1 data-testid="header-title">{title}</h1>
      <p data-testid="header-subtitle">{subtitle}</p>
      <div data-testid="header-actions">{actions}</div>
    </header>
  )),
}));

vi.mock("~/components/ui/button", () => ({
  Button: vi.fn(({ children, variant, size, asChild, ...props }) => {
    const ButtonComponent = asChild ? "span" : "button";
    return (
      <ButtonComponent
        data-variant={variant}
        data-size={size}
        data-testid={props["data-testid"] || "button"}
        {...props}
      >
        {children}
      </ButtonComponent>
    );
  }),
}));

describe("WorkoutSessionPage", () => {
  const mockPush = vi.fn();
  const mockRouter = { push: mockPush };
  const mockUseWorkoutSessionState = vi.fn();

  const mockWorkoutSession = {
    id: 123,
    workoutDate: new Date("2024-01-15"),
    exercises: [
      {
        id: 1,
        exerciseName: "Bench Press",
        unit: "kg" as const,
        sets: [
          { id: "1", weight: 100, reps: 10, sets: 1, unit: "kg" as const },
          { id: "2", weight: 105, reps: 8, sets: 1, unit: "kg" as const },
        ],
      },
    ],
    template: {
      id: 1,
      name: "Upper Body Workout",
    },
  };

  const mockSessionState = {
    // state
    exercises: mockWorkoutSession.exercises,
    setExercises: vi.fn(),
    expandedExercises: [],
    setExpandedExercises: vi.fn(),
    loading: false,
    isReadOnly: false,
    showDeleteConfirm: false,
    setShowDeleteConfirm: vi.fn(),
    previousExerciseData: new Map(),
    collapsedIndexes: [],

    // trpc utils and prefs
    utils: api.useUtils(),
    preferences: {
      id: 1,
      createdAt: new Date(),
      updatedAt: null,
      user_id: "test-user",
      defaultWeightUnit: "kg",
      predictive_defaults_enabled: false,
      right_swipe_action: "collapse_expand",
      enable_manual_wellness: false,
      progression_type: "linear",
      linear_progression_kg: "2.5",
      percentage_progression: "2.5",
      targetWorkoutsPerWeek: 3,
      warmupStrategy: "history",
      warmupSetsCount: 3,
      warmupPercentages: "[40, 60, 80]",
      warmupRepsStrategy: "match_working",
      warmupFixedReps: 5,
      enableMovementPatternSharing: false,
    } as any,

    // mutations and queue
    saveWorkout: vi.fn(),
    deleteWorkout: vi.fn(),
    enqueue: vi.fn(),
    applyOptimisticWorkoutUpdate: vi.fn(),
    applyOptimisticWorkoutUpdateFromPayload: vi.fn(),
    clearDraft: vi.fn(),

    // interactions
    swipeSettings: { leftSwipeAction: "delete", rightSwipeAction: "complete" },
    dragState: { isDragging: false, draggedIndex: null },
    dragHandlers: { handleDragStart: vi.fn(), handleDragEnd: vi.fn() },
    getDisplayOrder: vi.fn(),
    toggleExpansion: vi.fn(),
    handleSwipeToBottom: vi.fn(),
    updateSet: vi.fn(),
    toggleUnit: vi.fn(),
    addSet: vi.fn(),
    deleteSet: vi.fn(),
    moveSet: vi.fn(),
    buildSavePayload: vi.fn(),

    // preferences
    updatePreferences: vi.fn(),
    session: null,

    // undo
    lastAction: null,
    setLastAction: vi.fn(),
    redoLastUndo: vi.fn(),
    redoStack: [],
    undoLastAction: vi.fn(),
  };

  const mockContextValue = {
    updateSet: vi.fn(),
    exercises: mockWorkoutSession.exercises,
    handleAcceptSuggestion: vi.fn(),
    sessionState: mockSessionState,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter as any);
    (useWorkoutSessionContext as ReturnType<typeof vi.fn>).mockReturnValue(
      mockContextValue,
    );
    mockUseWorkoutSessionState.mockReturnValue(mockSessionState as any);
    (useWorkoutSessionState as ReturnType<typeof vi.fn>).mockImplementation(
      mockUseWorkoutSessionState,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Parameter Validation", () => {
    it("should redirect to workouts when session ID is invalid", async () => {
      const Component = WorkoutSessionPage({ params: { id: "invalid" } });
      render(Component);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/workouts");
      });
    });

    it("should redirect to workouts when session ID is NaN", async () => {
      const Component = WorkoutSessionPage({ params: { id: "abc123" } });
      render(Component);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/workouts");
      });
    });

    it("should not redirect when session ID is valid", async () => {
      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: mockWorkoutSession,
        error: null,
        isLoading: false,
      } as any);

      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });

  describe("Data Loading", () => {
    it("should call workouts.getById with correct session ID", async () => {
      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: mockWorkoutSession,
        error: null,
        isLoading: false,
      } as any);

      const Component = WorkoutSessionPage({ params: { id: "456" } });
      render(Component);

      await waitFor(() => {
        expect(
          api.workouts.getById.useQuery as ReturnType<typeof vi.fn>,
        ).toHaveBeenCalledWith({ id: 456 });
      });
    });

    it("should call preferences.get", async () => {
      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: mockWorkoutSession,
        error: null,
        isLoading: false,
      } as any);

      (
        api.preferences.get.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: { unit: "kg" },
        isLoading: false,
      } as any);

      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        expect(
          api.preferences.get.useQuery as ReturnType<typeof vi.fn>,
        ).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    it("should show not found message when workout session doesn't exist", async () => {
      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: null,
        error: new Error("Not found"),
        isLoading: false,
      } as any);

      const Component = WorkoutSessionPage({ params: { id: "999" } });
      render(Component);

      await waitFor(() => {
        expect(screen.getByText("Workout Not Found")).toBeInTheDocument();
        expect(
          screen.getByText(
            /The workout session you're looking for doesn't exist/,
          ),
        ).toBeInTheDocument();
      });
    });

    it("should show not found message when there's a workout error", async () => {
      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: null,
        error: new Error("Database error"),
        isLoading: false,
      } as any);

      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        expect(screen.getByText("Workout Not Found")).toBeInTheDocument();
      });
    });

    it("should provide back to workouts link when not found", async () => {
      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: null,
        error: new Error("Not found"),
        isLoading: false,
      } as any);

      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        const backLink = screen.getByText("Back to Workouts");
        expect(backLink.closest("a")).toHaveAttribute("href", "/workouts");
      });
    });
  });

  describe("Header Rendering", () => {
    beforeEach(() => {
      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: mockWorkoutSession,
        error: null,
        isLoading: false,
      } as any);
    });

    it("should render header with workout name and exercises", async () => {
      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        const headerTitle = screen.getByTestId("header-title");
        expect(headerTitle).toHaveTextContent(
          "View Workout: Upper Body Workout",
        );
      });
    });

    it("should render header with just workout name when no exercises", async () => {
      const workoutWithoutExercises = {
        ...mockWorkoutSession,
        exercises: [],
      };

      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: workoutWithoutExercises,
        error: null,
        isLoading: false,
      } as any);

      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        const headerTitle = screen.getByTestId("header-title");
        expect(headerTitle).toHaveTextContent("Upper Body Workout");
      });
    });

    it("should render header with default name when no template", async () => {
      const workoutWithoutTemplate = {
        ...mockWorkoutSession,
        template: null,
      };

      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: workoutWithoutTemplate,
        error: null,
        isLoading: false,
      } as any);

      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        const headerTitle = screen.getByTestId("header-title");
        expect(headerTitle).toHaveTextContent("View Workout: Workout");
      });
    });

    it("should render header subtitle with workout date", async () => {
      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        const headerSubtitle = screen.getByTestId("header-subtitle");
        expect(headerSubtitle).toHaveTextContent(/1\/15\/2024/);
      });
    });

    it("should render back button in header actions", async () => {
      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        const backButton = screen.getByText("← Back");
        expect(backButton.closest("a")).toHaveAttribute("href", "/");
      });
    });
  });

  describe("Workout Session Provider", () => {
    beforeEach(() => {
      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: mockWorkoutSession,
        error: null,
        isLoading: false,
      } as any);
    });

    it("should render WorkoutSessionContext.Provider", async () => {
      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        const provider = screen.getByTestId("workout-session-context-provider");
        expect(provider).toBeInTheDocument();
      });
    });

    it("should call useWorkoutSessionState with correct session ID", async () => {
      const Component = WorkoutSessionPage({ params: { id: "789" } });
      render(Component);

      await waitFor(() => {
        expect(mockUseWorkoutSessionState).toHaveBeenCalledWith({
          sessionId: 789,
        });
      });
    });

    it("should show loading state when session state is loading", async () => {
      mockUseWorkoutSessionState.mockReturnValue({
        ...mockSessionState,
        loading: true,
      } as any);

      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        expect(
          screen.getByText("Loading workout session..."),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Workout Session Content", () => {
    beforeEach(() => {
      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: mockWorkoutSession,
        error: null,
        isLoading: false,
      } as any);
    });

    it("should render WorkoutSessionWithHealthAdvice", async () => {
      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        const workoutComponent = screen.getByTestId(
          "workout-session-with-health-advice",
        );
        expect(workoutComponent).toBeInTheDocument();
      });
    });

    it("should pass correct session ID to WorkoutSessionWithHealthAdvice", async () => {
      const Component = WorkoutSessionPage({ params: { id: "456" } });
      render(Component);

      await waitFor(() => {
        const sessionId = screen.getByTestId("session-id");
        expect(sessionId).toHaveTextContent("456");
      });
    });

    it("should pass handleAcceptSuggestion to WorkoutSessionWithHealthAdvice", async () => {
      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        const acceptButton = screen.getByTestId("accept-suggestion");
        expect(acceptButton).toBeInTheDocument();
      });

      // Test the suggestion acceptance
      const acceptButton = screen.getByTestId("accept-suggestion");
      acceptButton.click();

      await waitFor(() => {
        expect(mockContextValue.handleAcceptSuggestion).toHaveBeenCalledWith({
          exerciseName: "Test Exercise",
          setIndex: 0,
          suggestion: { weight: 100, reps: 10 },
        });
      });
    });
  });

  describe("Page Structure", () => {
    beforeEach(() => {
      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: mockWorkoutSession,
        error: null,
        isLoading: false,
      } as any);
    });

    it("should render main element with correct classes", async () => {
      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        const main = screen.getByRole("main");
        expect(main).toHaveClass("min-h-screen", "overflow-x-hidden");
      });
    });

    it("should render container with correct classes", async () => {
      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        const container = screen.getByRole("main").querySelector(".container");
        expect(container).toHaveClass(
          "mx-auto",
          "w-full",
          "min-w-0",
          "px-3",
          "py-4",
          "sm:px-4",
          "sm:py-6",
        );
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle workout with invalid date format", async () => {
      const workoutWithInvalidDate = {
        ...mockWorkoutSession,
        workoutDate: "invalid-date",
      };

      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: workoutWithInvalidDate,
        error: null,
        isLoading: false,
      } as any);

      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        const headerSubtitle = screen.getByTestId("header-subtitle");
        expect(headerSubtitle).toBeInTheDocument();
        // Should fallback to current date
      });
    });

    it("should handle workout with string date", async () => {
      const workoutWithStringDate = {
        ...mockWorkoutSession,
        workoutDate: "2024-01-15T10:30:00Z",
      };

      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: workoutWithStringDate,
        error: null,
        isLoading: false,
      } as any);

      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        const headerSubtitle = screen.getByTestId("header-subtitle");
        expect(headerSubtitle).toBeInTheDocument();
      });
    });

    it("should handle workout with number date (timestamp)", async () => {
      const workoutWithNumberDate = {
        ...mockWorkoutSession,
        workoutDate: 1705311000000, // Jan 15, 2024
      };

      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: workoutWithNumberDate,
        error: null,
        isLoading: false,
      } as any);

      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        const headerSubtitle = screen.getByTestId("header-subtitle");
        expect(headerSubtitle).toBeInTheDocument();
      });
    });

    it("should handle workout with no exercises array", async () => {
      const workoutWithoutExercises = {
        ...mockWorkoutSession,
        exercises: null,
      };

      (
        api.workouts.getById.useQuery as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        data: workoutWithoutExercises,
        error: null,
        isLoading: false,
      } as any);

      const Component = WorkoutSessionPage({ params: { id: "123" } });
      render(Component);

      await waitFor(() => {
        const headerTitle = screen.getByTestId("header-title");
        expect(headerTitle).toHaveTextContent("Upper Body Workout");
      });
    });
  });
});
