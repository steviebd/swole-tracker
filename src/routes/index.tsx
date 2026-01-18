import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-br">
      <div className="bg-card border-border/50 w-full max-w-md space-y-8 rounded-xl border p-8 text-center shadow-lg">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Swole Tracker</h1>
          <p className="text-muted-foreground text-lg">
            Your AI-powered workout companion
          </p>
        </div>
        <a
          href="/api/auth/login?provider=GoogleOAuth&redirectTo=/workout/start"
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
        >
          Sign in with Google
        </a>
        <p className="text-muted-foreground text-sm">
          Track workouts, analyze progress, and achieve your fitness goals
        </p>
      </div>
    </div>
  );
}
