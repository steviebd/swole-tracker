"use client";

import { useAuth } from "~/providers/AuthProvider";
import Link from "next/link";

export function SignInButtons() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <button className="btn-primary px-8 py-3 font-semibold">
          Loading...
        </button>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <Link href="/auth/login">
        <button className="btn-primary px-8 py-3 font-semibold">Sign in</button>
      </Link>
      <div className="text-secondary text-center text-xs">
        Welcome to the Calm Dark experience
      </div>
    </div>
  );
}
