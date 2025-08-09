"use client";

import { useMemo } from "react";

// Type definitions matching the real tRPC schema
export interface MockWorkoutSession {
  id: number;
  user_id: string;
  templateId: number;
  workoutDate: Date;
  template?: {
    id: number;
    name: string;
    exercises: {
      id: number;
      exerciseName: string;
      orderIndex: number;
    }[];
  };
  exercises: {
    id: number;
    exerciseName: string;
    weight?: string;
    reps?: number;
    sets?: number;
    unit: string;
  }[];
}

export interface MockStats {
  workoutsThisWeek: number;
  avgDuration: string;
  weeklyGoal: {
    current: number;
    target: number;
  };
  volumeGoal: {
    current: string;
    target: string;
  };
  consistency: number;
}

// Mock recent workouts matching tRPC getRecent response structure
export function useMockFeed(limit = 3): {
  data: MockWorkoutSession[];
  isLoading: boolean;
  error: null;
} {
  const mockData = useMemo(() => {
    const baseDate = new Date();
    
    return Array.from({ length: limit }, (_, i) => ({
      id: i + 1,
      user_id: "mock_user",
      templateId: i + 1,
      workoutDate: new Date(baseDate.getTime() - (i * 2 * 24 * 60 * 60 * 1000)), // Every 2 days
      template: {
        id: i + 1,
        name: ["Push Day", "Pull Day", "Legs", "Upper Body", "Full Body"][i] || "Total",
        exercises: [
          { id: i * 10 + 1, exerciseName: "Bench Press", orderIndex: 0 },
          { id: i * 10 + 2, exerciseName: "Squats", orderIndex: 1 },
          { id: i * 10 + 3, exerciseName: "Deadlifts", orderIndex: 2 },
        ]
      },
      exercises: Array.from({ length: Math.floor(Math.random() * 5) + 3 }, (_, j) => ({
        id: i * 100 + j,
        exerciseName: ["Bench Press", "Squats", "Deadlifts", "Pull-ups", "Overhead Press", "Rows"][j] || "Exercise",
        weight: (60 + Math.random() * 40).toFixed(1),
        reps: Math.floor(Math.random() * 8) + 8,
        sets: Math.floor(Math.random() * 3) + 3,
        unit: "kg"
      }))
    }));
  }, [limit]);

  return {
    data: mockData,
    isLoading: false,
    error: null,
  };
}

// Mock dashboard stats
export function useMockStats(): {
  data: MockStats;
  isLoading: boolean;
  error: null;
} {
  const mockData = useMemo((): MockStats => ({
    workoutsThisWeek: 4,
    avgDuration: "52 min",
    weeklyGoal: {
      current: 4,
      target: 5
    },
    volumeGoal: {
      current: "12.5k",
      target: "15k"
    },
    consistency: 85
  }), []);

  return {
    data: mockData,
    isLoading: false,
    error: null,
  };
}

// Mock progress data for charts and metrics
export function useMockProgress(): {
  data: {
    workoutGoal: { current: number; target: number; percentage: number };
    volumeGoal: { current: string; target: string; percentage: number };
    consistency: { percentage: number; message: string };
  };
  isLoading: boolean;
  error: null;
} {
  const mockData = useMemo(() => ({
    workoutGoal: {
      current: 4,
      target: 5, 
      percentage: 80
    },
    volumeGoal: {
      current: "12.5k kg",
      target: "15k kg",
      percentage: 83
    },
    consistency: {
      percentage: 85,
      message: "Great consistency!"
    }
  }), []);

  return {
    data: mockData,
    isLoading: false,
    error: null,
  };
}