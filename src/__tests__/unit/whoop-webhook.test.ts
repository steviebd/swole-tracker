import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mutable env secret used by module mock
let __WHOOP_SECRET__ = '';

vi.mock('~/env', () => ({
  env: {
    get WHOOP_WEBHOOK_SECRET() {
      return __WHOOP_SECRET__;
    },
  },
}));

// Stable logger mock (counts errors)
const errorSpy = vi.fn();
vi.mock('~/lib/logger', () => ({ logger: { error: errorSpy, warn: vi.fn(), info: vi.fn() } }));

process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= 'pk_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= 'phc_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= 'https://us.i.posthog.com';
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= 'supabase_test_key';

describe('whoop-webhook helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    __WHOOP_SECRET__ = ''; // default to missing
    errorSpy.mockReset();
  });

  it('extractWebhookHeaders returns signature/timestamp when valid and timely', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const { extractWebhookHeaders } = await import('~/lib/whoop-webhook');

    const headers = new Headers();
    headers.set('X-WHOOP-Signature', 'abc123');
    headers.set('X-WHOOP-Signature-Timestamp', String(now - 60_000)); // 1 min ago

    const res = extractWebhookHeaders(headers);
    expect(res).toEqual({
      signature: 'abc123',
      timestamp: String(now - 60_000),
    });
  });

  it('extractWebhookHeaders returns null when missing headers', async () => {
    const { extractWebhookHeaders } = await import('~/lib/whoop-webhook');
    const headers = new Headers();
    expect(extractWebhookHeaders(headers)).toBeNull();
  });

  it('extractWebhookHeaders returns null when timestamp is outside 5-minute window', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const { extractWebhookHeaders } = await import('~/lib/whoop-webhook');

    // too old
    const h1 = new Headers();
    h1.set('X-WHOOP-Signature', 'sig');
    h1.set('X-WHOOP-Signature-Timestamp', String(now - 6 * 60_000));
    expect(extractWebhookHeaders(h1)).toBeNull();

    // from the future
    const h2 = new Headers();
    h2.set('X-WHOOP-Signature', 'sig');
    h2.set('X-WHOOP-Signature-Timestamp', String(now + 10_000));
    expect(extractWebhookHeaders(h2)).toBeNull();
  });

  it('verifyWhoopWebhook returns false when secret not configured', async () => {
    __WHOOP_SECRET__ = ''; // ensure missing
    const { verifyWhoopWebhook } = await import('~/lib/whoop-webhook');

    const ok = verifyWhoopWebhook('{"a":1}', 'sig', String(Date.now()));
    expect(ok).toBe(false);
  });

  it('verifyWhoopWebhook computes HMAC and compares signatures (happy path)', async () => {
    __WHOOP_SECRET__ = 'shhh';
    const { verifyWhoopWebhook } = await import('~/lib/whoop-webhook');

    const payload = '{"foo":"bar"}';
    const timestamp = '1700000000000';

    // Reproduce calculation in test to produce a matching signature:
    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha256', 'shhh');
    hmac.update(timestamp + payload, 'utf8');
    const expected = hmac.digest('base64');

    expect(verifyWhoopWebhook(payload, expected, timestamp)).toBe(true);
  });

  it('verifyWhoopWebhook returns false on invalid signature and logs error on thrown exceptions', async () => {
    __WHOOP_SECRET__ = 'shhh';

    const { verifyWhoopWebhook } = await import('~/lib/whoop-webhook');

    // Invalid signature should be false without throwing
    expect(verifyWhoopWebhook('x', 'not-base64', String(Date.now()))).toBe(false);

    // Force crypto to throw via bad Buffer (simulate inside function by passing malformed base64)
    const badSig = '%%%'; // invalid base64 triggers catch and logger.error
    expect(verifyWhoopWebhook('{"b":2}', badSig, String(Date.now()))).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });
});
