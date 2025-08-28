"use client";

/**
 * Hook for handling motion preferences and accessibility
 * 
 * Features:
 * - Detects user's motion preferences (reduce/no-preference)
 * - Provides safe defaults for animations
 * - Automatically updates when preferences change
 * - Server-side rendering compatible
 */

import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Use the newer addEventListener if available, fallback to addListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook that provides safe animation durations based on motion preferences
 */
export function useAnimationDurations() {
  const prefersReducedMotion = useReducedMotion();
  
  return {
    fast: prefersReducedMotion ? 1 : 160,
    base: prefersReducedMotion ? 1 : 200,
    slow: prefersReducedMotion ? 1 : 240,
    celebration: prefersReducedMotion ? 1 : 500,
  };
}

/**
 * Hook that provides safe animation properties based on motion preferences
 */
export function useAnimationProps() {
  const prefersReducedMotion = useReducedMotion();
  
  return {
    animate: !prefersReducedMotion,
    transition: prefersReducedMotion 
      ? { duration: 0.001 }
      : { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    // Provide simplified variants for reduced motion
    getVariant: (normalVariant: any, reducedVariant?: any) => {
      return prefersReducedMotion 
        ? (reducedVariant || { opacity: 1, transition: { duration: 0.001 } })
        : normalVariant;
    }
  };
}