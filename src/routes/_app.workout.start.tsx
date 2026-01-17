import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/workout/start")({
  component: WorkoutStartPage,
});

function WorkoutStartPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Start Workout</h1>
      <p className="text-muted-foreground mt-2">Start a new workout session</p>
    </div>
  );
}
