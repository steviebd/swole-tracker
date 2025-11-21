/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";

describe("JSDOM Environment Test", () => {
  it("should have jsdom environment", () => {
    expect(typeof document).toBe("object");
    expect(typeof window).toBe("object");
  });

  it("should create DOM elements", () => {
    const div = document.createElement("div");
    div.textContent = "Hello World";
    document.body.appendChild(div);
    expect(document.body.textContent).toBe("Hello World");
  });
});
