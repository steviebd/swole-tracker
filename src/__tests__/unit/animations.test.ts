import { describe, it, expect, vi } from "vitest";
import {
  AnimationDurations,
  AnimationEasing,
  baseTransition,
  springTransition,
  cardHoverVariants,
  fadeInUpVariants,
  staggerContainerVariants,
  staggerItemVariants,
  scaleInVariants,
  slideInRightVariants,
  slideInBottomVariants,
  progressFillVariants,
  numberCountVariants,
  celebrationVariants,
  badgeEntranceVariants,
  shimmerVariants,
  createReducedMotionVariants,
  createStaggeredEntrance,
} from "~/lib/animations";

describe("AnimationDurations", () => {
  it("should have correct duration values", () => {
    expect(AnimationDurations.fast).toBe(160);
    expect(AnimationDurations.base).toBe(200);
    expect(AnimationDurations.slow).toBe(240);
    expect(AnimationDurations.celebration).toBe(500);
  });
});

describe("AnimationEasing", () => {
  it("should have correct easing arrays", () => {
    expect(AnimationEasing.ease).toEqual([0.4, 0, 0.2, 1]);
    expect(AnimationEasing.spring).toEqual([0.2, 0.8, 0.2, 1.2]);
    expect(AnimationEasing.bounce).toEqual([0.68, -0.55, 0.265, 1.55]);
  });
});

describe("baseTransition", () => {
  it("should have correct transition properties", () => {
    expect(baseTransition.duration).toBe(0.2);
    expect(baseTransition.ease).toEqual([0.4, 0, 0.2, 1]);
  });
});

describe("springTransition", () => {
  it("should have correct spring properties", () => {
    expect(springTransition.type).toBe("spring");
    expect(springTransition.stiffness).toBe(300);
    expect(springTransition.damping).toBe(20);
  });
});

describe("createReducedMotionVariants", () => {
  it("should return original variants when reduced motion is not preferred", () => {
    // The setup already mocks matchMedia to return matches: false
    const originalVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    };

    const result = createReducedMotionVariants(originalVariants);
    expect(result).toBe(originalVariants);
  });

  it("should return simplified variants when reduced motion is preferred", () => {
    // Mock matchMedia to return matches: true
    if (typeof window !== "undefined") {
      window.matchMedia = vi.fn(
        () =>
          ({
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
            media: "",
            onchange: null,
          }) as any,
      );
    }

    const originalVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    };

    const result = createReducedMotionVariants(originalVariants);
    expect((result as any).hidden?.opacity).toBe(0);
    expect((result as any).visible?.opacity).toBe(1);
    expect((result as any).hidden?.y).toBeUndefined();
  });
});

describe("createStaggeredEntrance", () => {
  it("should create staggered animation variants", () => {
    const result = createStaggeredEntrance(0.1);
    expect((result as any).container.visible?.transition?.staggerChildren).toBe(
      0.1,
    );
    expect((result as any).item.hidden?.y).toBe(20);
  });
});

describe("progressFillVariants", () => {
  it("should be a function for dynamic width", () => {
    const variant = progressFillVariants.visible as (progress: number) => any;
    expect(typeof variant).toBe("function");
    const result = variant(75);
    expect(result.width).toBe("75%");
  });
});

describe("cardHoverVariants", () => {
  it("should have correct initial state", () => {
    expect(cardHoverVariants.initial as any).toEqual({
      scale: 1,
      y: 0,
      rotateY: 0,
    });
  });

  it("should have correct hover state", () => {
    expect((cardHoverVariants.hover as any).scale).toBe(1.02);
    expect((cardHoverVariants.hover as any).y).toBe(-4);
    expect((cardHoverVariants.hover as any).rotateY).toBe(2);
  });

  it("should have correct tap state", () => {
    expect((cardHoverVariants.tap as any).scale).toBe(0.98);
    expect((cardHoverVariants.tap as any).y).toBe(0);
    expect((cardHoverVariants.tap as any).rotateY).toBe(0);
  });
});

describe("fadeInUpVariants", () => {
  it("should have correct hidden state", () => {
    expect(fadeInUpVariants.hidden as any).toEqual({
      opacity: 0,
      y: 20,
    });
  });

  it("should have correct visible state", () => {
    expect((fadeInUpVariants.visible as any).opacity).toBe(1);
    expect((fadeInUpVariants.visible as any).y).toBe(0);
  });

  it("should have correct exit state", () => {
    expect((fadeInUpVariants.exit as any).opacity).toBe(0);
    expect((fadeInUpVariants.exit as any).y).toBe(-20);
  });
});

