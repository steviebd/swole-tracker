import { describe, it, expect, beforeEach, vi } from "vitest";
import { getModelInfo, SUPPORTED_MODELS } from "~/server/api/routers/jokes";

// Mock environment variables
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  // Mock the env module to avoid server-side environment variable access
  vi.mock("~/env", () => ({
    env: {
      NODE_ENV: "test",
      AI_GATEWAY_PROMPT: "Tell me a joke",
      AI_GATEWAY_MODEL: "openai/gpt-4o-mini",
      AI_GATEWAY_JOKE_MEMORY_NUMBER: 3,
      VERCEL_AI_GATEWAY_API_KEY: undefined,
    },
  }));
});

describe("getModelInfo function", () => {
  it("should return model info for supported models", () => {
    const model = getModelInfo("openai/gpt-4o-mini");
    expect(model.id).toBe("openai/gpt-4o-mini");
    expect(model.name).toBe("OpenAI GPT-4o Mini");
    expect(model.isSupported).toBe(true);
  });

  it("should return unknown model info for unsupported models", () => {
    const model = getModelInfo("unknown/model");
    expect(model.id).toBe("unknown/model");
    expect(model.name).toBe("Unknown Model");
    expect(model.isSupported).toBe(false);
  });

  it("should handle all supported models", () => {
    Object.keys(SUPPORTED_MODELS).forEach((modelId) => {
      const model = getModelInfo(modelId);
      expect(model.isSupported).toBe(true);
      expect(model.name).not.toBe("Unknown Model");
    });
  });
});

describe("SUPPORTED_MODELS constant", () => {
  it("should contain some expected models", () => {
    expect(SUPPORTED_MODELS).toHaveProperty("xai/grok-3-mini");
    expect(SUPPORTED_MODELS).toHaveProperty("openai/gpt-4o");
    expect(SUPPORTED_MODELS).toHaveProperty(
      "anthropic/claude-3-5-sonnet-20241022",
    );
  });

  it("should have proper model names", () => {
    expect(SUPPORTED_MODELS["openai/gpt-4o-mini"]).toBe("OpenAI GPT-4o Mini");
    expect(SUPPORTED_MODELS["xai/grok-beta"]).toBe("XAI Grok Beta");
    expect(SUPPORTED_MODELS["google/gemini-1.5-pro"]).toBe(
      "Google Gemini 1.5 Pro",
    );
  });
});

describe("jokesRouter exports", () => {
  it("should export utility functions", () => {
    // Test that the utility functions are properly exported
    expect(typeof getModelInfo).toBe("function");
    expect(typeof SUPPORTED_MODELS).toBe("object");
    expect(Object.keys(SUPPORTED_MODELS).length).toBeGreaterThan(0);
  });
});
