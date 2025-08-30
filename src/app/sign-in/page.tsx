"use client";

import { useAuth } from "@workos-inc/authkit-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const { user, signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  return (
    <div className="flex flex-col justify-center items-center h-screen space-y-4">
      <h1 className="text-2xl font-bold">Welcome to Swole Tracker</h1>
      <div className="flex flex-col space-y-2">
        <button 
          onClick={() => signIn()}
          className="btn-primary px-6 py-3 text-center rounded-lg"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}