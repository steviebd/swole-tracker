import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  verifyWhoopWebhook,
  extractWebhookHeaders,
  type WhoopWebhookPayload,
} from "~/lib/whoop-webhook";
import { getValidAccessToken } from "~/lib/token-rotation";
import {
  getTestModeUserId,
  isWhoopTestUserId,
  resolveWhoopInternalUserId,
} from "~/lib/whoop-user";
import { db } from "~/server/db";
import { webhookEvents, whoopSleep } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

interface WhoopSleepData {
  id: string;
  start?: string;
  end?: string;
  timezone_offset?: string;
  score?: {
    stage_summary?: {
      total_sleep_time_milli?: number;
      sleep_efficiency_percentage?: number;
      slow_wave_sleep_time_milli?: number;
      rem_sleep_time_milli?: number;
      light_sleep_time_milli?: number;
      wake_time_milli?: number;
      arousal_time_milli?: number;
      disturbance_count?: number;
      sleep_latency_milli?: number;
    };
    sleep_performance_percentage?: number;
  };
}

async function fetchSleepFromWhoop(
  sleepId: string,
  whoopUserId: number,
  dbUserId: string | null,
  isTestMode: boolean,
): Promise<WhoopSleepData | null> {
  try {
    if (isTestMode) {
      console.log(
        `🧪 Test mode detected for sleep ${sleepId} - creating mock sleep data`,
      );
      // Return mock sleep data for testing
      return {
        id: sleepId,
        start: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
        end: new Date().toISOString(),
        timezone_offset: "-08:00",
        score: {
          sleep_performance_percentage: 85,
          stage_summary: {
            total_sleep_time_milli: 7.5 * 60 * 60 * 1000, // 7.5 hours
            sleep_efficiency_percentage: 92.5,
            slow_wave_sleep_time_milli: 1.2 * 60 * 60 * 1000, // 1.2 hours
            rem_sleep_time_milli: 1.8 * 60 * 60 * 1000, // 1.8 hours
            light_sleep_time_milli: 4.5 * 60 * 60 * 1000, // 4.5 hours
            wake_time_milli: 30 * 60 * 1000, // 30 minutes
            arousal_time_milli: 15 * 60 * 1000, // 15 minutes
            disturbance_count: 3,
            sleep_latency_milli: 12 * 60 * 1000, // 12 minutes
          },
        },
      };
    }

    if (!dbUserId) {
      console.error(
        `No internal user mapping for WHOOP user ${whoopUserId} when fetching sleep ${sleepId}`,
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

    // Fetch the specific sleep from Whoop API
    const response = await fetch(
      `https://api.prod.whoop.com/developer/v1/activity/sleep/${sleepId}`,
      {
        headers: {
          Authorization: `Bearer ${tokenResult.token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch sleep ${sleepId} from Whoop API:`,
        response.status,
        await response.text(),
      );
      return null;
    }

    const sleepData: unknown = await response.json();
    if (typeof sleepData !== "object" || sleepData === null) {
      console.error("Invalid sleep JSON for", sleepId);
      return null;
    }

    // Runtime validation
    const obj = sleepData as Record<string, unknown>;
    if (typeof obj.id === "string") {
      return obj as unknown as WhoopSleepData;
    }

    console.error("Sleep data failed runtime validation in fetch", sleepData);
    return null;
  } catch (error) {
    console.error(`Error fetching sleep ${sleepId} from Whoop API:`, error);
    return null;
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

    const sleepData = await fetchSleepFromWhoop(
      sleepId,
      payload.user_id,
      dbUserId,
      isTestMode,
    );
    if (!sleepData) {
      console.error(`Could not fetch sleep data for ${sleepId}`);
      return;
    }

    // Check if sleep already exists in our database
    const [existingSleep] = await db
      .select()
      .from(whoopSleep)
      .where(eq(whoopSleep.whoop_sleep_id, sleepId));

    const stageSum = sleepData.score?.stage_summary;

    if (existingSleep) {
      // Update existing sleep
      console.log(
        `Updating existing sleep ${sleepId} for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db
        .update(whoopSleep)
        .set({
          start: sleepData.start ? new Date(sleepData.start) : new Date(),
          end: sleepData.end ? new Date(sleepData.end) : new Date(),
          timezone_offset: sleepData.timezone_offset || null,
          sleep_performance_percentage:
            sleepData.score?.sleep_performance_percentage || null,
          total_sleep_time_milli: stageSum?.total_sleep_time_milli || null,
          sleep_efficiency_percentage:
            stageSum?.sleep_efficiency_percentage || null,
          slow_wave_sleep_time_milli:
            stageSum?.slow_wave_sleep_time_milli || null,
          rem_sleep_time_milli: stageSum?.rem_sleep_time_milli || null,
          light_sleep_time_milli: stageSum?.light_sleep_time_milli || null,
          wake_time_milli: stageSum?.wake_time_milli || null,
          arousal_time_milli: stageSum?.arousal_time_milli || null,
          disturbance_count: stageSum?.disturbance_count || null,
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
          start: sleepData.start ? new Date(sleepData.start) : new Date(),
          end: sleepData.end ? new Date(sleepData.end) : new Date(),
          timezone_offset: sleepData.timezone_offset || null,
          sleep_performance_percentage:
            sleepData.score?.sleep_performance_percentage || null,
          total_sleep_time_milli: stageSum?.total_sleep_time_milli || null,
          sleep_efficiency_percentage:
            stageSum?.sleep_efficiency_percentage || null,
          slow_wave_sleep_time_milli:
            stageSum?.slow_wave_sleep_time_milli || null,
          rem_sleep_time_milli: stageSum?.rem_sleep_time_milli || null,
          light_sleep_time_milli: stageSum?.light_sleep_time_milli || null,
          wake_time_milli: stageSum?.wake_time_milli || null,
          arousal_time_milli: stageSum?.arousal_time_milli || null,
          disturbance_count: stageSum?.disturbance_count || null,
          sleep_latency_milli: stageSum?.sleep_latency_milli || null,
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

    console.log(`🎣 Received Whoop sleep webhook:`, {
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

    // Only process sleep.updated events
    if (payload.type === "sleep.updated") {
      await processSleepUpdate(payload, dbUserId, isTestMode);

      // Update webhook event status
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
        `✅ Successfully processed sleep.updated webhook for user ${payload.user_id}`,
      );
      return NextResponse.json({
        success: true,
        message: "Sleep updated successfully",
      });
    } else {
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

      console.log(`⏭️ Ignoring webhook event type: ${payload.type}`);
      return NextResponse.json({
        success: true,
        message: "Event type not processed",
      });
    }
  } catch (error) {
    console.error("❌ Sleep webhook processing error:", error);

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

// Handle GET requests for webhook verification
export async function GET() {
  return NextResponse.json({
    message: "Whoop sleep webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
