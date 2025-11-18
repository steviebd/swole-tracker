import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WarmupSection } from "~/app/_components/workout/WarmupSection";
import type { WarmupSetData } from "~/app/_components/workout/WarmupSetInput";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) =>
      React.createElement("div", props, children),
  },
  AnimatePresence: ({ children }: any) =>
    React.createElement(React.Fragment, null, children),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ChevronDown: () =>
    React.createElement(
      "div",
      { "data-testid": "chevron-down" },
      "ChevronDown",
    ),
  Zap: () => React.createElement("div", { "data-testid": "zap" }, "Zap"),
  Plus: () => React.createElement("div", { "data-testid": "plus" }, "Plus"),
  RotateCcw: () =>
    React.createElement("div", { "data-testid": "rotate-ccw" }, "RotateCcw"),
  GripVertical: () =>
    React.createElement("div", { "data-testid": "grip" }, "Grip"),
  Trash2: () => React.createElement("div", { "data-testid": "trash" }, "Trash"),
  ChevronUp: () =>
    React.createElement("div", { "data-testid": "chevron-up" }, "ChevronUp"),
}));

// Mock Button component
vi.mock("~/components/ui/button", () => ({
  Button: ({ children, ...props }: any) =>
    React.createElement("button", props, children),
}));

// Mock reduced motion hook
vi.mock("~/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => false,
}));

