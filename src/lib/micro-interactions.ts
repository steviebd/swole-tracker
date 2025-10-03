/**
 * Micro-interaction utilities for enhanced user feedback
 * 
 * Features:
 * - Button press feedback with scale animations
 * - Success celebrations and achievement effects
 * - Loading states with smooth transitions
 * - Form validation feedback
 * - Haptic-like feedback through timing
 * - GPU-optimized animations
 */

import type { Variants } from "framer-motion";
import { AnimationDurations, AnimationEasing } from "./animations";

/**
 * Button press feedback variants
 * Provides haptic-like visual feedback on button interactions
 */
export const buttonPressVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.02,
    y: -2,
    transition: {
      duration: AnimationDurations.fast / 1000,
      ease: AnimationEasing.ease,
    },
  },
  tap: {
    scale: 0.95,
    y: 0,
    transition: {
      duration: 0.1,
      ease: AnimationEasing.bounce,
    },
  },
};

/**
 * Enhanced button feedback with shadow depth changes
 */
export const buttonDepthVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
    boxShadow:
      "0 2px 8px color-mix(in srgb, var(--md-sys-color-shadow, #000000) 12%, transparent 88%)",
  },
  hover: {
    scale: 1.02,
    y: -2,
    boxShadow:
      "0 8px 24px color-mix(in srgb, var(--md-sys-color-shadow, #000000) 18%, transparent 82%)",
    transition: {
      duration: AnimationDurations.fast / 1000,
      ease: AnimationEasing.ease,
    },
  },
  tap: {
    scale: 0.98,
    y: 0,
    boxShadow:
      "0 1px 4px color-mix(in srgb, var(--md-sys-color-shadow, #000000) 14%, transparent 86%)",
    transition: {
      duration: 0.1,
    },
  },
};

/**
 * Form input focus state variants
 * Provides smooth transitions for form interactions
 */
export const inputFocusVariants: Variants = {
  blur: {
    borderColor: "var(--color-border-default)",
    boxShadow: "0 0 0 0px transparent",
    scale: 1,
    transition: {
      duration: AnimationDurations.base / 1000,
      ease: AnimationEasing.ease,
    },
  },
  focus: {
    borderColor: "var(--color-primary-default)",
    boxShadow:
      "0 0 0 3px color-mix(in srgb, var(--color-primary-default) 30%, transparent 70%)",
    scale: 1.01,
    transition: {
      duration: AnimationDurations.fast / 1000,
      ease: AnimationEasing.ease,
    },
  },
  error: {
    borderColor: "var(--color-status-danger-default)",
    boxShadow:
      "0 0 0 3px color-mix(in srgb, var(--color-status-danger-default) 28%, transparent 72%)",
    scale: 1.01,
    x: [-2, 2, -2, 2, 0],
    transition: {
      duration: AnimationDurations.base / 1000,
      ease: AnimationEasing.bounce,
    },
  },
  success: {
    borderColor: "var(--color-status-success-default)",
    boxShadow:
      "0 0 0 3px color-mix(in srgb, var(--color-status-success-default) 24%, transparent 76%)",
    scale: 1.01,
    transition: {
      duration: AnimationDurations.base / 1000,
      ease: AnimationEasing.ease,
    },
  },
};

/**
 * Loading spinner variants with smooth rotation
 */
export const loadingSpinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: "linear",
      repeat: Infinity,
    },
  },
};

/**
 * Loading dots variants for text loading states
 */
export const loadingDotsVariants: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.4,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
};

/**
 * Success celebration variants for achievements
 * Creates bouncy, celebratory animations
 */
export const successCelebrationVariants: Variants = {
  hidden: {
    scale: 0,
    rotate: -180,
    opacity: 0,
  },
  visible: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
  celebrate: {
    scale: [1, 1.3, 1.1, 1],
    rotate: [0, 180, 360, 0],
    transition: {
      duration: AnimationDurations.celebration / 1000,
      ease: AnimationEasing.spring,
      times: [0, 0.3, 0.7, 1],
    },
  },
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 1.5,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
};

/**
 * Confetti particle effect variants
 * Used for major milestone celebrations
 */
export const confettiVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
    y: 0,
    rotate: 0,
  },
  visible: (index: number) => ({
    opacity: 1,
    scale: [0, 1, 0.8, 0],
    y: [-20, -100, -50, 200],
    rotate: [0, 180, 270, 360],
    x: [0, Math.random() * 200 - 100, Math.random() * 150 - 75, Math.random() * 300 - 150],
    transition: {
      duration: 3,
      ease: AnimationEasing.ease,
      delay: index * 0.1,
      times: [0, 0.3, 0.6, 1],
    },
  }),
};

