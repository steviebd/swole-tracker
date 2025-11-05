import { describe, it, expect } from "vitest";

// Simple test to check if DOM environment works at all
describe("DOM Environment Test", () => {
  it("should have document defined", () => {
    expect(typeof document).toBe("object");
    expect(document).toBeDefined();
  });

  it("should have document.body defined", () => {
    expect(document.body).toBeDefined();
    expect(typeof document.body.appendChild).toBe("function");
  });

  it("should be able to create elements", () => {
    const div = document.createElement("div");
    expect(div).toBeDefined();
    expect(div.tagName).toBe("DIV");
  });

  it("should be able to append elements to body", () => {
    const div = document.createElement("div");
    expect(() => {
      document.body.appendChild(div);
    }).not.toThrow();
  });
});
