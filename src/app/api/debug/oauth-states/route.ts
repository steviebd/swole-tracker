import { NextResponse, type NextRequest } from "next/server";
import { SessionCookie } from "~/lib/session-cookie";
import { db } from "~/server/db";
import { oauthStates } from "~/server/db/schema";
import { desc, eq } from "drizzle-orm";
import { env } from "~/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Only allow in development environment
  if (env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "not available in production" },
      { status: 404 },
    );
  }

  const session = await SessionCookie.get(request);
  if (!session || SessionCookie.isExpired(session)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const states = await db
    .select({
      id: oauthStates.id,
      state: oauthStates.state,
      provider: oauthStates.provider,
      userId: oauthStates.user_id,
      createdAt: oauthStates.createdAt,
      expiresAt: oauthStates.expiresAt,
    })
    .from(oauthStates)
    .where(eq(oauthStates.user_id, session.userId))
    .orderBy(desc(oauthStates.id))
    .limit(10);

  const sanitized = states.map((row) => ({
    ...row,
    state: `${row.state.slice(0, 8)}...${row.state.slice(-4)}`,
    userId: `${row.userId.slice(0, 8)}...`,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ states: sanitized });
}
