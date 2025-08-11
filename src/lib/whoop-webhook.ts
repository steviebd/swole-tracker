import crypto from "crypto";
import { env } from "~/env";
import { logger } from "~/lib/logger";

export interface WhoopWebhookPayload {
  user_id: number;
  id: string | number; // UUID for v2, integer for v1
  type: string;
  trace_id: string;
}

/**
 * Verifies that a webhook request is legitimate by validating the signature
 * @param payload - Raw request body as string
 * @param signature - X-WHOOP-Signature header value
 * @param timestamp - X-WHOOP-Signature-Timestamp header value
 * @returns boolean indicating if the signature is valid
 */
export function verifyWhoopWebhook(
  payload: string,
  signature: string,
  timestamp: string,
): boolean {
  if (!env.WHOOP_WEBHOOK_SECRET) {
    logger.error("WHOOP_WEBHOOK_SECRET not configured");
    return false;
  }

  try {
    // Create the message to sign: timestamp + raw request body
    const message = timestamp + payload;

    // Generate HMAC-SHA256 signature
    const hmac = crypto.createHmac("sha256", env.WHOOP_WEBHOOK_SECRET);
    hmac.update(message, "utf8");

    // Base64 encode the signature
    const calculatedSignature = hmac.digest("base64");

    // Compare signatures using constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature, "base64"),
      Buffer.from(calculatedSignature, "base64"),
    );
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
