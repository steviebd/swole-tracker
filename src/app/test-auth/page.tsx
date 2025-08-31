"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "~/components/ui/button";

export default function TestAuthPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Authentication Test Page</h1>
      
      <AuthLoading>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800">🔄 Checking authentication status...</p>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 mb-4">❌ Not authenticated</p>
          <Button onClick={() => window.location.href = "/sign-in"}>
            Go to Sign In
          </Button>
        </div>
      </Unauthenticated>

      <Authenticated>
        <AuthenticatedContent />
      </Authenticated>
    </div>
  );
}

function AuthenticatedContent() {
  const userProfile = useQuery(api.users.getUserProfile);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
        <p className="text-green-800">✅ Successfully authenticated!</p>
      </div>

      {userProfile ? (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h2 className="text-lg font-semibold mb-2">User Profile</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Name:</strong> {userProfile.name}</p>
            <p><strong>Email:</strong> {userProfile.email}</p>
            <p><strong>WorkOS ID:</strong> {userProfile.workosId}</p>
            <p><strong>Account Created:</strong> {new Date(userProfile._creationTime).toLocaleString()}</p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-gray-600">Loading user profile...</p>
        </div>
      )}

      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Actions</h2>
        <div className="space-x-2">
          <Button onClick={() => window.location.href = "/api/auth/logout"}>
            Sign Out
          </Button>
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  );
}