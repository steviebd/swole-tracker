"use client";

import { useAuth } from "~/providers/AuthProvider";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { motion } from "framer-motion";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

export function SignInButtons() {
  const { user, isLoading } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-grid-4">
        <Button 
          variant="default" 
          size="xl" 
          className="animate-pulse skeleton-button"
          disabled
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 skeleton rounded-full"></div>
            Loading...
          </div>
        </Button>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <motion.div 
      className="flex flex-col gap-grid-4"
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
    >
      <Link href="/auth/login" className="w-full">
        <Button 
          variant="default" 
          size="xl" 
          className="w-full animate-button-press font-semibold tracking-wide touch-target-xl"
          haptic
          ripple
        >
          <motion.span
            className="flex items-center gap-2"
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
          >
            Start Your Journey
          </motion.span>
        </Button>
      </Link>
      <motion.div 
        className="text-muted-foreground text-center text-sm font-medium"
        initial={prefersReducedMotion ? {} : { opacity: 0 }}
        animate={prefersReducedMotion ? {} : { opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        Transform your workouts into victories
      </motion.div>
    </motion.div>
  );
}