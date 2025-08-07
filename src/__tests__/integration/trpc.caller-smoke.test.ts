import './setup.debug-errors';
import { describe, it, expect } from 'vitest';
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

// Minimal context to satisfy t.context typing (we won't use it)
type Ctx = Record<string, unknown>;

describe('tRPC caller smoke test', () => {
  it('invokes mutation and returns input via server-side caller', async () => {
    const t = initTRPC.context<Ctx>().create({
      transformer: superjson,
    });
    const publicProcedure = t.procedure;
    const createTRPCRouter = t.router;
    const createCallerFactory = t.createCallerFactory;

    const router = createTRPCRouter({
      templates: createTRPCRouter({
        // trivial mutation that simply echoes the input back
        create: publicProcedure
          .input((val: unknown) => val as { name: string; exercises: string[] })
          .mutation(async ({ input }) => {
            return { echoed: input };
          }),
      }),
    });

    const createCaller = createCallerFactory(router);
const trpc = createCaller({} as Ctx);

// keys() may be empty due to proxy design; ensure callable exists and works
// Avoid explicit any by narrowing via unknown then indexing safely.
const maybeCreate = (trpc as unknown as Record<string, unknown>).templates as Record<string, unknown> | undefined;
expect(typeof maybeCreate?.create).toBe('function');

const input = { name: 'Test', exercises: ['A', 'B'] };
const res = await (maybeCreate!.create as (i: typeof input) => Promise<{ echoed: typeof input }>)(input);
    expect(res).toEqual({ echoed: input });
  });
});
