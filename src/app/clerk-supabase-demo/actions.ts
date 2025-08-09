"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { currentUser } from "@clerk/nextjs/server";

export async function addWorkoutTemplate(name: string) {
  const user = await currentUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const supabase = await createServerSupabaseClient();

  try {
    const { data, error } = await supabase
      .from("swole-tracker_workout_template")
      .insert({
        name,
        user_id: user.id,
      })
      .select();

    if (error) {
      console.error("Supabase error:", error);
      throw new Error(`Failed to add template: ${error.message}`);
    }

    console.log("Template successfully added!", data);
    return data as {
      id: number;
      name: string;
      user_id: string;
      createdAt: string;
    }[];
  } catch (error: unknown) {
    console.error(
      "Error adding template:",
      error instanceof Error ? error.message : "Unknown error",
    );
    throw new Error("Failed to add workout template");
  }
}
