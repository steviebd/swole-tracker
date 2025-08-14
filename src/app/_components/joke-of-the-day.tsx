"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "~/providers/AuthProvider";
import { api } from "~/trpc/react";

export function JokeOfTheDay() {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
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
    enabled: !!user,
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

  // Don't render if user not authenticated
  if (!user) return null;
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
          <h3 className="mb-2 text-xl font-semibold text-white">
            😄 Joke of the Day
          </h3>
          <div className="animate-pulse text-blue-100">
            Loading a joke for you...
          </div>
        </>
      );
    }

    if (error) {
      return (
        <>
          <h3 className="mb-2 text-xl font-semibold text-white">
            😅 Joke of the Day
          </h3>
          <div className="text-sm text-red-200">
            {error.includes("not configured")
              ? "Feature not available yet"
              : `Error: ${error}`}
          </div>
          <div className="mt-1 text-xs text-blue-100">
            Double-click or swipe to dismiss
          </div>
        </>
      );
    }

    return (
      <>
        <h3 className="mb-2 text-xl font-semibold text-white">
          😄 Joke of the Day
        </h3>
        <p className="mb-2 text-sm leading-relaxed text-blue-100">{joke}</p>
        <div className="text-xs text-blue-200">
          Double-click or swipe to dismiss
        </div>
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
      className="bg-navy-600 hover:bg-navy-700 cursor-pointer touch-none rounded-lg p-6 text-center select-none"
      style={{
        backgroundColor: "var(--color-info)",
        borderColor: "var(--color-info)",
        transform: `translateX(${translateX}px)`,
        transition: isDragging
          ? "none"
          : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: Math.max(0.3, 1 - Math.abs(translateX) / 200),
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.backgroundColor = "var(--color-info)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.backgroundColor = "var(--color-info)";
        }
      }}
    >
      {renderContent()}
    </div>
  );
}
