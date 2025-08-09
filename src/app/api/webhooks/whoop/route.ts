import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyWhoopWebhook, extractWebhookHeaders, type WhoopWebhookPayload } from "~/lib/whoop-webhook";
import { db } from "~/server/db";
import { externalWorkoutsWhoop, userIntegrations, webhookEvents } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { broadcastWorkoutUpdate } from "~/lib/sse-broadcast";

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

async function fetchWorkoutFromWhoop(workoutId: string, userId: number): Promise<WhoopWorkoutData | null> {
  try {
    // Check if this is a test webhook (user_id: 12345)
    if (userId === 12345) {
      console.log(`🧪 Test mode detected for workout ${workoutId} - creating mock workout data`);
      // Return mock workout data for testing
      return {
        id: workoutId,
        start: new Date().toISOString(),
        end: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour later
        timezone_offset: "-08:00",
        sport_name: "🧪 TEST WORKOUT",
        score_state: "SCORED",
        score: { strain: 15.5 },
        during: { average_heart_rate: 145 },
        zone_duration: { zone_zero_milli: 0, zone_one_milli: 600000, zone_two_milli: 1800000, zone_three_milli: 1200000, zone_four_milli: 300000, zone_five_milli: 100000 }
      };
    }

    // Get user's integration to fetch their access token
    const [integration] = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.user_id, userId.toString()),
          eq(userIntegrations.provider, "whoop"),
          eq(userIntegrations.isActive, true)
        )
      );

    if (!integration) {
      console.error(`No active Whoop integration found for user ${userId}`);
      return null;
    }

    // Fetch the specific workout from Whoop API
    const response = await fetch(`https://api.prod.whoop.com/developer/v2/activity/workout/${workoutId}`, {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch workout ${workoutId} from Whoop API:`, response.status, await response.text());
      return null;
    }

    const workoutData: unknown = await response.json();
    if (typeof workoutData !== "object" || workoutData === null) {
      console.error("Invalid workout JSON for", workoutId);
      return null;
    }
    // Narrow unknown via runtime validation here and return correctly typed value
    const obj = workoutData as Record<string, unknown>;
    if (
      typeof obj.id === "string" &&
      typeof obj.start === "string" &&
      typeof obj.end === "string" &&
      typeof obj.timezone_offset === "string" &&
      typeof obj.sport_name === "string" &&
      typeof obj.score_state === "string"
    ) {
      return (obj as unknown) as WhoopWorkoutData;
    }
    console.error("Workout data failed runtime validation in fetch", workoutData);
    return null;
  } catch (error) {
    console.error(`Error fetching workout ${workoutId} from Whoop API:`, error);
    return null;
  }
}

async function processWorkoutUpdate(payload: WhoopWebhookPayload) {
  console.log(`Processing workout update webhook:`, payload);

  try {
    // Convert Whoop user_id to string to match our user_id format
    const userId = payload.user_id.toString();
    const workoutId = payload.id.toString();
    
    // For test webhooks (user_id: 12345), use a placeholder user ID that exists in your system
    // You'll need to replace this with an actual user ID from your database
    const isTestMode = payload.user_id === 12345;
    const dbUserId = isTestMode ? "TEST_USER_12345" : userId;

    // Fetch the updated workout data from Whoop API
    const workoutData = await fetchWorkoutFromWhoop(workoutId, payload.user_id);
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
    const typedWorkout: WhoopWorkoutData = (workoutData as unknown) as WhoopWorkoutData;

    if (existingWorkout) {
      // Update existing workout
      console.log(`Updating existing workout ${workoutId} for user ${dbUserId}${isTestMode ? ' (TEST MODE)' : ''}`);
      await db
        .update(externalWorkoutsWhoop)
        .set({
          start: new Date(typedWorkout.start),
          end: new Date(typedWorkout.end),
          timezone_offset: typedWorkout.timezone_offset,
          sport_name: typedWorkout.sport_name,
          score_state: typedWorkout.score_state,
          score: typedWorkout.score ?? null,
          during: typedWorkout.during ?? null,
          zone_duration: typedWorkout.zone_duration ?? null,
          updatedAt: new Date(),
        })
        .where(eq(externalWorkoutsWhoop.whoopWorkoutId, workoutId));
    } else {
      // Insert new workout
      console.log(`Inserting new workout ${workoutId} for user ${dbUserId}${isTestMode ? ' (TEST MODE)' : ''}`);
      await db.insert(externalWorkoutsWhoop).values({
        user_id: dbUserId,
        whoopWorkoutId: workoutId,
        start: new Date(typedWorkout.start),
        end: new Date(typedWorkout.end),
        timezone_offset: typedWorkout.timezone_offset,
        sport_name: typedWorkout.sport_name,
        score_state: typedWorkout.score_state,
        score: typedWorkout.score ?? null,
        during: typedWorkout.during ?? null,
        zone_duration: typedWorkout.zone_duration ?? null,
      });
    }

    console.log(`Successfully processed workout update for ${workoutId}`);
    
    // Broadcast the update to connected clients for this user (skip for test mode since no real user to notify)
    if (!isTestMode) {
      try {
        await broadcastWorkoutUpdate(userId, {
          id: workoutId,
          type: payload.type,
          sport_name: typedWorkout.sport_name,
          start: typedWorkout.start,
          end: typedWorkout.end,
        });
      } catch (broadcastError) {
        console.error("Failed to broadcast workout update:", broadcastError);
        // Don't throw - the webhook processing was successful
      }
    }
  } catch (error) {
    console.error(`Error processing workout update:`, error);
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
      return NextResponse.json({ error: "Invalid webhook headers" }, { status: 400 });
    }

    // Get raw request body
    const rawBody = await request.text();
    
    // Verify webhook signature
    if (!verifyWhoopWebhook(rawBody, webhookHeaders.signature, webhookHeaders.timestamp)) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse the payload
    let payload: WhoopWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error("Invalid JSON payload:", error);
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    console.log(`🎣 Received Whoop webhook:`, {
      type: payload.type,
      userId: payload.user_id,
      entityId: payload.id,
      traceId: payload.trace_id,
      timestamp: new Date().toISOString()
    });

    // Log webhook event to database for debugging
    try {
      const [webhookEvent] = await db.insert(webhookEvents).values({
        provider: 'whoop',
        eventType: payload.type,
        externalUserId: payload.user_id.toString(),
        externalEntityId: payload.id.toString(),
        payload: payload as unknown, // stored as JSONB; cast to unknown for lint safety
        headers: {
          signature: webhookHeaders.signature,
          timestamp: webhookHeaders.timestamp,
          userAgent: request.headers.get('user-agent') ?? undefined,
          contentType: request.headers.get('content-type') ?? undefined,
        } as unknown, // JSONB payload; assert unknown to avoid any
        status: 'received',
      }).returning({ id: webhookEvents.id });

      webhookEventId = webhookEvent?.id ?? null;
      console.log(`📝 Logged webhook event with ID: ${webhookEventId}`);
    } catch (dbError) {
      console.error("Failed to log webhook event to database:", dbError);
      // Continue processing even if logging fails
    }

    // Only process workout.updated events
    if (payload.type === "workout.updated") {
      await processWorkoutUpdate(payload);
      
      // Update webhook event status
      if (webhookEventId) {
        await db.update(webhookEvents)
          .set({
            status: 'processed',
            processingTime: Date.now() - startTime,
            processedAt: new Date(),
          })
          .where(eq(webhookEvents.id, webhookEventId));
      }

      console.log(`✅ Successfully processed workout.updated webhook for user ${payload.user_id}`);
      return NextResponse.json({ success: true, message: "Workout updated successfully" });
    } else {
      // Update webhook event status for ignored events
      if (webhookEventId) {
        await db.update(webhookEvents)
          .set({
            status: 'ignored',
            processingTime: Date.now() - startTime,
            processedAt: new Date(),
          })
          .where(eq(webhookEvents.id, webhookEventId));
      }

      console.log(`⏭️ Ignoring webhook event type: ${payload.type}`);
      return NextResponse.json({ success: true, message: "Event type not processed" });
    }

  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    
    // Update webhook event status for failed events
    if (webhookEventId) {
      try {
        await db.update(webhookEvents)
          .set({
            status: 'failed',
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
      { status: 500 }
    );
  }
}

// Handle GET requests for webhook verification (some webhook providers require this)
export async function GET() {
  return NextResponse.json({ 
    message: "Whoop webhook endpoint is active",
    timestamp: new Date().toISOString()
  });
}
