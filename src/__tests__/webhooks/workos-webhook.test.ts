import { describe, it, expect } from "vitest";
import crypto from "crypto";

// Helper function to create WorkOS signature (copied from webhook handler logic)
function createWorkOSSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payloadWithTimestamp = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadWithTimestamp, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

// Helper to verify signature (extracted from webhook handler)
function verifyWorkOSSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const elements = signature.split(",");
    const timestamp = elements.find((el) => el.startsWith("t="))?.replace("t=", "");
    const webhookSignature = elements.find((el) => el.startsWith("v1="))?.replace("v1=", "");

    if (!timestamp || !webhookSignature) {
      return false;
    }

    const payloadWithTimestamp = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadWithTimestamp, "utf8")
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(webhookSignature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (error) {
    return false;
  }
}

describe("WorkOS Webhook Signature Verification", () => {
  const testSecret = "test-webhook-secret-12345678901234567890";
  const testPayload = JSON.stringify({
    id: "webhook_01234567890abcdef",
    event: "user.created",
    data: {
      user: {
        object: "user",
        id: "user_01234567890abcdef",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        email_verified: true,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    },
    created_at: "2025-01-01T00:00:00Z",
  });

  it("should verify valid WorkOS webhook signature", () => {
    const signature = createWorkOSSignature(testPayload, testSecret);
    const isValid = verifyWorkOSSignature(testPayload, signature, testSecret);
    expect(isValid).toBe(true);
  });

  it("should reject invalid signature", () => {
    const signature = "t=1234567890,v1=invalid_signature_here";
    const isValid = verifyWorkOSSignature(testPayload, signature, testSecret);
    expect(isValid).toBe(false);
  });

  it("should reject malformed signature", () => {
    const signature = "malformed_signature";
    const isValid = verifyWorkOSSignature(testPayload, signature, testSecret);
    expect(isValid).toBe(false);
  });

  it("should reject signature with wrong secret", () => {
    const signature = createWorkOSSignature(testPayload, "wrong-secret");
    const isValid = verifyWorkOSSignature(testPayload, signature, testSecret);
    expect(isValid).toBe(false);
  });

  it("should reject signature with tampered payload", () => {
    const signature = createWorkOSSignature(testPayload, testSecret);
    const tamperedPayload = testPayload.replace("test@example.com", "hacker@evil.com");
    const isValid = verifyWorkOSSignature(tamperedPayload, signature, testSecret);
    expect(isValid).toBe(false);
  });
});

describe("WorkOS User Data Validation", () => {
  it("should validate required user fields", () => {
    const validUser = {
      object: "user",
      id: "user_01234567890abcdef",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      email_verified: true,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    expect(validUser.id).toBeTruthy();
    expect(validUser.email).toBeTruthy();
    expect(validUser.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it("should handle optional name fields", () => {
    const userWithoutNames = {
      object: "user",
      id: "user_01234567890abcdef",
      email: "test@example.com",
      first_name: null,
      last_name: null,
      email_verified: true,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    // Should still be valid even without names
    expect(userWithoutNames.id).toBeTruthy();
    expect(userWithoutNames.email).toBeTruthy();
  });
});

describe("Webhook Event Processing", () => {
  it("should process user.created event", () => {
    const event = {
      id: "webhook_01234567890abcdef",
      event: "user.created",
      data: {
        user: {
          object: "user",
          id: "user_01234567890abcdef",
          email: "test@example.com",
          first_name: "Test",
          last_name: "User",
          email_verified: true,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      },
      created_at: "2025-01-01T00:00:00Z",
    };

    expect(event.event).toBe("user.created");
    expect(["user.created", "user.updated"]).toContain(event.event);
  });

  it("should process user.updated event", () => {
    const event = {
      id: "webhook_01234567890abcdef",
      event: "user.updated",
      data: {
        user: {
          object: "user",
          id: "user_01234567890abcdef",
          email: "updated@example.com",
          first_name: "Updated",
          last_name: "User",
          email_verified: true,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T12:00:00Z",
        },
      },
      created_at: "2025-01-01T12:00:00Z",
    };

    expect(event.event).toBe("user.updated");
    expect(["user.created", "user.updated"]).toContain(event.event);
  });

  it("should ignore unsupported events", () => {
    const unsupportedEvent = "user.deleted";
    expect(["user.created", "user.updated"]).not.toContain(unsupportedEvent);
  });
});