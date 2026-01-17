import { createFileRoute } from "@tanstack/react-router";
import { checkAuth } from "~/server/functions/auth";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async () => {
        const { user, isAuthenticated } = await checkAuth();

        if (!isAuthenticated || !user) {
          return Response.json({ user: null }, { status: 401 });
        }

        return Response.json({
          user: { id: user.id },
          expiresAt: Date.now() + 3600000,
        });
      },
    },
  },
});
