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
            const parsedValue = JSON.parse(item);
            setStoredValue(parsedValue);
            console.log(`[localStorage] Loaded ${key}:`, parsedValue);
          } catch (parseError) {
            console.warn(`[localStorage] Invalid JSON for ${key}, clearing and using default:`, item);
            // Clear corrupted data and use initial value
            window.localStorage.removeItem(key);
            setStoredValue(initialValue);
          }
        }
      }
    } catch (error) {
      console.error(`[localStorage] Error accessing localStorage for ${key}:`, error);
    } finally {
      setIsLoaded(true);
    }
  }, [key, initialValue]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        console.log(`[localStorage] Saved ${key}:`, valueToStore);
      }
    } catch (error) {
      console.error(`[localStorage] Error saving ${key}:`, error);
    }
  };

  return [storedValue, setValue, isLoaded] as const;
}
