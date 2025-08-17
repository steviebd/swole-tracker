"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "~/lib/supabase-browser";
import Link from "next/link";
import { GoogleAuthButton } from "~/app/_components/google-auth-button";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  const supabase = createBrowserSupabaseClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (_err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 sm:space-y-8 card p-4 sm:p-6">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold">Sign In</h2>
        <p className="mt-2 text-sm sm:text-base text-muted">
          Sign in to your Swole Tracker account
        </p>
      </div>

      <div className="space-y-4">
        <GoogleAuthButton mode="signin" redirectTo={redirectTo} />
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-muted" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-card px-2 text-muted">
              Or continue with email
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSignIn} className="space-y-4">
        {error && (
          <div className="error-bg error-text">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 input-primary focus-primary text-base sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 input-primary focus-primary text-base sm:text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-primary py-2.5 sm:py-2 text-base sm:text-sm animate-button-hover"
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </button>
      </form>

      <div className="text-center">
        <p className="text-sm text-muted">
          Don't have an account?{" "}
          <Link
            href="/auth/register"
            className="text-primary hover:text-primary link-primary"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 sm:px-6 lg:px-8 overflow-x-hidden w-full">
      <Suspense fallback={
        <div className="w-full max-w-md space-y-6 sm:space-y-8 card p-4 sm:p-6">
          <div className="space-y-4">
            <div className="h-6 sm:h-8 skeleton"></div>
            <div className="h-4 skeleton"></div>
            <div className="h-10 skeleton"></div>
            <div className="h-10 skeleton"></div>
            <div className="h-10 skeleton"></div>
          </div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}