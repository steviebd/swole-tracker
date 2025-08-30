"use client";

import { Authenticated } from "convex/react";
import { useCurrentUser } from "~/hooks/useCurrentUser";
import Link from "next/link";

export function DashboardHeader() {
  return (
    <Authenticated>
      <DashboardHeaderContent />
    </Authenticated>
  );
}

function DashboardHeaderContent() {
  const user = useCurrentUser();

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
            Welcome back, {user?.name || user?.email || 'User'}
          </div>
        </div>
      </div>
    </div>
  );
}