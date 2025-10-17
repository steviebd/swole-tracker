import { describe, it, expect } from "vitest";
import {
  createStaggeredList,
  buttonPressVariants,
  inputFocusVariants,
} from "~/lib/micro-interactions";

describe("micro interactions", () => {
  describe("createStaggeredList", () => {
    it("creates staggered animation variants", () => {
      const result = createStaggeredList(3, 0.1);

      expect(result.container).toHaveProperty("hidden");
      expect(result.container).toHaveProperty("visible");
      expect(result.container.visible.transition.staggerChildren).toBe(0.1);

      expect(result.item).toHaveProperty("hidden");
      expect(result.item).toHaveProperty("visible");
    });
  });

  describe("animation variants", () => {
    it("exports buttonPressVariants", () => {
      expect(buttonPressVariants).toHaveProperty("initial");
      expect(buttonPressVariants).toHaveProperty("hover");
      expect(buttonPressVariants).toHaveProperty("tap");
    });

    it("exports inputFocusVariants", () => {
      expect(inputFocusVariants).toHaveProperty("blur");
      expect(inputFocusVariants).toHaveProperty("focus");
      expect(inputFocusVariants).toHaveProperty("error");
      expect(inputFocusVariants).toHaveProperty("success");
    });
  });
});
