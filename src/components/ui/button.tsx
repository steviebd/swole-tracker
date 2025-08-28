"use client";

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import type { HTMLMotionProps } from "framer-motion"
import { useReducedMotion } from "~/hooks/use-reduced-motion"
import { buttonPressVariants, triggerHapticFeedback } from "~/lib/micro-interactions"

import { cn } from "~/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-xs transition-all duration-200 ease-out",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-xs focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 transition-all duration-200 ease-out",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-xs dark:bg-input/30 dark:border-input dark:hover:bg-input/50 transition-all duration-200 ease-out",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-xs transition-all duration-200 ease-out",
        ghost:
          "hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95 dark:hover:bg-accent/50 transition-all duration-200 ease-out",
        link: "text-primary underline-offset-4 hover:underline hover:scale-105 active:scale-95 transition-all duration-200 ease-out",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3 touch-target",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 touch-target",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4 touch-target-large",
        icon: "size-9 touch-target",
      },
      interactive: {
        true: "cursor-pointer select-none",
        false: "cursor-default",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: true,
    },
  }
)

interface ButtonProps extends 
  Omit<React.ComponentProps<"button">, "onTap">, 
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  haptic?: boolean;
  ripple?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant,
  size,
  interactive,
  asChild = false,
  haptic = false,
  ripple = false,
  onPointerDown,
  children,
  ...props
}, ref) => {
  const prefersReducedMotion = useReducedMotion();
  const [ripplePosition, setRipplePosition] = React.useState<{ x: number; y: number } | null>(null);
  
  const handlePointerDown = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    // Trigger haptic feedback if enabled and supported
    if (haptic && !prefersReducedMotion) {
      triggerHapticFeedback('light');
    }
    
    // Create ripple effect if enabled
    if (ripple && !prefersReducedMotion && !asChild) {
      const rect = event.currentTarget.getBoundingClientRect();
      setRipplePosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      
      // Clear ripple after animation
      setTimeout(() => setRipplePosition(null), 400);
    }
    
    // Call original handler
    onPointerDown?.(event);
  }, [haptic, ripple, prefersReducedMotion, asChild, onPointerDown]);

  const Comp = asChild ? Slot : motion.button;

  const motionProps = !asChild && !prefersReducedMotion ? {
    variants: buttonPressVariants,
    initial: "initial",
    whileHover: "hover",
    whileTap: "tap",
    layout: true,
  } : {};

  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, interactive, className }))}
      onPointerDown={handlePointerDown}
      {...(!asChild ? motionProps : {})}
      {...props}
    >
      {children}
      
      {/* Ripple effect overlay */}
      {ripple && ripplePosition && !asChild && !prefersReducedMotion && (
        <motion.span
          className="absolute pointer-events-none rounded-full bg-white/20"
          style={{
            left: ripplePosition.x - 10,
            top: ripplePosition.y - 10,
            width: 20,
            height: 20,
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      )}
    </Comp>
  );
});

Button.displayName = "Button";

export { Button, buttonVariants, type ButtonProps };
