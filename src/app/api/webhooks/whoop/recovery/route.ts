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
import { webhookEvents, whoopRecovery } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

interface WhoopRecoveryData {
  id: string;
  cycle_id?: string;
  score?: {
    recovery_score?: number;
    hrv_rmssd_milli?: number;
    hrv_rmssd_baseline?: number;
    resting_heart_rate?: number;
    resting_heart_rate_baseline?: number;
  };
  date?: string;
  timezone_offset?: string;
}

async function fetchRecoveryFromWhoop(
  db: ReturnType<typeof createDb>,
  recoveryId: string,
  whoopUserId: number,
  dbUserId: string | null,
  isTestMode: boolean,
): Promise<WhoopRecoveryData | null> {
  try {
    if (isTestMode) {
      console.log(
        `🧪 Test mode detected for recovery ${recoveryId} - creating mock recovery data`,
      );
      // Return mock recovery data for testing
      return {
        id: recoveryId,
        cycle_id: "test_cycle_123",
        score: {
          recovery_score: 75,
          hrv_rmssd_milli: 45.2,
          hrv_rmssd_baseline: 42.8,
          resting_heart_rate: 52,
          resting_heart_rate_baseline: 54,
        },
        date: new Date().toISOString().split("T")[0],
        timezone_offset: "-08:00",
      };
    }

    if (!dbUserId) {
      console.error(
        `No internal user mapping for WHOOP user ${whoopUserId} when fetching recovery ${recoveryId}`,
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

    // Fetch the specific recovery from Whoop API
    const response = await fetch(
      `https://api.prod.whoop.com/developer/v1/recovery/${recoveryId}`,
      {
        headers: {
          Authorization: `Bearer ${tokenResult.token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch recovery ${recoveryId} from Whoop API:`,
        response.status,
        await response.text(),
      );
      return null;
    }

    const recoveryData: unknown = await response.json();
    if (typeof recoveryData !== "object" || recoveryData === null) {
      console.error("Invalid recovery JSON for", recoveryId);
      return null;
    }

    // Runtime validation
    const obj = recoveryData as Record<string, unknown>;
    if (typeof obj.id === "string") {
      return obj as unknown as WhoopRecoveryData;
    }

    console.error(
      "Recovery data failed runtime validation in fetch",
      recoveryData,
    );
    return null;
  } catch (error) {
    console.error(
      `Error fetching recovery ${recoveryId} from Whoop API:`,
      error,
    );
    return null;
  }
}

async function processRecoveryUpdate(
  db: ReturnType<typeof createDb>,
  payload: WhoopWebhookPayload,
  dbUserId: string,
  isTestMode: boolean,
) {
  console.log(`Processing recovery update webhook:`, payload);

  try {
    const recoveryId = payload.id.toString();

    const recoveryData = await fetchRecoveryFromWhoop(
      db,
      recoveryId,
      payload.user_id,
      dbUserId,
      isTestMode,
    );
    if (!recoveryData) {
      console.error(`Could not fetch recovery data for ${recoveryId}`);
      return;
    }

    // Parse the date from the recovery data (ensure it's in YYYY-MM-DD format)
    const recoveryDateStr = recoveryData.date
      ? recoveryData.date
      : new Date().toISOString().split("T")[0]!;

    // Check if recovery already exists in our database
    const [existingRecovery] = await db
      .select()
      .from(whoopRecovery)
      .where(eq(whoopRecovery.whoop_recovery_id, recoveryId));

    if (existingRecovery) {
      // Update existing recovery
      console.log(
        `Updating existing recovery ${recoveryId} for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db
        .update(whoopRecovery)
        .set({
          cycle_id: recoveryData.cycle_id || null,
          date: new Date(recoveryDateStr),
          recovery_score: recoveryData.score?.recovery_score || null,
          hrv_rmssd_milli: recoveryData.score?.hrv_rmssd_milli || null,
          hrv_rmssd_baseline: recoveryData.score?.hrv_rmssd_baseline || null,
          resting_heart_rate: recoveryData.score?.resting_heart_rate || null,
          resting_heart_rate_baseline:
            recoveryData.score?.resting_heart_rate_baseline || null,
          raw_data: JSON.stringify(recoveryData),
          timezone_offset: recoveryData.timezone_offset || null,
          updatedAt: new Date(),
        })
        .where(eq(whoopRecovery.whoop_recovery_id, recoveryId));
    } else {
      // Insert new recovery
      console.log(
        `Inserting new recovery ${recoveryId} for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db.insert(whoopRecovery).values({
        user_id: dbUserId,
        whoop_recovery_id: recoveryId,
        cycle_id: recoveryData.cycle_id || null,
        date: new Date(recoveryDateStr),
        recovery_score: recoveryData.score?.recovery_score || null,
        hrv_rmssd_milli: recoveryData.score?.hrv_rmssd_milli || null,
        hrv_rmssd_baseline: recoveryData.score?.hrv_rmssd_baseline || null,
        resting_heart_rate: recoveryData.score?.resting_heart_rate || null,
        resting_heart_rate_baseline:
          recoveryData.score?.resting_heart_rate_baseline || null,
        raw_data: JSON.stringify(recoveryData),
        timezone_offset: recoveryData.timezone_offset || null,
      });
    }

    console.log(`Successfully processed recovery update for ${recoveryId}`);
  } catch (error) {
    console.error(`Error processing recovery update:`, error);
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

    console.log(`🎣 Received Whoop recovery webhook:`, {
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
        .values({
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
        })
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

    // Only process recovery.updated events
    if (payload.type === "recovery.updated") {
      await processRecoveryUpdate(db, payload, dbUserId, isTestMode);

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
        `✅ Successfully processed recovery.updated webhook for user ${payload.user_id}`,
      );
      return NextResponse.json({
        success: true,
        message: "Recovery updated successfully",
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
    console.error("❌ Recovery webhook processing error:", error);

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
    message: "Whoop recovery webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
