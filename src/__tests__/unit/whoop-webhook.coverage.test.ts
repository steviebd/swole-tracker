import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mutable env secret used by module mock
let __WHOOP_SECRET__ = "";

vi.mock("~/env", () => ({
  env: {
    get WHOOP_WEBHOOK_SECRET() {
      return __WHOOP_SECRET__;
    },
  },
}));

// Stable logger mock (counts errors)
const errorSpy = vi.fn();
const warnSpy = vi.fn();
vi.mock("~/lib/logger", () => ({
  logger: { error: errorSpy, warn: warnSpy, info: vi.fn() },
}));

process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= "pk_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= "phc_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= "https://us.i.posthog.com";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= "supabase_test_key";

describe("whoop-webhook helpers additional coverage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    __WHOOP_SECRET__ = ""; // default to missing
    errorSpy.mockReset();
    warnSpy.mockReset();
  });

  it("extractWebhookHeaders handles valid headers at boundary conditions", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    const { extractWebhookHeaders } = await import("~/lib/whoop-webhook");

    // Test exact 5 minute boundary (should pass)
    const headers = new Headers();
    headers.set("X-WHOOP-Signature", "valid_sig");
    headers.set("X-WHOOP-Signature-Timestamp", String(now - 5 * 60 * 1000)); // exactly 5 mins ago

    const res = extractWebhookHeaders(headers);
    expect(res).toEqual({
      signature: "valid_sig",
      timestamp: String(now - 5 * 60 * 1000),
    });
  });

  it("extractWebhookHeaders returns null for exact boundary failures", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    const { extractWebhookHeaders } = await import("~/lib/whoop-webhook");

    // Test just over 5 minute boundary (should fail)
    const headers = new Headers();
    headers.set("X-WHOOP-Signature", "sig");
    headers.set(
      "X-WHOOP-Signature-Timestamp",
      String(now - (5 * 60 * 1000 + 1)),
    ); // 5 mins + 1ms ago

    expect(extractWebhookHeaders(headers)).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("extractWebhookHeaders handles missing headers", async () => {
    const { extractWebhookHeaders } = await import("~/lib/whoop-webhook");

    const headers = new Headers();
    // No headers set

    const res = extractWebhookHeaders(headers);
    expect(res).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("verifyWhoopWebhook handles empty payload gracefully", async () => {
    __WHOOP_SECRET__ = "secret";
    const { verifyWhoopWebhook } = await import("~/lib/whoop-webhook");

    const payload = "";
    const timestamp = "1700000000000";

    // Reproduce calculation in test to produce a matching signature:
    const crypto = await import("crypto");
    const hmac = crypto.createHmac("sha256", "secret");
    hmac.update(timestamp + payload, "utf8");
    const expected = hmac.digest("base64");

    const result = verifyWhoopWebhook(payload, expected, timestamp);
    expect(result).toBe(true);
  });

  it("verifyWhoopWebhook handles special characters in payload", async () => {
    __WHOOP_SECRET__ = "secret";
    const { verifyWhoopWebhook } = await import("~/lib/whoop-webhook");

    const payload = '{"test":"special chars !@#$%^&*()_+-=[]{}|;:,.<>?"}';
    const timestamp = "1700000000000";

    // Reproduce calculation in test to produce a matching signature:
    const crypto = await import("crypto");
    const hmac = crypto.createHmac("sha256", "secret");
    hmac.update(timestamp + payload, "utf8");
    const expected = hmac.digest("base64");

    const result = verifyWhoopWebhook(payload, expected, timestamp);
    expect(result).toBe(true);
  });

  it("verifyWhoopWebhook handles invalid base64 signature gracefully", async () => {
    __WHOOP_SECRET__ = "secret";
    const { verifyWhoopWebhook } = await import("~/lib/whoop-webhook");

    const result = verifyWhoopWebhook(
      "payload",
      "%%%invalid_base64%%%",
      "1234567890",
    );
    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });
});
