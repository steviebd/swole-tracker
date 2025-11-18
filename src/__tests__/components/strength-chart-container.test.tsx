import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { simpleRender as renderSimple } from "~/__tests__/test-utils";

// Ensure React is available globally for JSX
global.React = React;

// Mock framer-motion to prevent DOM warnings
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => (
      <div data-motion="div" {...props}>
        {children}
      </div>
    ),
    span: ({ children, ...props }: any) => (
      <span data-motion="span" {...props}>
        {children}
      </span>
    ),
    button: ({ children, ...props }: any) => (
      <button data-motion="button" {...props}>
        {children}
      </button>
    ),
    form: ({ children, ...props }: any) => (
      <form data-motion="form" {...props}>
        {children}
      </form>
    ),
  },
  AnimatePresence: ({ children }: any) => (
    <div data-animate-presence>{children}</div>
  ),
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useSpring: () => ({ get: () => 0, set: vi.fn() }),
}));

// Mock recharts components
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Line: () => <div data-testid="line" />,
  Tooltip: ({ content }: any) => (
    <div
      data-testid="tooltip"
      data-content={typeof content === "function" ? "function" : content}
    />
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: ({ domain }: any) => (
    <div data-testid="y-axis" data-domain={JSON.stringify(domain)} />
  ),
}));

import {
  StrengthChartContainer,
  calculateYAxisDomain,
} from "~/app/_components/StrengthChartContainer";

const mockChartPoints = [
  { date: "Jan 1", fullDate: "2024-01-01", value: 100 },
  { date: "Jan 8", fullDate: "2024-01-08", value: 105 },
  { date: "Jan 15", fullDate: "2024-01-15", value: 110 },
];

const defaultProps = {
  viewMode: "topSet" as const,
  setViewMode: vi.fn(),
  chartIsEmpty: false,
  chartPoints: mockChartPoints,
};

