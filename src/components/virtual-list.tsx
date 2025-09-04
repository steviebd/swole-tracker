"use client";

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = "",
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight);

  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(start + visibleCount + overscan, items.length);
    
    const safeStart = Math.max(0, start - overscan);
    const safeEnd = end;

    return {
      startIndex: safeStart,
      endIndex: safeEnd,
      visibleItems: items.slice(safeStart, safeEnd)
    };
  }, [scrollTop, itemHeight, visibleCount, overscan, items]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate offset for positioning visible items correctly
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Total height placeholder to maintain scroll bar */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Rendered items */}
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook for dynamic item heights (more complex scenarios)
export function useVirtualList<T>({
  items,
  estimatedItemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[];
  estimatedItemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState<number[]>([]);

  const totalHeight = useMemo(() => {
    if (itemHeights.length === 0) {
      return items.length * estimatedItemHeight;
    }
    return itemHeights.reduce((sum, height) => sum + height, 0);
  }, [itemHeights, items.length, estimatedItemHeight]);

  const { startIndex, endIndex, offsetY } = useMemo(() => {
    if (itemHeights.length === 0) {
      // Fallback to estimated heights
      const start = Math.floor(scrollTop / estimatedItemHeight);
      const visibleCount = Math.ceil(containerHeight / estimatedItemHeight);
      const end = Math.min(start + visibleCount + overscan, items.length);
      
      return {
        startIndex: Math.max(0, start - overscan),
        endIndex: end,
        offsetY: Math.max(0, start - overscan) * estimatedItemHeight,
      };
    }

    // Use actual measured heights
    let accumulatedHeight = 0;
    let startIndex = 0;
    let endIndex = 0;
    let offsetY = 0;

    // Find start index
    for (let i = 0; i < itemHeights.length; i++) {
      if (accumulatedHeight + itemHeights[i]! > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        // Calculate offset for start index
        offsetY = itemHeights.slice(0, startIndex).reduce((sum, h) => sum + h, 0);
        break;
      }
      accumulatedHeight += itemHeights[i]!;
    }

    // Find end index
    accumulatedHeight = offsetY;
    for (let i = startIndex; i < itemHeights.length; i++) {
      accumulatedHeight += itemHeights[i]!;
      if (accumulatedHeight > scrollTop + containerHeight) {
        endIndex = Math.min(i + overscan, items.length);
        break;
      }
    }

    return { startIndex, endIndex, offsetY };
  }, [scrollTop, itemHeights, containerHeight, overscan, items.length, estimatedItemHeight]);

  const measureItem = useCallback((index: number, height: number) => {
    setItemHeights(prev => {
      const newHeights = [...prev];
      newHeights[index] = height;
      return newHeights;
    });
  }, []);

  return {
    startIndex,
    endIndex,
    offsetY,
    totalHeight,
    visibleItems: items.slice(startIndex, endIndex),
    measureItem,
    scrollTop,
    setScrollTop,
  };
}