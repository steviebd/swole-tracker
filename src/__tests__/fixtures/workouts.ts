import { createMockExercise, createMockSet } from "../mocks/factories";

export const sampleWorkouts = [
  {
    id: 'fixture-push-day',
    name: 'Push Day',
    exercises: [
      {
        ...createMockExercise({ name: 'Bench Press', category: 'strength' }),
        sets: [
          createMockSet({ setNumber: 1, weight: 80, reps: 8 }),
          createMockSet({ setNumber: 2, weight: 80, reps: 6 }),
        ]
      },
      {
        ...createMockExercise({ name: 'Overhead Press', category: 'strength' }),
        sets: [
          createMockSet({ setNumber: 1, weight: 50, reps: 10 }),
          createMockSet({ setNumber: 2, weight: 50, reps: 8 }),
        ]
      }
    ]
  },
  {
    id: 'fixture-pull-day',
    name: 'Pull Day',
    exercises: [
      {
        ...createMockExercise({ name: 'Pull-ups', category: 'bodyweight' }),
        sets: [
          createMockSet({ setNumber: 1, weight: 0, reps: 12 }),
          createMockSet({ setNumber: 2, weight: 0, reps: 10 }),
        ]
      },
      {
        ...createMockExercise({ name: 'Barbell Rows', category: 'strength' }),
        sets: [
          createMockSet({ setNumber: 1, weight: 70, reps: 8 }),
          createMockSet({ setNumber: 2, weight: 70, reps: 8 }),
        ]
      }
    ]
  }
];