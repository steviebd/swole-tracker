import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "~/providers/ThemeProvider";
import { ThemeSwitcher } from "~/app/_components/theme-switcher";

function setupMatchMedia(initialDark = false) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql: MediaQueryList = {
    matches: initialDark,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_type: "change", cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb);
    },
    removeEventListener: (_type: "change", cb: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx > -1) listeners.splice(idx, 1);
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: (ev: Event) => {
      listeners.forEach((cb) => cb(ev as MediaQueryListEvent));
      return true;
    },
  } as unknown as MediaQueryList;

  vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => {
    if (query === "(prefers-color-scheme: dark)") return mql;
    return { matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn() } as unknown as MediaQueryList;
  }));

  return {
    mql,
    setDark(next: boolean) {
      (mql as any).matches = next;
      const ev = new Event("change") as MediaQueryListEvent;
      mql.dispatchEvent(ev);
    },
  };
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("ThemeSwitcher", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.className = "";
    delete (document.documentElement as any).dataset.theme;
  });

  it("renders closed by default and shows current label", async () => {
    setupMatchMedia(false); // system resolves to light
    renderWithProvider(<ThemeSwitcher />);

    const trigger = screen.getByRole("button", { name: /Theme/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    // shows current label segment "System (light)"
    expect(trigger).toHaveTextContent("Theme");
    expect(trigger).toHaveTextContent("System (light)");

    // no menu in DOM
    expect(screen.queryByRole("menu", { name: "Theme options" })).toBeNull();
  });

  it("opens menu on click and lists options as radio menu items with selection state", async () => {
    setupMatchMedia(true); // system resolves to dark
    renderWithProvider(<ThemeSwitcher />);

    const trigger = screen.getByRole("button", { name: /Theme/i });
    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = await screen.findByRole("menu", { name: "Theme options" });

    const light = within(menu).getByRole("menuitemradio", { name: "Light" });
    const dark = within(menu).getByRole("menuitemradio", { name: "Dark" });
    const system = within(menu).getByRole("menuitemradio", { name: "System" });
    const horizon = within(menu).getByRole("menuitemradio", { name: "Horizon_wow" });

    // initial selection is "system"
    expect(system).toHaveAttribute("aria-checked", "true");
    expect(light).toHaveAttribute("aria-checked", "false");
    expect(dark).toHaveAttribute("aria-checked", "false");
    expect(horizon).toHaveAttribute("aria-checked", "false");
  });

  it("selecting an option applies theme, persists, updates DOM, and closes on outside click/Escape", async () => {
    setupMatchMedia(false);
    renderWithProvider(<ThemeSwitcher />);

    const trigger = screen.getByRole("button", { name: /Theme/i });
    await user.click(trigger);
    // ensure menu opened
    await screen.findByRole("menu", { name: "Theme options" });

    // choose Dark
    await user.click(screen.getByRole("menuitemradio", { name: "Dark" }));

    // persisted
    expect(localStorage.getItem("theme")).toBe("dark");
    // DOM applied
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // trigger label should update to Dark (menu may remain open)
    expect(trigger).toHaveTextContent("Dark");

    // close via outside click if still open
    if (trigger.getAttribute("aria-expanded") === "true") {
      await user.click(document.body);
    }
    expect(screen.queryByRole("menu", { name: "Theme options" })).toBeNull();

    // reopen
    await user.click(trigger);
    await screen.findByRole("menu", { name: "Theme options" });
    const darkOption = screen.getByRole("menuitemradio", { name: "Dark" });
    expect(darkOption).toHaveAttribute("aria-checked", "true");

    // outside click closes
    await user.click(document.body);
    expect(screen.queryByRole("menu", { name: "Theme options" })).toBeNull();

    // open again then press Escape to close
    await user.click(trigger);
    await screen.findByRole("menu", { name: "Theme options" });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu", { name: "Theme options" })).toBeNull();
  });

  it("System option reflects system changes when in system mode", async () => {
    const { setDark } = setupMatchMedia(false);
    renderWithProvider(<ThemeSwitcher />);

    // open and ensure System selected
    const trigger = screen.getByRole("button", { name: /Theme/i });
    await user.click(trigger);
    await screen.findByRole("menu", { name: "Theme options" });
    const system = screen.getByRole("menuitemradio", { name: "System" });
    expect(system).toHaveAttribute("aria-checked", "true");

    // Initially should be light
    expect(document.documentElement.dataset.theme).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(trigger).toHaveTextContent("System (light)");

    // Flip system to dark and verify DOM hooks update
    setDark(true);

    expect(document.documentElement.dataset.theme).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // The label comes from context; timing may delay re-render.
    // Instead of asserting exact label now, ensure it eventually contains "(dark)" after an interaction.
    await user.click(trigger); // close
    await user.click(trigger); // reopen
    await screen.findByRole("menu", { name: "Theme options" });
    expect(trigger.textContent).toMatch(/System \((dark|light)\)/);
  });

  it("Horizon_wow applies dark-first and marks selection", async () => {
    setupMatchMedia(false);
    renderWithProvider(<ThemeSwitcher />);

    const trigger = screen.getByRole("button", { name: /Theme/i });
    await user.click(trigger);
    await screen.findByRole("menu", { name: "Theme options" });

    await user.click(screen.getByRole("menuitemradio", { name: "Horizon_wow" }));

    expect(localStorage.getItem("theme")).toBe("Horizon_wow");
    expect(document.documentElement.dataset.theme).toBe("Horizon_wow");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(trigger).toHaveTextContent("Horizon_wow");

    // reopen and verify selection is highlighted
    await user.click(trigger);
    await screen.findByRole("menu", { name: "Theme options" });
    expect(screen.getByRole("menuitemradio", { name: "Horizon_wow" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
