import { createServerSupabaseClient } from "@/lib/supabase-server";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AddWorkoutForm } from "./add-workout-form";
import { ClientWorkouts } from "./client-workouts";

export default async function ClerkSupabaseDemoPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createServerSupabaseClient();

  const { data: workouts, error } = await supabase
    .from("swole-tracker_workout_template")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching workouts:", error);
  }

  return (
    <main className="container-default min-h-screen py-6">
      <h1 className="mb-6 text-2xl font-bold">Clerk + Supabase Demo</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-semibold">
            Add New Workout Template
          </h2>
          <AddWorkoutForm />
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">
            Your Workout Templates (Server-side)
          </h2>
          {workouts && workouts.length > 0 ? (
            <ul className="space-y-2">
              {workouts.map((workout) => (
                <li key={workout.id} className="card p-3">
                  {workout.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-secondary">No templates yet.</p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">
          Your Workout Templates (Client-side)
        </h2>
        <ClientWorkouts />
      </div>
    </main>
  );
}
