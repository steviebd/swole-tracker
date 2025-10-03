import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  verifyWhoopWebhook,
  extractWebhookHeaders,
  type WhoopWebhookPayload,
} from "~/lib/whoop-webhook";
import { db } from "~/server/db";
import { webhookEvents, whoopProfile } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { getValidAccessToken } from "~/lib/token-rotation";

interface WhoopProfileData {
  user_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

async function fetchProfileFromWhoop(
  userId: number,
): Promise<WhoopProfileData | null> {
  try {
    // Check if this is a test webhook (user_id: 12345)
    if (userId === 12345) {
      console.log(
        `🧪 Test mode detected for profile ${userId} - creating mock profile data`,
      );
      // Return mock profile data for testing
      return {
        user_id: userId.toString(),
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
      };
    }

    // Get valid access token (handles decryption and rotation automatically)
    const tokenResult = await getValidAccessToken(userId.toString(), "whoop");

    if (!tokenResult.token) {
      console.error(
        `No valid Whoop token found for user ${userId}: ${tokenResult.error}`,
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

async function processProfileUpdate(payload: WhoopWebhookPayload) {
  console.log(`Processing profile update webhook:`, payload);

  try {
    // Convert Whoop user_id to string to match our user_id format
    const userId = payload.user_id.toString();
    const whoopUserId = payload.id.toString();

    // For test webhooks (user_id: 12345), use a placeholder user ID
    const isTestMode = payload.user_id === 12345;
    const dbUserId = isTestMode ? "TEST_USER_12345" : userId;

    // Fetch the updated profile data from Whoop API
    const profileData = await fetchProfileFromWhoop(payload.user_id);
    if (!profileData) {
      console.error(`Could not fetch profile data for user ${payload.user_id}`);
      return;
    }

    // Check if profile already exists in our database
    const [existingProfile] = await db
      .select()
      .from(whoopProfile)
      .where(eq(whoopProfile.user_id, dbUserId));

    if (existingProfile) {
      // Update existing profile
      console.log(
        `Updating existing profile for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db
        .update(whoopProfile)
        .set({
          whoop_user_id: whoopUserId,
          email: profileData.email || null,
          first_name: profileData.first_name || null,
          last_name: profileData.last_name || null,
          raw_data: JSON.stringify(profileData),
          last_updated: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(whoopProfile.user_id, dbUserId));
    } else {
      // Insert new profile
      console.log(
        `Inserting new profile for user ${dbUserId}${isTestMode ? " (TEST MODE)" : ""}`,
      );
      await db.insert(whoopProfile).values({
        user_id: dbUserId,
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
      !verifyWhoopWebhook(
        rawBody,
        webhookHeaders.signature,
        webhookHeaders.timestamp,
      )
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

    // Log webhook event to database for debugging
    try {
      const [webhookEvent] = await db
        .insert(webhookEvents)
        .values({
          provider: "whoop",
          eventType: payload.type,
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

    // Only process user_profile.updated events
    if (payload.type === "user_profile.updated") {
      await processProfileUpdate(payload);

      // Update webhook event status
      if (webhookEventId) {
        await db
          .update(webhookEvents)
          .set({
            status: "processed",
            processingTime: Date.now() - startTime,
            processedAt: new Date().toISOString(),
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
            processedAt: new Date().toISOString(),
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
            processedAt: new Date().toISOString(),
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
