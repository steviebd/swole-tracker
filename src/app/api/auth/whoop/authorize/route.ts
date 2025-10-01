import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "~/lib/supabase-server";
import {
  buildWhoopAuthorizationUrl,
  WhoopAuthorizationError,
} from "~/server/api/utils/whoop-authorization";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // Check if this is a prefetch request and return early to avoid CORS issues
    const purpose =
      request.headers.get("Purpose") || request.headers.get("X-Purpose");
    if (purpose === "prefetch" || request.nextUrl.searchParams.has("_rsc")) {
      return new NextResponse(null, { status: 204 });
    }
    const supabase = await createServerSupabaseClient(request.headers);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authorizeUrl = await buildWhoopAuthorizationUrl({
      origin: request.nextUrl.origin,
      headers: request.headers,
      userId: user.id,
    });

    // Redirect to OAuth provider (no cookies needed - state is stored server-side)
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    if (error instanceof WhoopAuthorizationError) {
      if (error.code === "WHOOP_NOT_CONFIGURED") {
        return NextResponse.redirect(
          `${request.nextUrl.origin}/connect-whoop?error=whoop_not_configured`,
        );
      }

      console.error("Whoop OAuth authorization error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Whoop OAuth authorization error:", error);
    return NextResponse.json(
      { error: "Failed to initiate authorization" },
      { status: 500 },
    );
  }
}
