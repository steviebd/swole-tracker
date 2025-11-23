import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SessionCookie } from "~/lib/session-cookie";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Clear the session cookie
    const response = NextResponse.json({ success: true });
    response.headers.set("Set-Cookie", await SessionCookie.destroy(request));

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Redirect GET to POST for backward compatibility
  try {
    // Clear the session cookie
    const response = NextResponse.redirect(new URL("/", request.url));
    response.headers.set("Set-Cookie", await SessionCookie.destroy(request));

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
