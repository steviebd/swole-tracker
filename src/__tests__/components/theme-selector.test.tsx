import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "~/__tests__/test-utils";
import { ThemeProvider } from "~/providers/ThemeProvider";
import { ThemeSelector } from "~/components/ThemeSelector";
import { mockLocalStorage } from "~/__tests__/test-utils";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("ThemeSelector accessibility", () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    const win =
      typeof window === "undefined"
        ? (globalThis as unknown as Window & typeof globalThis)
        : window;
    originalMatchMedia = win.matchMedia;
    (win as unknown as { localStorage: Storage }).localStorage =
      mockLocalStorage() as unknown as Storage;
    if (!(win as unknown as { document?: Document }).document) {
      (win as unknown as { document: Document }).document = document;
    }
    if (typeof (win as unknown as { addEventListener?: unknown }).addEventListener !== "function") {
      (win as unknown as { addEventListener: typeof window.addEventListener }).addEventListener = vi.fn();
    }
    if (typeof (win as unknown as { removeEventListener?: unknown }).removeEventListener !== "function") {
      (win as unknown as { removeEventListener: typeof window.removeEventListener }).removeEventListener = vi.fn();
    }
    if (typeof (win as unknown as { requestAnimationFrame?: unknown }).requestAnimationFrame !== "function") {
      (win as unknown as { requestAnimationFrame: typeof window.requestAnimationFrame }).requestAnimationFrame =
        (cb: FrameRequestCallback) => setTimeout(cb, 16);
    }
    if (typeof (win as unknown as { cancelAnimationFrame?: unknown }).cancelAnimationFrame !== "function") {
      (win as unknown as { cancelAnimationFrame: typeof window.cancelAnimationFrame }).cancelAnimationFrame =
        (handle: number) => clearTimeout(handle);
    }
    if (typeof (win as unknown as { setTimeout?: unknown }).setTimeout !== "function") {
      (win as unknown as { setTimeout: typeof window.setTimeout }).setTimeout = setTimeout;
    }
    if (typeof (win as unknown as { clearTimeout?: unknown }).clearTimeout !== "function") {
      (win as unknown as { clearTimeout: typeof window.clearTimeout }).clearTimeout = clearTimeout;
    }
    win.matchMedia = vi.fn().mockImplementation((query: string) => {
      return {
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("announces theme changes via aria-live region", async () => {
    render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    const darkButton = screen.getByRole("radio", { name: /dark/i });
    fireEvent.click(darkButton);

    expect(screen.getByText("Dark theme selected")).toBeInTheDocument();

    await waitFor(
      () =>
        expect(screen.queryByText("Dark theme selected")).not.toBeInTheDocument(),
      { timeout: 1500 },
    );
  });
});
