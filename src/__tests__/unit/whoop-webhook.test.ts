import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyWhoopWebhook, extractWebhookHeaders } from "~/lib/whoop-webhook";

// Mock crypto.subtle methods
Object.defineProperty(crypto.subtle, 'importKey', {
  value: vi.fn().mockResolvedValue({} as CryptoKey),
  writable: true,
});
Object.defineProperty(crypto.subtle, 'sign', {
  value: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
  writable: true,
});

describe("verifyWhoopWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (crypto.subtle.importKey as any).mockResolvedValue("mock-key");
    (crypto.subtle.sign as any).mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
  });

  afterEach(() => {
    delete process.env.WHOOP_WEBHOOK_SECRET;
  });

  it("should return false when WHOOP_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.WHOOP_WEBHOOK_SECRET;

    const result = await verifyWhoopWebhook(
      "payload",
      "signature",
      "timestamp",
    );

    expect(result).toBe(false);
  });

  it("should return false for invalid signature", async () => {
    process.env.WHOOP_WEBHOOK_SECRET = "test-secret";
    const result = await verifyWhoopWebhook(
      "payload",
      "wrong-signature",
      "1234567890",
    );

    expect(result).toBe(false);
  });

  it("should handle crypto errors gracefully", async () => {
  process.env.WHOOP_WEBHOOK_SECRET = "test-secret";
  (crypto.subtle.importKey as any).mockImplementation(() =>
  Promise.reject(new Error("Crypto error"))
  );

  const result = await verifyWhoopWebhook(
  "payload",
  "signature",
  "timestamp",
  );

  expect(result).toBe(false);
  });
});

describe("extractWebhookHeaders", () => {
  it("should return null when signature header is missing", () => {
    const headers = new Headers({
      "x-whoop-signature-timestamp": "1234567890",
    });

    const result = extractWebhookHeaders(headers);

    expect(result).toBe(null);
  });

  it("should return null when timestamp header is missing", () => {
    const headers = new Headers({
      "x-whoop-signature": "signature",
    });

    const result = extractWebhookHeaders(headers);

    expect(result).toBe(null);
  });

  it("should return null when timestamp is too old", () => {
    const oldTimestamp = (Date.now() - 6 * 60 * 1000).toString(); // 6 minutes ago
    const headers = new Headers({
      "x-whoop-signature": "signature",
      "x-whoop-signature-timestamp": oldTimestamp,
    });

    const result = extractWebhookHeaders(headers);

    expect(result).toBe(null);
  });

  it("should return null when timestamp is in the future", () => {
    const futureTimestamp = (Date.now() + 10000).toString(); // 10 seconds in future
    const headers = new Headers({
      "x-whoop-signature": "signature",
      "x-whoop-signature-timestamp": futureTimestamp,
    });

    const result = extractWebhookHeaders(headers);

    expect(result).toBe(null);
  });

  it("should accept timestamp in seconds", () => {
    const timestampSeconds = Math.floor(Date.now() / 1000).toString();
    const headers = new Headers({
      "x-whoop-signature": "signature",
      "x-whoop-signature-timestamp": timestampSeconds,
    });

    const result = extractWebhookHeaders(headers);

    expect(result).toEqual({
      signature: "signature",
      timestamp: timestampSeconds,
    });
  });

  it("should return signature and timestamp for valid headers", () => {
    const timestamp = Date.now().toString();
    const headers = new Headers({
      "x-whoop-signature": "valid-signature",
      "x-whoop-signature-timestamp": timestamp,
    });

    const result = extractWebhookHeaders(headers);

    expect(result).toEqual({
      signature: "valid-signature",
      timestamp,
    });
  });
});
