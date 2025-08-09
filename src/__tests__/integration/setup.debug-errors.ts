if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (reason: unknown, promise: unknown) => {
    const safe: Error =
      reason instanceof Error
        ? reason
        : new Error(typeof reason === 'string' ? reason : JSON.stringify(reason));
    (console.error as (...args: unknown[]) => void)('[DEBUG][unhandledRejection]', {
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
    const safe: Error =
      err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err));
    (console.error as (...args: unknown[]) => void)('[DEBUG][uncaughtException]', {
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
  const { beforeAll, afterAll } = globalThis as {
    beforeAll?: unknown;
    afterAll?: unknown;
  };

  const safeBeforeAll = typeof beforeAll === 'function' ? (beforeAll as (cb: () => void) => void) : undefined;
  const safeAfterAll = typeof afterAll === 'function' ? (afterAll as (cb: () => void) => void) : undefined;

  if (safeBeforeAll) {
    safeBeforeAll(() => {
      console.log('[DEBUG] error hooks installed for this spec');
    });
  }
  if (safeAfterAll) {
    safeAfterAll(() => {
      console.log('[DEBUG] error hooks removed for this spec');
    });
  }
} catch {
  // ignore
}