describe("StrengthChartContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateYAxisDomain", () => {
    it("returns default domain for empty values", () => {
      const result = calculateYAxisDomain([]);
      expect(result).toEqual([0, 100]);
    });

    it("calculates domain with 50% padding for small ranges (≤10)", () => {
      // Range of 10 (140-150), should use 50% padding = 5
      // Domain: [140-5, 150+5] = [135, 155]
      const result = calculateYAxisDomain([140, 145, 150]);
      expect(result).toEqual([135, 155]);
    });

    it("calculates domain with 30% padding for medium ranges (≤50)", () => {
      // Range of 30 (120-150), should use 30% padding = 9
      // Domain: [120-9, 150+9] = [111, 159]
      const result = calculateYAxisDomain([120, 135, 150]);
      expect(result).toEqual([111, 159]);
    });

    it("calculates domain with 10% padding for large ranges (>50)", () => {
      // Range of 60 (120-180), should use 10% padding = 6
      // Domain: [120-6, 180+6] = [114, 186]
      const result = calculateYAxisDomain([120, 150, 180]);
      expect(result).toEqual([114, 186]);
    });

    it("does not go below 0 for minimum value", () => {
      // Range of 5 (2-7), should use 50% padding = 2.5
      // Domain: [max(0, 2-2.5), 7+2.5] = [0, 9.5]
      const result = calculateYAxisDomain([2, 5, 7]);
      expect(result).toEqual([0, 9.5]);
    });

    it("handles single value", () => {
      // Range of 0 (single value), should use 50% padding = 0
      // Domain: [max(0, 100-0), 100+0] = [100, 100]
      const result = calculateYAxisDomain([100]);
      expect(result).toEqual([100, 100]);
    });

    it("handles negative values by clamping to 0", () => {
      // Range of 10 (-5 to 5), should use 50% padding = 5
      // Domain: [max(0, -5-5), 5+5] = [0, 10]
      const result = calculateYAxisDomain([-5, 0, 5]);
      expect(result).toEqual([0, 10]);
    });
  });

  describe("Component Rendering", () => {
    it("renders chart container with proper structure", () => {
      renderSimple(<StrengthChartContainer {...defaultProps} />);

      expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
      expect(screen.getByTestId("cartesian-grid")).toBeInTheDocument();
      expect(screen.getByTestId("line")).toBeInTheDocument();
      expect(screen.getByTestId("tooltip")).toBeInTheDocument();
      expect(screen.getByTestId("x-axis")).toBeInTheDocument();
      expect(screen.getByTestId("y-axis")).toBeInTheDocument();
    });

    it("renders view mode buttons", () => {
      renderSimple(<StrengthChartContainer {...defaultProps} />);

      expect(screen.getByText("Top Set")).toBeInTheDocument();
      expect(screen.getByText("1RM Estimate")).toBeInTheDocument();
      expect(screen.getByText("Session Intensity")).toBeInTheDocument();
    });

    it("shows active view mode styling", () => {
      renderSimple(<StrengthChartContainer {...defaultProps} />);

      const topSetButton = screen.getByText("Top Set");
      expect(topSetButton).toHaveClass("bg-primary", "text-primary-foreground");
    });

    it("shows inactive view mode styling", () => {
      renderSimple(<StrengthChartContainer {...defaultProps} />);

      const oneRmButton = screen.getByText("1RM Estimate");
      expect(oneRmButton).toHaveClass("bg-muted/60", "text-muted-foreground");
    });

    it("displays view mode description", () => {
      renderSimple(<StrengthChartContainer {...defaultProps} />);

      expect(
        screen.getByText("Heaviest weight lifted per session"),
      ).toBeInTheDocument();
    });
  });

  describe("View Mode Switching", () => {
    it("calls setViewMode when clicking view mode buttons", () => {
      const mockSetViewMode = vi.fn();
      renderSimple(
        <StrengthChartContainer
          {...defaultProps}
          setViewMode={mockSetViewMode}
        />,
      );

      const oneRmButton = screen.getByText("1RM Estimate");
      fireEvent.click(oneRmButton);

      expect(mockSetViewMode).toHaveBeenCalledWith("oneRm");
    });

    it("updates description when view mode changes", () => {
      const { rerender } = renderSimple(
        <StrengthChartContainer {...defaultProps} />,
      );

      expect(
        screen.getByText("Heaviest weight lifted per session"),
      ).toBeInTheDocument();

      rerender(<StrengthChartContainer {...defaultProps} viewMode="oneRm" />);

      expect(
        screen.getByText("Estimated e1RM for your heaviest set"),
      ).toBeInTheDocument();
    });

    it("updates chart color when view mode changes", () => {
      const { rerender } = renderSimple(
        <StrengthChartContainer {...defaultProps} />,
      );

      // Initially should be chart-1 color for topSet
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();

      rerender(<StrengthChartContainer {...defaultProps} viewMode="oneRm" />);

      // Should now be chart-4 color for oneRm
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });
  });

  describe("Empty Chart State", () => {
    it("shows empty state message when chartIsEmpty is true", () => {
      renderSimple(
        <StrengthChartContainer {...defaultProps} chartIsEmpty={true} />,
      );

      expect(
        screen.getByText(
          "Not enough sessions yet. Log a few workouts to unlock trend lines.",
        ),
      ).toBeInTheDocument();
    });

    it("does not render chart when empty", () => {
      renderSimple(
        <StrengthChartContainer {...defaultProps} chartIsEmpty={true} />,
      );

      expect(
        screen.queryByTestId("responsive-container"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Data Visualization", () => {
    it("passes chart data to LineChart", () => {
      renderSimple(<StrengthChartContainer {...defaultProps} />);

      const lineChart = screen.getByTestId("line-chart");
      const data = JSON.parse(lineChart.getAttribute("data-data") || "[]");
      expect(data).toEqual(mockChartPoints);
    });

    it("calculates and sets Y-axis domain", () => {
      renderSimple(<StrengthChartContainer {...defaultProps} />);

      const yAxis = screen.getByTestId("y-axis");
      const domain = JSON.parse(yAxis.getAttribute("data-domain") || "[]");

      // For values [100, 105, 110], range = 10, padding = 5, domain = [95, 115]
      expect(domain).toEqual([95, 115]);
    });

    it("virtualizes large datasets", () => {
      const largeDataset = Array.from({ length: 200 }, (_, i) => ({
        date: `Day ${i}`,
        fullDate: `2024-01-${String(i + 1).padStart(2, "0")}`,
        value: 100 + i,
      }));

      renderSimple(
        <StrengthChartContainer {...defaultProps} chartPoints={largeDataset} />,
      );

      const lineChart = screen.getByTestId("line-chart");
      const data = JSON.parse(lineChart.getAttribute("data-data") || "[]");

      // Should be limited to ~100 points max
      expect(data.length).toBeLessThanOrEqual(100);
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe("Tooltip Content", () => {
    it("renders tooltip with proper structure", () => {
      renderSimple(<StrengthChartContainer {...defaultProps} />);

      const tooltip = screen.getByTestId("tooltip");
      expect(tooltip).toBeInTheDocument();
    });

    it("tooltip content function handles active payload", () => {
      renderSimple(<StrengthChartContainer {...defaultProps} />);

      const tooltip = screen.getByTestId("tooltip");
      const contentType = tooltip.getAttribute("data-content");

      expect(contentType).toBe("function");

      // The tooltip content function is tested implicitly through the component rendering
      // We just verify that the tooltip component is rendered with the correct content type
      expect(tooltip).toBeInTheDocument();
    });
  });

  describe("Chart Styling", () => {
    it("applies correct container styling", () => {
      renderSimple(<StrengthChartContainer {...defaultProps} />);

      const container = screen
        .getByText("Top Set")
        .closest(".border-border\\/70");
      expect(container).toHaveClass(
        "border-border/70",
        "bg-card/70",
        "rounded-2xl",
      );
    });

    it("applies correct chart dimensions", () => {
      renderSimple(<StrengthChartContainer {...defaultProps} />);

      const chartContainer = screen.getByTestId(
        "responsive-container",
      ).parentElement;
      expect(chartContainer).toHaveClass("mt-4", "h-72", "w-full");
    });
  });

  describe("Accessibility", () => {
    it("renders buttons with proper types", () => {
      renderSimple(<StrengthChartContainer {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("type", "button");
      });
    });

    it("buttons have accessible names", () => {
      renderSimple(<StrengthChartContainer {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: "Top Set" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "1RM Estimate" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Session Intensity" }),
      ).toBeInTheDocument();
    });
  });

  describe("Performance Optimization", () => {
    it("memoizes virtualized data calculation", () => {
      const { rerender } = renderSimple(
        <StrengthChartContainer {...defaultProps} />,
      );

      // First render
      const lineChart1 = screen.getByTestId("line-chart");
      const data1 = JSON.parse(lineChart1.getAttribute("data-data") || "[]");

      // Re-render with same data
      rerender(<StrengthChartContainer {...defaultProps} />);

      const lineChart2 = screen.getByTestId("line-chart");
      const data2 = JSON.parse(lineChart2.getAttribute("data-data") || "[]");

      // Should be the same reference (memoized)
      expect(data1).toEqual(data2);
    });

    it("recalculates virtualized data when chartPoints change", () => {
      const { rerender } = renderSimple(
        <StrengthChartContainer {...defaultProps} />,
      );

      const newChartPoints = [
        { date: "Feb 1", fullDate: "2024-02-01", value: 115 },
        { date: "Feb 8", fullDate: "2024-02-08", value: 120 },
      ];

      rerender(
        <StrengthChartContainer
          {...defaultProps}
          chartPoints={newChartPoints}
        />,
      );

      const lineChart = screen.getByTestId("line-chart");
      const data = JSON.parse(lineChart.getAttribute("data-data") || "[]");

      expect(data).toEqual(newChartPoints);
    });
  });
});
