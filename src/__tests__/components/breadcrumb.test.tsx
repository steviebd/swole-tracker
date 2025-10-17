import React from "react";
import { describe, it, expect } from "vitest";
import { simpleRender as render, screen } from "~/__tests__/test-utils";
import {
  Breadcrumb,
  pageBreadcrumbs,
} from "~/components/navigation/breadcrumb";

describe("Breadcrumb", () => {
  it("renders nothing for home page", () => {
    render(<Breadcrumb pathname="/" />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("generates breadcrumbs from pathname", () => {
    render(<Breadcrumb pathname="/workout/start" />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Workout")).toBeInTheDocument();
    expect(screen.getByText("Start Workout")).toBeInTheDocument();
  });

  it("renders provided items", () => {
    const items = [
      { label: "Home", href: "/" },
      { label: "Custom", href: "/custom" },
      { label: "Current", current: true },
    ];

    render(<Breadcrumb items={items} />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("handles dynamic routes", () => {
    render(<Breadcrumb pathname="/templates/123/edit" />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("skips numeric IDs in breadcrumbs", () => {
    render(<Breadcrumb pathname="/workouts/456" />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Workouts & Progress")).toBeInTheDocument();
    // Should not show "456"
    expect(screen.queryByText("456")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <Breadcrumb pathname="/workout/start" className="custom-breadcrumb" />,
    );

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("custom-breadcrumb");
  });

  it("renders pre-defined breadcrumb configurations", () => {
    render(<Breadcrumb items={pageBreadcrumbs.workoutStart as any} />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Workout")).toBeInTheDocument();
    expect(screen.getByText("Start Workout")).toBeInTheDocument();
  });

  it("marks current page correctly", () => {
    const items = [
      { label: "Home", href: "/" },
      { label: "Current Page", current: true },
    ];

    render(<Breadcrumb items={items} />);

    const currentItem = screen.getByText("Current Page");
    expect(currentItem).toHaveAttribute("aria-current", "page");
  });

  it("renders links for non-current items", () => {
    const items = [
      { label: "Home", href: "/" },
      { label: "Link Page", href: "/link" },
    ];

    render(<Breadcrumb items={items} />);

    const link = screen.getByRole("link", { name: "Link Page" });
    expect(link).toHaveAttribute("href", "/link");
  });
});
