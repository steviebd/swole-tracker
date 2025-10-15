import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

export const runtime = "nodejs";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    responseMeta: ({ ctx, paths, errors, type }) => {
      // Collect all timings from the context
      const timings = ctx?.timings;
      const serverTiming: string[] = [];

      if (timings) {
        for (const [key, duration] of timings) {
          serverTiming.push(`${key};dur=${duration}`);
        }
      }

      // Add total request duration if we have context
      if (ctx?.timings) {
        const totalDuration = Array.from(ctx.timings.values()).reduce(
          (sum, dur) => sum + dur,
          0,
        );
        serverTiming.push(`total;dur=${totalDuration}`);
      }

      return {
        headers: {
          ...(serverTiming.length > 0 && {
            "Server-Timing": serverTiming.join(", "),
          }),
        },
      };
    },
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
