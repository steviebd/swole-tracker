import { getUserFromHeaders } from "~/lib/workos";
import { redirect } from "next/navigation";
import Link from "next/link";
import { WhoopWorkouts } from "~/app/_components/whoop-workouts";
import { Button } from "~/components/ui/button";

// Runtime configuration handled by OpenNext
export const dynamic = "force-dynamic";

export default async function ConnectWhoopPage() {
  const user = await getUserFromHeaders();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen overflow-x-hidden">
      <div className="container mx-auto px-4 py-6 w-full min-w-0">
        <div className="mb-8">
          <div className="mb-4">
            <Button asChild variant="ghost" className="px-0 text-blue-400 hover:text-blue-300">
              <Link href="/" className="inline-flex items-center">
                ← Go Back
              </Link>
            </Button>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Whoop Workouts</h1>
            <p className="text-muted-foreground">View and sync your Whoop workout data</p>
          </div>
        </div>

        <WhoopWorkouts />
      </div>
    </main>
  );
}
