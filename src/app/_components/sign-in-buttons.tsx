"use client";

import { useAuth } from "~/providers/AuthProvider";
import { Button } from "~/components/ui/button";
import React from "react";

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

  const handleSignIn = (e: React.MouseEvent) => {
    e.preventDefault();
    // Use full-page navigation to WorkOS auth flow
    window.location.assign('/api/auth/login');
  };

  return (
    <div className="flex flex-col gap-3">
      <Button 
        onClick={handleSignIn}
        variant="default" 
        size="lg" 
        className="px-8 py-3 font-semibold w-full"
      >
        Sign in with Email or Google
      </Button>
      <div className="text-secondary text-center text-xs">
        Secure authentication powered by WorkOS
      </div>
    </div>
  );
}
