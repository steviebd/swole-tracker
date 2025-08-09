"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "~/trpc/react";

let dismissedThisSession = false;

export function JokeOfTheDay() {
  const { user, isLoaded } = useUser();
  const [isDismissed, setIsDismissed] = useState<boolean>(dismissedThisSession);
  const [clickCount, setClickCount] = useState(0);
  const [joke, setJoke] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [velocity, setVelocity] = useState(0);
  const lastTouchTimeRef = useRef<number>(0);
  const lastTouchXRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // tRPC hooks
  const {
    data: jokeData,
    isLoading: isJokeLoading,
    error: jokeError,
  } = api.jokes.getCurrent.useQuery(undefined, {
    enabled: isLoaded && !!user,
    retry: false,
  });
  // No longer need cache mutations since we always fetch fresh jokes

  // Handle joke data from tRPC
  useEffect(() => {
    if (jokeData && user) {
      setJoke(jokeData.joke);
      setIsLoading(false);
      setError(null);
    }
  }, [jokeData, user]);

  // Handle loading and error states
  useEffect(() => {
    setIsLoading(isJokeLoading);
    if (jokeError) {
      if (jokeError.data?.code === "UNAUTHORIZED") {
        setError("Please log in to see the joke of the day");
      } else {
        setError(jokeError.message);
      }
    }
  }, [isJokeLoading, jokeError]);

  // Fresh joke is fetched automatically on each browser refresh via tRPC query
  // No caching logic needed - every page load gets a new joke from AI Gateway

  // Don't render if not loaded or user not authenticated
  if (!isLoaded || !user) return null;
  if (isDismissed) return null;

  const handleClick = () => {
    setClickCount((prev) => prev + 1);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (clickCount === 0) {
      timeoutRef.current = setTimeout(() => {
        setClickCount(0);
      }, 500);
    } else {
      setIsDismissed(true);
      dismissedThisSession = true;
    }
  };

  const startMomentumAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const animate = () => {
      setVelocity((prevVelocity) => {
        const newVelocity = prevVelocity * 0.95; // Friction
        if (Math.abs(newVelocity) < 0.1) {
          // Animation finished
          const currentTranslateX = translateX + newVelocity;
          if (Math.abs(currentTranslateX) > 150 || Math.abs(velocity) > 8) {
            setIsDismissed(true);
            dismissedThisSession = true;
          } else {
            // Snap back to center
            setTranslateX(0);
          }
          return 0;
        }

        setTranslateX((prevTranslateX) => {
          const newTranslateX = prevTranslateX + newVelocity;
          if (Math.abs(newTranslateX) > 150 || Math.abs(velocity) > 8) {
            setIsDismissed(true);
            dismissedThisSession = true;
            return newTranslateX;
          }
          return newTranslateX;
        });

        animationRef.current = requestAnimationFrame(animate);
        return newVelocity;
      });
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    lastTouchXRef.current = touch.clientX;
    lastTouchTimeRef.current = Date.now();
    setIsDragging(true);
    setVelocity(0);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Avoid calling preventDefault in passive event listeners to prevent console errors.
    // We rely on touch-action CSS to control scrolling behavior.
    if (!isDragging || !touchStartXRef.current || !touchStartYRef.current)
      return;

    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    // Only track horizontal movement if it's more significant than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setTranslateX(deltaX);

      // Calculate velocity for momentum
      const currentTime = Date.now();
      const timeDelta = currentTime - lastTouchTimeRef.current;
      const positionDelta = touch.clientX - lastTouchXRef.current;

      if (timeDelta > 0) {
        setVelocity((positionDelta / timeDelta) * 16); // Convert to pixels per frame (60fps)
      }

      lastTouchXRef.current = touch.clientX;
      lastTouchTimeRef.current = currentTime;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);

    // Check if should dismiss or animate back
    if (Math.abs(translateX) > 150 || Math.abs(velocity) > 8) {
      setIsDismissed(true);
      dismissedThisSession = true;
    } else if (Math.abs(velocity) > 0.5) {
      // Start momentum animation
      startMomentumAnimation();
    } else {
      // Snap back to center
      setTranslateX(0);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <>
          <h3 className="mb-2 text-xl font-semibold text-white">😄 Joke of the Day</h3>
          <div className="text-blue-100">Loading a joke for you...</div>
        </>
      );
    }

    if (error) {
      return (
        <>
          <h3 className="mb-2 text-xl font-semibold text-white">😅 Joke of the Day</h3>
          <div className="text-sm text-red-200">
            {error.includes("not configured")
              ? "Feature not available yet"
              : `Error: ${error}`}
          </div>
          <div className="mt-1 text-xs text-blue-100">Double-click or swipe to dismiss</div>
        </>
      );
    }

    return (
      <>
        <h3 className="mb-2 text-xl font-semibold text-white">😄 Joke of the Day</h3>
        <p className="mb-2 text-sm leading-relaxed text-blue-100">{joke}</p>
        <div className="text-xs text-blue-200">Double-click or swipe to dismiss</div>
      </>
    );
  };

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="cursor-pointer touch-none rounded-xl md:rounded-2xl p-6 md:p-8 text-center select-none bg-gradient-to-r border-0"
      data-theme="dark"
      style={{
        backgroundImage: `linear-gradient(to right, var(--color-info), var(--color-chart-4))`,
        boxShadow: "var(--shadow-lg)",
        transform: `translateX(${translateX}px)`,
        transition: "none",
        opacity: Math.max(0.3, 1 - Math.abs(translateX) / 200),
      }}
    >
      {renderContent()}
    </div>
  );
}
