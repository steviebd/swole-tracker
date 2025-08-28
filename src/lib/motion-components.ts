/**
 * Pre-configured animated components with design system integration
 * 
 * Features:
 * - Ready-to-use motion components with standard animations
 * - Consistent styling following design tokens and glass architecture
 * - Accessibility-aware with reduced motion support
 * - TypeScript support for component props
 * - Performance optimized with GPU acceleration
 */

import { motion, type HTMLMotionProps } from "framer-motion";
import { 
  cardHoverVariants,
  fadeInUpVariants,
  scaleInVariants,
  slideInRightVariants,
  slideInBottomVariants,
  staggerContainerVariants,
  staggerItemVariants,
  createReducedMotionVariants,
  baseTransition,
  springTransition,
} from "./animations";

/**
 * Animated card component with hover states
 * Perfect for interactive cards, stat displays, and clickable content
 */
export const MotionCard = motion.div;

/**
 * Default card animation props
 */
export const cardAnimationProps = {
  variants: createReducedMotionVariants(cardHoverVariants),
  initial: "initial",
  whileHover: "hover",
  whileTap: "tap",
  transition: baseTransition,
} as const;

/**
 * Animated container for page content with fade-in effect
 * Use for main content areas and sections
 */
export const MotionContainer = motion.div;

/**
 * Default container animation props
 */
export const containerAnimationProps = {
  variants: createReducedMotionVariants(fadeInUpVariants),
  initial: "hidden",
  animate: "visible",
  exit: "exit",
} as const;

/**
 * Animated modal/dialog wrapper with scale entrance
 * Perfect for modal dialogs and overlay content
 */
export const MotionModal = motion.div;

/**
 * Default modal animation props
 */
export const modalAnimationProps = {
  variants: createReducedMotionVariants(scaleInVariants),
  initial: "hidden",
  animate: "visible",
  exit: "exit",
  transition: springTransition,
} as const;

/**
 * Animated sheet component with slide-in from right
 * Ideal for side panels and drawer components
 */
export const MotionSheet = motion.div;

/**
 * Default sheet animation props
 */
export const sheetAnimationProps = {
  variants: createReducedMotionVariants(slideInRightVariants),
  initial: "hidden",
  animate: "visible",
  exit: "exit",
} as const;

/**
 * Animated bottom sheet with slide-in from bottom
 * Perfect for mobile sheets and bottom drawers
 */
export const MotionBottomSheet = motion.div;

/**
 * Default bottom sheet animation props
 */
export const bottomSheetAnimationProps = {
  variants: createReducedMotionVariants(slideInBottomVariants),
  initial: "hidden",
  animate: "visible",
  exit: "exit",
} as const;

/**
 * Animated list container with staggered children
 * Use for lists, grids, and collections with entrance animations
 */
export const MotionList = motion.div;

/**
 * Default list animation props
 */
export const listAnimationProps = {
  variants: createReducedMotionVariants(staggerContainerVariants),
  initial: "hidden",
  animate: "visible",
} as const;

/**
 * Animated list item for use with MotionList
 */
export const MotionListItem = motion.div;

/**
 * Default list item animation props
 */
export const listItemAnimationProps = {
  variants: createReducedMotionVariants(staggerItemVariants),
} as const;

/**
 * Animated button component with hover and tap states
 * Includes scale and elevation animations
 */
export const MotionButton = motion.button;

/**
 * Default button animation props
 */
export const buttonAnimationProps = {
  whileHover: { scale: 1.02, y: -1 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.1 },
} as const;

/**
 * Animated progress bar component
 * Includes smooth width transitions and gradient support
 */
export const MotionProgress = motion.div;

/**
 * Progress bar animation utility
 */
export const createProgressAnimation = (progress: number) => ({
  initial: { width: 0 },
  animate: { width: `${Math.min(progress, 100)}%` },
  transition: {
    duration: 1,
    ease: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
});

/**
 * Animated badge component with entrance animation
 * Perfect for notifications, tags, and status indicators
 */
export const MotionBadge = motion.div;

/**
 * Default badge animation props
 */
export const badgeAnimationProps = {
  initial: { opacity: 0, scale: 0.8, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.8, y: -10 },
  transition: springTransition,
} as const;

/**
 * Animated text component with typewriter-like entrance
 * Great for headlines and important text
 */
export const MotionText = motion.div;

/**
 * Default text animation props
 */
export const textAnimationProps = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" },
} as const;

/**
 * Animated icon component with hover rotation
 * Perfect for interactive icons and buttons
 */
export const MotionIcon = motion.div;

/**
 * Default icon animation props
 */
export const iconAnimationProps = {
  whileHover: { rotate: 15, scale: 1.1 },
  transition: { duration: 0.2 },
} as const;

/**
 * Animated overlay component for backgrounds and modals
 * Includes smooth fade transitions
 */
export const MotionOverlay = motion.div;

/**
 * Default overlay animation props
 */
export const overlayAnimationProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
} as const;

/**
 * Type definitions for motion component props
 */
export type MotionCardProps = HTMLMotionProps<"div">;
export type MotionContainerProps = HTMLMotionProps<"div">;
export type MotionModalProps = HTMLMotionProps<"div">;
export type MotionSheetProps = HTMLMotionProps<"div">;
export type MotionBottomSheetProps = HTMLMotionProps<"div">;
export type MotionListProps = HTMLMotionProps<"div">;
export type MotionListItemProps = HTMLMotionProps<"div">;
export type MotionButtonProps = HTMLMotionProps<"button">;
export type MotionProgressProps = HTMLMotionProps<"div">;
export type MotionBadgeProps = HTMLMotionProps<"div">;
export type MotionTextProps = HTMLMotionProps<"div">;
export type MotionIconProps = HTMLMotionProps<"div">;
export type MotionOverlayProps = HTMLMotionProps<"div">;

/**
 * Utility function to combine multiple animation props
 */
export const combineAnimationProps = (...propSets: Array<Record<string, any>>) => {
  return propSets.reduce((combined, props) => ({ ...combined, ...props }), {});
};

/**
 * Utility function to create custom entrance animations
 */
export const createEntranceAnimation = (
  delay = 0,
  duration = 0.5,
  easing = "easeOut"
) => ({
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { delay, duration, ease: easing }
  },
});

/**
 * Utility function to create hover lift animations
 */
export const createHoverLift = (liftAmount = -4, scale = 1.02) => ({
  whileHover: {
    y: liftAmount,
    scale,
    transition: { duration: 0.2 },
  },
});

/**
 * Utility function to create tap feedback animations
 */
export const createTapFeedback = (scale = 0.95) => ({
  whileTap: {
    scale,
    transition: { duration: 0.1 },
  },
});

/**
 * Export motion and utility functions
 */
export { motion };