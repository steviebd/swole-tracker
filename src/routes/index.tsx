import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="container mx-auto py-16">
      <h1 className="text-4xl font-bold">Welcome to Swole Tracker</h1>
      <p className="text-muted-foreground mt-4 text-lg">
        Sign in to start tracking your workouts
      </p>
      <a
        href="/api/auth/login?provider=GoogleOAuth&redirectTo=/_app/_index"
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-block rounded-lg px-6 py-3 transition-colors"
      >
        Sign in with Google
      </a>
    </div>
  );
}
