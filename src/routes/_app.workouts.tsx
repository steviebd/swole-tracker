import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/workouts")({
  component: WorkoutsPage,
});

function WorkoutsPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Workouts</h1>
      <p className="text-muted-foreground mt-2">Workout list page</p>
    </div>
  );
}
