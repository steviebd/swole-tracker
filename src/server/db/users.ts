import { eq } from "drizzle-orm";

import { db } from "~/server/db";
import { users } from "~/server/db/schema";

export type UpsertWorkOSUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
};

export async function upsertUserFromWorkOS(user: UpsertWorkOSUser) {
  const normalized = {
    id: user.id,
    email: user.email ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    profilePictureUrl: user.profilePictureUrl ?? null,
  } as const;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, normalized.id))
    .limit(1);

  const timestamp = new Date();

  if (existing.length > 0) {
    await db
      .update(users)
      .set({
        email: normalized.email,
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        profilePictureUrl: normalized.profilePictureUrl,
        updatedAt: timestamp,
      })
      .where(eq(users.id, normalized.id));

    return;
  }

  await db.insert(users).values({
    ...normalized,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}
