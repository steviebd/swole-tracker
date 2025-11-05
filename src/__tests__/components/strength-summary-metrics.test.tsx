import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { simpleRender as renderSimple } from "~/__tests__/test-utils";

// Ensure React is available globally for JSX
global.React = React;

import { StrengthSummaryMetrics } from "~/app/_components/StrengthSummaryMetrics";

const mockSummaryCards = [
  {
    id: "total-sessions",
    label: "Total Sessions",
    value: "24",
    helper: "Workouts completed",
  },
  {
    id: "total-volume",
    label: "Total Volume",
    value: "45,230 kg",
    helper: "Weight moved across all sessions",
  },
  {
    id: "avg-intensity",
    label: "Avg Intensity",
    value: "82%",
    helper: "Average of your best sets",
  },
  {
    id: "pr-count",
    label: "PR Count",
    value: "8",
    helper: "Personal records achieved",
  },
];

describe("StrengthSummaryMetrics", () => {
  describe("Component Rendering", () => {
    it("renders all summary cards", () => {
      renderSimple(<StrengthSummaryMetrics summaryCards={mockSummaryCards} />);

      expect(screen.getByText("Total Sessions")).toBeInTheDocument();
      expect(screen.getByText("Total Volume")).toBeInTheDocument();
      expect(screen.getByText("Avg Intensity")).toBeInTheDocument();
      expect(screen.getByText("PR Count")).toBeInTheDocument();
    });

    it("renders card values correctly", () => {
      renderSimple(<StrengthSummaryMetrics summaryCards={mockSummaryCards} />);

      expect(screen.getByText("24")).toBeInTheDocument();
      expect(screen.getByText("45,230 kg")).toBeInTheDocument();
      expect(screen.getByText("82%")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
    });

    it("renders card helpers correctly", () => {
      renderSimple(<StrengthSummaryMetrics summaryCards={mockSummaryCards} />);

      expect(screen.getByText("Workouts completed")).toBeInTheDocument();
      expect(
        screen.getByText("Weight moved across all sessions"),
      ).toBeInTheDocument();
      expect(screen.getByText("Average of your best sets")).toBeInTheDocument();
      expect(screen.getByText("Personal records achieved")).toBeInTheDocument();
    });
  });

  describe("Grid Layout", () => {
    it("applies correct grid classes", () => {
      renderSimple(<StrengthSummaryMetrics summaryCards={mockSummaryCards} />);

      const gridContainer = screen.getByText("Total Sessions").closest(".grid");
      expect(gridContainer).toHaveClass(
        "grid",
        "gap-4",
        "md:grid-cols-2",
        "xl:grid-cols-4",
      );
    });
  });

  describe("Card Styling", () => {
    it("applies correct card styling", () => {
      renderSimple(<StrengthSummaryMetrics summaryCards={mockSummaryCards} />);

      const cards = screen
        .getAllByText("Total Sessions")
        .map((el) => el.closest("div"));
      const card = cards.find((card) =>
        card?.classList.contains("border-border/70"),
      );

      expect(card).toHaveClass(
        "border-border/70",
        "bg-card/80",
        "rounded-2xl",
        "border",
        "p-4",
        "shadow-sm",
      );
    });

    it("applies correct label styling", () => {
      renderSimple(<StrengthSummaryMetrics summaryCards={mockSummaryCards} />);

      const label = screen.getByText("Total Sessions");
      expect(label).toHaveClass(
        "text-muted-foreground",
        "text-xs",
        "tracking-[0.25em]",
        "uppercase",
      );
    });

    it("applies correct value styling", () => {
      renderSimple(<StrengthSummaryMetrics summaryCards={mockSummaryCards} />);

      const value = screen.getByText("24");
      expect(value).toHaveClass(
        "text-foreground",
        "mt-2",
        "text-2xl",
        "font-semibold",
      );
    });

    it("applies correct helper styling", () => {
      renderSimple(<StrengthSummaryMetrics summaryCards={mockSummaryCards} />);

      const helper = screen.getByText("Workouts completed");
      expect(helper).toHaveClass("text-muted-foreground", "text-xs");
    });
  });

  describe("Data Handling", () => {
    it("renders cards with unique keys", () => {
      renderSimple(<StrengthSummaryMetrics summaryCards={mockSummaryCards} />);

      // Each card should be rendered (no duplicate key errors)
      expect(
        screen.getAllByText(
          /Total Sessions|Total Volume|Avg Intensity|PR Count/,
        ),
      ).toHaveLength(4);
    });

    it("handles empty summary cards array", () => {
      renderSimple(<StrengthSummaryMetrics summaryCards={[]} />);

      // Should render empty grid without errors
      const gridContainer = document.querySelector(".grid");
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer?.children).toHaveLength(0);
    });

    it("handles single card", () => {
      const singleCard = [mockSummaryCards[0]!];
      renderSimple(<StrengthSummaryMetrics summaryCards={singleCard} />);

      expect(screen.getByText("Total Sessions")).toBeInTheDocument();
      expect(screen.queryByText("Total Volume")).not.toBeInTheDocument();
    });

    it("handles cards with special characters", () => {
      const specialCards = [
        {
          id: "special",
          label: "Special & Characters",
          value: "100%",
          helper: "Test <>&\"'",
        },
      ];

      renderSimple(<StrengthSummaryMetrics summaryCards={specialCards} />);

      expect(screen.getByText("Special & Characters")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByText("Test <>&\"'")).toBeInTheDocument();
    });

    it("handles long text values", () => {
      const longCards = [
        {
          id: "long",
          label: "Very Long Label Text That Should Still Render",
          value: "1,234,567,890 kg",
          helper:
            "This is a very long helper text that should wrap appropriately in the UI",
        },
      ];

      renderSimple(<StrengthSummaryMetrics summaryCards={longCards} />);

      expect(
        screen.getByText("Very Long Label Text That Should Still Render"),
      ).toBeInTheDocument();
      expect(screen.getByText("1,234,567,890 kg")).toBeInTheDocument();
      expect(
        screen.getByText(
          "This is a very long helper text that should wrap appropriately in the UI",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("renders semantic structure", () => {
      renderSimple(<StrengthSummaryMetrics summaryCards={mockSummaryCards} />);

      // Should have proper heading hierarchy and structure
      const labels = screen.getAllByText(
        /Total Sessions|Total Volume|Avg Intensity|PR Count/,
      );
      expect(labels).toHaveLength(4);

      labels.forEach((label) => {
        expect(label.tagName.toLowerCase()).toBe("p");
      });
    });

    it("uses appropriate text colors for readability", () => {
      renderSimple(<StrengthSummaryMetrics summaryCards={mockSummaryCards} />);

      // Labels should use muted foreground color
      const label = screen.getByText("Total Sessions");
      expect(label).toHaveClass("text-muted-foreground");

      // Values should use foreground color
      const value = screen.getByText("24");
      expect(value).toHaveClass("text-foreground");

      // Helpers should use muted foreground color
      const helper = screen.getByText("Workouts completed");
      expect(helper).toHaveClass("text-muted-foreground");
    });
  });

  describe("Responsive Design", () => {
    it("uses responsive grid columns", () => {
      renderSimple(<StrengthSummaryMetrics summaryCards={mockSummaryCards} />);

      const grid = screen.getByText("Total Sessions").closest(".grid");
      expect(grid).toHaveClass("md:grid-cols-2", "xl:grid-cols-4");
    });

    it("stacks cards on mobile", () => {
      renderSimple(<StrengthSummaryMetrics summaryCards={mockSummaryCards} />);

      const grid = screen.getByText("Total Sessions").closest(".grid");
      // Default is single column on mobile (no explicit grid-cols-1 needed)
      expect(grid).not.toHaveClass("grid-cols-1");
    });
  });

  describe("Edge Cases", () => {
    it("handles cards with empty strings", () => {
      const emptyCards = [
        {
          id: "empty",
          label: "",
          value: "",
          helper: "",
        },
      ];

      renderSimple(<StrengthSummaryMetrics summaryCards={emptyCards} />);

      // Should still render the structure - find all empty p elements
      const emptyParagraphs = screen.getAllByText("", { selector: "p" });
      expect(emptyParagraphs.length).toBeGreaterThan(0);
    });

    it("handles cards with very large numbers", () => {
      const largeNumberCards = [
        {
          id: "large",
          label: "Large Number",
          value: "999,999,999,999",
          helper: "Very large number",
        },
      ];

      renderSimple(<StrengthSummaryMetrics summaryCards={largeNumberCards} />);

      expect(screen.getByText("999,999,999,999")).toBeInTheDocument();
    });

    it("handles cards with zero values", () => {
      const zeroCards = [
        {
          id: "zero",
          label: "Zero Value",
          value: "0",
          helper: "Zero helper",
        },
      ];

      renderSimple(<StrengthSummaryMetrics summaryCards={zeroCards} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("handles cards with negative values", () => {
      const negativeCards = [
        {
          id: "negative",
          label: "Negative Value",
          value: "-5.2%",
          helper: "Negative helper",
        },
      ];

      renderSimple(<StrengthSummaryMetrics summaryCards={negativeCards} />);

      expect(screen.getByText("-5.2%")).toBeInTheDocument();
    });
  });
});
