"use client";

import { useState, useRef, useEffect } from "react";

interface JokeResponse {
  joke?: string;
  error?: string;
}

export function JokeOfTheDay() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [joke, setJoke] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchJoke = async () => {
      // Check if joke is cached in session storage
      const cachedJoke = sessionStorage.getItem('joke-of-the-day');
      if (cachedJoke) {
        setJoke(cachedJoke);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/joke');
        const data: JokeResponse = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch joke');
        }
        
        if (data.joke) {
          setJoke(data.joke);
          // Cache the joke for this session
          sessionStorage.setItem('joke-of-the-day', data.joke);
        } else {
          throw new Error('No joke received');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch joke';
        setError(errorMessage);
        console.error('Error fetching joke:', err);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchJoke();
  }, []);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartXRef.current || !touchStartYRef.current) return;

    const touchEndX = e.changedTouches[0]?.clientX ?? 0;
    const touchEndY = e.changedTouches[0]?.clientY ?? 0;
    
    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - touchStartYRef.current;
    
    const minSwipeDistance = 100;
    const maxVerticalDistance = 50;
    
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaY) < maxVerticalDistance) {
      setIsDismissed(true);
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
          <div className="text-red-200 text-sm">Error: {error}</div>
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
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="bg-navy-600 hover:bg-navy-700 transition-colors rounded-lg p-6 text-center cursor-pointer select-none"
      style={{ backgroundColor: '#1e3a8a', borderColor: '#1e40af' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#1e40af';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#1e3a8a';
      }}
    >
      {renderContent()}
    </div>
  );
}
