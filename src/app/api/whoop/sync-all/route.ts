import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "~/lib/supabase-server";
import type * as oauth from "oauth4webapi";
import { db } from "~/server/db";
import { 
  userIntegrations, 
  externalWorkoutsWhoop,
  whoopRecovery,
  whoopCycles,
  whoopSleep,
  whoopProfile,
  whoopBodyMeasurement
} from "~/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
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

interface WhoopRecovery {
  id: string;
  cycle_id: string;
  sleep_id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: string;
  score: {
    recovery_score: number;
    hrv_rmssd_milli: number;
    resting_heart_rate_milli: number;
    hr_baseline: number;
    hrv_baseline: number;
  };
}

interface WhoopCycle {
  id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  score_state: string;
  score: {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
    kilojoule: number;
    percent_recorded: number;
    distance_meter: number;
    altitude_gain_meter: number;
    altitude_change_meter: number;
    zone_duration: {
      zone_zero_milli: number;
      zone_one_milli: number;
      zone_two_milli: number;
      zone_three_milli: number;
      zone_four_milli: number;
      zone_five_milli: number;
    };
  };
}

interface WhoopSleep {
  id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  nap: boolean;
  score_state: string;
  score: {
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_no_data_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
      sleep_cycle_count: number;
      disturbance_count: number;
    };
    sleep_needed: {
      baseline_milli: number;
      need_from_sleep_debt_milli: number;
      need_from_recent_strain_milli: number;
      need_from_recent_nap_milli: number;
    };
    respiratory_rate: number;
    sleep_performance_percentage: number;
    sleep_consistency_percentage: number;
    sleep_efficiency_percentage: number;
  };
}

interface WhoopProfile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
}

interface WhoopBodyMeasurement {
  id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  height_meter: number;
  weight_kilogram: number;
  max_heart_rate: number;
}

type IntegrationRecord = {
  id: number;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | Date | null;
};

async function refreshTokenIfNeeded(integration: IntegrationRecord) {
  const expiryBuffer = 5 * 60 * 1000; // 5 minutes
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

    const refreshRequest = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: integration.refreshToken,
        client_id: env.WHOOP_CLIENT_ID!,
        client_secret: env.WHOOP_CLIENT_SECRET!,
      }),
    };

    const response = await fetch(authorizationServer.token_endpoint!, refreshRequest);

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const tokens = await response.json();

    // Update integration with new tokens
    await db
      .update(userIntegrations)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || integration.refreshToken,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        updatedAt: new Date(),
      })
      .where(eq(userIntegrations.id, integration.id));

    return tokens.access_token;
  }

  return integration.accessToken;
}

