import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "~/providers/ThemeProvider";

function setupMatchMedia(initialDark = false) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql: MediaQueryList = {
    matches: initialDark,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (
      _type: "change",
      cb: (e: MediaQueryListEvent) => void,
    ) => {
      listeners.push(cb);
    },
    removeEventListener: (
      _type: "change",
      cb: (e: MediaQueryListEvent) => void,
    ) => {
      const idx = listeners.indexOf(cb);
      if (idx > -1) listeners.splice(idx, 1);
    },
    addListener: vi.fn(), // legacy
    removeListener: vi.fn(), // legacy
    dispatchEvent: (ev: Event) => {
      listeners.forEach((cb) => cb(ev as MediaQueryListEvent));
      return true;
    },
  } as unknown as MediaQueryList;

  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => {
      if (query === "(prefers-color-scheme: dark)") return mql;
      // fallback for other queries if any
      return {
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList;
    }),
  );

  return {
    mql,
    setDark(next: boolean) {
      (mql as any).matches = next;
      const ev = new Event("change") as MediaQueryListEvent;
      mql.dispatchEvent(ev);
    },
  };
}

function TestConsumer() {
  const { theme, resolvedTheme, setTheme, toggle } = useTheme();
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="resolved">{resolvedTheme}</div>
      <button onClick={() => setTheme("dark")}>set-dark2</button>
      <button onClick={() => setTheme("dark")}>set-dark</button>
      <button onClick={() => setTheme("system")}>set-system</button>
      <button onClick={() => setTheme("CalmDark")}>set-calm</button>
      <button onClick={toggle}>toggle</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.className = "";
    delete (document.documentElement as any).dataset.theme;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes from localStorage with fallback to 'system' and applies DOM hooks", async () => {
    // no localStorage - defaults to system
    const { setDark } = setupMatchMedia(false);

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    // Should read "system" and resolved light because prefersDark=false
    expect(await screen.findByTestId("theme")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");

    // DOM hooks: data-theme and .dark class should reflect "system" + light
    expect(document.documentElement.dataset.theme).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    // If system changes to dark, provider applies dark to DOM on system mode
    setDark(true);
    // effect handler should apply class (no state change expected)
    expect(document.documentElement.dataset.theme).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("persists theme changes to localStorage and updates DOM", async () => {
    setupMatchMedia(true); // system prefers dark

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    // initial
    expect(await screen.findByTestId("theme")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.dataset.theme).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // set light
    await user.click(screen.getByText("set-light"));
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    // set dark
    await user.click(screen.getByText("set-dark"));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // CalmDark acts dark-first and sets data-theme=CalmDark
    await user.click(screen.getByText("set-calm"));
    expect(screen.getByTestId("theme")).toHaveTextContent("CalmDark");
    // resolvedTheme is derived from theme/systemDark and doesn't special-case custom dark themes.
    // The DOM still applies dark-first for CalmDark.
    expect(localStorage.getItem("theme")).toBe("CalmDark");
    expect(document.documentElement.dataset.theme).toBe("CalmDark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("toggle switches only between dark and light without touching system/custom themes", async () => {
    setupMatchMedia(false);

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    // system -> toggle should set dark (toggle uses current theme state)
    await user.click(screen.getByText("toggle"));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // toggle again -> light
    await user.click(screen.getByText("toggle"));
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    // if we set CalmDark and toggle, it should go to light (via toggle logic dark?light:dark)
    await user.click(screen.getByText("set-calm"));
    expect(screen.getByTestId("theme")).toHaveTextContent("CalmDark");
    await user.click(screen.getByText("toggle"));
    // Horizon_wow is not special-cased by toggle; since theme !== "dark", toggle sets dark
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });

  it("honors localStorage on mount", async () => {
    localStorage.setItem("theme", "dark");
    setupMatchMedia(false);

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(await screen.findByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
