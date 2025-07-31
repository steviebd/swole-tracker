import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import * as oauth from "oauth4webapi";
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
  score?: any;
  during?: any;
  zone_duration?: any;
}

async function refreshTokenIfNeeded(integration: any) {
  // Check if token is expired or will expire in next 5 minutes
  const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
  const now = new Date();
  
  if (integration.expiresAt && new Date(integration.expiresAt).getTime() - now.getTime() < expiryBuffer) {
    if (!integration.refreshToken) {
      throw new Error("Access token expired and no refresh token available");
    }

    const authorizationServer: oauth.AuthorizationServer = {
      issuer: "https://api.prod.whoop.com",
      authorization_endpoint: "https://api.prod.whoop.com/oauth/oauth2/auth",
      token_endpoint: "https://api.prod.whoop.com/oauth/oauth2/token",
    };

    const client: oauth.Client = {
      client_id: env.WHOOP_CLIENT_ID!,
      client_secret: env.WHOOP_CLIENT_SECRET!,
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
        "Accept": "application/json",
      },
      body: new URLSearchParams(refreshRequest).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token refresh failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokens = await tokenResponse.json();

    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    // Update tokens in database
    await db
      .update(userIntegrations)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || integration.refreshToken,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(userIntegrations.id, integration.id));

    return tokens.access_token;
  }

  return integration.accessToken;
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(
      user.id,
      "whoop_sync",
      env.WHOOP_SYNC_RATE_LIMIT_PER_HOUR,
      60 * 60 * 1000 // 1 hour
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
            "X-RateLimit-Reset": Math.floor(rateLimit.resetTime.getTime() / 1000).toString(),
          }
        }
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
          eq(userIntegrations.isActive, true)
        )
      );

    if (!integration) {
      return NextResponse.json({ error: "Whoop integration not found" }, { status: 404 });
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(integration);

    // Fetch workouts from Whoop API (v2 endpoint) with pagination
    // Try to get more historical workouts by adding limit parameter
    const whoopResponse = await fetch("https://api.prod.whoop.com/developer/v2/activity/workout?limit=25", {
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
        { status: whoopResponse.status }
      );
    }

    const whoopData = await whoopResponse.json();
    console.log("Whoop API response structure:", {
      keys: Object.keys(whoopData),
      recordsLength: whoopData.records?.length,
      dataLength: whoopData.data?.length,
    });
    
    // v2 API might use 'data' instead of 'records'
    const workouts: WhoopWorkout[] = whoopData.data || whoopData.records || [];

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
          score: workout.score || null,
          during: workout.during || null,
          zone_duration: workout.zone_duration || null,
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
          "X-RateLimit-Reset": Math.floor(rateLimit.resetTime.getTime() / 1000).toString(),
        }
      }
    );
  } catch (error) {
    console.error("Sync workouts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync workouts" },
      { status: 500 }
    );
  }
}
