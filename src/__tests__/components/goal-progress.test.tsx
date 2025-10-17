import React from "react";
import { describe, it, expect, vi } from "vitest";
import { simpleRender as render, screen } from "~/__tests__/test-utils";
import { GoalProgress } from "~/components/charts/goal-progress";

// Framer-motion is mocked globally in setup.dom.ts

describe("GoalProgress", () => {
  it("renders linear variant by default", () => {
    render(
      <GoalProgress
        title="Test Goal"
        current={50}
        target={100}
        unit="workouts"
      />,
    );

    expect(screen.getByText("Test Goal")).toBeInTheDocument();
    expect(screen.getByText("50 / 100 workouts")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders circular variant", () => {
    render(
      <GoalProgress
        title="Test Goal"
        current={75}
        target={100}
        unit="points"
        variant="circular"
      />,
    );

    expect(screen.getByText("Test Goal")).toBeInTheDocument();
    expect(screen.getByText("75 / 100 points")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("shows achievement icon when goal is reached", () => {
    render(
      <GoalProgress
        title="Completed Goal"
        current={100}
        target={100}
        unit="tasks"
      />,
    );

    // CheckCircle icon should be present
    const checkIcon = document.querySelector("svg");
    expect(checkIcon).toBeInTheDocument();
  });

  it("shows over-achievement message", () => {
    render(
      <GoalProgress
        title="Exceeded Goal"
        current={120}
        target={100}
        unit="items"
      />,
    );

    expect(screen.getByText("🎉 Goal exceeded by 20.0%!")).toBeInTheDocument();
  });

  it("handles different sizes for circular variant", () => {
    const { rerender } = render(
      <GoalProgress
        title="Small Goal"
        current={25}
        target={100}
        unit="steps"
        variant="circular"
        size="sm"
      />,
    );

    expect(screen.getByText("25%")).toBeInTheDocument();

    rerender(
      <GoalProgress
        title="Large Goal"
        current={25}
        target={100}
        unit="steps"
        variant="circular"
        size="lg"
      />,
    );

    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("handles different themes", () => {
    const { rerender } = render(
      <GoalProgress
        title="Primary Goal"
        current={60}
        target={100}
        unit="units"
        theme="primary"
      />,
    );

    expect(screen.getByText("60%")).toBeInTheDocument();

    rerender(
      <GoalProgress
        title="Success Goal"
        current={60}
        target={100}
        unit="units"
        theme="success"
      />,
    );

    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("handles click events", () => {
    const handleClick = vi.fn();
    render(
      <GoalProgress
        title="Clickable Goal"
        current={80}
        target={100}
        unit="clicks"
        onClick={handleClick}
      />,
    );

    const progressElement = screen.getByRole("button");
    progressElement.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies custom className", () => {
    render(
      <GoalProgress
        title="Custom Goal"
        current={40}
        target={100}
        unit="custom"
        className="custom-class"
      />,
    );

    // Check that the custom class is applied to some element in the component
    const elementWithClass = document.querySelector(".custom-class");
    expect(elementWithClass).toBeInTheDocument();
  });

  it("caps progress at 100%", () => {
    render(
      <GoalProgress title="Over Goal" current={150} target={100} unit="over" />,
    );

    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
