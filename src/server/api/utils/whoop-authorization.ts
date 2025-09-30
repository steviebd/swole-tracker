import { env } from "~/env";
import {
  cleanupUserStates,
  createOAuthState,
  getClientIp,
} from "~/lib/oauth-state";

const WHOOP_SCOPE =
  "read:workout read:recovery read:sleep read:cycles read:profile read:body_measurement offline";

export class WhoopAuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: number = 500,
    readonly code: "WHOOP_NOT_CONFIGURED" | "WHOOP_STATE_FAILURE" | "WHOOP_OAUTH_FAILURE" = "WHOOP_OAUTH_FAILURE",
  ) {
    super(message);
    this.name = "WhoopAuthorizationError";
  }
}

interface BuildWhoopAuthorizationUrlParams {
  origin: string;
  headers: Headers;
  userId: string;
}

export async function buildWhoopAuthorizationUrl({
  origin,
  headers,
  userId,
}: BuildWhoopAuthorizationUrlParams): Promise<string> {
  if (!env.WHOOP_CLIENT_ID || !env.WHOOP_CLIENT_SECRET) {
    throw new WhoopAuthorizationError(
      "WHOOP integration is not configured",
      503,
      "WHOOP_NOT_CONFIGURED",
    );
  }

  try {
    await cleanupUserStates(userId, "whoop");

    const redirectUri = env.WHOOP_REDIRECT_URI || `${origin}/api/auth/whoop/callback`;
    const clientIp = getClientIp(headers);
    const userAgent = headers.get("user-agent") ?? "unknown";

    const state = await createOAuthState(
      userId,
      "whoop",
      redirectUri,
      clientIp,
      userAgent,
    );

    const authUrl = new URL("https://api.prod.whoop.com/oauth/oauth2/auth");
    authUrl.searchParams.append("client_id", env.WHOOP_CLIENT_ID);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", WHOOP_SCOPE);
    authUrl.searchParams.append("state", state);

    return authUrl.toString();
  } catch (error) {
    if (error instanceof WhoopAuthorizationError) {
      throw error;
    }

    console.error("Failed to build WHOOP authorization URL", error);
    throw new WhoopAuthorizationError(
      "Unable to initiate WHOOP authorization",
      500,
      "WHOOP_OAUTH_FAILURE",
    );
  }
}
