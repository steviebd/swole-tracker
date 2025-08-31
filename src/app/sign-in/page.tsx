"use client";

import { Button } from "~/components/ui/button";
import { useEffect, useState } from "react";

export default function SignInPage() {
  const [signInUrl, setSignInUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getSignInUrl() {
      try {
        const response = await fetch("/api/auth/sign-in-url");
        if (response.ok) {
          const data = await response.json();
          setSignInUrl(data.signInUrl);
        } else {
          console.error("Failed to get sign-in URL");
        }
      } catch (error) {
        console.error("Error fetching sign-in URL:", error);
      } finally {
        setLoading(false);
      }
    }
    
    getSignInUrl();
  }, []);

  const handleSignIn = () => {
    if (signInUrl) {
      window.location.href = signInUrl;
    } else {
      // Fallback to direct auth login
      window.location.href = "/api/auth/login";
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen space-y-4">
      <h1 className="text-2xl font-bold">Welcome to Swole Tracker</h1>
      <div className="flex flex-col space-y-2">
        <Button 
          onClick={handleSignIn}
          className="px-6 py-3 text-center"
          disabled={loading}
        >
          {loading ? "Loading..." : "Sign In with WorkOS"}
        </Button>
        {signInUrl && (
          <p className="text-xs text-muted-foreground text-center">
            Redirecting to WorkOS authentication...
          </p>
        )}
      </div>
    </div>
  );
}