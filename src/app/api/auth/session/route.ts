import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SessionCookie } from "~/lib/session-cookie";
import { getWorkOS } from "~/lib/workos";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await SessionCookie.get(request);

    if (!session || SessionCookie.isExpired(session)) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Fetch user details from WorkOS if needed
    try {
      const workos = getWorkOS();
      const user = await workos.userManagement.getUser(session.userId);

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_picture_url: user.profilePictureUrl,
        },
      });
    } catch (error) {
      console.error("Failed to fetch user from WorkOS:", error);
      // Return basic session info if WorkOS call fails
      return NextResponse.json({
        user: {
          id: session.userId,
          email: "unknown@unknown.com", // This should ideally be stored in session
        },
      });
    }
  } catch (error) {
    console.error("Session validation error:", error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
