import { expect, afterEach, beforeAll, afterAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Extend expect with jest-dom matchers
expect.extend(matchers);

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  NEXTAUTH_SECRET: "test-secret",
  NEXTAUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_POSTHOG_KEY: "phc_test_dummy",
  NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
  WORKOS_API_KEY: "test-workos-key",
  WORKOS_CLIENT_ID: "test-workos-client-id",
  WHOOP_CLIENT_ID: "test-whoop-client-id",
  WHOOP_CLIENT_SECRET: "test-whoop-client-secret",
  AI_GATEWAY_API_KEY: "test-ai-gateway-key",
  VERCEL_AI_GATEWAY_API_KEY: "test-vercel-ai-key",
};

// Mock console methods to avoid noise during tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});
