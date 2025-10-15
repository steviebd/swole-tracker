import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "~/__tests__/test-utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "~/components/ui/card";

describe("Card", () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    const win =
      typeof window === "undefined"
        ? (globalThis as unknown as Window & typeof globalThis)
        : window;
    originalMatchMedia = win.matchMedia;
    win.matchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(() => {}),
      removeEventListener: vi.fn(() => {}),
      addListener: vi.fn(() => {}),
      removeListener: vi.fn(() => {}),
      dispatchEvent: vi.fn(() => true),
    }));
  });

  afterEach(() => {
    const win =
      typeof window === "undefined"
        ? (globalThis as unknown as Window & typeof globalThis)
        : window;
    if (originalMatchMedia) {
      win.matchMedia = originalMatchMedia;
    } else {
      delete (win as unknown as { matchMedia?: typeof window.matchMedia })
        .matchMedia;
    }
  });

  it("renders with default props", () => {
    render(<Card>Card content</Card>);
    const card = screen.getByText("Card content");
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass("bg-surface-primary");
  });

  it("renders with different surfaces", () => {
    const { rerender } = render(<Card surface="app">App surface</Card>);
    expect(screen.getByText("App surface")).toHaveClass("bg-surface-app");

    rerender(<Card surface="surface">Surface</Card>);
    expect(screen.getByText("Surface")).toHaveClass("bg-surface-base");

    rerender(<Card surface="elevated">Elevated</Card>);
    expect(screen.getByText("Elevated")).toHaveClass("bg-surface-elevated");
  });

  it("renders with different variants", () => {
    const { rerender } = render(<Card variant="elevated">Elevated</Card>);
    expect(screen.getByText("Elevated")).toHaveClass("shadow-md");

    rerender(<Card variant="glass">Glass</Card>);
    expect(screen.getByText("Glass")).toHaveClass("glass-card");

    rerender(<Card variant="outline">Outline</Card>);
    expect(screen.getByText("Outline")).toHaveClass("bg-transparent");
  });

  it("renders with different padding", () => {
    const { rerender } = render(<Card padding="sm">Small padding</Card>);
    expect(screen.getByText("Small padding")).toHaveClass("p-4");

    rerender(<Card padding="lg">Large padding</Card>);
    expect(screen.getByText("Large padding")).toHaveClass("p-8");

    rerender(<Card padding="none">No padding</Card>);
    expect(screen.getByText("No padding")).not.toHaveClass("p-");
  });

  it("handles interactive prop", () => {
    render(<Card interactive>Interactive card</Card>);
    const card = screen.getByRole("button");
    expect(card).toHaveAttribute("tabIndex", "0");
    expect(card).toHaveAttribute("aria-pressed", "false");
  });

  it("handles onActivate callback", () => {
    const handleActivate = vi.fn();
    render(
      <Card interactive onActivate={handleActivate}>
        Interactive
      </Card>,
    );
    const card = screen.getByRole("button");
    fireEvent.click(card);
    expect(handleActivate).toHaveBeenCalledTimes(1);
  });

  it("handles keyboard activation", () => {
    const handleActivate = vi.fn();
    render(
      <Card interactive onActivate={handleActivate}>
        Interactive
      </Card>,
    );
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(handleActivate).toHaveBeenCalledTimes(1);
  });

  it("applies custom className", () => {
    render(<Card className="custom-class">Custom</Card>);
    expect(screen.getByText("Custom")).toHaveClass("custom-class");
  });
});

describe("CardHeader", () => {
  it("renders with children", () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText("Header content")).toBeInTheDocument();
  });

  it("applies default classes", () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText("Header")).toHaveClass(
      "border-b",
      "border-muted",
      "pb-4",
    );
  });
});

describe("CardTitle", () => {
  it("renders as h3 with correct classes", () => {
    render(<CardTitle>Title</CardTitle>);
    const title = screen.getByRole("heading", { level: 3 });
    expect(title).toHaveClass("text-lg", "font-semibold");
  });
});

describe("CardDescription", () => {
  it("renders with correct classes", () => {
    render(<CardDescription>Description</CardDescription>);
    expect(screen.getByText("Description")).toHaveClass(
      "text-sm",
      "text-muted-foreground",
    );
  });
});

describe("CardContent", () => {
  it("renders with default padding", () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText("Content")).toHaveClass("py-6");
  });
});

describe("CardFooter", () => {
  it("renders with border and padding", () => {
    render(<CardFooter>Footer</CardFooter>);
    expect(screen.getByText("Footer")).toHaveClass(
      "border-t",
      "border-muted",
      "pt-4",
    );
  });
});
