import { NextResponse } from "next/server";
import { getUserFromRequest } from "~/lib/auth/user";
import { db } from "~/server/db";
import { externalWorkoutsWhoop } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";



export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all workouts for the user
    const allWorkouts = await db
      .select({
        id: externalWorkoutsWhoop.id,
        whoopWorkoutId: externalWorkoutsWhoop.whoopWorkoutId,
        start: externalWorkoutsWhoop.start,
        end: externalWorkoutsWhoop.end,
        sport_name: externalWorkoutsWhoop.sport_name,
        score_state: externalWorkoutsWhoop.score_state,
        score: externalWorkoutsWhoop.score,
        during: externalWorkoutsWhoop.during,
        zone_duration: externalWorkoutsWhoop.zone_duration,
        createdAt: externalWorkoutsWhoop.createdAt,
      })
      .from(externalWorkoutsWhoop)
      .where(eq(externalWorkoutsWhoop.user_id, user.id))
      .orderBy(externalWorkoutsWhoop.createdAt);

    // Group workouts by temporal key (start + end time)
    const temporalGroups = new Map<string, typeof allWorkouts>();
    
    for (const workout of allWorkouts) {
      const temporalKey = `${workout.start}_${workout.end}`;
      if (!temporalGroups.has(temporalKey)) {
        temporalGroups.set(temporalKey, []);
      }
      temporalGroups.get(temporalKey)!.push(workout);
    }

    // Filter to only groups with duplicates
    const duplicates = Array.from(temporalGroups.entries())
      .filter(([_, workouts]) => workouts.length > 1)
      .map(([temporalKey, workouts]) => ({
        temporalKey,
        workouts,
        count: workouts.length,
      }));
    
    if (duplicates.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No duplicate workouts found",
        duplicatesRemoved: 0,
      });
    }

    let duplicatesRemoved = 0;
    const mergedWorkouts: Array<{
      kept: string;
      removed: string[];
      sport_name: string | null;
      start: string;
      end: string;
    }> = [];

    for (const group of duplicates) {
      const workouts = group.workouts;
      
      if (workouts.length <= 1) continue;

      // Find the "best" workout to keep (prefer one with sport_name, most complete data)
      const sortedWorkouts = [...workouts].sort((a, b) => {
        // Prefer workout with sport_name (not null/empty)
        if (a.sport_name && !b.sport_name) return -1;
        if (!a.sport_name && b.sport_name) return 1;
        
        // Prefer workout with score data
        if (a.score && !b.score) return -1;
        if (!a.score && b.score) return 1;
        
        // Prefer earliest created (first sync usually has better data)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      const keepWorkout = sortedWorkouts[0]!;
      const removeWorkouts = sortedWorkouts.slice(1);

      // Delete duplicate workouts
      for (const workout of removeWorkouts) {
        await db
          .delete(externalWorkoutsWhoop)
          .where(eq(externalWorkoutsWhoop.id, workout.id));
        
        duplicatesRemoved++;
      }

      mergedWorkouts.push({
        kept: keepWorkout.whoopWorkoutId,
        removed: removeWorkouts.map(w => w.whoopWorkoutId),
        sport_name: keepWorkout.sport_name,
        start: keepWorkout.start,
        end: keepWorkout.end,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${duplicatesRemoved} duplicate workouts`,
      duplicatesRemoved,
      duplicateGroups: duplicates.length,
      mergedWorkouts,
    });

  } catch (error) {
    console.error("Error cleaning up duplicate workouts:", error);
    return NextResponse.json(
      { error: "Failed to clean up duplicates" },
      { status: 500 }
    );
  }
}
