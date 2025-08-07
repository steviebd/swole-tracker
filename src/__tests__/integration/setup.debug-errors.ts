if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (reason: unknown, promise: unknown) => {
    const safe = reason instanceof Error ? reason : new Error(typeof reason === 'string' ? reason : JSON.stringify(reason));
    console.error('[DEBUG][unhandledRejection]', {
      reason: safe.message,
      reasonType: typeof reason,
      message: safe.message,
      name: safe.name,
      stack: safe.stack,
      cause: (safe as { cause?: unknown }).cause,
      promise,
    });
  });

  process.on('uncaughtException', (err: unknown) => {
    const safe = err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err));
    console.error('[DEBUG][uncaughtException]', {
      err: safe.message,
      message: safe.message,
      name: safe.name,
      stack: safe.stack,
      cause: (safe as { cause?: unknown }).cause,
    });
  });
}

// Vitest global hooks as extra safety
try {
  // @ts-expect-error Vitest globals are provided at runtime in test environment
  const { beforeAll, afterAll } = globalThis;
  if (typeof beforeAll === 'function') {
    beforeAll(() => {
      console.log('[DEBUG] error hooks installed for this spec');
    });
  }
  if (typeof afterAll === 'function') {
    afterAll(() => {
      console.log('[DEBUG] error hooks removed for this spec');
    });
  }
} catch {}