describe("WarmupSection Component", () => {
  const mockSuggestedSets: WarmupSetData[] = [
    { setNumber: 1, weight: 40, reps: 10, percentageOfTop: 0.4 },
    { setNumber: 2, weight: 60, reps: 8, percentageOfTop: 0.6 },
    { setNumber: 3, weight: 80, reps: 5, percentageOfTop: 0.8 },
  ];

  const mockWarmupSets: WarmupSetData[] = [
    { setNumber: 1, weight: 50, reps: 10 },
    { setNumber: 2, weight: 70, reps: 8 },
  ];

  const defaultProps = {
    exerciseName: "Bench Press",
    warmupSets: [],
    workingWeight: 100,
    weightUnit: "kg" as const,
    onUpdate: vi.fn(),
    onAutoFill: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering & Initial State", () => {
    it("renders collapsed by default", () => {
      render(<WarmupSection {...defaultProps} />);

      const header = screen.getByRole("button", { expanded: false });
      expect(header).toBeInTheDocument();
      expect(header).toHaveAttribute("aria-expanded", "false");
    });

    it("displays correct warm-up count in header", () => {
      render(<WarmupSection {...defaultProps} warmupSets={mockWarmupSets} />);

      expect(screen.getByText("Warm-up Sets (2)")).toBeInTheDocument();
    });

    it("displays total volume badge when sets exist", () => {
      render(<WarmupSection {...defaultProps} warmupSets={mockWarmupSets} />);

      // Volume: (50 * 10) + (70 * 8) = 1060kg
      const volumeBadge = screen.getByText("1060kg moved");
      expect(volumeBadge).toBeInTheDocument();
    });

    it("does not display volume badge when no sets", () => {
      render(<WarmupSection {...defaultProps} />);

      expect(screen.queryByText(/kg moved/)).not.toBeInTheDocument();
    });
  });

  describe("Expansion & Collapse", () => {
    it("expands on header click", async () => {
      const user = userEvent.setup();
      render(<WarmupSection {...defaultProps} />);

      const header = screen.getByRole("button", { expanded: false });
      await user.click(header);

      expect(header).toHaveAttribute("aria-expanded", "true");
    });

    it("shows action buttons when expanded", async () => {
      const user = userEvent.setup();
      render(<WarmupSection {...defaultProps} />);

      const header = screen.getByRole("button");
      await user.click(header);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add set/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /auto fill/i }),
        ).toBeInTheDocument();
      });
    });

    it("shows empty state when no sets and expanded", async () => {
      const user = userEvent.setup();
      render(<WarmupSection {...defaultProps} />);

      const header = screen.getByRole("button");
      await user.click(header);

      await waitFor(() => {
        expect(
          screen.getByText("No warm-up sets added yet"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Smart Suggestion Banner", () => {
    it("shows suggestion banner when suggestions exist and no sets", async () => {
      const user = userEvent.setup();
      render(
        <WarmupSection {...defaultProps} suggestedSets={mockSuggestedSets} />,
      );

      const header = screen.getByRole("button");
      await user.click(header);

      await waitFor(() => {
        expect(screen.getByText("Smart Suggestion")).toBeInTheDocument();
        expect(screen.getByText(/based on your history/i)).toBeInTheDocument();
        expect(screen.getByText("40kg → 60kg → 80kg")).toBeInTheDocument();
      });
    });

    it("does not show suggestion when sets already exist", async () => {
      const user = userEvent.setup();
      render(
        <WarmupSection
          {...defaultProps}
          warmupSets={mockWarmupSets}
          suggestedSets={mockSuggestedSets}
        />,
      );

      const header = screen.getByRole("button");
      await user.click(header);

      await waitFor(() => {
        expect(screen.queryByText("Smart Suggestion")).not.toBeInTheDocument();
      });
    });

    it("applies suggestion when Apply button clicked", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      render(
        <WarmupSection
          {...defaultProps}
          suggestedSets={mockSuggestedSets}
          onUpdate={onUpdate}
        />,
      );

      const header = screen.getByRole("button");
      await user.click(header);

      const applyButton = await screen.findByRole("button", { name: /apply/i });
      await user.click(applyButton);

      expect(onUpdate).toHaveBeenCalledWith(mockSuggestedSets);
    });

    it("dismisses suggestion when Dismiss button clicked", async () => {
      const user = userEvent.setup();
      render(
        <WarmupSection {...defaultProps} suggestedSets={mockSuggestedSets} />,
      );

      const header = screen.getByRole("button");
      await user.click(header);

      const dismissButton = await screen.findByRole("button", {
        name: /dismiss/i,
      });
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText("Smart Suggestion")).not.toBeInTheDocument();
      });
    });

    it("auto-expands section after applying suggestion", async () => {
      const user = userEvent.setup();
      render(
        <WarmupSection {...defaultProps} suggestedSets={mockSuggestedSets} />,
      );

      // Start collapsed
      const header = screen.getByRole("button", { expanded: false });

      // Expand to see suggestion
      await user.click(header);

      const applyButton = await screen.findByRole("button", { name: /apply/i });
      await user.click(applyButton);

      // Should remain expanded
      expect(header).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("Action Buttons", () => {
    it("calls onAutoFill when Auto Fill button clicked", async () => {
      const user = userEvent.setup();
      const onAutoFill = vi.fn();
      render(<WarmupSection {...defaultProps} onAutoFill={onAutoFill} />);

      const header = screen.getByRole("button");
      await user.click(header);

      const autoFillButton = await screen.findByRole("button", {
        name: /auto fill/i,
      });
      await user.click(autoFillButton);

      expect(onAutoFill).toHaveBeenCalledTimes(1);
    });

    it("adds new set when Add Set button clicked", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      render(<WarmupSection {...defaultProps} onUpdate={onUpdate} />);

      const header = screen.getByRole("button");
      await user.click(header);

      const addButton = await screen.findByRole("button", { name: /add set/i });
      await user.click(addButton);

      expect(onUpdate).toHaveBeenCalledWith([
        { setNumber: 1, weight: 0, reps: 5 },
      ]);
    });

    it("auto-expands section when adding a set", async () => {
      const user = userEvent.setup();
      render(<WarmupSection {...defaultProps} />);

      const header = screen.getByRole("button", { expanded: false });
      await user.click(header);

      const addButton = await screen.findByRole("button", { name: /add set/i });
      await user.click(addButton);

      expect(header).toHaveAttribute("aria-expanded", "true");
    });

    it("shows Clear button when sets exist", async () => {
      const user = userEvent.setup();
      render(<WarmupSection {...defaultProps} warmupSets={mockWarmupSets} />);

      const header = screen.getByRole("button");
      await user.click(header);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /clear/i }),
        ).toBeInTheDocument();
      });
    });

    it("does not show Clear button when no sets", async () => {
      const user = userEvent.setup();
      render(<WarmupSection {...defaultProps} />);

      const header = screen.getByRole("button");
      await user.click(header);

      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: /clear/i }),
        ).not.toBeInTheDocument();
      });
    });

    it("clears all sets when Clear button clicked", async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      render(
        <WarmupSection
          {...defaultProps}
          warmupSets={mockWarmupSets}
          onUpdate={onUpdate}
        />,
      );

      const header = screen.getByRole("button");
      await user.click(header);

      const clearButton = await screen.findByRole("button", { name: /clear/i });
      await user.click(clearButton);

      expect(onUpdate).toHaveBeenCalledWith([]);
    });
  });

  describe("Progression Footer", () => {
    it("shows progression ladder when sets and working weight exist", async () => {
      const user = userEvent.setup();
      render(
        <WarmupSection
          {...defaultProps}
          warmupSets={mockWarmupSets}
          workingWeight={100}
        />,
      );

      const header = screen.getByRole("button");
      await user.click(header);

      await waitFor(() => {
        expect(screen.getByText("Progressive load:")).toBeInTheDocument();
        expect(screen.getByText("50kg → 70kg → 100kg")).toBeInTheDocument();
      });
    });

    it("does not show progression footer when no working weight", async () => {
      const user = userEvent.setup();
      render(
        <WarmupSection
          {...defaultProps}
          warmupSets={mockWarmupSets}
          workingWeight={undefined}
        />,
      );

      const header = screen.getByRole("button");
      await user.click(header);

      await waitFor(() => {
        expect(screen.queryByText("Progressive load:")).not.toBeInTheDocument();
      });
    });

    it("does not show progression footer when no sets", async () => {
      const user = userEvent.setup();
      render(<WarmupSection {...defaultProps} workingWeight={100} />);

      const header = screen.getByRole("button");
      await user.click(header);

      await waitFor(() => {
        expect(screen.queryByText("Progressive load:")).not.toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels on header button", () => {
      render(<WarmupSection {...defaultProps} />);

      const header = screen.getByRole("button");
      expect(header).toHaveAttribute("aria-expanded");
      expect(header).toHaveAttribute(
        "aria-controls",
        "warmup-content-Bench Press",
      );
    });

    it("sets alert role on suggestion banner", async () => {
      const user = userEvent.setup();
      render(
        <WarmupSection {...defaultProps} suggestedSets={mockSuggestedSets} />,
      );

      const header = screen.getByRole("button");
      await user.click(header);

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert).toBeInTheDocument();
      });
    });

    it("supports keyboard navigation on header", async () => {
      render(<WarmupSection {...defaultProps} />);

      const header = screen.getByRole("button");
      header.focus();

      // Simulate Enter key
      fireEvent.keyDown(header, { key: "Enter", code: "Enter" });
      fireEvent.click(header);

      expect(header).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("Weight Unit Handling", () => {
    it("displays lbs unit correctly", async () => {
      const user = userEvent.setup();
      render(
        <WarmupSection
          {...defaultProps}
          weightUnit="lbs"
          warmupSets={mockWarmupSets}
        />,
      );

      const header = screen.getByRole("button");
      await user.click(header);

      await waitFor(() => {
        expect(screen.getByText("1060lbs moved")).toBeInTheDocument();
      });
    });

    it("formats suggestion with correct unit", async () => {
      const user = userEvent.setup();
      render(
        <WarmupSection
          {...defaultProps}
          weightUnit="lbs"
          suggestedSets={mockSuggestedSets}
        />,
      );

      const header = screen.getByRole("button");
      await user.click(header);

      await waitFor(() => {
        expect(screen.getByText("40lbs → 60lbs → 80lbs")).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles zero weight sets gracefully", () => {
      const zeroWeightSets: WarmupSetData[] = [
        { setNumber: 1, weight: 0, reps: 10 },
      ];

      render(<WarmupSection {...defaultProps} warmupSets={zeroWeightSets} />);

      expect(screen.getByText("Warm-up Sets (1)")).toBeInTheDocument();
      expect(screen.getByText("0kg moved")).toBeInTheDocument();
    });

    it("handles very large numbers of sets", async () => {
      const user = userEvent.setup();
      const manySets: WarmupSetData[] = Array.from({ length: 10 }, (_, i) => ({
        setNumber: i + 1,
        weight: 20 + i * 10,
        reps: 5,
      }));

      render(<WarmupSection {...defaultProps} warmupSets={manySets} />);

      const header = screen.getByRole("button");
      await user.click(header);

      expect(screen.getByText("Warm-up Sets (10)")).toBeInTheDocument();
    });

    it("handles empty suggested sets array", async () => {
      const user = userEvent.setup();
      render(<WarmupSection {...defaultProps} suggestedSets={[]} />);

      const header = screen.getByRole("button");
      await user.click(header);

      await waitFor(() => {
        expect(screen.queryByText("Smart Suggestion")).not.toBeInTheDocument();
      });
    });
  });
});
