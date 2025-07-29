"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "~/trpc/react";

export function JokeOfTheDay() {
  const { user, isLoaded } = useUser();
  const [isDismissed, setIsDismissed] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [joke, setJoke] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jokeCreatedAt, setJokeCreatedAt] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousUserIdRef = useRef<string | null>(null);
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
  const { data: jokeData, isLoading: isJokeLoading, error: jokeError, refetch } = api.jokes.getCurrent.useQuery(
    undefined,
    { 
      enabled: isLoaded && !!user,
      retry: false,
    }
  );
  const clearCacheMutation = api.jokes.clearCache.useMutation();
  const generateNewMutation = api.jokes.generateNew.useMutation();

  // Handle joke data from tRPC
  useEffect(() => {
    if (jokeData && user) {
      setJoke(jokeData.joke);
      setJokeCreatedAt(jokeData.createdAt);
      setIsLoading(false);
      setError(null);
    }
  }, [jokeData, user]);

  // Handle loading and error states
  useEffect(() => {
    setIsLoading(isJokeLoading);
    if (jokeError) {
      if (jokeError.data?.code === 'UNAUTHORIZED') {
        setError('Please log in to see the joke of the day');
      } else {
        setError(jokeError.message);
      }
    }
  }, [isJokeLoading, jokeError]);

  // Clear cache and refetch when user changes (login/logout)
  useEffect(() => {
    if (isLoaded && user?.id && previousUserIdRef.current && previousUserIdRef.current !== user.id) {
      console.log('User changed, clearing joke cache');
      clearCacheMutation.mutate(undefined, {
        onSuccess: () => {
          void refetch();
        }
      });
    }
    previousUserIdRef.current = user?.id ?? null;
  }, [user?.id, isLoaded, clearCacheMutation, refetch]);

  // Set up 20-hour refresh timer
  useEffect(() => {
    if (!jokeCreatedAt) return;

    const twentyHours = 20 * 60 * 60 * 1000; // 20 hours in milliseconds
    const timeUntilRefresh = twentyHours - (Date.now() - jokeCreatedAt.getTime());

    if (timeUntilRefresh > 0) {
      refreshTimeoutRef.current = setTimeout(() => {
        console.log('20 hours passed, fetching new joke');
        generateNewMutation.mutate(undefined, {
          onSuccess: (data) => {
            setJoke(data.joke);
            setJokeCreatedAt(data.createdAt);
          }
        });
      }, timeUntilRefresh);
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [jokeCreatedAt, generateNewMutation]);

  // Don't render if not loaded or user not authenticated
  if (!isLoaded || !user) return null;
  if (isDismissed) return null;

  const handleClick = () => {
    setClickCount(prev => prev + 1);
    
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
      setVelocity(prevVelocity => {
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
        
        setTranslateX(prevTranslateX => {
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
    e.preventDefault(); // Prevent scrolling
    if (!isDragging || !touchStartXRef.current || !touchStartYRef.current) return;

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
        setVelocity(positionDelta / timeDelta * 16); // Convert to pixels per frame (60fps)
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
          <h3 className="text-xl font-semibold mb-2 text-white">😄 Joke of the Day</h3>
          <div className="text-blue-100 animate-pulse">Loading a joke for you...</div>
        </>
      );
    }

    if (error) {
      return (
        <>
          <h3 className="text-xl font-semibold mb-2 text-white">😅 Joke of the Day</h3>
          <div className="text-red-200 text-sm">
            {error.includes('not configured') ? 'Feature not available yet' : `Error: ${error}`}
          </div>
          <div className="text-blue-100 text-xs mt-1">Double-click or swipe to dismiss</div>
        </>
      );
    }

    return (
      <>
        <h3 className="text-xl font-semibold mb-2 text-white">😄 Joke of the Day</h3>
        <p className="text-blue-100 text-sm leading-relaxed mb-2">{joke}</p>
        <div className="text-blue-200 text-xs">Double-click or swipe to dismiss</div>
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
      className="bg-navy-600 hover:bg-navy-700 rounded-lg p-6 text-center cursor-pointer select-none touch-pan-y"
      style={{ 
        backgroundColor: '#1e3a8a', 
        borderColor: '#1e40af',
        transform: `translateX(${translateX}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: Math.max(0.3, 1 - Math.abs(translateX) / 200)
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.backgroundColor = '#1e40af';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.backgroundColor = '#1e3a8a';
        }
      }}
    >
      {renderContent()}
    </div>
  );
}
