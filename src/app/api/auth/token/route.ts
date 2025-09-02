import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { unsealData } from "iron-session";

// Returns the raw WorkOS access token from the sealed session cookie.
// Convex will validate this token against WorkOS (iss=https://api.workos.com, aud=client_id)
export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sealed = cookieStore.get("wos-session")?.value;
    if (!sealed) {
      return new Response("Not authenticated", { status: 401 });
    }

    const password = process.env.WORKOS_COOKIE_PASSWORD;
    if (!password || password.length < 32) {
      console.error("WORKOS_COOKIE_PASSWORD missing/invalid");
      return new Response("Server misconfigured", { status: 500 });
    }

    const session: any = await unsealData(sealed, { password });
    const accessToken: string | undefined = session?.accessToken;
    if (!accessToken) {
      return new Response("Not authenticated", { status: 401 });
    }

    return new Response(accessToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("/api/auth/token error:", error);
    return new Response("Not authenticated", { status: 401 });
  }
}
