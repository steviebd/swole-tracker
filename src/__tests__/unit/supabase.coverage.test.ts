import { describe, it, expect, vi, beforeEach } from "vitest";

// Targeting low coverage in lib/supabase.ts (re-export + environment guards)

describe("lib/supabase.ts coverage", () => {
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    Object.assign(process.env, ORIG_ENV);
  });

  it("imports without throwing when public envs are present (browser path)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://public.example.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_KEY", "anon");
    const mod = await import("~/lib/supabase");
    expect(typeof mod).toBe("object");
  });

  it("server path imports with server envs set (no throw)", async () => {
    vi.stubEnv("SUPABASE_URL", "https://server.example.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
    // also provide public to satisfy any transitive guard
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://public.example.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_KEY", "anon");
    const mod = await import("~/lib/supabase");
    expect(typeof mod).toBe("object");
  });
});
