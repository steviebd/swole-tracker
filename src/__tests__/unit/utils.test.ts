import { describe, it, expect } from "vitest";
import { cn } from "~/lib/utils";

describe("cn utility function", () => {
  it("should combine class names correctly", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  it("should handle conditional classes", () => {
    expect(cn("class1", false && "class2", "class3")).toBe("class1 class3");
  });

  it("should handle array of classes", () => {
    expect(cn(["class1", "class2"], "class3")).toBe("class1 class2 class3");
  });

  it("should merge Tailwind classes correctly", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("should handle empty inputs", () => {
    expect(cn()).toBe("");
    expect(cn("", undefined, null, false)).toBe("");
  });

  it("should handle object syntax", () => {
    expect(cn({ class1: true, class2: false })).toBe("class1");
  });

  it("should handle mixed input types", () => {
    expect(
      cn("base", ["conditional1", "conditional2"], {
        active: true,
        inactive: false,
      }),
    ).toBe("base conditional1 conditional2 active");
  });
});
