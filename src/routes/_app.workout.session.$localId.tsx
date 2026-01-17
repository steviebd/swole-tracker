import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/workout/session/$localId")({
  component: WorkoutSessionPage,
});

function WorkoutSessionPage() {
  const { localId } = Route.useParams();
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Workout Session</h1>
      <p className="text-muted-foreground mt-2">Session ID: {localId}</p>
    </div>
  );
}
