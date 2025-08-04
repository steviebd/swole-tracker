/* eslint-disable no-console */
if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (reason: any, promise) => {
    console.error('[DEBUG][unhandledRejection]', {
      reason,
      reasonType: typeof reason,
      message: reason?.message,
      name: reason?.name,
      stack: reason?.stack,
      cause: (reason as any)?.cause,
      promise,
    });
  });

  process.on('uncaughtException', (err: any) => {
    console.error('[DEBUG][uncaughtException]', {
      err,
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
      cause: (err as any)?.cause,
    });
  });
}

// Vitest global hooks as extra safety
try {
  // @ts-ignore
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
