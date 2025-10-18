import { timingSafeEqual } from "node:crypto";

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
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.WHOOP_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(message),
    );
    const calculatedSignature = Buffer.from(new Uint8Array(signatureBuffer));

    let providedSignature: Buffer;
    try {
      providedSignature = Buffer.from(signature, "base64");
    } catch (error) {
      logger.error("Failed to parse provided webhook signature", error);
      return false;
    }

    if (calculatedSignature.length !== providedSignature.length) {
      logger.warn("Webhook signature length mismatch", {
        calculatedLength: calculatedSignature.length,
        providedLength: providedSignature.length,
      });
      return false;
    }

    // Compare signatures using constant-time comparison to mitigate timing attacks
    return timingSafeEqual(calculatedSignature, providedSignature);
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
  const numericTimestamp = Number(timestamp);
  if (!Number.isFinite(numericTimestamp)) {
    logger.warn("Webhook timestamp is not a valid number", { timestamp });
    return null;
  }

  const timestampMs =
    numericTimestamp < 1_000_000_000_000
      ? numericTimestamp * 1000
      : numericTimestamp;
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
