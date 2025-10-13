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
import { webhookEvents, whoopCycles } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

interface WhoopCycleData {
  id: string;
  start?: string;
  end?: string;
  timezone_offset?: string;
  score?: {
    strain?: number;
    average_heart_rate?: number;
    max_heart_rate?: number;
    kilojoule?: number;
  };
}

async function fetchCycleFromWhoop(
  cycleId: string,
  whoopUserId: number,
  dbUserId: string | null,
  isTestMode: boolean,
): Promise<WhoopCycleData | null> {
  try {
    if (isTestMode) {
      console.log(
        `🧪 Test mode detected for cycle ${cycleId} - creating mock cycle data`,
      );
      // Return mock cycle data for testing
      return {
        id: cycleId,
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
        end: new Date().toISOString(),
        timezone_offset: "-08:00",
        score: {
          strain: 12.5,
          average_heart_rate: 72,
          max_heart_rate: 185,
          kilojoule: 2450.8,
        },
      };
    }

    if (!dbUserId) {
      console.error(
        `No internal user mapping for WHOOP user ${whoopUserId} when fetching cycle ${cycleId}`,
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

    // Fetch the specific cycle from Whoop API
    const response = await fetch(
      `https://api.prod.whoop.com/developer/v1/cycle/${cycleId}`,
      {
        headers: {
          Authorization: `Bearer ${tokenResult.token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch cycle ${cycleId} from Whoop API:`,
        response.status,
        await response.text(),
      );
      return null;
    }

    const cycleData: unknown = await response.json();
    if (typeof cycleData !== "object" || cycleData === null) {
      console.error("Invalid cycle JSON for", cycleId);
      return null;
    }

    // Runtime validation
    const obj = cycleData as Record<string, unknown>;
    if (typeof obj.id === "string") {
      return obj as unknown as WhoopCycleData;
    }

    console.error("Cycle data failed runtime validation in fetch", cycleData);
    return null;
  } catch (error) {
    console.error(`Error fetching cycle ${cycleId} from Whoop API:`, error);
    return null;
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

    const cycleData = await fetchCycleFromWhoop(
      cycleId,
      payload.user_id,
      dbUserId,
      isTestMode,
    );
    if (!cycleData) {
      console.error(`Could not fetch cycle data for ${cycleId}`);
      return;
    }

    // Check if cycle already exists in our database
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
          start: cycleData.start ? new Date(cycleData.start) : new Date(),
          end: cycleData.end ? new Date(cycleData.end) : new Date(),
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
      await db.insert(whoopCycles).values({
        user_id: dbUserId,
        whoop_cycle_id: cycleId,
        start: cycleData.start ? new Date(cycleData.start) : new Date(),
        end: cycleData.end ? new Date(cycleData.end) : new Date(),
        timezone_offset: cycleData.timezone_offset || null,
        day_strain: cycleData.score?.strain || null,
        average_heart_rate: cycleData.score?.average_heart_rate || null,
        max_heart_rate: cycleData.score?.max_heart_rate || null,
        kilojoule: cycleData.score?.kilojoule || null,
        raw_data: JSON.stringify(cycleData),
      });
    }

    console.log(`Successfully processed cycle update for ${cycleId}`);
  } catch (error) {
    console.error(`Error processing cycle update:`, error);
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

    console.log(`🎣 Received Whoop cycle webhook:`, {
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

    // Only process cycle.updated events
    if (payload.type === "cycle.updated") {
      await processCycleUpdate(payload, dbUserId, isTestMode);

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
        `✅ Successfully processed cycle.updated webhook for user ${payload.user_id}`,
      );
      return NextResponse.json({
        success: true,
        message: "Cycle updated successfully",
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
    console.error("❌ Cycle webhook processing error:", error);

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
    message: "Whoop cycle webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
