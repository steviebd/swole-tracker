import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import crypto from "crypto";

/**
 * WorkOS Webhook Handler for User Profile Synchronization
 * 
 * This endpoint receives WorkOS webhook events for user.created and user.updated
 * and synchronizes user profile data with the Convex database.
 * 
 * Security:
 * - Verifies WorkOS webhook signature using the WORKOS_WEBHOOK_SECRET
 * - Uses internalMutation to prevent direct client access to user sync logic
 * - Includes comprehensive error handling and logging
 * 
 * Supported Events:
 * - user.created: Creates a new user record in Convex
 * - user.updated: Updates existing user profile information
 */

// Initialize Convex client for server-side operations
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// WorkOS webhook signature verification
function verifyWorkOSSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // WorkOS uses HMAC-SHA256 with format: t=timestamp,v1=signature
    const elements = signature.split(",");
    const timestamp = elements.find((el) => el.startsWith("t="))?.replace("t=", "");
    const webhookSignature = elements.find((el) => el.startsWith("v1="))?.replace("v1=", "");

    if (!timestamp || !webhookSignature) {
      console.error("Invalid signature format");
      return false;
    }

    // Create expected signature
    const payloadWithTimestamp = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadWithTimestamp, "utf8")
      .digest("hex");

    // Compare signatures using constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(webhookSignature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (error) {
    console.error("Error verifying WorkOS signature:", error);
    return false;
  }
}

// Rate limiting for webhook endpoints
const WEBHOOK_RATE_LIMIT = 100; // Max 100 requests per minute
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const windowStart = Math.floor(now / 60000) * 60000; // 1-minute windows
  
  const current = rateLimitMap.get(clientIP);
  if (!current || current.resetTime !== windowStart) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: windowStart });
    return true;
  }
  
  if (current.count >= WEBHOOK_RATE_LIMIT) {
    return false;
  }
  
  current.count++;
  return true;
}

// WorkOS webhook event types we handle
interface WorkOSUser {
  object: "user";
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  email_verified: boolean;
  profile_picture_url?: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkOSWebhookEvent {
  id: string;
  data: {
    user: WorkOSUser;
  };
  event: "user.created" | "user.updated";
  created_at: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = request.headers.get("x-forwarded-for")?.split(",")[0] || 
                     request.headers.get("x-real-ip") || 
                     "unknown";

    // Apply rate limiting
    if (!checkRateLimit(clientIP)) {
      console.warn(`WorkOS webhook rate limit exceeded for IP: ${clientIP}`);
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // Get the webhook secret from environment
    const webhookSecret = process.env.WORKOS_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("WORKOS_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    // Get request body and signature
    const body = await request.text();
    const signature = request.headers.get("workos-signature");

    if (!signature) {
      console.error("Missing WorkOS signature header");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    if (!verifyWorkOSSignature(body, signature, webhookSecret)) {
      console.error("Invalid WorkOS webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    let event: WorkOSWebhookEvent;
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      console.error("Failed to parse WorkOS webhook payload:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Validate event structure
    if (!event.event || !event.data?.user) {
      console.error("Invalid WorkOS webhook event structure");
      return NextResponse.json(
        { error: "Invalid event structure" },
        { status: 400 }
      );
    }

    // Only handle user.created and user.updated events
    if (!["user.created", "user.updated"].includes(event.event)) {
      console.log(`Ignoring WorkOS webhook event: ${event.event}`);
      return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    }

    const user = event.data.user;

    // Validate required user fields
    if (!user.id || !user.email) {
      console.error("Missing required user fields in WorkOS webhook");
      return NextResponse.json(
        { error: "Missing required user fields" },
        { status: 400 }
      );
    }

    console.log(`Processing WorkOS ${event.event} event for user: ${user.email}`);

    // Sync user data with Convex using the internal mutation
    try {
      await convex.mutation(api.users.ensure, {
        workosId: user.id,
        email: user.email,
        firstName: user.first_name || undefined,
        lastName: user.last_name || undefined,
      });

      console.log(`Successfully synced user ${user.email} from WorkOS webhook`);

      // Log the webhook event for audit purposes (optional)
      // This could be expanded to use the webhookEvents table for debugging
      
      return NextResponse.json(
        { 
          message: "User synchronized successfully",
          userId: user.id,
          event: event.event
        },
        { status: 200 }
      );

    } catch (convexError) {
      console.error("Failed to sync user with Convex:", convexError);
      
      // Return 500 to trigger WorkOS retry logic
      return NextResponse.json(
        { error: "Database sync failed" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Unexpected error in WorkOS webhook handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check endpoint for WorkOS webhook configuration
export async function GET() {
  return NextResponse.json({
    service: "WorkOS webhook handler",
    status: "healthy",
    timestamp: new Date().toISOString(),
    endpoints: ["user.created", "user.updated"],
  });
}