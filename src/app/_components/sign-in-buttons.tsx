"use client";

import { SignInButton, useUser } from "@clerk/nextjs";

export function SignInButtons() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex flex-col gap-3">
        <button className="rounded-lg bg-gray-600 px-8 py-3 font-semibold text-white">
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
        <button className="rounded-lg bg-purple-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-purple-700">
          Sign in
        </button>
      </SignInButton>
    </div>
  );
}
