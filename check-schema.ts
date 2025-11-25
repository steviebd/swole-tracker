#!/usr/bin/env bun
/**
 * Check actual database schema vs Drizzle schema
 */

import { db } from "./src/server/db";

async function checkSchema() {
  console.log("🔍 Checking database schema...\n");

  try {
    // Check session_exercises table structure
    const sessionExercisesSchema = await db.run(`
      PRAGMA table_info(session_exercises)
    `);

    console.log("📋 session_exercises table columns:");
    sessionExercisesSchema.results?.forEach((col: any) => {
      console.log(`  - ${col.name}: ${col.type}`);
    });

    // Check workout_sessions table structure
    const workoutSessionsSchema = await db.run(`
      PRAGMA table_info(workout_sessions)
    `);

    console.log("\n📋 workout_sessions table columns:");
    workoutSessionsSchema.results?.forEach((col: any) => {
      console.log(`  - ${col.name}: ${col.type}`);
    });

    // Check milestones table structure
    const milestonesSchema = await db.run(`
      PRAGMA table_info(milestones)
    `);

    console.log("\n📋 milestones table columns:");
    milestonesSchema.results?.forEach((col: any) => {
      console.log(`  - ${col.name}: ${col.type}`);
    });
  } catch (error) {
    console.error("❌ Error checking schema:", error);
  }
}

checkSchema().catch(console.error);
