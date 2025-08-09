"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";

export interface SwipeSettings {
  dismissThreshold: number; // Distance in pixels to trigger dismiss
  velocityThreshold: number; // Velocity threshold for dismiss
  friction: number; // Momentum decay factor (0-1)
  minimumVelocity: number; // Minimum velocity to start momentum
  framesPerSecond: number; // For velocity calculation
}

export const DEFAULT_SWIPE_SETTINGS: SwipeSettings = {
  dismissThreshold: 150,
  velocityThreshold: 8,
  friction: 0.95,
  minimumVelocity: 0.5,
  framesPerSecond: 60,
};

export interface SwipeGestureState {
  translateX: number;
  translateY: number;
  isDragging: boolean;
  velocity: number;
  isDismissed: boolean;
}

export interface SwipeGestureHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
}

export function useSwipeGestures(
  onDismiss?: () => void,
  settings: Partial<SwipeSettings> = {},
  direction: "horizontal" | "vertical" = "horizontal",
): [SwipeGestureState, SwipeGestureHandlers, () => void] {
  const config = useMemo(
    () => ({ ...DEFAULT_SWIPE_SETTINGS, ...settings }),
    [settings],
  );

  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [velocity, setVelocity] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const lastTouchXRef = useRef<number>(0);
  const lastTouchYRef = useRef<number>(0);
  const lastTouchTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const isMouseRef = useRef(false);

  const startMomentumAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const animate = () => {
      setVelocity((prevVelocity) => {
        const newVelocity = prevVelocity * config.friction;
        if (Math.abs(newVelocity) < 0.1) {
          // Animation finished - always snap back to center
          if (direction === "horizontal") {
            setTranslateX(0);
          } else {
            setTranslateY(0);
          }
          return 0;
        }

        if (direction === "horizontal") {
          setTranslateX((prevTranslateX) => {
            const newTranslateX = prevTranslateX + newVelocity;
            if (
              Math.abs(newTranslateX) > config.dismissThreshold ||
              Math.abs(velocity) > config.velocityThreshold
            ) {
              setIsDismissed(true);
              onDismiss?.();
              return 0; // Reset to center immediately
            }
            return newTranslateX;
          });
        } else {
          setTranslateY((prevTranslateY) => {
            const newTranslateY = prevTranslateY + newVelocity;
            if (
              Math.abs(newTranslateY) > config.dismissThreshold ||
              Math.abs(velocity) > config.velocityThreshold
            ) {
              setIsDismissed(true);
              onDismiss?.();
              return 0; // Reset to center immediately
            }
            return newTranslateY;
          });
        }

        animationRef.current = requestAnimationFrame(animate);
        return newVelocity;
      });
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [config, direction, velocity, onDismiss]);

  const handleStart = useCallback(
    (clientX: number, clientY: number, isMouse = false) => {
      touchStartXRef.current = clientX;
      touchStartYRef.current = clientY;
      lastTouchXRef.current = clientX;
      lastTouchYRef.current = clientY;
      lastTouchTimeRef.current = Date.now();
      setIsDragging(true);
      setVelocity(0);
      isMouseRef.current = isMouse;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    },
    [],
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number, preventDefault = true) => {
      if (!isDragging || !touchStartXRef.current || !touchStartYRef.current)
        return;

      if (preventDefault) {
        // Note: We can't call preventDefault here for mouse events,
        // it should be called in the component's event handler
      }

      const deltaX = clientX - touchStartXRef.current;
      const deltaY = clientY - touchStartYRef.current;

      if (direction === "horizontal") {
        // Only track horizontal movement if it's more significant than vertical
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          setTranslateX(deltaX);

          // Calculate velocity for momentum
          const currentTime = Date.now();
          const timeDelta = currentTime - lastTouchTimeRef.current;
          const positionDelta = clientX - lastTouchXRef.current;

          if (timeDelta > 0) {
            setVelocity(
              (positionDelta / timeDelta) * (1000 / config.framesPerSecond),
            );
          }

          lastTouchXRef.current = clientX;
          lastTouchTimeRef.current = currentTime;
        }
      } else {
        // Vertical direction
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          setTranslateY(deltaY);

          const currentTime = Date.now();
          const timeDelta = currentTime - lastTouchTimeRef.current;
          const positionDelta = clientY - lastTouchYRef.current;

          if (timeDelta > 0) {
            setVelocity(
              (positionDelta / timeDelta) * (1000 / config.framesPerSecond),
            );
          }

          lastTouchYRef.current = clientY;
          lastTouchTimeRef.current = currentTime;
        }
      }
    },
    [isDragging, direction, config.framesPerSecond],
  );

  const handleEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    isMouseRef.current = false;

    const currentTranslate =
      direction === "horizontal" ? translateX : translateY;

    // Check if should dismiss or animate back
    if (
      Math.abs(currentTranslate) > config.dismissThreshold ||
      Math.abs(velocity) > config.velocityThreshold
    ) {
      // Trigger dismiss callback but reset position immediately
      setIsDismissed(true);
      onDismiss?.();
      // Reset position so card doesn't stay offscreen
      if (direction === "horizontal") {
        setTranslateX(0);
      } else {
        setTranslateY(0);
      }
    } else if (Math.abs(velocity) > config.minimumVelocity) {
      // Start momentum animation
      startMomentumAnimation();
    } else {
      // Snap back to center
      if (direction === "horizontal") {
        setTranslateX(0);
      } else {
        setTranslateY(0);
      }
    }
  }, [
    isDragging,
    direction,
    translateX,
    translateY,
    velocity,
    config,
    onDismiss,
    startMomentumAnimation,
  ]);

  // Touch handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      handleStart(touch.clientX, touch.clientY);
    },
    [handleStart],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Don't call preventDefault() to avoid passive event listener warning
      // The CSS touch-action property handles scroll prevention
      const touch = e.touches[0];
      if (!touch) return;
      handleMove(touch.clientX, touch.clientY, false);
    },
    [handleMove],
  );

  const onTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Mouse handlers for desktop support
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleStart(e.clientX, e.clientY, true);
    },
    [handleStart],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isMouseRef.current) return;
      handleMove(e.clientX, e.clientY);
    },
    [handleMove],
  );

  const onMouseUp = useCallback(() => {
    if (!isMouseRef.current) return;
    handleEnd();
  }, [handleEnd]);

  const onMouseLeave = useCallback(() => {
    if (!isMouseRef.current) return;
    handleEnd();
  }, [handleEnd]);

  const reset = useCallback(() => {
    setTranslateX(0);
    setTranslateY(0);
    setIsDragging(false);
    setVelocity(0);
    setIsDismissed(false);
    isMouseRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const state: SwipeGestureState = {
    translateX,
    translateY,
    isDragging,
    velocity,
    isDismissed,
  };

  const handlers: SwipeGestureHandlers = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
  };

  return [state, handlers, reset];
}
