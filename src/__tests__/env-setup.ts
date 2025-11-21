// This file runs before any other setup to ensure environment variables are set
// before the env module is imported and validated

process.env["WORKER_SESSION_SECRET"] =
  "test_session_secret_32_chars_minimum_12345678901234567890123456789012";
process.env["ENCRYPTION_MASTER_KEY"] =
  "test_encryption_key_32_chars_minimum_12345678901234567890123456789012";
process.env["NEXT_PUBLIC_SITE_URL"] = "http://localhost:3000";
process.env["NEXT_PUBLIC_POSTHOG_KEY"] = "phc_test_dummy";
process.env["NEXT_PUBLIC_POSTHOG_HOST"] = "https://us.i.posthog.com";
process.env["AI_GATEWAY_PROMPT"] = "Tell a fitness joke";
process.env["AI_GATEWAY_MODEL"] = "openai/gpt-4o-mini";
process.env["AI_GATEWAY_JOKE_MEMORY_NUMBER"] = "3";
process.env["VERCEL_AI_GATEWAY_API_KEY"] = "test-key";
