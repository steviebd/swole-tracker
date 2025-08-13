import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "~/lib/supabase-server";
import type * as oauth from "oauth4webapi";
import { db } from "~/server/db";
import { userIntegrations, externalWorkoutsWhoop } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { env } from "~/env";
import { checkRateLimit } from "~/lib/rate-limit";

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

type IntegrationRecord = {
  id: number;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | Date | null;
};

async function refreshTokenIfNeeded(integration: IntegrationRecord) {
  // Check if token is expired or will expire in next 5 minutes
  const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
  const now = new Date();

  if (
    integration.expiresAt &&
    new Date(integration.expiresAt).getTime() - now.getTime() < expiryBuffer
  ) {
    if (!integration.refreshToken) {
      throw new Error("Access token expired and no refresh token available");
    }

    const authorizationServer: oauth.AuthorizationServer = {
      issuer: "https://api.prod.whoop.com",
      authorization_endpoint: "https://api.prod.whoop.com/oauth/oauth2/auth",
      token_endpoint: "https://api.prod.whoop.com/oauth/oauth2/token",
    };

    // Make refresh token request directly
    const refreshRequest = {
      grant_type: "refresh_token",
      refresh_token: integration.refreshToken,
      client_id: env.WHOOP_CLIENT_ID!,
      client_secret: env.WHOOP_CLIENT_SECRET!,
    };

    const tokenResponse = await fetch(authorizationServer.token_endpoint!, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(refreshRequest).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(
        `Token refresh failed: ${tokenResponse.status} - ${errorText}`,
      );
    }

    const tokens: unknown = await tokenResponse.json();

    if (typeof tokens !== "object" || tokens === null) {
      throw new Error("Unexpected token response shape");
    }
    const t = tokens as {
      access_token?: string;
      refresh_token?: string | null;
      expires_in?: number;
    };

    const expiresAt = t.expires_in
      ? new Date(Date.now() + t.expires_in * 1000)
      : null;

    // Update tokens in database
    await db
      .update(userIntegrations)
      .set({
        accessToken: t.access_token!,
        refreshToken: t.refresh_token ?? integration.refreshToken,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(userIntegrations.id, Number(integration.id)));

    return t.access_token!;
  }

  return integration.accessToken;
}

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit (use shared env presets)
    const rateLimit = await checkRateLimit(
      user.id,
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

    // Get user's Whoop integration
    const [integration] = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.user_id, user.id),
          eq(userIntegrations.provider, "whoop"),
          eq(userIntegrations.isActive, true),
        ),
      );

    if (!integration) {
      return NextResponse.json(
        { error: "Whoop integration not found" },
        { status: 404 },
      );
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(integration);

    // Fetch workouts from Whoop API (v2 endpoint) with pagination
    // Try to get more historical workouts by adding limit parameter
    const whoopResponse = await fetch(
      "https://api.prod.whoop.com/developer/v2/activity/workout?limit=25",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

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

    let newWorkouts = 0;
    let duplicates = 0;

    // Process each workout
    for (const workout of workouts) {
      try {
        // Check if workout already exists
        const [existingWorkout] = await db
          .select()
          .from(externalWorkoutsWhoop)
          .where(eq(externalWorkoutsWhoop.whoopWorkoutId, workout.id));

        if (existingWorkout) {
          duplicates++;
          continue;
        }

        // Insert new workout
        await db.insert(externalWorkoutsWhoop).values({
          user_id: user.id,
          whoopWorkoutId: workout.id,
          start: new Date(workout.start),
          end: new Date(workout.end),
          timezone_offset: workout.timezone_offset,
          sport_name: workout.sport_name,
          score_state: workout.score_state,
          score: workout.score ?? null,
          during: workout.during ?? null,
          zone_duration: workout.zone_duration ?? null,
        });

        newWorkouts++;
      } catch (error) {
        console.error(`Error processing workout ${workout.id}:`, error);
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
