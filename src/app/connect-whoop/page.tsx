import { SessionCookie } from "~/lib/session-cookie";
import { redirect } from "next/navigation";
import Link from "next/link";
import { WhoopWorkouts } from "~/app/_components/whoop-workouts";
import { Button } from "~/components/ui/button";
import { headers } from "next/headers";

export default async function ConnectWhoopPage() {
  const headersList = await headers();
  const mockRequest = {
    headers: {
      get: (name: string) => headersList.get(name),
    },
  } as Request;

  const session = await SessionCookie.get(mockRequest);

  if (!session || SessionCookie.isExpired(session)) {
    redirect("/");
  }

  return (
    <main className="min-h-screen overflow-x-hidden">
      <div className="container mx-auto w-full min-w-0 px-4 py-6">
        <div className="mb-8">
          <div className="mb-4">
            <Button
              asChild
              variant="ghost"
              className="px-0 text-blue-400 hover:text-blue-300"
            >
              <Link href="/" className="inline-flex items-center">
                ← Go Back
              </Link>
            </Button>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Whoop Workouts
            </h1>
            <p className="text-muted-foreground">
              View and sync your Whoop workout data
            </p>
          </div>
        </div>

        <WhoopWorkouts />
      </div>
    </main>
  );
}
