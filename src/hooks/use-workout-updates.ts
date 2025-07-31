import { useEffect, useRef } from 'react';

interface WorkoutUpdateData {
  type: string;
  timestamp: number;
  workout?: {
    id: string;
    type: string;
    sport_name: string;
    start: string;
    end: string;
  };
}

export function useWorkoutUpdates(onWorkoutUpdate: () => void) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const callbackRef = useRef(onWorkoutUpdate);
  
  // Update the callback ref when it changes
  callbackRef.current = onWorkoutUpdate;

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Create EventSource connection
    const eventSource = new EventSource('/api/sse/workout-updates');
    eventSourceRef.current = eventSource;

    // Handle incoming messages
    eventSource.onmessage = (event) => {
      try {
        const data: WorkoutUpdateData = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('Connected to workout updates SSE stream');
        } else if (data.type === 'workout-updated') {
          console.log('Received workout update:', data.workout);
          // Trigger the callback to refetch data
          callbackRef.current();
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    // Handle connection errors
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      // The browser will automatically try to reconnect
    };

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []); // Empty dependency array - we only want this to run once

  // Return a function to manually close the connection if needed
  return {
    close: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    }
  };
}
