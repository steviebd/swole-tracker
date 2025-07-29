"use client";

import { useState, useRef } from "react";

export function JokeOfTheDay() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

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
      <h3 className="text-xl font-semibold mb-2 text-white">😄 Joke of the Day</h3>
      <p className="text-blue-100">Double-click or swipe to dismiss</p>
    </div>
  );
}
