"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // Call logout API to clear cookies
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      
      // Redirect to home page
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Sign-out error:", error);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
    >
      Sign Out
    </button>
  );
}