/**
 * Tests for WorkoutSessionContext
 * Tests core workout session state management and context functionality
 */

import { render, renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { type ReactNode } from "react";

import {
  WorkoutSessionContext,
  useWorkoutSessionContext,
} from "~/contexts/WorkoutSessionContext";
import { type WorkoutSessionState } from "~/hooks/useWorkoutSessionState";
import { type SetData } from "~/app/_components/set-input";

// Mock the workout session state hook
vi.mock("~/hooks/useWorkoutSessionState", () => ({
  useWorkoutSessionState: vi.fn(),
}));

// Test wrapper component
const createWrapper = (contextValue: any) => {
  return ({ children }: { children: ReactNode }) => (
    <WorkoutSessionContext.Provider value={contextValue}>
      {children}
    </WorkoutSessionContext.Provider>
  );
};

describe("WorkoutSessionContext", () => {
  const mockUpdateSet = vi.fn();
  const mockHandleAcceptSuggestion = vi.fn();
  const mockExercises = [
    {
      templateExerciseId: 1,
      exerciseName: "Bench Press",
      unit: "lbs" as const,
      sets: [
        { id: "1", weight: 135, reps: 10, sets: 1, unit: "lbs" },
        { id: "2", weight: 185, reps: 8, sets: 1, unit: "lbs" },
      ],
    },
    {
      templateExerciseId: 2,
      exerciseName: "Squat",
      unit: "lbs" as const,
      sets: [
        { id: "3", weight: 225, reps: 5, sets: 1, unit: "lbs" },
        { id: "4", weight: 275, reps: 3, sets: 1, unit: "lbs" },
      ],
    },
  ];

  const mockSessionState = {
    exercises: mockExercises,
    updateSet: vi.fn(),
    loading: false,
    session: {
      id: 123,
      templateId: 1,
    },
  } as any;

  const contextValue = {
    updateSet: mockUpdateSet,
    exercises: mockExercises,
    handleAcceptSuggestion: mockHandleAcceptSuggestion,
    sessionState: mockSessionState,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Context Provider", () => {
    it("should provide context value to children", () => {
      const TestComponent = () => {
        const context = useWorkoutSessionContext();
        return (
          <div data-testid="context">
            {JSON.stringify({
              hasUpdateSet: typeof context.updateSet === "function",
              hasExercises: Array.isArray(context.exercises),
              hasHandleAcceptSuggestion:
                typeof context.handleAcceptSuggestion === "function",
              hasSessionState: !!context.sessionState,
            })}
          </div>
        );
      };

      const { getByTestId } = render(<TestComponent />, {
        wrapper: createWrapper(contextValue),
      });

      const contextData = JSON.parse(
        getByTestId("context").textContent || "{}",
      );
      expect(contextData.hasUpdateSet).toBe(true);
      expect(contextData.hasExercises).toBe(true);
      expect(contextData.hasHandleAcceptSuggestion).toBe(true);
      expect(contextData.hasSessionState).toBe(true);
    });

    it("should pass through the exact context value", () => {
      const { result } = renderHook(() => useWorkoutSessionContext(), {
        wrapper: createWrapper(contextValue),
      });

      expect(result.current.updateSet).toBe(mockUpdateSet);
      expect(result.current.exercises).toBe(mockExercises);
      expect(result.current.handleAcceptSuggestion).toBe(
        mockHandleAcceptSuggestion,
      );
      expect(result.current.sessionState).toBe(mockSessionState);
    });
  });

  describe("useWorkoutSessionContext Hook", () => {
    it("should return context when used within provider", () => {
      const { result } = renderHook(() => useWorkoutSessionContext(), {
        wrapper: createWrapper(contextValue),
      });

      expect(result.current).toEqual(contextValue);
    });

    it("should throw error when used outside provider", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useWorkoutSessionContext());
      }).toThrow(
        "useWorkoutSessionContext must be used within WorkoutSessionProvider",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Context Functionality", () => {
    it("should handle updateSet calls correctly", () => {
      const { result } = renderHook(() => useWorkoutSessionContext(), {
        wrapper: createWrapper(contextValue),
      });

      act(() => {
        result.current.updateSet(0, 1, "weight", 200);
      });

      expect(mockUpdateSet).toHaveBeenCalledWith(0, 1, "weight", 200);
      expect(mockUpdateSet).toHaveBeenCalledTimes(1);
    });

    it("should handle different field types in updateSet", () => {
      const { result } = renderHook(() => useWorkoutSessionContext(), {
        wrapper: createWrapper(contextValue),
      });

      act(() => {
        result.current.updateSet(0, 0, "weight", 145);
        result.current.updateSet(0, 0, "reps", 12);
        result.current.updateSet(0, 0, "rpe", 8);
        result.current.updateSet(0, 0, "notes", "Felt good");
      });

      expect(mockUpdateSet).toHaveBeenCalledTimes(4);
      expect(mockUpdateSet).toHaveBeenNthCalledWith(1, 0, 0, "weight", 145);
      expect(mockUpdateSet).toHaveBeenNthCalledWith(2, 0, 0, "reps", 12);
      expect(mockUpdateSet).toHaveBeenNthCalledWith(3, 0, 0, "rpe", 8);
      expect(mockUpdateSet).toHaveBeenNthCalledWith(
        4,
        0,
        0,
        "notes",
        "Felt good",
      );
    });

    it("should handle acceptSuggestion calls correctly", () => {
      const { result } = renderHook(() => useWorkoutSessionContext(), {
        wrapper: createWrapper(contextValue),
      });

      const suggestionPayload = {
        exerciseName: "Bench Press",
        templateExerciseId: 1,
        setIndex: 0,
        suggestion: {
          weight: 145,
          reps: 8,
          restSeconds: 120,
        },
      };

      act(() => {
        result.current.handleAcceptSuggestion(suggestionPayload);
      });

      expect(mockHandleAcceptSuggestion).toHaveBeenCalledWith(
        suggestionPayload,
      );
      expect(mockHandleAcceptSuggestion).toHaveBeenCalledTimes(1);
    });

    it("should provide access to exercises array", () => {
      const { result } = renderHook(() => useWorkoutSessionContext(), {
        wrapper: createWrapper(contextValue),
      });

      expect(result.current.exercises).toEqual(mockExercises);
      expect(result.current.exercises).toHaveLength(2);
      expect(result.current.exercises[0]!.exerciseName).toBe("Bench Press");
      expect(result.current.exercises[1]!.exerciseName).toBe("Squat");
    });

    it("should provide access to session state", () => {
      const { result } = renderHook(() => useWorkoutSessionContext(), {
        wrapper: createWrapper(contextValue),
      });

      expect(result.current.sessionState).toBe(mockSessionState);
      expect(result.current.sessionState.session?.id).toBe(123);
      expect(result.current.sessionState.session?.templateId).toBe(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty exercises array", () => {
      const emptyContext = {
        ...contextValue,
        exercises: [],
      };

      const { result } = renderHook(() => useWorkoutSessionContext(), {
        wrapper: createWrapper(emptyContext),
      });

      expect(result.current.exercises).toEqual([]);
      expect(result.current.exercises).toHaveLength(0);
    });

    it("should handle undefined values in suggestions", () => {
      const { result } = renderHook(() => useWorkoutSessionContext(), {
        wrapper: createWrapper(contextValue),
      });

      const suggestionPayload = {
        exerciseName: "Bench Press",
        setIndex: 0,
        suggestion: {
          weight: 135,
          reps: 10,
          restSeconds: 60,
        },
      };

      act(() => {
        result.current.handleAcceptSuggestion(suggestionPayload);
      });

      expect(mockHandleAcceptSuggestion).toHaveBeenCalledWith(
        suggestionPayload,
      );
    });

    it("should handle null context value gracefully", () => {
      const TestComponent = () => {
        try {
          const context = useWorkoutSessionContext();
          return (
            <div data-testid="context-value">{JSON.stringify(context)}</div>
          );
        } catch (error) {
          return <div data-testid="error">{(error as Error).message}</div>;
        }
      };

      const { getByTestId } = render(
        <WorkoutSessionContext.Provider value={null}>
          <TestComponent />
        </WorkoutSessionContext.Provider>,
      );

      expect(getByTestId("error").textContent).toContain(
        "useWorkoutSessionContext must be used within WorkoutSessionProvider",
      );
    });
  });

  describe("Type Safety", () => {
    it("should maintain correct types for context values", () => {
      const { result } = renderHook(() => useWorkoutSessionContext(), {
        wrapper: createWrapper(contextValue),
      });

      // These checks ensure TypeScript types are correct
      expect(typeof result.current.updateSet).toBe("function");
      expect(Array.isArray(result.current.exercises)).toBe(true);
      expect(typeof result.current.handleAcceptSuggestion).toBe("function");
      expect(typeof result.current.sessionState).toBe("object");
    });

    it("should handle SetData field types correctly", () => {
      const { result } = renderHook(() => useWorkoutSessionContext(), {
        wrapper: createWrapper(contextValue),
      });

      // Test various SetData field types
      const validFields: Array<keyof SetData> = [
        "weight",
        "reps",
        "rpe",
        "notes",
        "distance",
        "time",
      ];

      validFields.forEach((field) => {
        expect(() => {
          act(() => {
            result.current.updateSet(0, 0, field, "test");
          });
        }).not.toThrow();
      });
    });
  });
});
