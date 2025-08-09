"use client";

import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load value from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key);
        if (item !== null) {
          try {
            const parsedValue = JSON.parse(item) as unknown as T;
            setStoredValue(parsedValue);
            if (process.env.NODE_ENV !== 'test') {
              // avoid noisy logging in test runners that can increase memory usage
              console.log(`[localStorage] Loaded ${key}:`, parsedValue);
            }
          } catch {
            console.warn(`[localStorage] Invalid JSON for ${key}, clearing and using default:`, item);
            // Clear corrupted data and use initial value
            window.localStorage.removeItem(key);
            setStoredValue(initialValue);
          }
        }
      }
    } catch (err) {
      console.error(`[localStorage] Error accessing localStorage for ${key}:`, err);
    } finally {
      setIsLoaded(true);
    }
  }, [key, initialValue]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = typeof value === 'function' ? (value as (val: T) => T)(storedValue) : value;

      // Save state
      setStoredValue(valueToStore);

      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        if (process.env.NODE_ENV !== 'test') {
          // avoid noisy logging in test runners that can increase memory usage
          console.log(`[localStorage] Saved ${key}:`, valueToStore);
        }
      }
    } catch (err) {
      console.error(`[localStorage] Error saving ${key}:`, err);
    }
  };

  return [storedValue, setValue, isLoaded] as const;
}
