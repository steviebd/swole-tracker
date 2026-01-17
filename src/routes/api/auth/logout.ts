import { createFileRoute } from "@tanstack/react-router";
import { SessionCookie } from "~/lib/session-cookie";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const destroyCookie = await SessionCookie.destroy(request);

        return new Response(null, {
          status: 302,
          headers: {
            Location: "/sign-in",
            "Set-Cookie": destroyCookie,
          },
        });
      },
    },
  },
});
