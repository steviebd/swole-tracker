import React from "react";
import { describe, it, expect } from "vitest";

describe("GlobalStatusTray", () => {
  it("exports a component", async () => {
    const module = await import("~/components/global-status-tray");
    expect(typeof module.GlobalStatusTray).toBe("function");
  });
});
