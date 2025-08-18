"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GoogleAuthButton } from "~/app/_components/google-auth-button";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

function RegisterForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  // WorkOS registration - redirect to OAuth flow (same as login for WorkOS)
  const handleRegister = () => {
    const loginUrl = `/api/auth/login${redirectTo !== '/' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`;
    window.location.href = loginUrl;
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl sm:text-3xl font-bold">Create Account</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Create your Swole Tracker account to get started
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <GoogleAuthButton mode="signup" redirectTo={redirectTo} />
          
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
            onClick={handleRegister}
            className="w-full" 
            size="lg"
          >
            Sign up with WorkOS
          </Button>
        </div>

        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link 
            href={`/auth/login${redirectTo !== '/' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
            className="underline underline-offset-4 hover:text-primary"
          >
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-8">
        <Suspense fallback={<div>Loading...</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}