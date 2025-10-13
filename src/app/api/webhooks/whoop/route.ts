import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  verifyWhoopWebhook,
  extractWebhookHeaders,
  type WhoopWebhookPayload,
} from "~/lib/whoop-webhook";
import { db } from "~/server/db";
import {
  externalWorkoutsWhoop,
  webhookEvents,
  whoopRecovery,
  whoopSleep,
  whoopCycles,
  whoopBodyMeasurement,
} from "~/server/db/schema";
import { eq } from "drizzle-orm";

import { getValidAccessToken } from "~/lib/token-rotation";
import {
  getTestModeUserId,
  isWhoopTestUserId,
  resolveWhoopInternalUserId,
} from "~/lib/whoop-user";

export const runtime = "nodejs";

interface WhoopWorkoutData {
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

interface WhoopRecoveryData {
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

interface WhoopSleepData {
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

interface WhoopCycleData {
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

interface WhoopBodyMeasurementData {
  id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  height_meter: number;
  weight_kilogram: number;
  max_heart_rate: number;
}

// Generic function to fetch data from WHOOP API v2
async function fetchWhoopData<T>(
  endpoint: string,
  entityId: string,
  whoopUserId: number,
  dbUserId: string | null,
  isTestMode: boolean,
): Promise<T | null> {
  try {
    if (isTestMode) {
      console.log(
        `🧪 Test mode detected for ${endpoint}/${entityId} - skipping API call`,
      );
      return null;
    }

    if (!dbUserId) {
      console.error(
        `No internal user mapping for WHOOP user ${whoopUserId} while fetching ${endpoint}/${entityId}`,
      );
      return null;
    }

    const tokenResult = await getValidAccessToken(dbUserId, "whoop");

    if (!tokenResult.token) {
      console.error(
        `No valid Whoop token found for user ${dbUserId}: ${tokenResult.error}`,
      );
      return null;
    }

    const response = await fetch(
      `https://api.prod.whoop.com/developer/v2/${endpoint}/${entityId}`,
      {
        headers: {
          Authorization: `Bearer ${tokenResult.token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch ${endpoint}/${entityId} from WHOOP API:`,
        response.status,
        await response.text(),
      );
      return null;
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(
      `Error fetching ${endpoint}/${entityId} from WHOOP API:`,
      error,
    );
    return null;
  }
}

async function fetchWorkoutFromWhoop(
  workoutId: string,
  whoopUserId: number,
  dbUserId: string | null,
  isTestMode: boolean,
): Promise<WhoopWorkoutData | null> {
  if (isTestMode) {
    console.log(
      `🧪 Test mode detected for workout ${workoutId} - creating mock workout data`,
    );
    return {
      id: workoutId,
      start: new Date().toISOString(),
      end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      timezone_offset: "-08:00",
      sport_name: "🧪 TEST WORKOUT",
      score_state: "SCORED",
      score: { strain: 15.5 },
      during: { average_heart_rate: 145 },
      zone_duration: {
        zone_zero_milli: 0,
        zone_one_milli: 600000,
        zone_two_milli: 1800000,
        zone_three_milli: 1200000,
        zone_four_milli: 300000,
        zone_five_milli: 100000,
      },
    };
  }

  return await fetchWhoopData<WhoopWorkoutData>(
    "activity/workout",
    workoutId,
    whoopUserId,
    dbUserId,
    isTestMode,
  );
}

async function processWorkoutUpdate(
  payload: WhoopWebhookPayload,
  dbUserId: string,
  isTestMode: boolean,
) {
  console.log(`Processing workout update webhook:`, payload);

  try {
    const workoutId = payload.id.toString();

    const workoutData = await fetchWorkoutFromWhoop(
      workoutId,
      payload.user_id,
      dbUserId,
      isTestMode,
    );
    if (!workoutData) {
      console.error(`Could not fetch workout data for ${workoutId}`);
      return;
    }
    // Runtime shape guard to satisfy type checker
    const isWhoopWorkoutData = (w: unknown): w is WhoopWorkoutData => {
      if (typeof w !== "object" || w === null) return false;
      const o = w as Record<string, unknown>;
      return (
        typeof o.id === "string" &&
        typeof o.start === "string" &&
        typeof o.end === "string" &&
        typeof o.timezone_offset === "string" &&
        typeof o.sport_name === "string" &&
        typeof o.score_state === "string"
      );
    };
    if (!isWhoopWorkoutData(workoutData)) {
      console.error("Workout data failed runtime validation", workoutData);
      return;
    }

    // Check if workout already exists in our database
    const [existingWorkout] = await db
      .select()
      .from(externalWorkoutsWhoop)
      .where(eq(externalWorkoutsWhoop.whoopWorkoutId, workoutId));

    // workoutData already validated in fetch; treat as WhoopWorkoutData
    const typedWorkout: WhoopWorkoutData =
      workoutData as unknown as WhoopWorkoutData;

    if (existingWorkout) {
      // Update existing workout
      console.log(
        `Updating existing workout ${workoutId} for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db
        .update(externalWorkoutsWhoop)
        .set({
          start: new Date(typedWorkout.start),
          end: new Date(typedWorkout.end),
          timezone_offset: typedWorkout.timezone_offset,
          sport_name: typedWorkout.sport_name,
          score_state: typedWorkout.score_state,
          score: typedWorkout.score ? JSON.stringify(typedWorkout.score) : null,
          during: typedWorkout.during
            ? JSON.stringify(typedWorkout.during)
            : null,
          zone_duration: typedWorkout.zone_duration
            ? JSON.stringify(typedWorkout.zone_duration)
            : null,
          updatedAt: new Date(),
        })
        .where(eq(externalWorkoutsWhoop.whoopWorkoutId, workoutId));
    } else {
      // Insert new workout
      console.log(
        `Inserting new workout ${workoutId} for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db.insert(externalWorkoutsWhoop).values({
        user_id: dbUserId,
        whoopWorkoutId: workoutId,
        start: new Date(typedWorkout.start),
        end: new Date(typedWorkout.end),
        timezone_offset: typedWorkout.timezone_offset,
        sport_name: typedWorkout.sport_name,
        score_state: typedWorkout.score_state,
        score: typedWorkout.score ? JSON.stringify(typedWorkout.score) : null,
        during: typedWorkout.during
          ? JSON.stringify(typedWorkout.during)
          : null,
        zone_duration: typedWorkout.zone_duration
          ? JSON.stringify(typedWorkout.zone_duration)
          : null,
      });
    }

    console.log(`Successfully processed workout update for ${workoutId}`);
  } catch (error) {
    console.error(`Error processing workout update:`, error);
    throw error;
  }
}

async function processRecoveryUpdate(
  payload: WhoopWebhookPayload,
  dbUserId: string,
  isTestMode: boolean,
) {
  console.log(`Processing recovery update webhook:`, payload);

  try {
    const recoveryId = payload.id.toString();

    const recoveryData = await fetchWhoopData<WhoopRecoveryData>(
      "recovery",
      recoveryId,
      payload.user_id,
      dbUserId,
      isTestMode,
    );
    if (!recoveryData) {
      console.error(`Could not fetch recovery data for ${recoveryId}`);
      return;
    }

    // Check if recovery already exists
    const [existingRecovery] = await db
      .select()
      .from(whoopRecovery)
      .where(eq(whoopRecovery.whoop_recovery_id, recoveryId));

    const datePart =
      recoveryData.created_at.split("T")[0] ||
      new Date().toISOString().split("T")[0]!;

    if (existingRecovery) {
      // Update existing recovery
      console.log(
        `Updating existing recovery ${recoveryId} for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db
        .update(whoopRecovery)
        .set({
          cycle_id: recoveryData.cycle_id || null,
          date: new Date(datePart),
          recovery_score: recoveryData.score?.recovery_score || null,
          hrv_rmssd_milli: recoveryData.score?.hrv_rmssd_milli || null,
          hrv_rmssd_baseline: recoveryData.score?.hrv_baseline || null,
          resting_heart_rate:
            recoveryData.score?.resting_heart_rate_milli || null,
          resting_heart_rate_baseline: recoveryData.score?.hr_baseline || null,
          raw_data: JSON.stringify(recoveryData),
          updatedAt: new Date(),
        })
        .where(eq(whoopRecovery.whoop_recovery_id, recoveryId));
    } else {
      // Insert new recovery
      console.log(
        `Inserting new recovery ${recoveryId} for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db.insert(whoopRecovery).values([
        {
          user_id: dbUserId,
          whoop_recovery_id: recoveryId,
          cycle_id: recoveryData.cycle_id || null,
          date: new Date(datePart),
          recovery_score: recoveryData.score?.recovery_score || null,
          hrv_rmssd_milli: recoveryData.score?.hrv_rmssd_milli || null,
          hrv_rmssd_baseline: recoveryData.score?.hrv_baseline || null,
          resting_heart_rate:
            recoveryData.score?.resting_heart_rate_milli || null,
          resting_heart_rate_baseline: recoveryData.score?.hr_baseline || null,
          raw_data: JSON.stringify(recoveryData),
          timezone_offset: null,
        },
      ]);
    }

    console.log(`Successfully processed recovery update for ${recoveryId}`);
  } catch (error) {
    console.error(`Error processing recovery update:`, error);
    throw error;
  }
}

async function processSleepUpdate(
  payload: WhoopWebhookPayload,
  dbUserId: string,
  isTestMode: boolean,
) {
  console.log(`Processing sleep update webhook:`, payload);

  try {
    const sleepId = payload.id.toString();

    const sleepData = await fetchWhoopData<WhoopSleepData>(
      "activity/sleep",
      sleepId,
      payload.user_id,
      dbUserId,
      isTestMode,
    );
    if (!sleepData) {
      console.error(`Could not fetch sleep data for ${sleepId}`);
      return;
    }

    // Check if sleep already exists
    const [existingSleep] = await db
      .select()
      .from(whoopSleep)
      .where(eq(whoopSleep.whoop_sleep_id, sleepId));

    if (existingSleep) {
      // Update existing sleep
      console.log(
        `Updating existing sleep ${sleepId} for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db
        .update(whoopSleep)
        .set({
          start: new Date(sleepData.start),
          end: new Date(sleepData.end),
          timezone_offset: sleepData.timezone_offset || null,
          sleep_performance_percentage:
            sleepData.score?.sleep_performance_percentage || null,
          total_sleep_time_milli:
            sleepData.score?.stage_summary?.total_in_bed_time_milli || null,
          sleep_efficiency_percentage:
            sleepData.score?.sleep_efficiency_percentage || null,
          slow_wave_sleep_time_milli:
            sleepData.score?.stage_summary?.total_slow_wave_sleep_time_milli ||
            null,
          rem_sleep_time_milli:
            sleepData.score?.stage_summary?.total_rem_sleep_time_milli || null,
          light_sleep_time_milli:
            sleepData.score?.stage_summary?.total_light_sleep_time_milli ||
            null,
          wake_time_milli:
            sleepData.score?.stage_summary?.total_awake_time_milli || null,
          arousal_time_milli:
            sleepData.score?.stage_summary?.total_awake_time_milli || null,
          disturbance_count:
            sleepData.score?.stage_summary?.disturbance_count || null,
          raw_data: JSON.stringify(sleepData),
          updatedAt: new Date(),
        })
        .where(eq(whoopSleep.whoop_sleep_id, sleepId));
    } else {
      // Insert new sleep
      console.log(
        `Inserting new sleep ${sleepId} for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db.insert(whoopSleep).values([
        {
          user_id: dbUserId,
          whoop_sleep_id: sleepId,
          start: new Date(sleepData.start),
          end: new Date(sleepData.end),
          timezone_offset: sleepData.timezone_offset || null,
          sleep_performance_percentage:
            sleepData.score?.sleep_performance_percentage || null,
          total_sleep_time_milli:
            sleepData.score?.stage_summary?.total_in_bed_time_milli || null,
          sleep_efficiency_percentage:
            sleepData.score?.sleep_efficiency_percentage || null,
          slow_wave_sleep_time_milli:
            sleepData.score?.stage_summary?.total_slow_wave_sleep_time_milli ||
            null,
          rem_sleep_time_milli:
            sleepData.score?.stage_summary?.total_rem_sleep_time_milli || null,
          light_sleep_time_milli:
            sleepData.score?.stage_summary?.total_light_sleep_time_milli ||
            null,
          wake_time_milli:
            sleepData.score?.stage_summary?.total_awake_time_milli || null,
          arousal_time_milli:
            sleepData.score?.stage_summary?.total_awake_time_milli || null,
          disturbance_count:
            sleepData.score?.stage_summary?.disturbance_count || null,
          sleep_latency_milli: null,
          raw_data: JSON.stringify(sleepData),
        },
      ]);
    }

    console.log(`Successfully processed sleep update for ${sleepId}`);
  } catch (error) {
    console.error(`Error processing sleep update:`, error);
    throw error;
  }
}

async function processCycleUpdate(
  payload: WhoopWebhookPayload,
  dbUserId: string,
  isTestMode: boolean,
) {
  console.log(`Processing cycle update webhook:`, payload);

  try {
    const cycleId = payload.id.toString();

    const cycleData = await fetchWhoopData<WhoopCycleData>(
      "cycle",
      cycleId,
      payload.user_id,
      dbUserId,
      isTestMode,
    );
    if (!cycleData) {
      console.error(`Could not fetch cycle data for ${cycleId}`);
      return;
    }

    // Check if cycle already exists
    const [existingCycle] = await db
      .select()
      .from(whoopCycles)
      .where(eq(whoopCycles.whoop_cycle_id, cycleId));

    if (existingCycle) {
      // Update existing cycle
      console.log(
        `Updating existing cycle ${cycleId} for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db
        .update(whoopCycles)
        .set({
          start: new Date(cycleData.start),
          end: new Date(cycleData.end),
          timezone_offset: cycleData.timezone_offset || null,
          day_strain: cycleData.score?.strain || null,
          average_heart_rate: cycleData.score?.average_heart_rate || null,
          max_heart_rate: cycleData.score?.max_heart_rate || null,
          kilojoule: cycleData.score?.kilojoule || null,
          raw_data: JSON.stringify(cycleData),
          updatedAt: new Date(),
        })
        .where(eq(whoopCycles.whoop_cycle_id, cycleId));
    } else {
      // Insert new cycle
      console.log(
        `Inserting new cycle ${cycleId} for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db.insert(whoopCycles).values([
        {
          user_id: dbUserId,
          whoop_cycle_id: cycleId,
          start: new Date(cycleData.start),
          end: new Date(cycleData.end),
          timezone_offset: cycleData.timezone_offset || null,
          day_strain: cycleData.score?.strain || null,
          average_heart_rate: cycleData.score?.average_heart_rate || null,
          max_heart_rate: cycleData.score?.max_heart_rate || null,
          kilojoule: cycleData.score?.kilojoule || null,
          raw_data: JSON.stringify(cycleData),
        },
      ]);
    }

    console.log(`Successfully processed cycle update for ${cycleId}`);
  } catch (error) {
    console.error(`Error processing cycle update:`, error);
    throw error;
  }
}

async function processBodyMeasurementUpdate(
  payload: WhoopWebhookPayload,
  dbUserId: string,
  isTestMode: boolean,
) {
  console.log(`Processing body measurement update webhook:`, payload);

  try {
    const measurementId = payload.id.toString();

    const measurementData = await fetchWhoopData<WhoopBodyMeasurementData>(
      "user/measurement/body",
      measurementId,
      payload.user_id,
      dbUserId,
      isTestMode,
    );
    if (!measurementData) {
      console.error(
        `Could not fetch body measurement data for ${measurementId}`,
      );
      return;
    }

    // Check if measurement already exists
    const [existingMeasurement] = await db
      .select()
      .from(whoopBodyMeasurement)
      .where(eq(whoopBodyMeasurement.whoop_measurement_id, measurementId));

    const measurementDate =
      measurementData.created_at.split("T")[0] ||
      new Date().toISOString().split("T")[0]!;

    if (existingMeasurement) {
      // Update existing measurement
      console.log(
        `Updating existing measurement ${measurementId} for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db
        .update(whoopBodyMeasurement)
        .set({
          height_meter: measurementData.height_meter || null,
          weight_kilogram: measurementData.weight_kilogram || null,
          max_heart_rate: measurementData.max_heart_rate || null,
          measurement_date: new Date(measurementDate),
          raw_data: JSON.stringify(measurementData),
          updatedAt: new Date(),
        })
        .where(eq(whoopBodyMeasurement.whoop_measurement_id, measurementId));
    } else {
      // Insert new measurement
      console.log(
        `Inserting new measurement ${measurementId} for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db.insert(whoopBodyMeasurement).values([
        {
          user_id: dbUserId,
          whoop_measurement_id: measurementId,
          height_meter: measurementData.height_meter || null,
          weight_kilogram: measurementData.weight_kilogram || null,
          max_heart_rate: measurementData.max_heart_rate || null,
          measurement_date: new Date(measurementDate),
          raw_data: JSON.stringify(measurementData),
        },
      ]);
    }

    console.log(
      `Successfully processed body measurement update for ${measurementId}`,
    );
  } catch (error) {
    console.error(`Error processing body measurement update:`, error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let webhookEventId: number | null = null;

  try {
    // Extract webhook headers
    const webhookHeaders = extractWebhookHeaders(request.headers);
    if (!webhookHeaders) {
      console.error("Invalid webhook headers received");
      return NextResponse.json(
        { error: "Invalid webhook headers" },
        { status: 400 },
      );
    }

    // Get raw request body
    const rawBody = await request.text();

    // Verify webhook signature
    if (
      !(await verifyWhoopWebhook(
        rawBody,
        webhookHeaders.signature,
        webhookHeaders.timestamp,
      ))
    ) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse the payload
    let payload: WhoopWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error("Invalid JSON payload:", error);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    console.log(`🎣 Received Whoop webhook:`, {
      type: payload.type,
      userId: payload.user_id,
      entityId: payload.id,
      traceId: payload.trace_id,
      timestamp: new Date().toISOString(),
    });

    const isTestMode = isWhoopTestUserId(payload.user_id);
    const mappedUserId = isTestMode
      ? getTestModeUserId()
      : await resolveWhoopInternalUserId(payload.user_id.toString());

    // Log webhook event to database for debugging
    try {
      const [webhookEvent] = await db
        .insert(webhookEvents)
        .values([
          {
            provider: "whoop",
            eventType: payload.type,
            userId: mappedUserId ?? null,
            externalUserId: payload.user_id.toString(),
            externalEntityId: payload.id.toString(),
            payload: JSON.stringify(payload),
            headers: JSON.stringify({
              signature: webhookHeaders.signature,
              timestamp: webhookHeaders.timestamp,
              userAgent: request.headers.get("user-agent") ?? undefined,
              contentType: request.headers.get("content-type") ?? undefined,
            }),
            status: "received",
          },
        ])
        .returning({ id: webhookEvents.id });

      webhookEventId = webhookEvent?.id ?? null;
      console.log(`📝 Logged webhook event with ID: ${webhookEventId}`);
    } catch (dbError) {
      console.error("Failed to log webhook event to database:", dbError);
      // Continue processing even if logging fails
    }

    if (!isTestMode && !mappedUserId) {
      const message = `No internal user mapping for WHOOP user ${payload.user_id}`;
      console.error(message);

      if (webhookEventId) {
        try {
          await db
            .update(webhookEvents)
            .set({
              status: "pending_user_mapping",
              error: message,
              processedAt: new Date(),
            })
            .where(eq(webhookEvents.id, webhookEventId));
        } catch (statusError) {
          console.error(
            "Failed to update webhook event status while awaiting mapping:",
            statusError,
          );
        }
      }

      return NextResponse.json(
        {
          success: false,
          message,
        },
        { status: 202 },
      );
    }

    const dbUserId = mappedUserId ?? getTestModeUserId();

    // Process different webhook event types
    switch (payload.type) {
      case "workout.updated":
        await processWorkoutUpdate(payload, dbUserId, isTestMode);
        break;

      case "recovery.updated":
        await processRecoveryUpdate(payload, dbUserId, isTestMode);
        break;

      case "sleep.updated":
        await processSleepUpdate(payload, dbUserId, isTestMode);
        break;

      case "cycle.updated":
        await processCycleUpdate(payload, dbUserId, isTestMode);
        break;

      case "body_measurement.updated":
        await processBodyMeasurementUpdate(payload, dbUserId, isTestMode);
        break;

      case "user_profile.updated":
        // Profile updates are handled by the dedicated profile webhook endpoint
        // but we can also handle them here for completeness
        console.log(
          `📋 User profile update received for user ${payload.user_id}, entity ${payload.id}`,
        );
        break;

      default:
        // Update webhook event status for ignored events
        if (webhookEventId) {
          await db
            .update(webhookEvents)
            .set({
              status: "ignored",
              processingTime: Date.now() - startTime,
              processedAt: new Date(),
            })
            .where(eq(webhookEvents.id, webhookEventId));
        }

        console.log(`⏭️ Ignoring webhook event type: ${String(payload.type)}`);
        return NextResponse.json({
          success: true,
          message: "Event type not processed",
        });
    }

    // Update webhook event status for processed events
    if (webhookEventId) {
      await db
        .update(webhookEvents)
        .set({
          status: "processed",
          processingTime: Date.now() - startTime,
          processedAt: new Date(),
        })
        .where(eq(webhookEvents.id, webhookEventId));
    }

    console.log(
      `✅ Successfully processed ${payload.type} webhook for user ${payload.user_id}`,
    );
    return NextResponse.json({
      success: true,
      message: `${payload.type} processed successfully`,
    });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);

    // Update webhook event status for failed events
    if (webhookEventId) {
      try {
        await db
          .update(webhookEvents)
          .set({
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
            processingTime: Date.now() - startTime,
            processedAt: new Date(),
          })
          .where(eq(webhookEvents.id, webhookEventId));
      } catch (updateError) {
        console.error("Failed to update webhook event status:", updateError);
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Handle GET requests for webhook verification (some webhook providers require this)
export async function GET() {
  return NextResponse.json({
    message: "Whoop webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
