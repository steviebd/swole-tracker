"use client";

import { useAuth } from "~/providers/AuthProvider";
import Link from "next/link";

export function DashboardHeader() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="border-b border-border/50">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-semibold text-lg">
              Dashboard
            </Link>
          </div>
          <div className="text-sm text-muted-foreground">
            Welcome back, {user.firstName || user.email}
          </div>
        </div>
      </div>
    </div>
  );
}