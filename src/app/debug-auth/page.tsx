"use client";

import { useAuth, useAccessToken } from "@workos-inc/authkit-nextjs/components";
import { useConvexAuth, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "~/components/ui/button";
import { useState } from "react";

export default function AuthDebugPage() {
  const workosAuth = useAuth();
  const { getAccessToken } = useAccessToken();
  const convexAuth = useConvexAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const handleGetToken = async () => {
    setTokenError(null);
    try {
      const token = await getAccessToken();
      setAccessToken(token);
    } catch (error) {
      setTokenError(error instanceof Error ? error.message : 'Unknown error');
      setAccessToken(null);
    }
  };

  const clearTokenDisplay = () => {
    setAccessToken(null);
    setTokenError(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Authentication Debug Page</h1>
      
      {/* WorkOS Auth Status */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h2 className="text-xl font-semibold mb-4">WorkOS Authentication</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Loading:</strong> {workosAuth.loading ? '✅ Yes' : '❌ No'}</p>
          <p><strong>User exists:</strong> {workosAuth.user ? '✅ Yes' : '❌ No'}</p>
          {workosAuth.user && (
            <div className="ml-4 space-y-1">
              <p><strong>User ID:</strong> {workosAuth.user.id}</p>
              <p><strong>Email:</strong> {workosAuth.user.email}</p>
              <p><strong>First Name:</strong> {workosAuth.user.firstName}</p>
              <p><strong>Last Name:</strong> {workosAuth.user.lastName}</p>
            </div>
          )}
        </div>
        <div className="mt-4 space-x-2">
          <Button onClick={handleGetToken} size="sm">Get Access Token</Button>
          <Button onClick={clearTokenDisplay} variant="outline" size="sm">Clear</Button>
        </div>
        {accessToken && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
            <p><strong>Token (first 50 chars):</strong> {accessToken.substring(0, 50)}...</p>
          </div>
        )}
        {tokenError && (
          <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
            <p><strong>Token Error:</strong> {tokenError}</p>
          </div>
        )}
      </div>

      {/* Convex Auth Status */}
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
        <h2 className="text-xl font-semibold mb-4">Convex Authentication</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Authenticated:</strong> {convexAuth.isAuthenticated ? '✅ Yes' : '❌ No'}</p>
          <p><strong>Loading:</strong> {convexAuth.isLoading ? '✅ Yes' : '❌ No'}</p>
        </div>
      </div>

      {/* Convex Auth Components Test */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
        <h2 className="text-xl font-semibold mb-4">Convex Auth Components Test</h2>
        
        <AuthLoading>
          <div className="p-2 bg-yellow-100 border border-yellow-300 rounded mb-2">
            <p className="text-yellow-800">🔄 AuthLoading: Checking authentication...</p>
          </div>
        </AuthLoading>

        <Unauthenticated>
          <div className="p-2 bg-red-100 border border-red-300 rounded mb-2">
            <p className="text-red-800">❌ Unauthenticated: User not logged in</p>
            <Button 
              onClick={() => window.location.href = "/sign-in"}
              className="mt-2"
              size="sm"
            >
              Go to Sign In
            </Button>
          </div>
        </Unauthenticated>

        <Authenticated>
          <AuthenticatedSection />
        </Authenticated>
      </div>

      {/* Direct Actions */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <div className="space-x-2 space-y-2">
          <Button onClick={() => window.location.href = "/sign-in"}>
            Go to Sign In
          </Button>
          <Button onClick={() => window.location.href = "/test-auth"} variant="outline">
            Go to Test Auth
          </Button>
          <Button onClick={() => window.location.href = "/api/auth/logout"} variant="destructive">
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedSection() {
  const userProfile = useQuery(api.users.getUserProfile);
  
  return (
    <div className="p-2 bg-green-100 border border-green-300 rounded">
      <p className="text-green-800 mb-2">✅ Authenticated: User is logged in</p>
      
      {userProfile === undefined ? (
        <p className="text-sm text-gray-600">Loading user profile...</p>
      ) : userProfile === null ? (
        <p className="text-sm text-orange-600">No user profile found in Convex</p>
      ) : (
        <div className="text-sm space-y-1">
          <p><strong>Profile Name:</strong> {userProfile.name}</p>
          <p><strong>Profile Email:</strong> {userProfile.email}</p>
          <p><strong>WorkOS ID:</strong> {userProfile.workosId}</p>
          <p><strong>Created:</strong> {new Date(userProfile._creationTime).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}