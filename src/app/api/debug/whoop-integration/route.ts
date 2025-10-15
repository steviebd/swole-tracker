import { NextResponse, type NextRequest } from "next/server";
import { SessionCookie } from "~/lib/session-cookie";
import { createDb, getD1Binding } from "~/server/db";
import { userIntegrations } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const db = createDb(getD1Binding());

  const session = await SessionCookie.get(request);
  if (!session || SessionCookie.isExpired(session)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [integration] = await db
    .select({
      id: userIntegrations.id,
      provider: userIntegrations.provider,
      accessToken: userIntegrations.accessToken,
      refreshToken: userIntegrations.refreshToken,
      expiresAt: userIntegrations.expiresAt,
      updatedAt: userIntegrations.updatedAt,
      createdAt: userIntegrations.createdAt,
    })
    .from(userIntegrations)
    .where(
      and(
        eq(userIntegrations.user_id, session.userId),
        eq(userIntegrations.provider, "whoop"),
      ),
    );

  if (!integration) {
    return NextResponse.json({ integration: null });
  }

  const showRaw = request.nextUrl.searchParams.get("raw") === "1";

  return NextResponse.json({
    integration: {
      ...integration,
      accessTokenPreview: integration.accessToken.slice(0, 16) + "...",
      accessTokenLength: integration.accessToken.length,
      refreshTokenPreview: integration.refreshToken
        ? integration.refreshToken.slice(0, 16) + "..."
        : null,
      refreshTokenLength: integration.refreshToken?.length ?? null,
      accessTokenRaw: showRaw ? integration.accessToken : undefined,
      refreshTokenRaw: showRaw ? integration.refreshToken : undefined,
    },
  });
}
