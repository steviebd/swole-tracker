import { NextRequest, NextResponse } from "next/server";
import { verifyWhoopWebhook, extractWebhookHeaders, type WhoopWebhookPayload } from "~/lib/whoop-webhook";
import { db } from "~/server/db";
import { externalWorkoutsWhoop, userIntegrations } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { env } from "~/env";

interface WhoopWorkoutData {
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

async function fetchWorkoutFromWhoop(workoutId: string, userId: number): Promise<WhoopWorkoutData | null> {
  try {
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

    const workoutData = await response.json();
    return workoutData;
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

    // Fetch the updated workout data from Whoop API
    const workoutData = await fetchWorkoutFromWhoop(workoutId, payload.user_id);
    if (!workoutData) {
      console.error(`Could not fetch workout data for ${workoutId}`);
      return;
    }

    // Check if workout already exists in our database
    const [existingWorkout] = await db
      .select()
      .from(externalWorkoutsWhoop)
      .where(eq(externalWorkoutsWhoop.whoopWorkoutId, workoutId));

    if (existingWorkout) {
      // Update existing workout
      console.log(`Updating existing workout ${workoutId} for user ${userId}`);
      await db
        .update(externalWorkoutsWhoop)
        .set({
          start: new Date(workoutData.start),
          end: new Date(workoutData.end),
          timezone_offset: workoutData.timezone_offset,
          sport_name: workoutData.sport_name,
          score_state: workoutData.score_state,
          score: workoutData.score || null,
          during: workoutData.during || null,
          zone_duration: workoutData.zone_duration || null,
          updatedAt: new Date(),
        })
        .where(eq(externalWorkoutsWhoop.whoopWorkoutId, workoutId));
    } else {
      // Insert new workout
      console.log(`Inserting new workout ${workoutId} for user ${userId}`);
      await db.insert(externalWorkoutsWhoop).values({
        user_id: userId,
        whoopWorkoutId: workoutId,
        start: new Date(workoutData.start),
        end: new Date(workoutData.end),
        timezone_offset: workoutData.timezone_offset,
        sport_name: workoutData.sport_name,
        score_state: workoutData.score_state,
        score: workoutData.score || null,
        during: workoutData.during || null,
        zone_duration: workoutData.zone_duration || null,
      });
    }

    console.log(`Successfully processed workout update for ${workoutId}`);
  } catch (error) {
    console.error(`Error processing workout update:`, error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract webhook headers
    const webhookHeaders = extractWebhookHeaders(request.headers);
    if (!webhookHeaders) {
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

    console.log(`Received Whoop webhook:`, payload);

    // Only process workout.updated events
    if (payload.type === "workout.updated") {
      await processWorkoutUpdate(payload);
      return NextResponse.json({ success: true, message: "Workout updated successfully" });
    } else {
      console.log(`Ignoring webhook event type: ${payload.type}`);
      return NextResponse.json({ success: true, message: "Event type not processed" });
    }

  } catch (error) {
    console.error("Webhook processing error:", error);
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
