import { createFileRoute } from "@tanstack/react-router";

const cfEnv = process.env as Record<string, string | undefined>;

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const provider = url.searchParams.get("provider") || "GoogleOAuth";
        const redirectTo = url.searchParams.get("redirectTo") || "/";

        const workosClientId = cfEnv.WORKOS_CLIENT_ID;
        const siteUrl = cfEnv.SITE_URL || "http://localhost:8787";

        if (!workosClientId) {
          return new Response("WorkOS client ID not configured", {
            status: 500,
          });
        }

        const authUrl = new URL(
          "https://api.workos.com/user_management/authentication/start",
        );
        authUrl.searchParams.set("client_id", workosClientId);
        authUrl.searchParams.set(
          "redirect_uri",
          `${siteUrl}/api/auth/callback`,
        );
        authUrl.searchParams.set("provider", provider);
        authUrl.searchParams.set("state", redirectTo);

        return new Response(null, {
          status: 302,
          headers: {
            Location: authUrl.toString(),
          },
        });
      },
    },
  },
});
