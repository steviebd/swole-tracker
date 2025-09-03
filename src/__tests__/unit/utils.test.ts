import { describe, it, expect } from "vitest";
import { cn } from "~/lib/utils";

describe("cn utility function", () => {
  it("should combine class names correctly", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  it("should handle conditional classes", () => {
    expect(cn("class1", true && "class2", false && "class3")).toBe(
      "class1 class2",
    );
  });

  it("should merge Tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("should handle arrays of classes", () => {
    expect(cn(["class1", "class2"], "class3")).toBe("class1 class2 class3");
  });

  it("should handle undefined and null values", () => {
    expect(cn("class1", undefined, null, "class2")).toBe("class1 class2");
  });

  it("should handle empty inputs", () => {
    expect(cn()).toBe("");
  });

  it("should handle clsx syntax", () => {
    expect(cn("class1", { class2: true, class3: false })).toBe("class1 class2");
  });
});
