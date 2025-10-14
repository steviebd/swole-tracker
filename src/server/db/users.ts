import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

export interface UpsertUserFromWorkOSParams {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
}

export async function upsertUserFromWorkOS({
  id,
  email,
  firstName,
  lastName,
  profilePictureUrl,
}: UpsertUserFromWorkOSParams) {
  await db
    .insert(users)
    .values({
      id,
      email,
      firstName,
      lastName,
      profilePictureUrl,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        firstName,
        lastName,
        profilePictureUrl,
        updatedAt: new Date(),
      },
    });
}
