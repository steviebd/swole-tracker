import { createFileRoute } from "@tanstack/react-router";

const cfEnv = process.env as Record<string, string | undefined>;
import { WorkOS } from "@workos-inc/node";
import { SessionCookie } from "~/lib/session-cookie";

export const Route = createFileRoute("/api/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");
        const state = url.searchParams.get("state") || "/";

        if (error) {
          console.error("WorkOS auth error:", error, errorDescription);
          return new Response(
            `Authentication failed: ${errorDescription || error}`,
            { status: 400 },
          );
        }

        if (!code) {
          return new Response("Missing authorization code", { status: 400 });
        }

        const workosApiKey = cfEnv.WORKOS_API_KEY;
        const workosClientId = cfEnv.WORKOS_CLIENT_ID;
        const siteUrl = cfEnv.SITE_URL || "http://localhost:8787";

        if (!workosApiKey || !workosClientId) {
          return new Response("WorkOS not configured", { status: 500 });
        }

        const workos = new WorkOS(workosApiKey);

        try {
          const authResponse =
            (await workos.userManagement.authenticateWithCode({
              clientId: workosClientId,
              code,
            })) as any;

          const expiresAt =
            authResponse.expiresAt ?? Math.floor(Date.now() / 1000) + 3600;

          const sessionCookie = await SessionCookie.create({
            userId: authResponse.user.id,
            accessToken: authResponse.accessToken,
            refreshToken: authResponse.refreshToken ?? null,
            accessTokenExpiresAt: expiresAt,
            sessionExpiresAt: expiresAt + 60 * 60 * 24 * 30,
            expiresAt,
          });

          return new Response(null, {
            status: 302,
            headers: {
              Location: state,
              "Set-Cookie": sessionCookie,
            },
          });
        } catch (error) {
          console.error("WorkOS authentication error:", error);
          return new Response("Authentication failed", { status: 500 });
        }
      },
    },
  },
});
