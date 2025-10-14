import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="space-y-6 text-center">
        <div>
          <h1 className="mb-4 text-4xl font-bold">404 - Page Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The page you're looking for doesn't exist.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild variant="default">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/workout/start">Start Workout</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/templates">View Templates</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
