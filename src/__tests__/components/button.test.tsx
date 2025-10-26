import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  simpleRender as render,
  screen,
  fireEvent,
  act,
} from "~/__tests__/test-utils";
import { Button } from "~/components/ui/button";

describe("Button", () => {
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
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-interactive-primary");
  });

  it("renders with different variants", async () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-destructive");

    await act(async () => {
      rerender(<Button variant="outline">Outline</Button>);
    });
    expect(screen.getByRole("button")).toHaveClass(
      "border-interactive-primary",
    );

    await act(async () => {
      rerender(<Button variant="secondary">Secondary</Button>);
    });
    expect(screen.getByRole("button")).toHaveClass("bg-interactive-secondary");

    await act(async () => {
      rerender(<Button variant="ghost">Ghost</Button>);
    });
    expect(screen.getByRole("button")).toHaveClass("bg-transparent");

    await act(async () => {
      rerender(<Button variant="link">Link</Button>);
    });
    expect(screen.getByRole("button")).toHaveClass("underline-offset-4");
  });

  it("renders with different sizes", async () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-10");

    await act(async () => {
      rerender(<Button size="lg">Large</Button>);
    });
    expect(screen.getByRole("button")).toHaveClass("h-12");

    await act(async () => {
      rerender(<Button size="xl">Extra Large</Button>);
    });
    expect(screen.getByRole("button")).toHaveClass("h-14");

    await act(async () => {
      rerender(<Button size="icon">Icon</Button>);
    });
    expect(screen.getByRole("button")).toHaveClass("size-11");
  });

  it("handles disabled state", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-disabled", "true");
  });

  it("handles click events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies custom className", () => {
    render(<Button className="custom-class">Custom</Button>);
    expect(screen.getByRole("button")).toHaveClass("custom-class");
  });

  it("forwards other props to button element", () => {
    render(
      <Button type="submit" data-testid="submit-btn">
        Submit
      </Button>,
    );
    const button = screen.getByTestId("submit-btn");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("renders as child component when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>,
    );
    const link = screen.getByRole("link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
  });

  it("sets correct data attributes", () => {
    render(<Button variant="destructive">Test</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-slot", "button");
    expect(button).toHaveAttribute("data-state-layer", "error");
  });
});
