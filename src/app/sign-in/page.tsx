"use client";

import { Button } from "~/components/ui/button";
import { useEffect, useState } from "react";

export default function SignInPage() {
  const [signInUrl, setSignInUrl] = useState<string>("");

  useEffect(() => {
    // Fetch the sign-in URL from a server action
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
      }
    }
    
    getSignInUrl();
  }, []);

  const handleSignIn = () => {
    if (signInUrl) {
      window.location.href = signInUrl;
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen space-y-4">
      <h1 className="text-2xl font-bold">Welcome to Swole Tracker</h1>
      <div className="flex flex-col space-y-2">
        <Button 
          onClick={handleSignIn}
          className="px-6 py-3 text-center"
          disabled={!signInUrl}
        >
          {signInUrl ? "Sign In" : "Loading..."}
        </Button>
      </div>
    </div>
  );
}