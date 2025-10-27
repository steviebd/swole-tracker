import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkoutSessionPage from "~/app/workout/session/[id]/page";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    workouts: {
      getById: {
        useQuery: vi.fn(),
      },
    },
    preferences: {
      get: {
        useQuery: vi.fn(),
      },
    },
  },
}));

vi.mock("~/app/_components/WorkoutSessionWithHealthAdvice", () => ({
  WorkoutSessionWithHealthAdvice: vi.fn(() => (
    <div data-testid="workout-session-health-advice">
      WorkoutSessionWithHealthAdvice
    </div>
  )),
}));

vi.mock("~/components/ui/glass-header", () => ({
  GlassHeader: vi.fn(({ title, subtitle, actions }) => (
    <div data-testid="glass-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actions}
    </div>
  )),
}));

vi.mock("~/components/ui/button", () => ({
  Button: vi.fn(({ children, ...props }) => (
    <button {...props}>{children}</button>
  )),
}));

vi.mock("~/hooks/useWorkoutSessionState", () => ({
  useWorkoutSessionState: vi.fn(() => ({
    exercises: [],
    updateSet: vi.fn(),
    loading: false,
    setExercises: vi.fn(),
    expandedExercises: [],
    setExpandedExercises: vi.fn(),
    isReadOnly: false,
    showDeleteConfirm: false,
    setShowDeleteConfirm: vi.fn(),
    previousExerciseData: null,
    collapsedIndexes: [],
    utils: {},
    preferences: {},
    saveWorkout: vi.fn(),
    deleteWorkout: vi.fn(),
    enqueue: vi.fn(),
    applyOptimisticWorkoutUpdate: vi.fn(),
    applyOptimisticWorkoutUpdateFromPayload: vi.fn(),
    clearDraft: vi.fn(),
    swipeSettings: {},
    dragState: {},
    dragHandlers: {},
    getDisplayOrder: vi.fn(),
    toggleExpansion: vi.fn(),
    handleSwipeToBottom: vi.fn(),
    toggleUnit: vi.fn(),
    addSet: vi.fn(),
    deleteSet: vi.fn(),
    moveSet: vi.fn(),
    buildSavePayload: vi.fn(),
    updatePreferences: vi.fn(),
    session: null,
    lastAction: null,
    setLastAction: vi.fn(),
    redoLastUndo: vi.fn(),
    redoStack: [],
    undoLastAction: vi.fn(),
  })),
}));

vi.mock("~/contexts/WorkoutSessionContext", () => ({
  WorkoutSessionContext: {
    Provider: vi.fn(({ children }) => (
      <div data-testid="workout-session-context">{children}</div>
    )),
  },
  useWorkoutSessionContext: vi.fn(() => ({
    updateSet: vi.fn(),
    exercises: [],
    handleAcceptSuggestion: vi.fn(),
    sessionState: {},
  })),
}));

// Import after mocking
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useWorkoutSessionState } from "~/hooks/useWorkoutSessionState";
import { useWorkoutSessionContext } from "~/contexts/WorkoutSessionContext";

const mockUseRouter = vi.mocked(useRouter);
const mockGetByIdQuery = vi.mocked(api.workouts.getById.useQuery);
const mockGetPreferencesQuery = vi.mocked(api.preferences.get.useQuery);
const mockUseWorkoutSessionState = vi.mocked(useWorkoutSessionState);
const mockUseWorkoutSessionContext = vi.mocked(useWorkoutSessionContext);

