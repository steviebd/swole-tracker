import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "~/__tests__/test-utils";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";

describe("Alert", () => {
  it("renders with default variant", () => {
    render(
      <Alert>
        <AlertTitle>Alert Title</AlertTitle>
        <AlertDescription>Alert description</AlertDescription>
      </Alert>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass("bg-card", "text-card-foreground");
  });

  it("renders with destructive variant", () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Error Title</AlertTitle>
        <AlertDescription>Error description</AlertDescription>
      </Alert>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass("text-destructive");
  });

  it("renders title and description", () => {
    render(
      <Alert>
        <AlertTitle>Test Title</AlertTitle>
        <AlertDescription>Test description</AlertDescription>
      </Alert>,
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <Alert className="custom-class">
        <AlertTitle>Title</AlertTitle>
      </Alert>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("custom-class");
  });

  it("forwards other props", () => {
    render(
      <Alert data-testid="custom-alert">
        <AlertTitle>Title</AlertTitle>
      </Alert>,
    );

    expect(screen.getByTestId("custom-alert")).toBeInTheDocument();
  });
});

describe("AlertTitle", () => {
  it("renders with correct classes", () => {
    render(<AlertTitle>Title</AlertTitle>);

    const title = screen.getByText("Title");
    expect(title).toHaveClass("font-medium", "tracking-tight");
  });

  it("applies custom className", () => {
    render(<AlertTitle className="custom-title">Title</AlertTitle>);

    const title = screen.getByText("Title");
    expect(title).toHaveClass("custom-title");
  });
});

describe("AlertDescription", () => {
  it("renders with correct classes", () => {
    render(<AlertDescription>Description</AlertDescription>);

    const description = screen.getByText("Description");
    expect(description).toHaveClass("text-muted-foreground", "text-sm");
  });

  it("applies custom className", () => {
    render(
      <AlertDescription className="custom-desc">Description</AlertDescription>,
    );

    const description = screen.getByText("Description");
    expect(description).toHaveClass("custom-desc");
  });
});
