"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';

interface VirtualizationConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside of viewport
  threshold?: number; // Minimum number of items to trigger virtualization
}

interface VirtualItem {
  index: number;
  start: number;
  end: number;
}

interface VirtualizationResult {
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  visibleItems: VirtualItem[];
  containerProps: {
    style: React.CSSProperties;
  };
  scrollElementProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent<HTMLElement>) => void;
  };
}

/**
 * Custom hook for virtualizing large lists
 * 
 * Optimizes performance by only rendering visible items plus a small buffer
 * Automatically enables when item count exceeds threshold (default: 10)
 */
export function useVirtualization(
  itemCount: number,
  config: VirtualizationConfig
): VirtualizationResult {
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    threshold = 10
  } = config;

  const [scrollTop, setScrollTop] = useState(0);

  // Disable virtualization for small lists
  const shouldVirtualize = itemCount > threshold;

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const virtualItems = useMemo(() => {
    if (!shouldVirtualize) {
      // Return all items for non-virtualized lists
      return Array.from({ length: itemCount }, (_, index) => ({
        index,
        start: index * itemHeight,
        end: (index + 1) * itemHeight
      }));
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const items: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight
      });
    }

    return items;
  }, [scrollTop, itemCount, itemHeight, containerHeight, overscan, shouldVirtualize]);

  const totalHeight = itemCount * itemHeight;
  const startIndex = virtualItems[0]?.index || 0;
  const endIndex = virtualItems[virtualItems.length - 1]?.index || itemCount - 1;

  return {
    totalHeight,
    startIndex,
    endIndex,
    visibleItems: virtualItems,
    containerProps: {
      style: {
        height: shouldVirtualize ? containerHeight : 'auto',
        overflow: shouldVirtualize ? 'auto' : 'visible',
        position: 'relative'
      }
    },
    scrollElementProps: {
      style: shouldVirtualize ? {
        height: totalHeight,
        position: 'relative',
        width: '100%'
      } : {},
      onScroll: handleScroll
    }
  };
}

/**
 * Hook for managing virtual list state with item updates
 */
export function useVirtualList<T>(
  items: T[],
  config: VirtualizationConfig
) {
  const virtualization = useVirtualization(items.length, config);
  
  const visibleItems = useMemo(() => {
    return virtualization.visibleItems.map(virtualItem => ({
      ...virtualItem,
      data: items[virtualItem.index]
    }));
  }, [virtualization.visibleItems, items]);

  return {
    ...virtualization,
    visibleItems
  };
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(componentName: string) {
  const [renderCount, setRenderCount] = useState(0);
  const [renderTime, setRenderTime] = useState<number[]>([]);

  useEffect(() => {
    const startTime = performance.now();
    setRenderCount(prev => prev + 1);

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      setRenderTime(prev => [...prev.slice(-9), duration]); // Keep last 10 renders
    };
  });

  const averageRenderTime = useMemo(() => {
    if (renderTime.length === 0) return 0;
    return renderTime.reduce((sum, time) => sum + time, 0) / renderTime.length;
  }, [renderTime]);

  // Log performance warnings in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && averageRenderTime > 16) {
      console.warn(`⚠️ ${componentName} is rendering slowly (${averageRenderTime.toFixed(2)}ms avg). Consider optimization.`);
    }
  }, [componentName, averageRenderTime]);

  return {
    renderCount,
    averageRenderTime,
    lastRenderTime: renderTime[renderTime.length - 1] || 0
  };
}