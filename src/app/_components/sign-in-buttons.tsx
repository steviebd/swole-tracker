"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { Button } from "~/components/ui/button";
import Link from "next/link";

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
      <Link href="/api/auth/login">
        <Button 
          variant="default" 
          size="lg" 
          className="px-8 py-3 font-semibold w-full"
        >
          Sign in with Email or Google
        </Button>
      </Link>
      <div className="text-secondary text-center text-xs">
        Secure authentication powered by WorkOS
      </div>
    </div>
  );
}
