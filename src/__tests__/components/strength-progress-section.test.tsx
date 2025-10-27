import { describe, it, expect } from "vitest";

describe("StrengthProgressSection", () => {
  it("exports a component", async () => {
    const module = await import("~/app/_components/StrengthProgressSection");
    expect(typeof module.StrengthProgressSection).toBe("function");
  });
});
