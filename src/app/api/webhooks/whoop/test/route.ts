import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { env } from "~/env";

/**
 * Test endpoint to simulate a Whoop webhook
 * This endpoint generates a proper webhook payload with valid signature
 * and sends it to our webhook endpoint for testing
 */
export async function POST(request: NextRequest) {
  try {
    // Check if webhook secret is configured
    if (!env.WHOOP_WEBHOOK_SECRET) {
      return NextResponse.json(
        {
          error:
            "WHOOP_WEBHOOK_SECRET not configured. Add it to your .env file to test webhooks.",
        },
        { status: 400 },
      );
    }

    // Get test parameters from request body
    const {
      userId,
      workoutId,
      eventType = "workout.updated",
    } = (await request.json()) as {
      userId?: number | string;
      workoutId?: string;
      eventType?: string;
    };

    // Create test webhook payload
    const testPayload = {
      user_id: userId ?? 12345,
      id: workoutId ?? "550e8400-e29b-41d4-a716-446655440000", // Test UUID
      type: eventType,
      trace_id: crypto.randomUUID(),
    };

    const payloadString = JSON.stringify(testPayload);
    const timestamp = Date.now().toString();

    // Generate valid webhook signature
    const message = timestamp + payloadString;
    const hmac = crypto.createHmac("sha256", env.WHOOP_WEBHOOK_SECRET);
    hmac.update(message, "utf8");
    const signature = hmac.digest("base64");

    // Get the webhook URL
    const baseUrl = request.nextUrl.origin;
    const webhookUrl = `${baseUrl}/api/webhooks/whoop`;

    console.log("🧪 Sending test webhook:", {
      url: webhookUrl,
      payload: testPayload,
      timestamp,
      signature: signature.substring(0, 10) + "...",
    });

    // Send the webhook to our endpoint
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WHOOP-Signature": signature,
        "X-WHOOP-Signature-Timestamp": timestamp,
      },
      body: payloadString,
    });

    const webhookResult = await webhookResponse.json();

    return NextResponse.json({
      success: true,
      message: "Test webhook sent successfully",
      testPayload,
      webhookResponse: {
        status: webhookResponse.status,
        data: webhookResult,
      },
      instructions: [
        "✅ Webhook was sent with proper signature",
        "📡 Check your server logs for processing details",
        "🔍 Check if workout data was updated in database",
        "⚠️ Note: This test uses a fake workout ID - real data won't be fetched from Whoop API",
      ],
    });
  } catch (error) {
    console.error("Test webhook error:", error);
    return NextResponse.json(
      {
        error: "Failed to send test webhook",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Whoop Webhook Test Endpoint",
    usage: "POST to this endpoint to simulate a Whoop webhook",
    example: {
      method: "POST",
      body: {
        userId: 12345,
        workoutId: "550e8400-e29b-41d4-a716-446655440000",
        eventType: "workout.updated",
      },
    },
  });
}
