#!/usr/bin/env node

// Test script to verify playbook workout naming
// import { createMockDb } from "./src/__tests__/unit/routers/workouts-router.test.ts";

// Mock data that simulates a playbook workout
const mockWorkoutWithPlaybook = {
  id: 1,
  workoutDate: "2024-10-15",
  templateId: 1,
  template: { name: "Push Day" },
  exercises: [],
  playbook: {
    name: "Strength Building",
    weekNumber: 3,
    sessionNumber: 2,
  },
};

// Mock data without playbook
const mockWorkoutWithoutPlaybook = {
  id: 2,
  workoutDate: "2024-10-14",
  templateId: 2,
  template: { name: "Pull Day" },
  exercises: [],
  playbook: null,
};

// Test the resolveWorkoutName function (copied from recent-workouts.tsx)
/**
 * @param {any} workout
 * @param {string} fallback
 * @returns {string}
 */
function resolveTemplateName(workout: any, fallback: string): string {
  // Check for playbook first - format as "Playbook Name - Week X - Session Y"
  const playbook = workout.playbook;
  if (playbook && typeof playbook === "object" && !Array.isArray(playbook)) {
    const pb = playbook;
    if (
      typeof pb.name === "string" &&
      typeof pb.weekNumber === "number" &&
      typeof pb.sessionNumber === "number"
    ) {
      const name = pb.name.trim();
      if (name.length > 0) {
        return `${name} - Week ${pb.weekNumber} - Session ${pb.sessionNumber}`;
      }
    }
  }

  // Fall back to template name
  const template = workout.template;
  if (
    template &&
    typeof template === "object" &&
    !Array.isArray(template) &&
    typeof template.name === "string"
  ) {
    const name = template.name.trim();
    if (name.length > 0) {
      return name;
    }
  }

  return fallback;
}

console.log("Testing playbook workout naming:");
console.log("============================");

console.log("\n1. Workout WITH playbook:");
console.log("Input:", JSON.stringify(mockWorkoutWithPlaybook, null, 2));
const result1 = resolveTemplateName(mockWorkoutWithPlaybook, "Custom Workout");
console.log("Display name:", result1);
console.log("Expected: Strength Building - Week 3 - Session 2");
console.log("✓ Pass:", result1 === "Strength Building - Week 3 - Session 2");

console.log("\n2. Workout WITHOUT playbook (has template):");
console.log("Input:", JSON.stringify(mockWorkoutWithoutPlaybook, null, 2));
const result2 = resolveTemplateName(
  mockWorkoutWithoutPlaybook,
  "Custom Workout",
);
console.log("Display name:", result2);
console.log("Expected: Pull Day");
console.log("✓ Pass:", result2 === "Pull Day");

console.log("\n3. Workout WITHOUT playbook or template:");
const mockWorkoutNoTemplateNoPlaybook = {
  id: 3,
  workoutDate: "2024-10-13",
  templateId: null,
  template: null,
  exercises: [],
  playbook: null,
};
console.log("Input:", JSON.stringify(mockWorkoutNoTemplateNoPlaybook, null, 2));
const result3 = resolveTemplateName(
  mockWorkoutNoTemplateNoPlaybook,
  "Custom Workout",
);
console.log("Display name:", result3);
console.log("Expected: Custom Workout");
console.log("✓ Pass:", result3 === "Custom Workout");

console.log("\n============================");
console.log(
  "All tests passed:",
  result1 === "Strength Building - Week 3 - Session 2" &&
    result2 === "Pull Day" &&
    result3 === "Custom Workout",
);