/**
 * Card interaction variants with enhanced depth
 */
export const cardInteractionVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
    rotateY: 0,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  hover: {
    scale: 1.02,
    y: -4,
    rotateY: 3,
    boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
    transition: {
      duration: AnimationDurations.base / 1000,
      ease: AnimationEasing.ease,
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
  focus: {
    scale: 1.01,
    y: -2,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 0 0 3px var(--color-primary-default, #f97316)",
    transition: {
      duration: AnimationDurations.fast / 1000,
      ease: AnimationEasing.ease,
    },
  },
};

/**
 * Progress bar fill variants with smooth animations
 */
export const progressFillVariants: Variants = {
  hidden: {
    width: "0%",
    opacity: 0.8,
  },
  visible: (progress: number) => ({
    width: `${Math.min(Math.max(progress, 0), 100)}%`,
    opacity: 1,
    transition: {
      width: {
        duration: AnimationDurations.slow / 1000,
        ease: AnimationEasing.ease,
      },
      opacity: {
        duration: AnimationDurations.fast / 1000,
      },
    },
  }),
  pulse: {
    opacity: [1, 0.7, 1],
    transition: {
      duration: 2,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
};

/**
 * Skeleton loading variants with shimmer effect
 */
export const skeletonShimmerVariants: Variants = {
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
 * Toast notification variants
 */
export const toastVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -50,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: -50,
    scale: 0.95,
    transition: {
      duration: AnimationDurations.fast / 1000,
      ease: AnimationEasing.ease,
    },
  },
};

/**
 * Icon spin variants for loading states
 */
export const iconSpinVariants: Variants = {
  initial: {
    rotate: 0,
  },
  hover: {
    rotate: 15,
    transition: {
      duration: AnimationDurations.base / 1000,
      ease: AnimationEasing.ease,
    },
  },
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: "linear",
      repeat: Infinity,
    },
  },
};

/**
 * Text glow effect variants
 */
export const textGlowVariants: Variants = {
  initial: {
    textShadow: "0 0 0px currentColor",
  },
  hover: {
    textShadow: "0 0 8px currentColor",
    transition: {
      duration: AnimationDurations.base / 1000,
      ease: AnimationEasing.ease,
    },
  },
};

/**
 * Ripple effect for touch interactions
 * Creates expanding circle effect on tap
 */
export const rippleVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 1,
  },
  animate: {
    scale: 2,
    opacity: 0,
    transition: {
      duration: AnimationDurations.base / 1000,
      ease: AnimationEasing.ease,
    },
  },
};

/**
 * Achievement badge shine effect
 */
export const badgeShineVariants: Variants = {
  initial: {
    x: "-100%",
  },
  animate: {
    x: "100%",
    transition: {
      duration: AnimationDurations.slow / 1000,
      ease: AnimationEasing.ease,
    },
  },
};

/**
 * Number counter animation variants
 * Used for animating stat changes
 */
export const numberCounterVariants: Variants = {
  initial: {
    scale: 1,
    color: "var(--color-text-primary)",
  },
  counting: {
    scale: [1, 1.1, 1],
    color: ["var(--color-text-primary)", "var(--color-primary-default)", "var(--color-text-primary)"],
    transition: {
      duration: AnimationDurations.slow / 1000,
      ease: AnimationEasing.bounce,
      times: [0, 0.5, 1],
    },
  },
};

/**
 * Create reduced motion variants that respect accessibility preferences
 */
export const createAccessibleVariants = (variants: Variants): Variants => {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const accessibleVariants: Variants = {};
    
    Object.keys(variants).forEach((key) => {
      accessibleVariants[key] = {
        opacity: key === "hidden" ? 0 : 1,
        transition: { duration: 0.001 },
      };
    });
    
    return accessibleVariants;
  }
  
  return variants;
};

/**
 * Utility function to trigger haptic feedback on supported devices
 */
export const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window !== "undefined" && 'vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    };
    navigator.vibrate(patterns[type]);
  }
};

/**
 * Create staggered animation for lists
 */
export const createStaggeredList = (itemCount: number, delay = 0.05) => ({
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
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: AnimationDurations.base / 1000,
        ease: AnimationEasing.ease,
      },
    },
  },
});

export {
  AnimationDurations,
  AnimationEasing,
};
