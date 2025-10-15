"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "~/providers/AuthProvider";

export function DashboardClient({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/sign-in");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="relative mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-4 text-center sm:px-6">
        <div className="glass-hero py-grid-6 w-full min-w-0 rounded-2xl px-6 shadow-2xl sm:px-8 md:px-12 lg:px-16">
          <div className="space-y-8">
            <div className="skeleton skeleton-title mx-auto w-3/4"></div>
            <div className="space-y-3">
              <div className="skeleton skeleton-text w-full"></div>
              <div className="skeleton skeleton-text mx-auto w-5/6"></div>
              <div className="skeleton skeleton-text mx-auto w-4/6"></div>
            </div>
            <div className="skeleton skeleton-button mx-auto w-48"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
