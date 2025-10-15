import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SessionCookie } from "~/lib/session-cookie";
import { createDb, getD1Binding } from "~/server/db";
import { externalWorkoutsWhoop } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { env } from "~/env";
import { checkRateLimit } from "~/lib/rate-limit";
import { getValidAccessToken } from "~/lib/token-rotation";

export const runtime = "nodejs";

interface WhoopWorkout {
  id: string;
  start: string;
  end: string;
  timezone_offset: string;
  sport_name: string;
  score_state: string;
  score?: unknown;
  during?: unknown;
  zone_duration?: unknown;
}

export async function POST(request: NextRequest) {
  const db = createDb(getD1Binding());

  try {
    const session = await SessionCookie.get(request);
    if (!session || SessionCookie.isExpired(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit (use shared env presets)
    const rateLimit = await checkRateLimit(
      db,
      session.userId,
      "whoop_sync",
      env.WHOOP_SYNC_RATE_LIMIT_PER_HOUR,
      60 * 60 * 1000, // 1 hour
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `You can only sync ${env.WHOOP_SYNC_RATE_LIMIT_PER_HOUR} times per hour. Try again in ${Math.ceil(rateLimit.retryAfter! / 60)} minutes.`,
          retryAfter: rateLimit.retryAfter,
          resetTime: rateLimit.resetTime.toISOString(),
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimit.retryAfter!.toString(),
            "X-RateLimit-Limit": env.WHOOP_SYNC_RATE_LIMIT_PER_HOUR.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": Math.floor(
              rateLimit.resetTime.getTime() / 1000,
            ).toString(),
          },
        },
      );
    }

    // Get valid access token (automatically handles rotation if needed)
    const tokenResult = await getValidAccessToken(db, session.userId, "whoop");

    if (!tokenResult.token) {
      return NextResponse.json(
        {
          error:
            tokenResult.error || "Whoop integration not found or token invalid",
        },
        { status: 404 },
      );
    }

    const accessToken = tokenResult.token;

    // Get the latest workout timestamp for incremental sync
    const [latestWorkout] = await db
      .select({ start: externalWorkoutsWhoop.start })
      .from(externalWorkoutsWhoop)
      .where(eq(externalWorkoutsWhoop.user_id, session.userId))
      .orderBy(desc(externalWorkoutsWhoop.start))
      .limit(1);

    // Fetch workouts from Whoop API (v2 endpoint) with incremental sync
    let whoopUrl =
      "https://api.prod.whoop.com/developer/v2/activity/workout?limit=25";
    if (latestWorkout?.start) {
      const sinceIso = new Date(latestWorkout.start).toISOString();
      whoopUrl += `&since=${encodeURIComponent(sinceIso)}`;
    }

    const whoopResponse = await fetch(whoopUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!whoopResponse.ok) {
      const errorText = await whoopResponse.text();
      console.error("Whoop API error:", whoopResponse.status, errorText);
      return NextResponse.json(
        { error: `Whoop API error: ${whoopResponse.status} - ${errorText}` },
        { status: whoopResponse.status },
      );
    }

    const whoopData: unknown = await whoopResponse.json();
    if (typeof whoopData !== "object" || whoopData === null) {
      return NextResponse.json(
        { error: "Unexpected Whoop API response shape" },
        { status: 502 },
      );
    }

    // Narrow shape
    const dataArr = (whoopData as { data?: unknown }).data;
    const recordsArr = (whoopData as { records?: unknown }).records;

    console.log("Whoop API response structure:", {
      keys: Object.keys(whoopData as Record<string, unknown>),
      recordsLength: Array.isArray(recordsArr) ? recordsArr.length : undefined,
      dataLength: Array.isArray(dataArr) ? dataArr.length : undefined,
    });

    // v2 API might use 'data' instead of 'records'
    const workoutsRaw = (
      Array.isArray(dataArr)
        ? dataArr
        : Array.isArray(recordsArr)
          ? recordsArr
          : []
    ) as unknown[];

    const workouts: WhoopWorkout[] = workoutsRaw.map((w) => {
      const o = w as Record<string, unknown>;
      return {
        id: String(o.id ?? ""),
        start: String(o.start ?? ""),
        end: String(o.end ?? ""),
        timezone_offset: String(o.timezone_offset ?? ""),
        sport_name: String(o.sport_name ?? ""),
        score_state: String(o.score_state ?? ""),
        score: o.score,
        during: o.during,
        zone_duration: o.zone_duration,
      };
    });

    // Check for existing workouts by both WHOOP ID and temporal overlap
    const existingWorkouts = await db
      .select({
        whoopWorkoutId: externalWorkoutsWhoop.whoopWorkoutId,
        start: externalWorkoutsWhoop.start,
        end: externalWorkoutsWhoop.end,
      })
      .from(externalWorkoutsWhoop)
      .where(eq(externalWorkoutsWhoop.user_id, session.userId));

    const existingIds = new Set(existingWorkouts.map((w) => w.whoopWorkoutId));
    const existingTimes = new Set(
      existingWorkouts.map(
        (w) => `${w.start.toISOString()}_${w.end.toISOString()}`,
      ),
    );

    // Filter out workouts that already exist by ID or temporal match
    const newWorkoutData = workouts.filter((w) => {
      const timeKey = `${new Date(w.start).toISOString()}_${new Date(w.end).toISOString()}`;
      return !existingIds.has(w.id) && !existingTimes.has(timeKey);
    });

    let newWorkouts = 0;
    const duplicates = workouts.length - newWorkoutData.length;

    // Batch insert new workouts
    if (newWorkoutData.length > 0) {
      try {
        const workoutValues = newWorkoutData.map((workout) => ({
          user_id: session.userId,
          whoopWorkoutId: workout.id,
          start: new Date(workout.start),
          end: new Date(workout.end),
          timezone_offset: workout.timezone_offset,
          sport_name: workout.sport_name,
          score_state: workout.score_state,
          score: workout.score ? JSON.stringify(workout.score) : null,
          during: workout.during ? JSON.stringify(workout.during) : null,
          zone_duration: workout.zone_duration
            ? JSON.stringify(workout.zone_duration)
            : null,
        }));

        await db.insert(externalWorkoutsWhoop).values(workoutValues);
        newWorkouts = newWorkoutData.length;
      } catch (error) {
        console.error(
          "Error during batch insert, falling back to individual inserts:",
          error,
        );

        // Fallback to individual inserts if batch fails
        for (const workout of newWorkoutData) {
          try {
            await db.insert(externalWorkoutsWhoop).values({
              user_id: session.userId,
              whoopWorkoutId: workout.id,
              start: new Date(workout.start),
              end: new Date(workout.end),
              timezone_offset: workout.timezone_offset,
              sport_name: workout.sport_name,
              score_state: workout.score_state,
              score: workout.score ? JSON.stringify(workout.score) : null,
              during: workout.during ? JSON.stringify(workout.during) : null,
              zone_duration: workout.zone_duration
                ? JSON.stringify(workout.zone_duration)
                : null,
            });
            newWorkouts++;
          } catch (individualError) {
            console.error(
              `Error processing workout ${workout.id}:`,
              individualError,
            );
          }
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        totalWorkouts: workouts.length,
        newWorkouts,
        duplicates,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime.toISOString(),
        },
      },
      {
        headers: {
          "X-RateLimit-Limit": env.WHOOP_SYNC_RATE_LIMIT_PER_HOUR.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": Math.floor(
            rateLimit.resetTime.getTime() / 1000,
          ).toString(),
        },
      },
    );
  } catch (error) {
    console.error("Sync workouts error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to sync workouts",
      },
      { status: 500 },
    );
  }
}
