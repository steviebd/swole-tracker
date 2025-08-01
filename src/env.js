import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    CLERK_SECRET_KEY: z.string(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // Vercel AI Gateway configuration (AI SDK 5 beta)
    VERCEL_AI_GATEWAY_API_KEY: z.string().optional(),
    // Supported models: xai/grok-3-mini, google/gemini-2.0-flash-lite, openai/gpt-4o, etc.
    AI_GATEWAY_MODEL: z.string().default("xai/grok-3-mini"),
    AI_GATEWAY_PROMPT: z
      .string()
      .default(
        "Tell me a short, funny programming or tech joke. Keep it clean and under 100 words.",
      ),
    AI_GATEWAY_JOKE_MEMORY_NUMBER: z.coerce.number().default(3),
    // Whoop Integration
    WHOOP_CLIENT_ID: z.string().optional(),
    WHOOP_CLIENT_SECRET: z.string().optional(),
    WHOOP_SYNC_RATE_LIMIT_PER_HOUR: z.coerce.number().default(10),
    // Whoop Webhooks (using the same client secret for webhook verification)
    WHOOP_WEBHOOK_SECRET: z.string().optional(),
    // Rate Limiting Configuration
    RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR: z.coerce.number().default(100),
    RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR: z.coerce.number().default(200),
    RATE_LIMIT_API_CALLS_PER_MINUTE: z.coerce.number().default(60),
    RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_KEY: z.string(),
    NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY,
    NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_AI_GATEWAY_API_KEY: process.env.VERCEL_AI_GATEWAY_API_KEY,
    AI_GATEWAY_MODEL: process.env.AI_GATEWAY_MODEL,
    AI_GATEWAY_PROMPT: process.env.AI_GATEWAY_PROMPT,
    AI_GATEWAY_JOKE_MEMORY_NUMBER: process.env.AI_GATEWAY_JOKE_MEMORY_NUMBER,
    WHOOP_CLIENT_ID: process.env.WHOOP_CLIENT_ID,
    WHOOP_CLIENT_SECRET: process.env.WHOOP_CLIENT_SECRET,
    WHOOP_SYNC_RATE_LIMIT_PER_HOUR: process.env.WHOOP_SYNC_RATE_LIMIT_PER_HOUR,
    WHOOP_WEBHOOK_SECRET: process.env.WHOOP_WEBHOOK_SECRET,
    RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR: process.env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR,
    RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR: process.env.RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR,
    RATE_LIMIT_API_CALLS_PER_MINUTE: process.env.RATE_LIMIT_API_CALLS_PER_MINUTE,
    RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
