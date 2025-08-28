/**
 * Animation utilities and reusable motion variants for consistent animations
 * 
 * Features:
 * - Standard animation variants following design manifesto
 * - 60fps target with GPU acceleration preferences
 * - Duration and easing aligned with design tokens (200-300ms)
 * - Accessibility-aware with prefers-reduced-motion support
 * - Framer Motion compatible variants and transitions
 */

import type { Variants, Transition } from "framer-motion";

/**
 * Standard animation durations in milliseconds
 * Aligned with CSS custom properties in design tokens
 */
export const AnimationDurations = {
  fast: 160,
  base: 200,
  slow: 240,
  celebration: 500,
} as const;

/**
 * Standard easing functions for consistent motion
 * Optimized for UI micro-interactions
 */
export const AnimationEasing = {
  ease: [0.4, 0, 0.2, 1] as const,
  spring: [0.2, 0.8, 0.2, 1.2] as const,
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
} as const;

/**
 * Base transition configuration
 * GPU-accelerated and performance optimized
 */
export const baseTransition: Transition = {
  duration: AnimationDurations.base / 1000,
  ease: AnimationEasing.ease,
};

/**
 * Spring transition for celebratory animations
 */
export const springTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 20,
};

/**
 * Card hover animation variants
 * Used for interactive cards and buttons
 */
export const cardHoverVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
    rotateY: 0,
  },
  hover: {
    scale: 1.02,
    y: -4,
    rotateY: 2,
    transition: {
      ...baseTransition,
      duration: AnimationDurations.fast / 1000,
    },
  },
  tap: {
    scale: 0.98,
    y: 0,
    rotateY: 0,
    transition: {
      duration: 0.1,
    },
  },
};

/**
 * Fade in up animation variants
 * Used for page entries and content reveals
 */
export const fadeInUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: baseTransition,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      ...baseTransition,
      duration: AnimationDurations.fast / 1000,
    },
  },
};

/**
 * Stagger container variants for animating lists
 * Creates cascading animations for multiple children
 */
export const staggerContainerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

/**
 * Stagger item variants for use with stagger containers
 */
export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: baseTransition,
  },
};

/**
 * Scale in variants for modal and dialog entries
 */
export const scaleInVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      ...baseTransition,
      duration: AnimationDurations.fast / 1000,
    },
  },
};

/**
 * Slide in from right variants
 * Used for sheet/drawer components
 */
export const slideInRightVariants: Variants = {
  hidden: {
    x: "100%",
    opacity: 0,
  },
  visible: {
    x: "0%",
    opacity: 1,
    transition: {
      ...baseTransition,
      duration: AnimationDurations.slow / 1000,
    },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: baseTransition,
  },
};

/**
 * Slide in from bottom variants
 * Used for mobile sheets and bottom drawers
 */
export const slideInBottomVariants: Variants = {
  hidden: {
    y: "100%",
    opacity: 0,
  },
  visible: {
    y: "0%",
    opacity: 1,
    transition: {
      ...baseTransition,
      duration: AnimationDurations.slow / 1000,
    },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: baseTransition,
  },
};

/**
 * Progress bar fill animation variants
 * Used for progress indicators and loading states
 */
export const progressFillVariants: Variants = {
  hidden: {
    width: "0%",
  },
  visible: (progress: number) => ({
    width: `${Math.min(progress, 100)}%`,
    transition: {
      duration: AnimationDurations.celebration / 1000,
      ease: AnimationEasing.ease,
    },
  }),
};

/**
 * Number counting animation variants
 * Used for stat counters and metric displays
 */
export const numberCountVariants: Variants = {
  hidden: {
    scale: 1,
  },
  counting: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.3,
      times: [0, 0.5, 1],
      ease: AnimationEasing.bounce,
    },
  },
};

/**
 * Achievement celebration variants
 * Used for goal completions and milestones
 */
export const celebrationVariants: Variants = {
  hidden: {
    scale: 0,
    rotate: -180,
    opacity: 0,
  },
  visible: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: springTransition,
  },
  celebrate: {
    scale: [1, 1.2, 1],
    rotate: [0, 360, 0],
    transition: {
      duration: AnimationDurations.celebration / 1000,
      ease: AnimationEasing.spring,
    },
  },
};

/**
 * Badge entrance animation variants
 * Used for new badges and notifications
 */
export const badgeEntranceVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
};

/**
 * Shimmer loading animation variants
 * Used for skeleton loading states
 */
export const shimmerVariants: Variants = {
  animate: {
    x: ["-100%", "100%"],
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: "easeInOut",
    },
  },
};

/**
 * Utility function to create reduced motion variants
 * Returns simplified variants when prefers-reduced-motion is set
 */
export const createReducedMotionVariants = (variants: Variants): Variants => {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // Convert all variants to simple opacity changes
    const reducedVariants: Variants = {};
    
    Object.keys(variants).forEach((key) => {
      const variant = variants[key];
      if (typeof variant === "object" && variant !== null && typeof variant !== "function") {
        reducedVariants[key] = {
          opacity: key === "hidden" ? 0 : 1,
          transition: {
            duration: 0.001, // Nearly instant
          },
        };
      } else {
        reducedVariants[key] = variant;
      }
    });
    
    return reducedVariants;
  }
  
  return variants;
};

/**
 * Utility function to create staggered entrance animations
 */
export const createStaggeredEntrance = (delay = 0.05) => ({
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delay,
        delayChildren: 0.1,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: baseTransition,
    },
  },
});

/**
 * Export all animation utilities
 */
export {
  type Variants,
  type Transition,
};