async function fetchWhoopData<T>(
  endpoint: string,
  accessToken: string,
  limit: number = 25
): Promise<T[]> {
  const url = `https://api.prod.whoop.com/developer/v1/${endpoint}?limit=${limit}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`WHOOP API error for ${endpoint}: ${response.status}`);
  }

  const data = await response.json();
  return data.records || data || [];
}

async function syncWorkouts(userId: string, accessToken: string): Promise<number> {
  try {
    const workouts = await fetchWhoopData<WhoopWorkout>("activity/workout", accessToken, 25);
    
    if (workouts.length === 0) return 0;

    const existingWorkouts = await db
      .select({ whoopWorkoutId: externalWorkoutsWhoop.whoopWorkoutId })
      .from(externalWorkoutsWhoop)
      .where(
        and(
          eq(externalWorkoutsWhoop.user_id, userId),
          inArray(externalWorkoutsWhoop.whoopWorkoutId, workouts.map(w => w.id))
        )
      );

    const existingIds = new Set(existingWorkouts.map(w => w.whoopWorkoutId));
    const newWorkouts = workouts.filter(w => !existingIds.has(w.id));

    if (newWorkouts.length > 0) {
      await db.insert(externalWorkoutsWhoop).values(
        newWorkouts.map(workout => ({
          user_id: userId,
          whoopWorkoutId: workout.id,
          start: new Date(workout.start),
          end: new Date(workout.end),
          timezone_offset: workout.timezone_offset,
          sport_name: workout.sport_name,
          score_state: workout.score_state,
          score: workout.score,
          during: workout.during,
          zone_duration: workout.zone_duration,
        }))
      );
    }

    return newWorkouts.length;
  } catch (error) {
    console.error("Error syncing workouts:", error);
    throw error;
  }
}

async function syncRecovery(userId: string, accessToken: string): Promise<number> {
  try {
    const recoveries = await fetchWhoopData<WhoopRecovery>("recovery", accessToken, 25);
    
    if (recoveries.length === 0) return 0;

    const existingRecoveries = await db
      .select({ whoopRecoveryId: whoopRecovery.whoop_recovery_id })
      .from(whoopRecovery)
      .where(
        and(
          eq(whoopRecovery.user_id, userId),
          inArray(whoopRecovery.whoop_recovery_id, recoveries.map(r => r.id))
        )
      );

    const existingIds = new Set(existingRecoveries.map(r => r.whoopRecoveryId));
    const newRecoveries = recoveries.filter(r => !existingIds.has(r.id));

    if (newRecoveries.length > 0) {
      await db.insert(whoopRecovery).values(
        newRecoveries.map(recovery => {
          const date = recovery.created_at ? recovery.created_at.split('T')[0]! : new Date().toISOString().split('T')[0]!
          return {
            user_id: userId,
            whoop_recovery_id: recovery.id,
            cycle_id: recovery.cycle_id,
            date: date,
            recovery_score: recovery.score?.recovery_score,
            hrv_rmssd_milli: recovery.score?.hrv_rmssd_milli?.toString(),
            hrv_rmssd_baseline: recovery.score?.hrv_baseline?.toString(),
            resting_heart_rate: recovery.score?.resting_heart_rate_milli,
            resting_heart_rate_baseline: recovery.score?.hr_baseline,
            raw_data: recovery,
            timezone_offset: null,
          };
        })
      );
    }

    return newRecoveries.length;
  } catch (error) {
    console.error("Error syncing recovery:", error);
    throw error;
  }
}

async function syncCycles(userId: string, accessToken: string): Promise<number> {
  try {
    const cycles = await fetchWhoopData<WhoopCycle>("cycle", accessToken, 25);
    
    if (cycles.length === 0) return 0;

    const existingCycles = await db
      .select({ whoopCycleId: whoopCycles.whoop_cycle_id })
      .from(whoopCycles)
      .where(
        and(
          eq(whoopCycles.user_id, userId),
          inArray(whoopCycles.whoop_cycle_id, cycles.map(c => c.id))
        )
      );

    const existingIds = new Set(existingCycles.map(c => c.whoopCycleId));
    const newCycles = cycles.filter(c => !existingIds.has(c.id));

    if (newCycles.length > 0) {
      await db.insert(whoopCycles).values(
        newCycles.map(cycle => ({
          user_id: userId,
          whoop_cycle_id: cycle.id,
          start: new Date(cycle.start),
          end: new Date(cycle.end),
          timezone_offset: cycle.timezone_offset,
          day_strain: cycle.score?.strain?.toString(),
          average_heart_rate: cycle.score?.average_heart_rate,
          max_heart_rate: cycle.score?.max_heart_rate,
          kilojoule: cycle.score?.kilojoule?.toString(),
          raw_data: cycle,
        }))
      );
    }

    return newCycles.length;
  } catch (error) {
    console.error("Error syncing cycles:", error);
    throw error;
  }
}

async function syncSleep(userId: string, accessToken: string): Promise<number> {
  try {
    const sleeps = await fetchWhoopData<WhoopSleep>("activity/sleep", accessToken, 25);
    
    if (sleeps.length === 0) return 0;

    const existingSleeps = await db
      .select({ whoopSleepId: whoopSleep.whoop_sleep_id })
      .from(whoopSleep)
      .where(
        and(
          eq(whoopSleep.user_id, userId),
          inArray(whoopSleep.whoop_sleep_id, sleeps.map(s => s.id))
        )
      );

    const existingIds = new Set(existingSleeps.map(s => s.whoopSleepId));
    const newSleeps = sleeps.filter(s => !existingIds.has(s.id));

    if (newSleeps.length > 0) {
      await db.insert(whoopSleep).values(
        newSleeps.map(sleep => ({
          user_id: userId,
          whoop_sleep_id: sleep.id,
          start: new Date(sleep.start),
          end: new Date(sleep.end),
          timezone_offset: sleep.timezone_offset,
          sleep_performance_percentage: sleep.score?.sleep_performance_percentage,
          total_sleep_time_milli: sleep.score?.stage_summary?.total_in_bed_time_milli,
          sleep_efficiency_percentage: sleep.score?.sleep_efficiency_percentage?.toString(),
          slow_wave_sleep_time_milli: sleep.score?.stage_summary?.total_slow_wave_sleep_time_milli,
          rem_sleep_time_milli: sleep.score?.stage_summary?.total_rem_sleep_time_milli,
          light_sleep_time_milli: sleep.score?.stage_summary?.total_light_sleep_time_milli,
          wake_time_milli: sleep.score?.stage_summary?.total_awake_time_milli,
          arousal_time_milli: sleep.score?.stage_summary?.total_awake_time_milli, // Using awake as proxy
          disturbance_count: sleep.score?.stage_summary?.disturbance_count,
          sleep_latency_milli: null, // Not available in API data
          raw_data: sleep,
        }))
      );
    }

    return newSleeps.length;
  } catch (error) {
    console.error("Error syncing sleep:", error);
    throw error;
  }
}

async function syncProfile(userId: string, accessToken: string): Promise<number> {
  try {
    const response = await fetch("https://api.prod.whoop.com/developer/v1/user/profile/basic", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`WHOOP Profile API error: ${response.status}`);
    }

    const profile = await response.json() as WhoopProfile;
    
    // Check if profile already exists
    const existingProfile = await db
      .select()
      .from(whoopProfile)
      .where(eq(whoopProfile.user_id, userId))
      .limit(1);

    if (existingProfile.length > 0) {
      // Update existing profile
      await db
        .update(whoopProfile)
        .set({
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          raw_data: profile,
          last_updated: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(whoopProfile.user_id, userId));
      return 0; // Updated, not new
    } else {
      // Insert new profile
      await db.insert(whoopProfile).values({
        user_id: userId,
        whoop_user_id: profile.user_id.toString(),
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        raw_data: profile,
      });
      return 1; // New profile
    }
  } catch (error) {
    console.error("Error syncing profile:", error);
    throw error;
  }
}

async function syncBodyMeasurements(userId: string, accessToken: string): Promise<number> {
  try {
    const measurements = await fetchWhoopData<WhoopBodyMeasurement>("user/measurement/body", accessToken, 25);
    
    if (measurements.length === 0) return 0;

    const existingMeasurements = await db
      .select({ whoopMeasurementId: whoopBodyMeasurement.whoop_measurement_id })
      .from(whoopBodyMeasurement)
      .where(
        and(
          eq(whoopBodyMeasurement.user_id, userId),
          inArray(whoopBodyMeasurement.whoop_measurement_id, measurements.map(m => m.id))
        )
      );

    const existingIds = new Set(existingMeasurements.map(m => m.whoopMeasurementId));
    const newMeasurements = measurements.filter(m => !existingIds.has(m.id));

    if (newMeasurements.length > 0) {
      await db.insert(whoopBodyMeasurement).values(
        newMeasurements.map(measurement => {
          const measurementDate = measurement.created_at ? measurement.created_at.split('T')[0]! : new Date().toISOString().split('T')[0]!;
          return {
            user_id: userId,
            whoop_measurement_id: measurement.id,
            height_meter: measurement.height_meter?.toString(),
            weight_kilogram: measurement.weight_kilogram?.toString(),
            max_heart_rate: measurement.max_heart_rate,
            measurement_date: measurementDate,
            raw_data: measurement,
          };
        })
      );
    }

    return newMeasurements.length;
  } catch (error) {
    console.error("Error syncing body measurements:", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limit (allow 10 requests per hour for comprehensive sync)
    const rateLimitResult = await checkRateLimit(user.id, "whoop_sync_all", 10, 60 * 60 * 1000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          resetTime: rateLimitResult.resetTime 
        },
        { status: 429 }
      );
    }

    // Get user's WHOOP integration
    const [integration] = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.user_id, user.id),
          eq(userIntegrations.provider, "whoop"),
          eq(userIntegrations.isActive, true)
        )
      )
      .limit(1);

    if (!integration) {
      return NextResponse.json(
        { error: "No active WHOOP integration found" },
        { status: 404 }
      );
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(integration);

    // Sync all data types
    const results = {
      workouts: 0,
      recovery: 0,
      cycles: 0,
      sleep: 0,
      profile: 0,
      bodyMeasurements: 0,
      errors: [] as string[],
    };

    // Sync each data type independently to prevent one failure from stopping others
    try {
      results.workouts = await syncWorkouts(user.id, accessToken);
    } catch (error) {
      results.errors.push(`Workouts: ${error}`);
    }

    try {
      results.recovery = await syncRecovery(user.id, accessToken);
    } catch (error) {
      results.errors.push(`Recovery: ${error}`);
    }

    try {
      results.cycles = await syncCycles(user.id, accessToken);
    } catch (error) {
      results.errors.push(`Cycles: ${error}`);
    }

    try {
      results.sleep = await syncSleep(user.id, accessToken);
    } catch (error) {
      results.errors.push(`Sleep: ${error}`);
    }

    try {
      results.profile = await syncProfile(user.id, accessToken);
    } catch (error) {
      results.errors.push(`Profile: ${error}`);
    }

    try {
      results.bodyMeasurements = await syncBodyMeasurements(user.id, accessToken);
    } catch (error) {
      results.errors.push(`Body Measurements: ${error}`);
    }

    const totalSynced = results.workouts + results.recovery + results.cycles + 
                       results.sleep + results.profile + results.bodyMeasurements;

    return NextResponse.json({
      success: true,
      synced: results,
      totalNewRecords: totalSynced,
      message: `Successfully synced ${totalSynced} new records across all data types`,
    });

  } catch (error) {
    console.error("Comprehensive WHOOP sync error:", error);
    return NextResponse.json(
      { error: "Internal server error during sync" },
      { status: 500 }
    );
  }
}