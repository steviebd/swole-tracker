import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SetInput } from "~/app/_components/set-input";

// Import test setup files to ensure DOM is properly configured
import "~/__tests__/setup.dom";
import "~/__tests__/setup.common";

// Ensure DOM is available before tests
beforeEach(() => {
  // Ensure document and window are properly defined
  if (typeof document === "undefined") {
    (global as any).document = {
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      createElement: vi.fn(() => ({
        style: {},
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    };
  }

  if (typeof window === "undefined") {
    (global as any).window = {
      matchMedia: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    };
  }
});

// Mock console to avoid noise
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = vi.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
});

describe("Move Set Integration - Comprehensive Coverage", () => {
  const mockOnUpdate = vi.fn();
  const mockOnToggleUnit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnMoveUp = vi.fn();
  const mockOnMoveDown = vi.fn();

  const mockSet = {
    id: "test-set-1",
    weight: 100,
    reps: 10,
    sets: 1,
    unit: "kg" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Button Rendering and State", () => {
    it("should render move buttons for middle set", () => {
      render(
        <SetInput
          set={mockSet}
          setIndex={1} // Middle set
          exerciseIndex={0}
          exerciseName="Test Exercise"
          onUpdate={mockOnUpdate}
          onToggleUnit={mockOnToggleUnit}
          onDelete={mockOnDelete}
          onMoveUp={mockOnMoveUp}
          onMoveDown={mockOnMoveDown}
          readOnly={false}
        />,
      );

      expect(screen.getByLabelText("Move set up")).toBeInTheDocument();
      expect(screen.getByLabelText("Move set down")).toBeInTheDocument();
    });

    it("should not render move up button for first set", () => {
      render(
        <SetInput
          set={mockSet}
          setIndex={0} // First set
          exerciseIndex={0}
          exerciseName="Test Exercise"
          onUpdate={mockOnUpdate}
          onToggleUnit={mockOnToggleUnit}
          onDelete={mockOnDelete}
          onMoveUp={undefined} // Not provided for first set
          onMoveDown={mockOnMoveDown}
          readOnly={false}
        />,
      );

      expect(screen.queryByLabelText("Move set up")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Move set down")).toBeInTheDocument();
    });

    it("should not render move down button for last set", () => {
      render(
        <SetInput
          set={mockSet}
          setIndex={2} // Last set in 3-set exercise
          exerciseIndex={0}
          exerciseName="Test Exercise"
          onUpdate={mockOnUpdate}
          onToggleUnit={mockOnToggleUnit}
          onDelete={mockOnDelete}
          onMoveUp={mockOnMoveUp}
          onMoveDown={undefined} // Not provided for last set
          readOnly={false}
        />,
      );

      expect(screen.getByLabelText("Move set up")).toBeInTheDocument();
      expect(screen.queryByLabelText("Move set down")).not.toBeInTheDocument();
    });

    it("should not render move buttons in read-only mode", () => {
      render(
        <SetInput
          set={mockSet}
          setIndex={1}
          exerciseIndex={0}
          exerciseName="Test Exercise"
          onUpdate={mockOnUpdate}
          onToggleUnit={mockOnToggleUnit}
          onDelete={mockOnDelete}
          onMoveUp={mockOnMoveUp}
          onMoveDown={mockOnMoveDown}
          readOnly={true}
        />,
      );

      expect(screen.queryByLabelText("Move set up")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Move set down")).not.toBeInTheDocument();
    });
  });

  describe("Button Interactions", () => {
    it("should call onMoveUp when up button is clicked", () => {
      render(
        <SetInput
          set={mockSet}
          setIndex={1}
          exerciseIndex={0}
          exerciseName="Test Exercise"
          onUpdate={mockOnUpdate}
          onToggleUnit={mockOnToggleUnit}
          onDelete={mockOnDelete}
          onMoveUp={mockOnMoveUp}
          onMoveDown={mockOnMoveDown}
          readOnly={false}
        />,
      );

      const moveUpButton = screen.getByLabelText("Move set up");
      fireEvent.click(moveUpButton);

      expect(mockOnMoveUp).toHaveBeenCalledTimes(1);
      expect(mockOnMoveUp).toHaveBeenCalledWith();
    });

    it("should call onMoveDown when down button is clicked", () => {
      render(
        <SetInput
          set={mockSet}
          setIndex={1}
          exerciseIndex={0}
          exerciseName="Test Exercise"
          onUpdate={mockOnUpdate}
          onToggleUnit={mockOnToggleUnit}
          onDelete={mockOnDelete}
          onMoveUp={mockOnMoveUp}
          onMoveDown={mockOnMoveDown}
          readOnly={false}
        />,
      );

      const moveDownButton = screen.getByLabelText("Move set down");
      fireEvent.click(moveDownButton);

      expect(mockOnMoveDown).toHaveBeenCalledTimes(1);
      expect(mockOnMoveDown).toHaveBeenCalledWith();
    });

    it("should not trigger other handlers when move buttons are clicked", () => {
      render(
        <SetInput
          set={mockSet}
          setIndex={1}
          exerciseIndex={0}
          exerciseName="Test Exercise"
          onUpdate={mockOnUpdate}
          onToggleUnit={mockOnToggleUnit}
          onDelete={mockOnDelete}
          onMoveUp={mockOnMoveUp}
          onMoveDown={mockOnMoveDown}
          readOnly={false}
        />,
      );

      const moveUpButton = screen.getByLabelText("Move set up");
      const moveDownButton = screen.getByLabelText("Move set down");

      fireEvent.click(moveUpButton);
      fireEvent.click(moveDownButton);

      // Only move handlers should be called
      expect(mockOnMoveUp).toHaveBeenCalledTimes(1);
      expect(mockOnMoveDown).toHaveBeenCalledTimes(1);

      // Other handlers should NOT be called
      expect(mockOnUpdate).not.toHaveBeenCalled();
      expect(mockOnToggleUnit).not.toHaveBeenCalled();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should support Ctrl+ArrowUp for moving up", () => {
      render(
        <SetInput
          set={mockSet}
          setIndex={1}
          exerciseIndex={0}
          exerciseName="Test Exercise"
          onUpdate={mockOnUpdate}
          onToggleUnit={mockOnToggleUnit}
          onDelete={mockOnDelete}
          onMoveUp={mockOnMoveUp}
          onMoveDown={mockOnMoveDown}
          readOnly={false}
        />,
      );

      const setInput = screen.getByRole("group");
      fireEvent.keyDown(setInput, { key: "ArrowUp", ctrlKey: true });

      expect(mockOnMoveUp).toHaveBeenCalledTimes(1);
    });

    it("should support Ctrl+ArrowDown for moving down", () => {
      render(
        <SetInput
          set={mockSet}
          setIndex={1}
          exerciseIndex={0}
          exerciseName="Test Exercise"
          onUpdate={mockOnUpdate}
          onToggleUnit={mockOnToggleUnit}
          onDelete={mockOnDelete}
          onMoveUp={mockOnMoveUp}
          onMoveDown={mockOnMoveDown}
          readOnly={false}
        />,
      );

      const setInput = screen.getByRole("group");
      fireEvent.keyDown(setInput, { key: "ArrowDown", ctrlKey: true });

      expect(mockOnMoveDown).toHaveBeenCalledTimes(1);
    });

    it("should not trigger move on regular arrow keys", () => {
      render(
        <SetInput
          set={mockSet}
          setIndex={1}
          exerciseIndex={0}
          exerciseName="Test Exercise"
          onUpdate={mockOnUpdate}
          onToggleUnit={mockOnToggleUnit}
          onDelete={mockOnDelete}
          onMoveUp={mockOnMoveUp}
          onMoveDown={mockOnMoveDown}
          readOnly={false}
        />,
      );

      const setInput = screen.getByRole("group");
      fireEvent.keyDown(setInput, { key: "ArrowUp" });
      fireEvent.keyDown(setInput, { key: "ArrowDown" });

      expect(mockOnMoveUp).not.toHaveBeenCalled();
      expect(mockOnMoveDown).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(
        <SetInput
          set={mockSet}
          setIndex={1}
          exerciseIndex={0}
          exerciseName="Test Exercise"
          onUpdate={mockOnUpdate}
          onToggleUnit={mockOnToggleUnit}
          onDelete={mockOnDelete}
          onMoveUp={mockOnMoveUp}
          onMoveDown={mockOnMoveDown}
          readOnly={false}
        />,
      );

      expect(screen.getByLabelText("Move set up")).toHaveAttribute(
        "aria-label",
        "Move set up",
      );
      expect(screen.getByLabelText("Move set down")).toHaveAttribute(
        "aria-label",
        "Move set down",
      );
      expect(screen.getByLabelText("Move set up")).toHaveAttribute(
        "title",
        "Move set up",
      );
      expect(screen.getByLabelText("Move set down")).toHaveAttribute(
        "title",
        "Move set down",
      );
    });

    it("should have proper role and aria-label on set group", () => {
      render(
        <SetInput
          set={mockSet}
          setIndex={1}
          exerciseIndex={0}
          exerciseName="Test Exercise"
          onUpdate={mockOnUpdate}
          onToggleUnit={mockOnToggleUnit}
          onDelete={mockOnDelete}
          onMoveUp={mockOnMoveUp}
          onMoveDown={mockOnMoveDown}
          readOnly={false}
        />,
      );

      const setGroup = screen.getByRole("group");
      expect(setGroup).toHaveAttribute("aria-label", "Set 2 of Test Exercise");
    });
  });

  describe("Visual Feedback", () => {
    it("should have hover effects on move buttons", () => {
      render(
        <SetInput
          set={mockSet}
          setIndex={1}
          exerciseIndex={0}
          exerciseName="Test Exercise"
          onUpdate={mockOnUpdate}
          onToggleUnit={mockOnToggleUnit}
          onDelete={mockOnDelete}
          onMoveUp={mockOnMoveUp}
          onMoveDown={mockOnMoveDown}
          readOnly={false}
        />,
      );

      const moveUpButton = screen.getByLabelText("Move set up");
      const moveDownButton = screen.getByLabelText("Move set down");

      // Check that buttons have the transition-colors class for hover effects
      expect(moveUpButton).toHaveClass("transition-colors");
      expect(moveDownButton).toHaveClass("transition-colors");
    });

    it("should not render move up button for first set", () => {
      render(
        <SetInput
          set={mockSet}
          setIndex={0} // First set
          exerciseIndex={0}
          exerciseName="Test Exercise"
          onUpdate={mockOnUpdate}
          onToggleUnit={mockOnToggleUnit}
          onDelete={mockOnDelete}
          onMoveUp={undefined} // Not provided for first set
          onMoveDown={mockOnMoveDown}
          readOnly={false}
        />,
      );

      expect(screen.queryByLabelText("Move set up")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Move set down")).toBeInTheDocument();
    });
  });
});
