"use client";

import React, { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import nextPackage from "next/package.json";
import pkg from "../../../../package.json";

/**
 * Non-sensitive diagnostics page to aid troubleshooting in all environments.
 * Shows feature flags, versions, and basic environment configuration.
 *
 * Route: /debug/system
 */
export default function SystemDebugPage() {
  const { user, isLoaded } = useUser();

  const data = useMemo(() => {
    // Expose only non-sensitive values. Never show secrets or full URLs with keys.
    const features = {
      rateLimitingEnabled: process.env.NEXT_PUBLIC_RATE_LIMIT_ENABLED ?? undefined, // likely undefined, server-only flag exists
      posthogEnabled: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
      supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_KEY),
      clerkConfigured: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    };

    const envHints = {
      vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL ?? undefined,
      supabaseUrlOrigin:
        process.env.NEXT_PUBLIC_SUPABASE_URL
          ? tryGetOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL)
          : undefined,
      posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? undefined,
    };

    const versions = {
      app: (pkg as any).version ?? "unknown",
      next: nextPackage.version,
      react: (pkg as any).dependencies?.react ?? "unknown",
      trpc: (pkg as any).dependencies?.["@trpc/server"] ?? "unknown",
      drizzle: (pkg as any).dependencies?.["drizzle-orm"] ?? "unknown",
      typescript: (pkg as any).devDependencies?.typescript ?? "unknown",
    };

    return { features, envHints, versions };
  }, []);

  return (
    <main className="mx-auto max-w-screen-sm p-4 space-y-6">
      <h1 className="text-xl font-semibold">System Diagnostics</h1>

      <Section title="User">
        <KV k="isLoaded" v={String(isLoaded)} />
        <KV k="userId" v={user?.id ?? "anonymous"} />
        <KV k="email" v={user?.primaryEmailAddress?.emailAddress ?? "n/a"} />
      </Section>

      <Section title="Features">
        <KV k="rateLimitingEnabled" v={String(data.features.rateLimitingEnabled ?? "server-only")} />
        <KV k="posthogEnabled" v={String(data.features.posthogEnabled)} />
        <KV k="supabaseConfigured" v={String(data.features.supabaseConfigured)} />
        <KV k="clerkConfigured" v={String(data.features.clerkConfigured)} />
      </Section>

      <Section title="Env Hints">
        <KV k="vercelUrl" v={data.envHints.vercelUrl ?? "n/a"} />
        <KV k="supabaseUrlOrigin" v={data.envHints.supabaseUrlOrigin ?? "n/a"} />
        <KV k="posthogHost" v={data.envHints.posthogHost ?? "n/a"} />
      </Section>

      <Section title="Versions">
        <KV k="app" v={data.versions.app} />
        <KV k="next" v={data.versions.next} />
        <KV k="react" v={data.versions.react} />
        <KV k="tRPC" v={data.versions.trpc} />
        <KV k="drizzle" v={data.versions.drizzle} />
        <KV k="typescript" v={data.versions.typescript} />
      </Section>

      <p className="text-xs text-gray-500">
        This page intentionally avoids printing secrets. Use it to quickly verify environment configuration and feature flags. 
        For webhook debugging use /debug/webhooks.
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-700 p-3">
      <h2 className="mb-2 text-sm font-medium text-gray-300">{title}</h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-gray-400">{k}</span>
      <span className="font-mono text-gray-100">{v}</span>
    </div>
  );
}

function tryGetOrigin(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}
