import { createServerSupabaseClient } from "~/lib/supabase-server";
import { ClientWorkouts } from "./client-workouts";
import { AddWorkoutForm } from "./add-workout-form";

export default async function ClerkSupabaseDemo() {
  // Server-side rendering with Supabase + Clerk
  const supabase = await createServerSupabaseClient();

  // Query workout templates using Supabase (this would normally use your Drizzle schema table names)
  const { data: templates, error } = await supabase
    .from("swole-tracker_workout_template")
    .select("*")
    .order("createdAt", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching templates:", error);
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="mb-8 text-3xl font-bold">
        Clerk + Supabase Integration Demo
      </h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Server-side rendered section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Server-side Rendering</h2>
          <p className="text-gray-400">
            Workout templates fetched on the server
          </p>

          <div className="space-y-3">
            {templates && templates.length > 0 ? (
              templates.map(
                (template: { id: number; name: string; createdAt: string }) => (
                  <div key={template.id} className="rounded-lg bg-gray-800 p-4">
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-gray-400">
                      Created:{" "}
                      {new Date(template.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">ID: {template.id}</p>
                  </div>
                ),
              )
            ) : (
              <div className="rounded-lg bg-gray-800 p-4">
                <p className="text-gray-400">No templates found</p>
              </div>
            )}
          </div>

          <AddWorkoutForm />
        </div>

        {/* Client-side rendered section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Client-side Rendering</h2>
          <p className="text-gray-400">Recent workouts fetched on the client</p>

          <ClientWorkouts />
        </div>
      </div>
    </div>
  );
}
