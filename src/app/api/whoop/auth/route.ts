import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "~/lib/supabase-server";
import {
  buildWhoopAuthorizationUrl,
  WhoopAuthorizationError,
} from "~/server/api/utils/whoop-authorization";

export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({ authorizeUrl });
  } catch (error) {
    if (error instanceof WhoopAuthorizationError) {
      if (error.code === "WHOOP_NOT_CONFIGURED") {
        return NextResponse.json(
          { error: "Whoop integration is not configured", code: error.code },
          { status: 503 },
        );
      }

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    console.error("Whoop OAuth initialization error:", error);
    return NextResponse.json(
      { error: "Failed to initiate WHOOP authorization" },
      { status: 500 },
    );
  }
}

