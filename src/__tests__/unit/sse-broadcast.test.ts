import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= 'pk_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= 'phc_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= 'https://us.i.posthog.com';
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= 'supabase_test_key';

describe('sse-broadcast', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function makeWriter() {
    return {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as WritableStreamDefaultWriter<Uint8Array>;
  }

  it('addConnection and broadcast write to all active writers', async () => {
    const mod = await import('~/lib/sse-broadcast');
    const { addConnection, broadcastWorkoutUpdate } = mod;

    const userId = 'user_1';
    const w1 = makeWriter();
    const w2 = makeWriter();

    addConnection(userId, w1);
    addConnection(userId, w2);

    await broadcastWorkoutUpdate(userId, { id: 'w', sets: 3 });

    expect((w1 as any).write).toHaveBeenCalledTimes(1);
    expect((w2 as any).write).toHaveBeenCalledTimes(1);

    const payload = (w1 as any).write.mock.calls[0][0] as Uint8Array;
    const decoded = new TextDecoder().decode(payload);
    expect(decoded).toContain('workout-updated');
    expect(decoded).toContain('"id":"w"');
  });

  it('broadcast handles dead connections and removes them (close is called)', async () => {
    const mod = await import('~/lib/sse-broadcast');
    const { addConnection, broadcastWorkoutUpdate } = mod;

    const userId = 'user_2';
    const alive = makeWriter();
    const dead = makeWriter();
    (dead as any).write.mockRejectedValueOnce(new Error('connection closed'));

    addConnection(userId, alive);
    addConnection(userId, dead);

    await broadcastWorkoutUpdate(userId, { id: 'x' });

    expect((alive as any).write).toHaveBeenCalledTimes(1);
    expect((dead as any).write).toHaveBeenCalledTimes(1);
    expect((dead as any).close).toHaveBeenCalledTimes(1);

    // Subsequent broadcasts should only hit the alive writer
    await broadcastWorkoutUpdate(userId, { id: 'y' });
    expect((alive as any).write).toHaveBeenCalledTimes(2);
  });

  it('broadcast no-ops when no connections exist', async () => {
    const mod = await import('~/lib/sse-broadcast');
    const { broadcastWorkoutUpdate } = mod;

    // Should not throw
    await expect(broadcastWorkoutUpdate('unknown', { id: 'none' })).resolves.toBeUndefined();
  });
});
