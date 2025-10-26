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
import { createDb, getD1Binding } from "~/server/db";
import { webhookEvents, whoopSleep } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

class WebhookProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookProcessingError";
  }
}

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
    sleep_consistency_percentage?: number;
    sleep_needed?: {
      baseline_milli?: number;
      need_from_sleep_debt_milli?: number;
      need_from_recent_strain_milli?: number;
      need_from_recent_nap_milli?: number;
    };
  };
}

async function fetchSleepFromWhoop(
  db: ReturnType<typeof createDb>,
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
          sleep_consistency_percentage: 88,
          sleep_needed: {
            baseline_milli: 7 * 60 * 60 * 1000,
            need_from_sleep_debt_milli: 15 * 60 * 1000,
            need_from_recent_strain_milli: 20 * 60 * 1000,
            need_from_recent_nap_milli: 5 * 60 * 1000,
          },
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

    const tokenResult = await getValidAccessToken(db, dbUserId, "whoop");

    if (!tokenResult.token) {
      console.error(
        `No valid Whoop token found for user ${dbUserId}: ${tokenResult.error}`,
      );
      return null;
    }

    // Fetch the specific sleep from Whoop API
    const response = await fetch(
      `https://api.prod.whoop.com/developer/v2/activity/sleep/${sleepId}`,
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
  db: ReturnType<typeof createDb>,
  payload: WhoopWebhookPayload,
  dbUserId: string,
  isTestMode: boolean,
) {
  console.log(`Processing sleep update webhook:`, payload);

  try {
    const sleepId = payload.id.toString();

    const sleepData = await fetchSleepFromWhoop(
      db,
      sleepId,
      payload.user_id,
      dbUserId,
      isTestMode,
    );
    if (!sleepData) {
      throw new WebhookProcessingError(
        `Could not fetch sleep data for ${sleepId}`,
      );
    }

    // Check if sleep already exists in our database
    const [existingSleep] = await db
      .select()
      .from(whoopSleep)
      .where(eq(whoopSleep.whoop_sleep_id, sleepId));

    const stageSum = sleepData.score?.stage_summary;
    const sleepNeed = sleepData.score?.sleep_needed;
    const sleepConsistency = sleepData.score?.sleep_consistency_percentage;

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
          sleep_latency_milli: stageSum?.sleep_latency_milli || null,
          sleep_consistency_percentage: sleepConsistency || null,
          sleep_need_baseline_milli: sleepNeed?.baseline_milli || null,
          sleep_need_from_sleep_debt_milli:
            sleepNeed?.need_from_sleep_debt_milli || null,
          sleep_need_from_recent_strain_milli:
            sleepNeed?.need_from_recent_strain_milli || null,
          sleep_need_from_recent_nap_milli:
            sleepNeed?.need_from_recent_nap_milli || null,
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
          sleep_consistency_percentage: sleepConsistency || null,
          sleep_need_baseline_milli: sleepNeed?.baseline_milli || null,
          sleep_need_from_sleep_debt_milli:
            sleepNeed?.need_from_sleep_debt_milli || null,
          sleep_need_from_recent_strain_milli:
            sleepNeed?.need_from_recent_strain_milli || null,
          sleep_need_from_recent_nap_milli:
            sleepNeed?.need_from_recent_nap_milli || null,
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
  const db = createDb(getD1Binding());
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
      : await resolveWhoopInternalUserId(db, payload.user_id.toString());

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
              status: "failed",
              error: message,
              processingTime: Date.now() - startTime,
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

    // Only process supported sleep events
    if (payload.type === "sleep.updated" || payload.type === "sleep.created") {
      await processSleepUpdate(db, payload, dbUserId, isTestMode);

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
        `✅ Successfully processed ${payload.type} webhook for user ${payload.user_id}`,
      );
      return NextResponse.json({
        success: true,
        message: "Sleep event processed successfully",
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

    const isProcessingError = error instanceof WebhookProcessingError;
    const status = isProcessingError ? 202 : 500;
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status });
  }
}

// Handle GET requests for webhook verification
export async function GET() {
  return NextResponse.json({
    message: "Whoop sleep webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
