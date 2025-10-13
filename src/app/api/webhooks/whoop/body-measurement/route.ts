import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  verifyWhoopWebhook,
  extractWebhookHeaders,
  type WhoopWebhookPayload,
} from "~/lib/whoop-webhook";
import { db } from "~/server/db";
import { webhookEvents, whoopBodyMeasurement } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { getValidAccessToken } from "~/lib/token-rotation";
import {
  getTestModeUserId,
  isWhoopTestUserId,
  resolveWhoopInternalUserId,
} from "~/lib/whoop-user";

export const runtime = "nodejs";

interface WhoopBodyMeasurementData {
  id: string;
  height_meter?: number;
  weight_kilogram?: number;
  max_heart_rate?: number;
  date?: string;
}

async function fetchBodyMeasurementFromWhoop(
  measurementId: string,
  whoopUserId: number,
  dbUserId: string | null,
  isTestMode: boolean,
): Promise<WhoopBodyMeasurementData | null> {
  try {
    if (isTestMode) {
      console.log(
        `🧪 Test mode detected for body measurement ${measurementId} - creating mock measurement data`,
      );
      // Return mock body measurement data for testing
      return {
        id: measurementId,
        height_meter: 1.75, // 5'9"
        weight_kilogram: 75.5, // 166 lbs
        max_heart_rate: 190,
        date: new Date().toISOString().split("T")[0],
      };
    }

    if (!dbUserId) {
      console.error(
        `No internal user mapping for WHOOP user ${whoopUserId} when fetching body measurement ${measurementId}`,
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

    // Fetch the specific body measurement from Whoop API
    const response = await fetch(
      `https://api.prod.whoop.com/developer/v1/user/measurement/body/${measurementId}`,
      {
        headers: {
          Authorization: `Bearer ${tokenResult.token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch body measurement ${measurementId} from Whoop API:`,
        response.status,
        await response.text(),
      );
      return null;
    }

    const measurementData: unknown = await response.json();
    if (typeof measurementData !== "object" || measurementData === null) {
      console.error("Invalid body measurement JSON for", measurementId);
      return null;
    }

    // Runtime validation
    const obj = measurementData as Record<string, unknown>;
    if (typeof obj.id === "string") {
      return obj as unknown as WhoopBodyMeasurementData;
    }

    console.error(
      "Body measurement data failed runtime validation in fetch",
      measurementData,
    );
    return null;
  } catch (error) {
    console.error(
      `Error fetching body measurement ${measurementId} from Whoop API:`,
      error,
    );
    return null;
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

    const measurementData = await fetchBodyMeasurementFromWhoop(
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

    // Parse the measurement date (ensure it's in YYYY-MM-DD format)
    const measurementDateStr = measurementData.date
      ? measurementData.date
      : new Date().toISOString().split("T")[0]!;

    // Check if body measurement already exists in our database
    const [existingMeasurement] = await db
      .select()
      .from(whoopBodyMeasurement)
      .where(eq(whoopBodyMeasurement.whoop_measurement_id, measurementId));

    if (existingMeasurement) {
      // Update existing body measurement
      console.log(
        `Updating existing body measurement ${measurementId} for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db
        .update(whoopBodyMeasurement)
        .set({
          height_meter: measurementData.height_meter || null,
          weight_kilogram: measurementData.weight_kilogram || null,
          max_heart_rate: measurementData.max_heart_rate || null,
          measurement_date: new Date(measurementDateStr),
          raw_data: JSON.stringify(measurementData),
          updatedAt: new Date(),
        })
        .where(eq(whoopBodyMeasurement.whoop_measurement_id, measurementId));
    } else {
      // Insert new body measurement
      console.log(
        `Inserting new body measurement ${measurementId} for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db.insert(whoopBodyMeasurement).values({
        user_id: dbUserId,
        whoop_measurement_id: measurementId,
        height_meter: measurementData.height_meter || null,
        weight_kilogram: measurementData.weight_kilogram || null,
        max_heart_rate: measurementData.max_heart_rate || null,
        measurement_date: new Date(measurementDateStr),
        raw_data: JSON.stringify(measurementData),
      });
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

    console.log(`🎣 Received Whoop body measurement webhook:`, {
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

    // Only process body_measurement.updated events
    if (payload.type === "body_measurement.updated") {
      await processBodyMeasurementUpdate(payload, dbUserId, isTestMode);

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
        `✅ Successfully processed body_measurement.updated webhook for user ${payload.user_id}`,
      );
      return NextResponse.json({
        success: true,
        message: "Body measurement updated successfully",
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
    console.error("❌ Body measurement webhook processing error:", error);

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
    message: "Whoop body measurement webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
