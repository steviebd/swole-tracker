import { useEffect, useRef } from "react";

export function useWorkoutUpdates(onWorkoutUpdate: () => void) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(onWorkoutUpdate);

  // Update the callback ref when it changes
  callbackRef.current = onWorkoutUpdate;

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    // Poll for updates every 30 seconds
    intervalRef.current = setInterval(() => {
      console.log("Polling for workout updates");
      // Trigger the callback to refetch data
      callbackRef.current();
    }, 30000); // 30 seconds

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []); // Empty dependency array - we only want this to run once

  // Return a function to manually stop polling if needed
  return {
    stop: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    },
  };
}
