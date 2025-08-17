"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "~/lib/supabase-browser";
import Link from "next/link";
import { GoogleAuthButton } from "~/app/_components/google-auth-button";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const _router = useRouter();

  const supabase = createBrowserSupabaseClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setMessage(
        "Check your email for a verification link to complete your registration."
      );
    } catch (_err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center overflow-x-hidden w-full px-4">
      <div className="w-full max-w-md space-y-8 card p-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Sign Up</h2>
          <p className="mt-2 text-muted">
            Create your Swole Tracker account
          </p>
        </div>

        <div className="space-y-4">
          <GoogleAuthButton mode="signup" />
          
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

        <form onSubmit={handleSignUp} className="space-y-4">
          {error && (
            <div className="error-bg error-text">
              {error}
            </div>
          )}

          {message && (
            <div className="success-bg success-text">
              {message}
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
              className="mt-1 input-primary focus-primary"
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
              className="mt-1 input-primary focus-primary"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-1 input-primary focus-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-2 animate-button-hover"
          >
            {isLoading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="link-primary"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}