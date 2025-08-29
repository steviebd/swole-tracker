"use client";

export function DashboardContent() {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
          <p className="text-muted-foreground mb-8">
            Welcome to Swole Tracker! The Convex migration is complete, but the UI components need to be rebuilt.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-2">Workouts</h3>
              <p className="text-sm text-muted-foreground">Track your workouts</p>
              <a href="/workouts" className="text-primary hover:underline text-sm">View workouts →</a>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-2">Templates</h3>
              <p className="text-sm text-muted-foreground">Manage workout templates</p>
              <a href="/templates" className="text-primary hover:underline text-sm">View templates →</a>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-2">Progress</h3>
              <p className="text-sm text-muted-foreground">Track your progress</p>
              <a href="/progress" className="text-primary hover:underline text-sm">View progress →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}