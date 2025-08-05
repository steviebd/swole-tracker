"use client";

import { SignInButton, useUser } from "@clerk/nextjs";

export function SignInButtons() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex flex-col gap-3">
        <button className="btn-primary px-8 py-3 font-semibold">
          Loading...
        </button>
      </div>
    );
  }

  if (isSignedIn) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <SignInButton mode="modal">
        <button className="btn-primary px-8 py-3 font-semibold">
          Sign in
        </button>
      </SignInButton>
    </div>
  );
}
