/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";

describe("Happy DOM Test", () => {
  it("should have happy-dom environment", () => {
    expect(typeof document).toBe("object");
    expect(typeof window).toBe("object");
  });
});
