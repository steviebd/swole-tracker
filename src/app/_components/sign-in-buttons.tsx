"use client";

import { SignInButton } from "@clerk/nextjs";

export function SignInButtons() {
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
