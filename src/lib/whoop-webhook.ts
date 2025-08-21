import { env } from "~/env";
import { logger } from "~/lib/logger";

export interface WhoopWebhookPayload {
  user_id: number;
  id: string; // UUID for v2 API events
  type: WhoopWebhookEventType;
  trace_id: string;
}

export type WhoopWebhookEventType = 
  | "workout.updated"
  | "recovery.updated" 
  | "sleep.updated"
  | "cycle.updated"
  | "body_measurement.updated"
  | "user_profile.updated";

/**
 * Constant-time comparison for buffers using Web Crypto API
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i]! ^ b[i]!;
  }
  
  return result === 0;
}

/**
 * Verifies that a webhook request is legitimate by validating the signature
 * @param payload - Raw request body as string
 * @param signature - X-WHOOP-Signature header value
 * @param timestamp - X-WHOOP-Signature-Timestamp header value
 * @returns boolean indicating if the signature is valid
 */
export async function verifyWhoopWebhook(
  payload: string,
  signature: string,
  timestamp: string,
): Promise<boolean> {
  if (!env.WHOOP_WEBHOOK_SECRET) {
    logger.error("WHOOP_WEBHOOK_SECRET not configured");
    return false;
  }

  try {
    // Create the message to sign: timestamp + raw request body
    const message = timestamp + payload;
    const encoder = new TextEncoder();

    // Import the secret key for HMAC
    const key = await globalThis.crypto.subtle.importKey(
      "raw",
      encoder.encode(env.WHOOP_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Generate HMAC-SHA256 signature
    const signatureBuffer = await globalThis.crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(message)
    );

    // Base64 encode the signature
    const calculatedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    // Convert base64 strings to Uint8Arrays for timing-safe comparison
    const providedSigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    const calculatedSigBytes = Uint8Array.from(atob(calculatedSignature), c => c.charCodeAt(0));

    // Compare signatures using constant-time comparison
    return timingSafeEqual(providedSigBytes, calculatedSigBytes);
  } catch (error) {
    logger.error("Error verifying webhook signature", error);
    return false;
  }
}

/**
 * Validates webhook headers and extracts signature information
 * @param headers - Request headers
 * @returns Object with signature and timestamp, or null if invalid
 */
export function extractWebhookHeaders(headers: Headers) {
  const signature = headers.get("X-WHOOP-Signature");
  const timestamp = headers.get("X-WHOOP-Signature-Timestamp");

  if (!signature || !timestamp) {
    logger.warn("Missing required webhook headers");
    return null;
  }

  // Validate timestamp (should be within last 5 minutes to prevent replay attacks)
  const timestampMs = parseInt(timestamp, 10);
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  if (timestampMs < fiveMinutesAgo || timestampMs > now) {
    logger.warn("Webhook timestamp outside acceptable range", {
      timestamp,
      now,
      fiveMinutesAgo,
    });
    return null;
  }

  return { signature, timestamp };
}
