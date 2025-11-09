"use client";

import React, { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

/**
 * This page automatically redirects to WorkOS AuthKit hosted authentication page.
 * WorkOS AuthKit shows all enabled authentication methods (email/password, Google OAuth, etc.)
 * based on what you've configured in your WorkOS Dashboard.
 */
function LoginRedirect() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirectTo") || "/";

  useEffect(() => {
    // Automatically redirect to WorkOS AuthKit
    const authUrl = `/api/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`;
    window.location.href = authUrl;
  }, [redirectTo]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold sm:text-3xl">
          Redirecting to Sign In...
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Please wait while we redirect you to the authentication page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center py-8">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
        </div>
        <p className="text-muted-foreground text-center text-xs">
          If you're not redirected automatically,{" "}
          <a
            href={`/api/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`}
            className="underline"
          >
            click here
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center overflow-x-hidden px-4 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-4">
              <div className="skeleton h-6 sm:h-8"></div>
              <div className="skeleton h-4"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center py-8">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
              </div>
            </CardContent>
          </Card>
        }
      >
        <LoginRedirect />
      </Suspense>
    </div>
  );
}
