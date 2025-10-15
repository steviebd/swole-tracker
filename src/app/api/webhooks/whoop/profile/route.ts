import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  verifyWhoopWebhook,
  extractWebhookHeaders,
  type WhoopWebhookPayload,
} from "~/lib/whoop-webhook";
import { createDb, getD1Binding } from "~/server/db";
import { webhookEvents, whoopProfile } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { getValidAccessToken } from "~/lib/token-rotation";
import {
  getTestModeUserId,
  isWhoopTestUserId,
  resolveWhoopInternalUserId,
} from "~/lib/whoop-user";

export const runtime = "nodejs";

interface WhoopProfileData {
  user_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

async function fetchProfileFromWhoop(
  db: ReturnType<typeof createDb>,
  profileId: string,
  whoopUserId: number,
  dbUserId: string | null,
  isTestMode: boolean,
): Promise<WhoopProfileData | null> {
  try {
    if (isTestMode) {
      console.log(
        `🧪 Test mode detected for profile ${whoopUserId} - creating mock profile data`,
      );
      // Return mock profile data for testing
      return {
        user_id: whoopUserId.toString(),
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
      };
    }

    if (!dbUserId) {
      console.error(
        `No internal user mapping for WHOOP user ${whoopUserId} when fetching profile`,
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

    // Fetch profile from Whoop API
    const response = await fetch(
      `https://api.prod.whoop.com/developer/v1/user/profile/basic`,
      {
        headers: {
          Authorization: `Bearer ${tokenResult.token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch profile from Whoop API:`,
        response.status,
        await response.text(),
      );
      return null;
    }

    const profileData: unknown = await response.json();
    if (typeof profileData !== "object" || profileData === null) {
      console.error("Invalid profile JSON");
      return null;
    }

    // Runtime validation
    const obj = profileData as Record<string, unknown>;
    if (typeof obj.user_id === "string") {
      return obj as unknown as WhoopProfileData;
    }

    console.error(
      "Profile data failed runtime validation in fetch",
      profileData,
    );
    return null;
  } catch (error) {
    console.error(`Error fetching profile from Whoop API:`, error);
    return null;
  }
}

async function processProfileUpdate(
  db: ReturnType<typeof createDb>,
  payload: WhoopWebhookPayload,
  dbUserId: string,
  isTestMode: boolean,
) {
  console.log(`Processing profile update webhook:`, payload);

  try {
    const whoopUserId = payload.id.toString();

    // Fetch the updated profile data from Whoop API
    const profileData = await fetchProfileFromWhoop(
      db,
      whoopUserId,
      payload.user_id,
      dbUserId,
      isTestMode,
    );
    if (!profileData) {
      console.error(`Could not fetch profile data for user ${payload.user_id}`);
      return;
    }

    const targetUserId = dbUserId;

    // Check if profile already exists in our database
    const [existingProfile] = await db
      .select()
      .from(whoopProfile)
      .where(eq(whoopProfile.user_id, targetUserId));

    if (existingProfile) {
      // Update existing profile
      console.log(
        `Updating existing profile for user ${targetUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db
        .update(whoopProfile)
        .set({
          whoop_user_id: whoopUserId,
          email: profileData.email || null,
          first_name: profileData.first_name || null,
          last_name: profileData.last_name || null,
          raw_data: JSON.stringify(profileData),
          last_updated: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(whoopProfile.user_id, targetUserId));
    } else {
      // Insert new profile
      console.log(
        `Inserting new profile for user ${targetUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db.insert(whoopProfile).values({
        user_id: targetUserId,
        whoop_user_id: whoopUserId,
        email: profileData.email || null,
        first_name: profileData.first_name || null,
        last_name: profileData.last_name || null,
        raw_data: JSON.stringify(profileData),
      });
    }

    console.log(
      `Successfully processed profile update for user ${payload.user_id}`,
    );
  } catch (error) {
    console.error(`Error processing profile update:`, error);
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

    console.log(`🎣 Received Whoop profile webhook:`, {
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

    // Only process user_profile.updated events
    if (payload.type === "user_profile.updated") {
      await processProfileUpdate(db, payload, dbUserId, isTestMode);

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
        `✅ Successfully processed profile.updated webhook for user ${payload.user_id}`,
      );
      return NextResponse.json({
        success: true,
        message: "Profile updated successfully",
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
    console.error("❌ Profile webhook processing error:", error);

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
    message: "Whoop profile webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