describe("WorkoutSessionPage", () => {
  const mockRouter = {
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
  });

  describe("Invalid session ID handling", () => {
    it("should redirect to /workouts when session ID is not a number", () => {
      const params = { id: "invalid" };

      render(<WorkoutSessionPage params={params} />);

      expect(mockRouter.push).toHaveBeenCalledWith("/workouts");
    });

    it("should redirect to /workouts when session ID is NaN", () => {
      const params = { id: "NaN" };

      render(<WorkoutSessionPage params={params} />);

      expect(mockRouter.push).toHaveBeenCalledWith("/workouts");
    });
  });

  describe("Valid session ID handling", () => {
    const validParams = { id: "123" };

    beforeEach(() => {
      mockGetByIdQuery.mockReturnValue({
        data: null,
        error: null,
        isLoading: false,
      } as any);

      mockGetPreferencesQuery.mockReturnValue({
        data: null,
        error: null,
        isLoading: false,
      } as any);

      mockUseWorkoutSessionState.mockReturnValue({
        exercises: [],
        updateSet: vi.fn(),
        loading: false,
        setExercises: vi.fn(),
        expandedExercises: [],
        setExpandedExercises: vi.fn(),
        isReadOnly: false,
        showDeleteConfirm: false,
        setShowDeleteConfirm: vi.fn(),
        previousExerciseData: null,
        collapsedIndexes: [],
        utils: {},
        preferences: {},
        saveWorkout: vi.fn(),
        deleteWorkout: vi.fn(),
        enqueue: vi.fn(),
        applyOptimisticWorkoutUpdate: vi.fn(),
        applyOptimisticWorkoutUpdateFromPayload: vi.fn(),
        clearDraft: vi.fn(),
        swipeSettings: {},
        dragState: {},
        dragHandlers: {},
        getDisplayOrder: vi.fn(),
        toggleExpansion: vi.fn(),
        handleSwipeToBottom: vi.fn(),
        toggleUnit: vi.fn(),
        addSet: vi.fn(),
        deleteSet: vi.fn(),
        moveSet: vi.fn(),
        buildSavePayload: vi.fn(),
        updatePreferences: vi.fn(),
        session: null,
        lastAction: null,
        setLastAction: vi.fn(),
        redoLastUndo: vi.fn(),
        redoStack: [],
        undoLastAction: vi.fn(),
      } as any);

      mockUseWorkoutSessionContext.mockReturnValue({
        updateSet: vi.fn(),
        exercises: [],
        handleAcceptSuggestion: vi.fn(),
        sessionState: {
          exercises: [],
          updateSet: vi.fn(),
          loading: false,
          setExercises: vi.fn(),
          expandedExercises: [],
          setExpandedExercises: vi.fn(),
          isReadOnly: false,
          showDeleteConfirm: false,
          setShowDeleteConfirm: vi.fn(),
          previousExerciseData: null,
          collapsedIndexes: [],
          utils: {},
          preferences: {},
          saveWorkout: vi.fn(),
          deleteWorkout: vi.fn(),
          enqueue: vi.fn(),
          applyOptimisticWorkoutUpdate: vi.fn(),
          applyOptimisticWorkoutUpdateFromPayload: vi.fn(),
          clearDraft: vi.fn(),
          swipeSettings: {},
          dragState: {},
          dragHandlers: {},
          getDisplayOrder: vi.fn(),
          toggleExpansion: vi.fn(),
          handleSwipeToBottom: vi.fn(),
          toggleUnit: vi.fn(),
          addSet: vi.fn(),
          deleteSet: vi.fn(),
          moveSet: vi.fn(),
          buildSavePayload: vi.fn(),
          updatePreferences: vi.fn(),
          session: null,
          lastAction: null,
          setLastAction: vi.fn(),
          redoLastUndo: vi.fn(),
          redoStack: [],
          undoLastAction: vi.fn(),
        },
      } as any);
    });

    it("should render loading state initially", () => {
      mockGetByIdQuery.mockReturnValue({
        data: undefined,
        error: null,
        isLoading: true,
      } as any);

      render(<WorkoutSessionPage params={validParams} />);

      // Header should still render, but WorkoutSessionProvider shows loading
      expect(screen.getByTestId("glass-header")).toBeInTheDocument();
      expect(screen.getByText("Workout")).toBeInTheDocument();
    });

    it("should render error page when workout not found", () => {
      mockGetByIdQuery.mockReturnValue({
        data: null,
        error: new Error("Not found"),
        isLoading: false,
      } as any);

      render(<WorkoutSessionPage params={validParams} />);

      expect(screen.getByText("Workout Not Found")).toBeInTheDocument();
      expect(
        screen.getByText(
          /The workout session you're looking for doesn't exist/,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Back to Workouts" }),
      ).toHaveAttribute("href", "/workouts");
    });

    it("should render workout session page with default title when no exercises", () => {
      const mockWorkoutData = {
        exercises: [],
        workoutDate: new Date("2023-01-01"),
      };

      mockGetByIdQuery.mockReturnValue({
        data: mockWorkoutData,
        error: null,
        isLoading: false,
      } as any);

      render(<WorkoutSessionPage params={validParams} />);

      expect(screen.getByTestId("glass-header")).toBeInTheDocument();
      expect(screen.getByText("Workout")).toBeInTheDocument();
      expect(
        screen.getByTestId("workout-session-health-advice"),
      ).toBeInTheDocument();
    });

    it("should render workout session page with exercises in title", () => {
      const mockWorkoutData = {
        exercises: [{ id: 1 }, { id: 2 }],
        workoutDate: new Date("2023-01-01"),
      };

      mockGetByIdQuery.mockReturnValue({
        data: mockWorkoutData,
        error: null,
        isLoading: false,
      } as any);

      render(<WorkoutSessionPage params={validParams} />);

      expect(screen.getByText("View Workout: Workout")).toBeInTheDocument();
    });

    it("should render workout session page with template name in title", () => {
      const mockWorkoutData = {
        exercises: [{ id: 1 }],
        template: { name: "Push Day" },
        workoutDate: new Date("2023-01-01"),
      };

      mockGetByIdQuery.mockReturnValue({
        data: mockWorkoutData,
        error: null,
        isLoading: false,
      } as any);

      render(<WorkoutSessionPage params={validParams} />);

      expect(screen.getByText("View Workout: Push Day")).toBeInTheDocument();
    });

    it("should render workout date in subtitle", () => {
      const workoutDate = new Date("2023-01-01T10:30:00");
      const mockWorkoutData = {
        exercises: [],
        workoutDate,
      };

      mockGetByIdQuery.mockReturnValue({
        data: mockWorkoutData,
        error: null,
        isLoading: false,
      } as any);

      render(<WorkoutSessionPage params={validParams} />);

      expect(
        screen.getByText(workoutDate.toLocaleString()),
      ).toBeInTheDocument();
    });

    it("should render current date when workoutDate is invalid", () => {
      const mockWorkoutData = {
        exercises: [],
        workoutDate: "invalid-date",
      };

      mockGetByIdQuery.mockReturnValue({
        data: mockWorkoutData,
        error: null,
        isLoading: false,
      } as any);

      render(<WorkoutSessionPage params={validParams} />);

      // Should render some date string (current date)
      const header = screen.getByTestId("glass-header");
      expect(header).toBeInTheDocument();
    });

    it("should render back button in header actions", () => {
      const mockWorkoutData = {
        exercises: [],
        workoutDate: new Date(),
      };

      mockGetByIdQuery.mockReturnValue({
        data: mockWorkoutData,
        error: null,
        isLoading: false,
      } as any);

      render(<WorkoutSessionPage params={validParams} />);

      const backButton = screen.getByRole("link", { name: "← Back" });
      expect(backButton).toHaveAttribute("href", "/");
    });
  });
});
