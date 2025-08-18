"use client";

import { useAuth } from "~/providers/AuthProvider";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export function SignInButtons() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Button variant="default" size="lg" className="px-8 py-3 font-semibold">
          Loading...
        </Button>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <Link href="/auth/login">
        <Button variant="default" size="lg" className="px-8 py-3 font-semibold">Sign in</Button>
      </Link>
      <div className="text-secondary text-center text-xs">
        Welcome to the Calm Dark experience
      </div>
    </div>
  );
}
