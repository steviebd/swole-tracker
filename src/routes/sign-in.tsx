import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">
            Welcome to Swole Tracker
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Sign in to track your workouts and progress
          </p>
        </div>
        <p className="text-muted-foreground text-center">
          Auth UI coming in Phase 1
        </p>
      </div>
    </div>
  );
}
