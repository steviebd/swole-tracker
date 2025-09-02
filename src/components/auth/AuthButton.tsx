"use client";

import { useConvexAuth } from "convex/react";
// no WorkOS client provider on the frontend; we use route redirects for login/logout

export function AuthButton() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="px-4 py-2 text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <button
        onClick={() => { window.location.href = "/auth/sign-out"; }}
        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        Logout
      </button>
    );
  }

  return (
    <button
      onClick={() => { window.location.href = "/auth/sign-in"; }}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      Login with WorkOS
    </button>
  );
}
