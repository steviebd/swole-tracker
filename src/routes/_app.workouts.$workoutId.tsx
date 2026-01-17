import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/workouts/$workoutId")({
  component: WorkoutDetailsPage,
});

function WorkoutDetailsPage() {
  const { workoutId } = Route.useParams();
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Workout Details</h1>
      <p className="text-muted-foreground mt-2">Workout ID: {workoutId}</p>
    </div>
  );
}
