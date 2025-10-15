import { and, eq } from "drizzle-orm";

import type { DrizzleDb } from "~/server/db";
import { userIntegrations, whoopProfile } from "~/server/db/schema";

const WHOOP_PROVIDER = "whoop";

const TEST_WHOOP_USER_ID = 12345;

export function isWhoopTestUserId(userId: number): boolean {
  return userId === TEST_WHOOP_USER_ID;
}

export function getTestModeUserId(): string {
  return "TEST_USER_12345";
}

export async function resolveWhoopInternalUserId(
  db: DrizzleDb,
  whoopUserId: string,
): Promise<string | null> {
  const [profile] = await db
    .select({ userId: whoopProfile.user_id })
    .from(whoopProfile)
    .where(eq(whoopProfile.whoop_user_id, whoopUserId))
    .limit(1);

  if (profile?.userId) {
    return profile.userId;
  }

  const [integration] = await db
    .select({ userId: userIntegrations.user_id })
    .from(userIntegrations)
    .where(
      and(
        eq(userIntegrations.provider, WHOOP_PROVIDER),
        eq(userIntegrations.externalUserId, whoopUserId),
      ),
    )
    .limit(1);

  return integration?.userId ?? null;
}
