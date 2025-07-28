"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState } from "react";
import type { LiteralUnion, ClientSafeProvider } from "next-auth/react";
import type { BuiltInProviderType } from "next-auth/providers/index";

export function SignInButtons() {
  const [providers, setProviders] = useState<Record<
    LiteralUnion<BuiltInProviderType, string>,
    ClientSafeProvider
  > | null>(null);

  useEffect(() => {
    const setAuthProviders = async () => {
      const res = await getProviders();
      setProviders(res);
    };
    void setAuthProviders();
  }, []);

  if (!providers) {
    return (
      <div className="rounded-lg bg-gray-700 px-8 py-3 font-semibold text-white animate-pulse">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {Object.values(providers).map((provider) => (
        <button
          key={provider.name}
          onClick={() => signIn(provider.id)}
          className={`rounded-lg px-8 py-3 font-semibold text-white transition-colors ${
            provider.name === "Discord"
              ? "bg-purple-600 hover:bg-purple-700"
              : provider.name === "Google"
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-600 hover:bg-gray-700"
          }`}
        >
          Sign in with {provider.name}
        </button>
      ))}
    </div>
  );
}