describe("staggerContainerVariants", () => {
  it("should have correct hidden state", () => {
    expect(staggerContainerVariants.hidden as any).toEqual({
      opacity: 0,
    });
  });

  it("should have correct visible state with stagger", () => {
    expect((staggerContainerVariants.visible as any).opacity).toBe(1);
    expect(
      (staggerContainerVariants.visible as any).transition?.staggerChildren,
    ).toBe(0.05);
    expect(
      (staggerContainerVariants.visible as any).transition?.delayChildren,
    ).toBe(0.1);
  });
});

describe("staggerItemVariants", () => {
  it("should have correct hidden state", () => {
    expect(staggerItemVariants.hidden as any).toEqual({
      opacity: 0,
      y: 20,
      scale: 0.95,
    });
  });

  it("should have correct visible state", () => {
    expect((staggerItemVariants.visible as any).opacity).toBe(1);
    expect((staggerItemVariants.visible as any).y).toBe(0);
    expect((staggerItemVariants.visible as any).scale).toBe(1);
  });
});

describe("scaleInVariants", () => {
  it("should have correct hidden state", () => {
    expect(scaleInVariants.hidden as any).toEqual({
      opacity: 0,
      scale: 0.95,
    });
  });

  it("should have correct visible state", () => {
    expect((scaleInVariants.visible as any).opacity).toBe(1);
    expect((scaleInVariants.visible as any).scale).toBe(1);
  });

  it("should have correct exit state", () => {
    expect((scaleInVariants.exit as any).opacity).toBe(0);
    expect((scaleInVariants.exit as any).scale).toBe(0.95);
  });
});

describe("slideInRightVariants", () => {
  it("should have correct hidden state", () => {
    expect(slideInRightVariants.hidden as any).toEqual({
      x: "100%",
      opacity: 0,
    });
  });

  it("should have correct visible state", () => {
    expect((slideInRightVariants.visible as any).x).toBe("0%");
    expect((slideInRightVariants.visible as any).opacity).toBe(1);
  });

  it("should have correct exit state", () => {
    expect((slideInRightVariants.exit as any).x).toBe("100%");
    expect((slideInRightVariants.exit as any).opacity).toBe(0);
  });
});

describe("slideInBottomVariants", () => {
  it("should have correct hidden state", () => {
    expect(slideInBottomVariants.hidden as any).toEqual({
      y: "100%",
      opacity: 0,
    });
  });

  it("should have correct visible state", () => {
    expect((slideInBottomVariants.visible as any).y).toBe("0%");
    expect((slideInBottomVariants.visible as any).opacity).toBe(1);
  });

  it("should have correct exit state", () => {
    expect((slideInBottomVariants.exit as any).y).toBe("100%");
    expect((slideInBottomVariants.exit as any).opacity).toBe(0);
  });
});

describe("numberCountVariants", () => {
  it("should have correct hidden state", () => {
    expect(numberCountVariants.hidden as any).toEqual({
      scale: 1,
    });
  });

  it("should have correct counting state", () => {
    expect((numberCountVariants.counting as any).scale).toEqual([1, 1.05, 1]);
  });
});

describe("celebrationVariants", () => {
  it("should have correct hidden state", () => {
    expect(celebrationVariants.hidden as any).toEqual({
      scale: 0,
      rotate: -180,
      opacity: 0,
    });
  });

  it("should have correct visible state", () => {
    expect((celebrationVariants.visible as any).scale).toBe(1);
    expect((celebrationVariants.visible as any).rotate).toBe(0);
    expect((celebrationVariants.visible as any).opacity).toBe(1);
  });

  it("should have correct celebrate state", () => {
    expect((celebrationVariants.celebrate as any).scale).toEqual([1, 1.2, 1]);
    expect((celebrationVariants.celebrate as any).rotate).toEqual([0, 360, 0]);
  });
});

describe("badgeEntranceVariants", () => {
  it("should have correct hidden state", () => {
    expect(badgeEntranceVariants.hidden as any).toEqual({
      opacity: 0,
      scale: 0.8,
      y: 10,
    });
  });

  it("should have correct visible state", () => {
    expect((badgeEntranceVariants.visible as any).opacity).toBe(1);
    expect((badgeEntranceVariants.visible as any).scale).toBe(1);
    expect((badgeEntranceVariants.visible as any).y).toBe(0);
  });
});

describe("shimmerVariants", () => {
  it("should have correct animate state", () => {
    expect((shimmerVariants.animate as any).x).toEqual(["-100%", "100%"]);
    expect((shimmerVariants.animate as any).transition?.repeat).toBe(Infinity);
    expect((shimmerVariants.animate as any).transition?.duration).toBe(1.5);
  });
});

describe("fadeInUpVariants", () => {
  it("should have correct hidden state", () => {
    expect(fadeInUpVariants.hidden as any).toEqual({
      opacity: 0,
      y: 20,
    });
  });

  it("should have correct visible state", () => {
    expect((fadeInUpVariants.visible as any).opacity).toBe(1);
    expect((fadeInUpVariants.visible as any).y).toBe(0);
  });

  it("should have correct exit state", () => {
    expect((fadeInUpVariants.exit as any).opacity).toBe(0);
    expect((fadeInUpVariants.exit as any).y).toBe(-20);
  });
});

