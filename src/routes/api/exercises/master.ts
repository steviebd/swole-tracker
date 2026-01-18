import { createServerFn } from "@tanstack/react-start";
import { withAuth } from "~/server/functions/middleware";
import { masterExercises } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";

export const getMasterExercises = createServerFn({ method: "GET" })
  .middleware([withAuth])
  .handler(async ({ context }) => {
    const { db, user } = context;

    const exercises = await db.query.masterExercises.findMany({
      where: eq(masterExercises.user_id, user.id),
      orderBy: [desc(masterExercises.name)],
    });

    return exercises;
  });
