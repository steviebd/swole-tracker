import { z } from "zod";

const envSchema = z.object({
  DB: z.any().optional(),

  WORKOS_API_KEY: z.string().optional(),
  WORKOS_CLIENT_ID: z.string().optional(),

  WORKER_SESSION_SECRET: z.string().min(32).optional(),

  WHOOP_CLIENT_ID: z.string().optional(),
  WHOOP_CLIENT_SECRET: z.string().optional(),
  WHOOP_REDIRECT_URI: z.string().url().optional(),
  WHOOP_WEBHOOK_SECRET: z.string().optional(),
  WHOOP_SYNC_RATE_LIMIT_PER_HOUR: z.coerce.number().default(10),

  AI_GATEWAY_API_KEY: z.string().optional(),
  AI_GATEWAY_MODEL: z.string().default("xai/grok-3-mini"),
  AI_GATEWAY_MODEL_HEALTH: z.string().default("xai/grok-3-mini"),
  AI_DEBRIEF_MODEL: z.string().default("xai/grok-3-mini"),

  ENCRYPTION_MASTER_KEY: z.string().min(32).optional(),
  RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR: z.coerce.number().default(100),
  RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR: z.coerce.number().default(200),
  RATE_LIMIT_API_CALLS_PER_MINUTE: z.coerce.number().default(60),
  RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),

  E2E_TESTING: z.string().optional(),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  SITE_URL: z.string().url().default("http://localhost:8787"),
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const clientEnv = {
  SITE_URL: import.meta.env.VITE_SITE_URL ?? "http://localhost:8787",
  POSTHOG_KEY: import.meta.env.VITE_POSTHOG_KEY ?? "",
  POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com",
};
