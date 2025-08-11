import "./setup.debug-errors";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller, createMockDb, createMockUser } from "./trpc-harness";

// Seed public env
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= "pk_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= "phc_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= "https://us.i.posthog.com";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= "supabase_test_key";

describe("tRPC post router coverage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should return hello greeting with public procedure", async () => {
    const user = null; // Public procedure doesn't need user
    const db = createMockDb({});

    const trpc = buildCaller({ db, user });
    const result = await (trpc as any).post?.hello({ text: "World" });

    expect(result).toEqual({
      greeting: "Hello World",
    });
  });

  it("should return secret message with protected procedure", async () => {
    const user = createMockUser(true);
    const db = createMockDb({});

    const trpc = buildCaller({ db, user });
    const result = await (trpc as any).post?.getSecretMessage();

    expect(result).toBe("you can now see this secret message!");
  });
});