describe("staggerContainerVariants", () => {
  it("should have correct hidden state", () => {
    expect(staggerContainerVariants.hidden as any).toEqual({
      opacity: 0,
    });
  });

  it("should have correct visible state with stagger", () => {
    expect((staggerContainerVariants.visible as any).opacity).toBe(1);
    expect(
      (staggerContainerVariants.visible as any).transition?.staggerChildren,
    ).toBe(0.05);
    expect(
      (staggerContainerVariants.visible as any).transition?.delayChildren,
    ).toBe(0.1);
  });
});

describe("staggerItemVariants", () => {
  it("should have correct hidden state", () => {
    expect(staggerItemVariants.hidden as any).toEqual({
      opacity: 0,
      y: 20,
      scale: 0.95,
    });
  });

  it("should have correct visible state", () => {
    expect((staggerItemVariants.visible as any).opacity).toBe(1);
    expect((staggerItemVariants.visible as any).y).toBe(0);
    expect((staggerItemVariants.visible as any).scale).toBe(1);
  });
});

describe("scaleInVariants", () => {
  it("should have correct hidden state", () => {
    expect(scaleInVariants.hidden as any).toEqual({
      opacity: 0,
      scale: 0.95,
    });
  });

  it("should have correct visible state", () => {
    expect((scaleInVariants.visible as any).opacity).toBe(1);
    expect((scaleInVariants.visible as any).scale).toBe(1);
  });

  it("should have correct exit state", () => {
    expect((scaleInVariants.exit as any).opacity).toBe(0);
    expect((scaleInVariants.exit as any).scale).toBe(0.95);
  });
});

describe("slideInRightVariants", () => {
  it("should have correct hidden state", () => {
    expect(slideInRightVariants.hidden as any).toEqual({
      x: "100%",
      opacity: 0,
    });
  });

  it("should have correct visible state", () => {
    expect((slideInRightVariants.visible as any).x).toBe("0%");
    expect((slideInRightVariants.visible as any).opacity).toBe(1);
  });

  it("should have correct exit state", () => {
    expect((slideInRightVariants.exit as any).x).toBe("100%");
    expect((slideInRightVariants.exit as any).opacity).toBe(0);
  });
});

describe("slideInBottomVariants", () => {
  it("should have correct hidden state", () => {
    expect(slideInBottomVariants.hidden as any).toEqual({
      y: "100%",
      opacity: 0,
    });
  });

  it("should have correct visible state", () => {
    expect((slideInBottomVariants.visible as any).y).toBe("0%");
    expect((slideInBottomVariants.visible as any).opacity).toBe(1);
  });

  it("should have correct exit state", () => {
    expect((slideInBottomVariants.exit as any).y).toBe("100%");
    expect((slideInBottomVariants.exit as any).opacity).toBe(0);
  });
});

describe("numberCountVariants", () => {
  it("should have correct hidden state", () => {
    expect(numberCountVariants.hidden as any).toEqual({
      scale: 1,
    });
  });

  it("should have correct counting state", () => {
    expect((numberCountVariants.counting as any).scale).toEqual([1, 1.05, 1]);
  });
});

describe("celebrationVariants", () => {
  it("should have correct hidden state", () => {
    expect(celebrationVariants.hidden as any).toEqual({
      scale: 0,
      rotate: -180,
      opacity: 0,
    });
  });

  it("should have correct visible state", () => {
    expect((celebrationVariants.visible as any).scale).toBe(1);
    expect((celebrationVariants.visible as any).rotate).toBe(0);
    expect((celebrationVariants.visible as any).opacity).toBe(1);
  });

  it("should have correct celebrate state", () => {
    expect((celebrationVariants.celebrate as any).scale).toEqual([1, 1.2, 1]);
    expect((celebrationVariants.celebrate as any).rotate).toEqual([0, 360, 0]);
  });
});

describe("badgeEntranceVariants", () => {
  it("should have correct hidden state", () => {
    expect(badgeEntranceVariants.hidden as any).toEqual({
      opacity: 0,
      scale: 0.8,
      y: 10,
    });
  });

  it("should have correct visible state", () => {
    expect((badgeEntranceVariants.visible as any).opacity).toBe(1);
    expect((badgeEntranceVariants.visible as any).scale).toBe(1);
    expect((badgeEntranceVariants.visible as any).y).toBe(0);
  });
});

describe("shimmerVariants", () => {
  it("should have correct animate state", () => {
    expect((shimmerVariants.animate as any).x).toEqual(["-100%", "100%"]);
    expect((shimmerVariants.animate as any).transition?.repeat).toBe(Infinity);
    expect((shimmerVariants.animate as any).transition?.duration).toBe(1.5);
  });
});
