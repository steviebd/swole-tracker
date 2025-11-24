import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "~/__tests__/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ThemeProvider } from "~/providers/ThemeProvider";
import { ThemeSelector } from "~/components/ThemeSelector";
import { mockLocalStorage } from "~/__tests__/test-utils";

describe("ThemeSelector accessibility", () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    const win =
      typeof window === "undefined"
        ? (globalThis as unknown as Window & typeof globalThis)
        : window;
    originalMatchMedia = win.matchMedia;
    Object.defineProperty(win, "localStorage", {
      value: mockLocalStorage(),
      writable: true,
      configurable: true,
    });
    if (
      typeof (win as unknown as { addEventListener?: unknown })
        .addEventListener !== "function"
    ) {
      (
        win as unknown as { addEventListener: typeof window.addEventListener }
      ).addEventListener = vi.fn(() => {});
    }
    if (
      typeof (win as unknown as { removeEventListener?: unknown })
        .removeEventListener !== "function"
    ) {
      (
        win as unknown as {
          removeEventListener: typeof window.removeEventListener;
        }
      ).removeEventListener = vi.fn(() => {});
    }
    if (
      typeof (win as unknown as { requestAnimationFrame?: unknown })
        .requestAnimationFrame !== "function"
    ) {
      (
        win as unknown as {
          requestAnimationFrame: typeof window.requestAnimationFrame;
        }
      ).requestAnimationFrame = (cb: FrameRequestCallback) =>
        setTimeout(cb, 16);
    }
    if (
      typeof (win as unknown as { cancelAnimationFrame?: unknown })
        .cancelAnimationFrame !== "function"
    ) {
      (
        win as unknown as {
          cancelAnimationFrame: typeof window.cancelAnimationFrame;
        }
      ).cancelAnimationFrame = (handle: number) => clearTimeout(handle);
    }
    if (
      typeof (win as unknown as { setTimeout?: unknown }).setTimeout !==
      "function"
    ) {
      (win as unknown as { setTimeout: typeof window.setTimeout }).setTimeout =
        setTimeout;
    }
    if (
      typeof (win as unknown as { clearTimeout?: unknown }).clearTimeout !==
      "function"
    ) {
      (
        win as unknown as { clearTimeout: typeof window.clearTimeout }
      ).clearTimeout = clearTimeout;
    }
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

  it("renders with proper accessibility attributes", async () => {
    // Set up document.dataset for ThemeProvider
    Object.defineProperty(document.documentElement, "dataset", {
      value: {},
      writable: true,
    });

    await act(async () => {
      render(
        <ThemeProvider initialTheme="light" initialResolvedTheme="light">
          <ThemeSelector />
        </ThemeProvider>,
      );
    });

    // Use a single waitFor with longer timeout to avoid race conditions
    await waitFor(
      () => {
        const radioGroup = screen.getByRole("radiogroup");
        expect(radioGroup).toBeInTheDocument();
        expect(radioGroup).toHaveAttribute(
          "aria-labelledby",
          "theme-selector-label",
        );

        // Check that the label exists
        const label = screen.getByText("Appearance");
        expect(label).toBeInTheDocument();
        expect(label).toHaveAttribute("id", "theme-selector-label");

        const radioButtons = screen.getAllByRole("radio");
        expect(radioButtons).toHaveLength(6); // 6 theme options

        // Check that one radio button is checked (default theme)
        const checkedRadios = radioButtons.filter(
          (radio) => radio.getAttribute("aria-checked") === "true",
        );
        expect(checkedRadios).toHaveLength(1);
      },
      { timeout: 5000 },
    );
  });
});
