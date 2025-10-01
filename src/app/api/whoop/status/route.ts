import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "~/lib/supabase-server";
import { db } from "~/server/db";
import { userIntegrations } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          authenticated: false,
        },
        { status: 401 },
      );
    }

    // Get user's WHOOP integration
    const [integration] = await db
      .select({
        id: userIntegrations.id,
        isActive: userIntegrations.isActive,
        expiresAt: userIntegrations.expiresAt,
        createdAt: userIntegrations.createdAt,
        scope: userIntegrations.scope,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.user_id, user.id),
          eq(userIntegrations.provider, "whoop"),
        ),
      );

    if (!integration) {
      return NextResponse.json({
        authenticated: true,
        connected: false,
        message: "No WHOOP integration found",
      });
    }

    const now = new Date();
    const expiresAt = integration.expiresAt
      ? new Date(integration.expiresAt)
      : null;
    const isExpired = expiresAt ? expiresAt.getTime() < now.getTime() : false;
    const expiresIn = expiresAt
      ? Math.max(0, expiresAt.getTime() - now.getTime())
      : null;

    return NextResponse.json({
      authenticated: true,
      connected: integration.isActive,
      integration: {
        id: integration.id,
        isActive: integration.isActive,
        connectedAt: integration.createdAt,
        expiresAt: integration.expiresAt,
        isExpired,
        expiresInMs: expiresIn,
        scope: integration.scope,
      },
    });
  } catch (error) {
    console.error("Error checking WHOOP status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
