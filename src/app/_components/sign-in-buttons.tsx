"use client";

import { Button } from "~/components/ui/button";
import React from "react";

export function SignInButtons() {
  const handleSignIn = (e: React.MouseEvent) => {
    e.preventDefault();
    // Redirect to the sign-in page which will handle the WorkOS redirect properly
    window.location.assign('/sign-in');
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
