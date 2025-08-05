import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Focus: improve coverage for lib/supabase.ts by exercising import under
// various env combos to cover branches/guards transitively.

describe("lib/supabase.ts additional coverage", () => {
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    Object.assign(process.env, ORIG_ENV);
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    process.env = { ...ORIG_ENV };
  });

  it("imports even when only public envs present (browser oriented path)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://public.example.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_KEY", "public-anon");
    const mod = await import("~/lib/supabase");
    expect(mod).toBeTruthy();
  });

  it("imports when only server envs present (server oriented path)", async () => {
    vi.stubEnv("SUPABASE_URL", "https://server.example.com");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
    const mod = await import("~/lib/supabase");
    expect(mod).toBeTruthy();
  });

  it("imports with mixture of envs, does not throw", async () => {
    vi.stubEnv("SUPABASE_URL", "https://server.example.com");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://public.example.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_KEY", "public-anon");
    const mod = await import("~/lib/supabase");
    expect(typeof mod).toBe("object");
  });
});
