"use client";

import { Button } from "~/components/ui/button";

export default function SignInPage() {
  // Simple redirect to WorkOS auth flow
  const handleSignIn = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen space-y-4">
      <h1 className="text-2xl font-bold">Welcome to Swole Tracker</h1>
      <div className="flex flex-col space-y-2">
        <Button 
          onClick={handleSignIn}
          className="px-6 py-3 text-center"
        >
          Sign In
        </Button>
      </div>
    </div>
  );
}