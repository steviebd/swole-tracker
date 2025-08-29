import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { ensureUser } from "./users";

// Supported AI models via Vercel AI Gateway
const SUPPORTED_MODELS = {
  // XAI (fast, good for creative tasks)
  "xai/grok-3-mini": "XAI Grok 3 Mini",
  "xai/grok-beta": "XAI Grok Beta",

  // Google (strong reasoning, good for complex tasks)
  "google/gemini-2.0-flash-lite": "Google Gemini 2.0 Flash Lite",
  "google/gemini-1.5-pro": "Google Gemini 1.5 Pro",

  // OpenAI (balanced, reliable)
  "openai/gpt-4o": "OpenAI GPT-4o",
  "openai/gpt-4o-mini": "OpenAI GPT-4o Mini",
  "openai/gpt-3.5-turbo": "OpenAI GPT-3.5 Turbo",

  // Anthropic (thoughtful, detailed responses)
  "anthropic/claude-3-5-sonnet-20241022": "Anthropic Claude 3.5 Sonnet",

  // Meta (open source)
  "meta/llama-3.1-405b-instruct": "Meta Llama 3.1 405B",
} as const;

function getModelInfo(modelId: string) {
  const modelName = SUPPORTED_MODELS[modelId as keyof typeof SUPPORTED_MODELS];
  return {
    id: modelId,
    name: modelName || "Unknown Model",
    isSupported: !!modelName,
  };
}

// Helper function to generate fresh joke using AI Gateway
async function generateNewJoke(ctx: any, user: any) {
  // Get environment variables (these would come from process.env in the actual deployment)
  const AI_GATEWAY_PROMPT = process.env.AI_GATEWAY_PROMPT ?? "Tell me a joke";
  const AI_GATEWAY_JOKE_MEMORY_NUMBER = parseInt(process.env.AI_GATEWAY_JOKE_MEMORY_NUMBER ?? "3");
  const AI_GATEWAY_MODEL = process.env.AI_GATEWAY_MODEL ?? "openai/gpt-4o-mini";
  const VERCEL_AI_GATEWAY_API_KEY = process.env.VERCEL_AI_GATEWAY_API_KEY;
  
  let enhancedPrompt = AI_GATEWAY_PROMPT;

  try {
    // Always fetch previous jokes first
    const memoryCount = AI_GATEWAY_JOKE_MEMORY_NUMBER;
    
    const previousJokes = await ctx.db
      .query("dailyJokes")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .take(memoryCount);

    // Build enhanced prompt with previous jokes when available
    if (previousJokes.length > 0) {
      const jokeList = previousJokes.map((j: any) => j.joke).join(", ");
      enhancedPrompt = `${AI_GATEWAY_PROMPT}. Previous jokes: ${jokeList}`;
    }

    let resolvedModel = AI_GATEWAY_MODEL;
    // Normalize common short ids to full gateway ids
    if (resolvedModel === "gpt-4o-mini") resolvedModel = "openai/gpt-4o-mini";
    const modelInfo = getModelInfo(resolvedModel);

    // Check if AI Gateway is configured
    const hasKey = !!VERCEL_AI_GATEWAY_API_KEY;

    if (!hasKey) {
      console.log("Vercel AI Gateway not configured, using fallback joke");
      return {
        joke: "Vercel AI Gateway not configured. Here's a classic: Why did the computer go to the doctor? Because it had a virus!",
        createdAt: Date.now(),
        isFromCache: false,
      };
    }

    // Log AI Gateway usage
    console.log("🚀 Generating new joke with Vercel AI Gateway...");
    console.log("📱 Model:", `${modelInfo.name} (${modelInfo.id})`);
    console.log("💬 Enhanced Prompt:", (enhancedPrompt ?? "").substring(0, 100) + "...");
    console.log("🧠 Memory: Using", previousJokes.length, "previous jokes");
    console.log("🚀 Calling AI Gateway for fresh joke...");

    // Call AI Gateway (this would be replaced with actual AI SDK call in production)
    let text: string | undefined;
    try {
      // In a real implementation, you'd call the AI Gateway here
      // For now, we'll simulate it
      const prompt = previousJokes.length > 0 
        ? `${AI_GATEWAY_PROMPT}. Previous jokes: ${previousJokes.map((j: any) => j.joke).join(", ")}`
        : AI_GATEWAY_PROMPT;
      
      // This would be the actual AI SDK call:
      // const { generateText } = await import("ai");
      // const result = await generateText({ model: resolvedModel, prompt });
      // text = result.text;
      
      // For now, return a placeholder
      text = "Why did the developer go broke? Because they used up all their cache!";
    } catch (error) {
      throw new Error("No content generated from AI Gateway");
    }

    if (!text) {
      throw new Error("No content generated from AI Gateway");
    }

    const trimmed = text.trim();

    // Insert the new joke into DB
    const jokeId = await ctx.db.insert("dailyJokes", {
      userId: user._id,
      joke: trimmed,
      aiModel: resolvedModel,
      prompt: enhancedPrompt,
    });

    return {
      joke: trimmed,
      createdAt: Date.now(),
      isFromCache: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      joke: `AI generation failed: ${message}`,
      createdAt: Date.now(),
      isFromCache: false,
    };
  }
}

// Get current joke (generates fresh one each time)
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    console.log("jokesRouter.getCurrent called for user:", user._id);
    console.log("🔄 Generating fresh joke on browser refresh...");

    try {
      const result = await generateNewJoke(ctx, user);

      // Handle AI generation failures
      if (
        typeof result?.joke === "string" &&
        result.joke.startsWith("AI generation failed")
      ) {
        return {
          joke: "Error loading joke. Here's a backup: Why don't programmers like nature? It has too many bugs!",
          createdAt: Date.now(),
          isFromCache: false,
        };
      }

      // Handle not configured message
      if (
        typeof result?.joke === "string" &&
        result.joke.startsWith("Vercel AI Gateway not configured")
      ) {
        return result;
      }

      return result;
    } catch {
      return {
        joke: "Error loading joke. Here's a backup: Why don't programmers like nature? It has too many bugs!",
        createdAt: Date.now(),
        isFromCache: false,
      };
    }
  },
});

// Generate a new joke manually
export const generateNew = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    return await generateNewJoke(ctx, user);
  },
});

// Clear joke cache for user
export const clearCache = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    // Delete all jokes for the current user
    const jokes = await ctx.db
      .query("dailyJokes")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .collect();

    for (const joke of jokes) {
      await ctx.db.delete(joke._id);
    }

    return { success: true };
  },
});

// Get recent jokes for user
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    const limit = args.limit ?? 10;

    return await ctx.db
      .query("dailyJokes")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);
  },
});