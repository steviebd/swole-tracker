import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  WarmupSetInput,
  type WarmupSetData,
} from "~/app/_components/workout/WarmupSetInput";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) =>
      React.createElement("div", props, children),
  },
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Trash2: () => React.createElement("div", { "data-testid": "trash" }, "Trash"),
  GripVertical: () =>
    React.createElement("div", { "data-testid": "grip" }, "Grip"),
  ChevronUp: () =>
    React.createElement("div", { "data-testid": "chevron-up" }, "Up"),
  ChevronDown: () =>
    React.createElement("div", { "data-testid": "chevron-down" }, "Down"),
}));

describe("WarmupSetInput Component", () => {
  const mockSetData: WarmupSetData = {
    setNumber: 1,
    weight: 60,
    reps: 10,
    percentageOfTop: 0.6,
  };

  const defaultProps = {
    data: mockSetData,
    weightUnit: "kg" as const,
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders set number badge correctly", () => {
      render(<WarmupSetInput {...defaultProps} />);

      const badge = screen.getByLabelText("Warm-up set number 1");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("W1");
    });

    it("renders different set numbers correctly", () => {
      const { rerender } = render(<WarmupSetInput {...defaultProps} />);

      expect(screen.getByText("W1")).toBeInTheDocument();

      rerender(
        <WarmupSetInput
          {...defaultProps}
          data={{ ...mockSetData, setNumber: 3 }}
        />,
      );

      expect(screen.getByText("W3")).toBeInTheDocument();
    });

    it("displays weight input with correct value", () => {
      render(<WarmupSetInput {...defaultProps} />);

      const weightInput = screen.getByLabelText("Warm-up set 1 weight");
      expect(weightInput).toHaveValue(60);
    });

    it("displays reps input with correct value", () => {
      render(<WarmupSetInput {...defaultProps} />);

      const repsInput = screen.getByLabelText("Warm-up set 1 reps");
      expect(repsInput).toHaveValue(10);
    });

    it("displays weight unit label", () => {
      render(<WarmupSetInput {...defaultProps} />);

      expect(screen.getByText("kg")).toBeInTheDocument();
    });

    it("displays lbs unit when specified", () => {
      render(<WarmupSetInput {...defaultProps} weightUnit="lbs" />);

      expect(screen.getByText("lbs")).toBeInTheDocument();
    });

    it("displays percentage badge when provided", () => {
      render(<WarmupSetInput {...defaultProps} />);

      const percentageBadge = screen.getByText("60%");
      expect(percentageBadge).toBeInTheDocument();
      expect(percentageBadge).toHaveAttribute("title", "60% of working weight");
    });

    it("does not display percentage badge when not provided", () => {
      const dataWithoutPercentage = { ...mockSetData };
      delete dataWithoutPercentage.percentageOfTop;

      render(<WarmupSetInput {...defaultProps} data={dataWithoutPercentage} />);

      expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
    });

    it("displays drag handle", () => {
      render(<WarmupSetInput {...defaultProps} />);

      const dragHandle = screen.getByLabelText("Drag to reorder");
      expect(dragHandle).toBeInTheDocument();
    });

    it("displays delete button", () => {
      render(<WarmupSetInput {...defaultProps} />);

      const deleteButton = screen.getByLabelText("Delete warm-up set 1");
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe("Weight Input Interactions", () => {
    it("updates weight on change", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      render(<WarmupSetInput {...defaultProps} onUpdate={onUpdate} />);

      const weightInput = screen.getByLabelText("Warm-up set 1 weight");

      // Use fireEvent to directly simulate the change event
      const { fireEvent } = await import("@testing-library/react");
      fireEvent.change(weightInput, { target: { value: "75" } });

      expect(onUpdate).toHaveBeenCalledWith({ weight: 75 });
    });

    it("handles decimal weight values", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      render(<WarmupSetInput {...defaultProps} onUpdate={onUpdate} />);

      const weightInput = screen.getByLabelText("Warm-up set 1 weight");

      // Use fireEvent to directly simulate the change event
      const { fireEvent } = await import("@testing-library/react");
      fireEvent.change(weightInput, { target: { value: "62.5" } });

      expect(onUpdate).toHaveBeenCalledWith({ weight: 62.5 });
    });

    it("handles empty weight input", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      render(<WarmupSetInput {...defaultProps} onUpdate={onUpdate} />);

      const weightInput = screen.getByLabelText("Warm-up set 1 weight");
      await user.clear(weightInput);

      expect(onUpdate).toHaveBeenCalledWith({ weight: 0 });
    });

    it("has correct input attributes for weight", () => {
      render(<WarmupSetInput {...defaultProps} />);

      const weightInput = screen.getByLabelText("Warm-up set 1 weight");
      expect(weightInput).toHaveAttribute("type", "number");
      expect(weightInput).toHaveAttribute("inputMode", "decimal");
      expect(weightInput).toHaveAttribute("step", "0.5");
    });
  });

  describe("Reps Input Interactions", () => {
    it("updates reps on change", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      render(<WarmupSetInput {...defaultProps} onUpdate={onUpdate} />);

      const repsInput = screen.getByLabelText("Warm-up set 1 reps");

      // Use fireEvent to directly simulate the change event
      const { fireEvent } = await import("@testing-library/react");
      fireEvent.change(repsInput, { target: { value: "8" } });

      expect(onUpdate).toHaveBeenCalledWith({ reps: 8 });
    });

    it("handles empty reps input", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      render(<WarmupSetInput {...defaultProps} onUpdate={onUpdate} />);

      const repsInput = screen.getByLabelText("Warm-up set 1 reps");
      await user.clear(repsInput);

      expect(onUpdate).toHaveBeenCalledWith({ reps: 0 });
    });

    it("has correct input attributes for reps", () => {
      render(<WarmupSetInput {...defaultProps} />);

      const repsInput = screen.getByLabelText("Warm-up set 1 reps");
      expect(repsInput).toHaveAttribute("type", "number");
      expect(repsInput).toHaveAttribute("inputMode", "numeric");
    });
  });

  describe("Delete Functionality", () => {
    it("calls onDelete when delete button clicked", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      render(<WarmupSetInput {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByLabelText("Delete warm-up set 1");
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("has title attribute on delete button", () => {
      render(<WarmupSetInput {...defaultProps} />);

      const deleteButton = screen.getByLabelText("Delete warm-up set 1");
      expect(deleteButton).toHaveAttribute("title", "Delete set");
    });
  });

  describe("Move Up/Down Arrows", () => {
    it("shows move up arrow when onMoveUp provided", () => {
      const onMoveUp = vi.fn();
      render(<WarmupSetInput {...defaultProps} onMoveUp={onMoveUp} />);

      const moveUpButton = screen.getByLabelText("Move warm-up set 1 up");
      expect(moveUpButton).toBeInTheDocument();
      expect(moveUpButton).toHaveAttribute("title", "Move up");
    });

    it("shows move down arrow when onMoveDown provided", () => {
      const onMoveDown = vi.fn();
      render(<WarmupSetInput {...defaultProps} onMoveDown={onMoveDown} />);

      const moveDownButton = screen.getByLabelText("Move warm-up set 1 down");
      expect(moveDownButton).toBeInTheDocument();
      expect(moveDownButton).toHaveAttribute("title", "Move down");
    });

    it("does not show move up arrow when onMoveUp not provided", () => {
      render(<WarmupSetInput {...defaultProps} />);

      expect(
        screen.queryByLabelText("Move warm-up set 1 up"),
      ).not.toBeInTheDocument();
    });

    it("does not show move down arrow when onMoveDown not provided", () => {
      render(<WarmupSetInput {...defaultProps} />);

      expect(
        screen.queryByLabelText("Move warm-up set 1 down"),
      ).not.toBeInTheDocument();
    });

    it("calls onMoveUp when move up button clicked", async () => {
      const user = userEvent.setup();
      const onMoveUp = vi.fn();
      render(<WarmupSetInput {...defaultProps} onMoveUp={onMoveUp} />);

      const moveUpButton = screen.getByLabelText("Move warm-up set 1 up");
      await user.click(moveUpButton);

      expect(onMoveUp).toHaveBeenCalledTimes(1);
    });

    it("calls onMoveDown when move down button clicked", async () => {
      const user = userEvent.setup();
      const onMoveDown = vi.fn();
      render(<WarmupSetInput {...defaultProps} onMoveDown={onMoveDown} />);

      const moveDownButton = screen.getByLabelText("Move warm-up set 1 down");
      await user.click(moveDownButton);

      expect(onMoveDown).toHaveBeenCalledTimes(1);
    });
  });

  describe("Drag Handle", () => {
    it("renders drag handle with correct styling", () => {
      render(<WarmupSetInput {...defaultProps} />);

      const dragHandle = screen.getByLabelText("Drag to reorder");
      expect(dragHandle).toHaveAttribute("data-drag-handle", "true");
    });

    it("applies dragging styles when isDragging is true", () => {
      const { container } = render(
        <WarmupSetInput {...defaultProps} isDragging={true} />,
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("opacity-50");
      expect(wrapper).toHaveClass("cursor-grabbing");
    });

    it("does not apply dragging styles when isDragging is false", () => {
      const { container } = render(
        <WarmupSetInput {...defaultProps} isDragging={false} />,
      );

      const wrapper = container.firstChild;
      expect(wrapper).not.toHaveClass("cursor-grabbing");
    });
  });

  describe("Accessibility", () => {
    it("has proper role for group", () => {
      render(<WarmupSetInput {...defaultProps} />);

      const group = screen.getByRole("group", { name: "Warm-up set 1" });
      expect(group).toBeInTheDocument();
    });

    it("all inputs have proper aria-labels", () => {
      render(<WarmupSetInput {...defaultProps} />);

      expect(screen.getByLabelText("Warm-up set 1 weight")).toBeInTheDocument();
      expect(screen.getByLabelText("Warm-up set 1 reps")).toBeInTheDocument();
      expect(screen.getByLabelText("Delete warm-up set 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Drag to reorder")).toBeInTheDocument();
    });

    it("percentage badge has descriptive title", () => {
      render(<WarmupSetInput {...defaultProps} />);

      const badge = screen.getByText("60%");
      expect(badge).toHaveAttribute("title", "60% of working weight");
    });
  });

  describe("Glass Card Styling", () => {
    it("applies glass card styling classes", () => {
      const { container } = render(<WarmupSetInput {...defaultProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("glass-card");
      expect(wrapper).toHaveClass("glass-hairline");
      expect(wrapper).toHaveClass("bg-secondary/5");
    });

    it("applies rounded-lg for consistent design", () => {
      const { container } = render(<WarmupSetInput {...defaultProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("rounded-lg");
    });
  });

  describe("Edge Cases", () => {
    it("handles zero values gracefully", () => {
      const zeroSet: WarmupSetData = {
        setNumber: 1,
        weight: 0,
        reps: 0,
      };

      render(<WarmupSetInput {...defaultProps} data={zeroSet} />);

      const weightInput = screen.getByLabelText("Warm-up set 1 weight");
      const repsInput = screen.getByLabelText("Warm-up set 1 reps");

      // When value is 0, the input shows empty string due to `value={data.weight || ""}`
      // But we need to check the actual DOM value property
      expect(weightInput.value).toBe("");
      expect(repsInput.value).toBe("");
    });

    it("handles very large numbers", () => {
      const largeSet: WarmupSetData = {
        setNumber: 999,
        weight: 999.5,
        reps: 999,
        percentageOfTop: 0.95,
      };

      render(<WarmupSetInput {...defaultProps} data={largeSet} />);

      expect(screen.getByText("W999")).toBeInTheDocument();
      expect(screen.getByText("95%")).toBeInTheDocument();
    });

    it("handles percentage calculation edge cases", () => {
      const { rerender } = render(<WarmupSetInput {...defaultProps} />);

      // 0% percentage
      rerender(
        <WarmupSetInput
          {...defaultProps}
          data={{ ...mockSetData, percentageOfTop: 0 }}
        />,
      );
      expect(screen.getByText("0%")).toBeInTheDocument();

      // 100% percentage
      rerender(
        <WarmupSetInput
          {...defaultProps}
          data={{ ...mockSetData, percentageOfTop: 1 }}
        />,
      );
      expect(screen.getByText("100%")).toBeInTheDocument();

      // Fractional percentage - should round
      rerender(
        <WarmupSetInput
          {...defaultProps}
          data={{ ...mockSetData, percentageOfTop: 0.576 }}
        />,
      );
      expect(screen.getByText("58%")).toBeInTheDocument();
    });
  });
});
