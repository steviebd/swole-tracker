import { createFileRoute } from "@tanstack/react-router";
import { WorkOS } from "@workos-inc/node";

function getEnv(name: string): string | undefined {
  if (
    typeof process !== "undefined" &&
    process.env &&
    (process.env as Record<string, unknown>)[name]
  ) {
    return (process.env as Record<string, string>)[name];
  }
  if (
    typeof globalThis !== "undefined" &&
    (globalThis as unknown as Record<string, unknown>).__env__ !== undefined
  ) {
    return ((globalThis as unknown as Record<string, Record<string, string>>)
      .__env__ || {})[name];
  }
  return undefined;
}

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const provider = url.searchParams.get("provider") || "authkit";
        const redirectTo = url.searchParams.get("redirectTo") || "/";

        const workosClientId = getEnv("WORKOS_CLIENT_ID");
        const workosApiKey = getEnv("WORKOS_API_KEY");
        const siteUrl =
          getEnv("NEXT_PUBLIC_SITE_URL") || "http://localhost:8787";

        if (!workosClientId) {
          return new Response("WorkOS client ID not configured", {
            status: 500,
          });
        }

        if (!workosApiKey) {
          return new Response("WorkOS API key not configured", {
            status: 500,
          });
        }

        const workos = new WorkOS(workosApiKey);

        const authUrl = workos.userManagement.getAuthorizationUrl({
          provider: provider === "GoogleOAuth" ? "google" : provider,
          clientId: workosClientId,
          redirectUri: `${siteUrl}/api/auth/callback`,
          state: redirectTo,
        });

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
