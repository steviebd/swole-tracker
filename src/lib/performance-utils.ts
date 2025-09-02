/**
 * Performance utilities for React optimization
 */

import React, { useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Performance monitoring and optimization utilities
 */

// Debounce hook for expensive operations
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for high-frequency events
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  const lastCalledRef = useRef(0);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCalledRef.current >= delay) {
      lastCalledRef.current = now;
      return callbackRef.current(...args);
    }
  }, [delay]) as T;
}

// Memoize expensive computations
export function useExpensiveComputation<T>(
  computation: () => T,
  dependencies: React.DependencyList
): T {
  return useMemo(() => {
    const start = performance.now();
    const result = computation();
    const end = performance.now();
    
    if (process.env.NODE_ENV === 'development' && end - start > 10) {
      console.warn(`Expensive computation took ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  }, dependencies);
}

// Performance-aware setState for large objects
export function useOptimizedState<T extends object>(initialState: T) {
  const [state, setState] = React.useState(initialState);
  
  const optimizedSetState = useCallback((updates: Partial<T> | ((prev: T) => Partial<T>)) => {
    setState(prev => {
      const newUpdates = typeof updates === 'function' ? updates(prev) : updates;
      
      // Check if any values actually changed
      const hasChanges = Object.keys(newUpdates).some(
        key => prev[key as keyof T] !== newUpdates[key as keyof T]
      );
      
      if (!hasChanges) {
        return prev; // Return same reference if no changes
      }
      
      return { ...prev, ...newUpdates };
    });
  }, []);
  
  return [state, optimizedSetState] as const;
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [hasBeenVisible, setHasBeenVisible] = React.useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const visible = entry.isIntersecting;
      setIsVisible(visible);
      
      if (visible && !hasBeenVisible) {
        setHasBeenVisible(true);
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options, hasBeenVisible]);

  return { isVisible, hasBeenVisible };
}

// Bundle size analyzer (development only)
export function analyzeBundleSize() {
  if (process.env.NODE_ENV !== 'development') return;
  
  const getComponentSize = (componentName: string) => {
    // This would integrate with webpack bundle analyzer in a real app
    console.log(`📦 Component: ${componentName}`);
  };
  
  return { getComponentSize };
}

// Memory usage tracker
export function useMemoryTracker(componentName: string) {
  const mountTime = useRef(Date.now());
  
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        console.log(`🧠 ${componentName} Memory:`, {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB',
          lifetime: Date.now() - mountTime.current + 'ms'
        });
      }
    };
    
    const interval = setInterval(checkMemory, 10000); // Check every 10s
    
    return () => clearInterval(interval);
  }, [componentName]);
}

// Performance budget checker
export function usePerformanceBudget(budgets: {
  renderTime?: number; // in ms
  memoryUsage?: number; // in MB
  bundleSize?: number; // in KB
}) {
  const violations = useRef<string[]>([]);
  
  const checkBudget = useCallback((metric: string, value: number, budget?: number) => {
    if (!budget || process.env.NODE_ENV !== 'development') return;
    
    if (value > budget) {
      const violation = `${metric} exceeded budget: ${value} > ${budget}`;
      if (!violations.current.includes(violation)) {
        violations.current.push(violation);
        console.warn(`⚠️ Performance Budget Violation: ${violation}`);
      }
    }
  }, []);
  
  return { checkBudget, violations: violations.current };
}

// Component render tracking
export function useRenderTracker(componentName: string) {
  const renderCount = useRef(0);
  const lastRender = useRef(Date.now());
  
  renderCount.current += 1;
  const currentRender = Date.now();
  const timeSinceLastRender = currentRender - lastRender.current;
  lastRender.current = currentRender;
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 ${componentName} render #${renderCount.current} (+${timeSinceLastRender}ms)`);
    }
  });
  
  return {
    renderCount: renderCount.current,
    timeSinceLastRender
  };
}

// Network-aware data loading
export function useNetworkAwareLoading() {
  const [connectionType, setConnectionType] = React.useState<string>('unknown');
  const [effectiveType, setEffectiveType] = React.useState<string>('4g');
  
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnection = () => {
        setConnectionType(connection.type || 'unknown');
        setEffectiveType(connection.effectiveType || '4g');
      };
      
      updateConnection();
      connection.addEventListener('change', updateConnection);
      
      return () => {
        connection.removeEventListener('change', updateConnection);
      };
    }
  }, []);
  
  const shouldLoadImages = effectiveType !== 'slow-2g';
  const shouldLoadFullData = effectiveType === '4g' || effectiveType === '5g';
  
  return {
    connectionType,
    effectiveType,
    shouldLoadImages,
    shouldLoadFullData,
    isSlowConnection: effectiveType === 'slow-2g' || effectiveType === '2g'
  };
}

// Core Web Vitals tracking
export function useWebVitals() {
  const [vitals, setVitals] = React.useState<{
    CLS?: number;
    FID?: number;
    FCP?: number;
    LCP?: number;
    TTFB?: number;
  }>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Simple performance measurement without web-vitals library
    const measurePerformance = () => {
      if ('performance' in window && 'getEntriesByType' in performance) {
        // Measure FCP
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          setVitals(prev => ({ ...prev, FCP: fcpEntry.startTime }));
        }

        // Measure LCP using PerformanceObserver
        if ('PerformanceObserver' in window) {
          try {
            const lcpObserver = new PerformanceObserver((entryList) => {
              const entries = entryList.getEntries();
              const lastEntry = entries[entries.length - 1];
              if (lastEntry) {
                setVitals(prev => ({ ...prev, LCP: lastEntry.startTime }));
              }
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

            // Measure CLS
            const clsObserver = new PerformanceObserver((entryList) => {
              let clsValue = 0;
              for (const entry of entryList.getEntries()) {
                if (!(entry as any).hadRecentInput) {
                  clsValue += (entry as any).value;
                }
              }
              setVitals(prev => ({ ...prev, CLS: clsValue }));
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });

          } catch (error) {
            console.log('Performance Observer not supported');
          }
        }
      }
    };

    measurePerformance();
  }, []);

  return vitals;
}

// Performance optimization for large workouts
export function useWorkoutPerformance(exerciseCount: number) {
  const shouldVirtualize = exerciseCount >= 20;
  const overscan = Math.min(5, Math.ceil(exerciseCount * 0.1));
  
  // Performance recommendations
  const recommendations = useMemo(() => {
    const recs: string[] = [];
    
    if (exerciseCount > 50) {
      recs.push('Consider breaking this into multiple workout sessions');
    }
    
    if (exerciseCount > 30) {
      recs.push('Virtualization is enabled for optimal performance');
    }
    
    if (exerciseCount > 20) {
      recs.push('Using performance optimized rendering');
    }
    
    return recs;
  }, [exerciseCount]);
  
  return {
    shouldVirtualize,
    overscan,
    recommendations,
    performanceMode: shouldVirtualize ? 'virtualized' : 'standard',
    itemHeight: shouldVirtualize ? 120 : 'auto'
  };
}