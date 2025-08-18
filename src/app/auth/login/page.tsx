"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GoogleAuthButton } from "~/app/_components/google-auth-button";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  // WorkOS login - redirect to OAuth flow
  const handleLogin = () => {
    const loginUrl = `/api/auth/login${redirectTo !== '/' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`;
    window.location.href = loginUrl;
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl sm:text-3xl font-bold">Sign In</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Sign in to your Swole Tracker account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <GoogleAuthButton mode="signin" redirectTo={redirectTo} />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button 
            onClick={handleLogin}
            className="w-full" 
            size="lg"
          >
            Sign in with WorkOS
          </Button>
        </div>

        <div className="text-center text-sm">
          Don't have an account?{" "}
          <Link 
            href={`/auth/register${redirectTo !== '/' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
            className="underline underline-offset-4 hover:text-primary"
          >
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-8">
        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}