import { eq, desc } from "drizzle-orm";
import { generateText } from "ai";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { dailyJokes } from "~/server/db/schema";
import { env } from "~/env";

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

// Helper function to generate fresh joke on every browser refresh
// Always calls AI Gateway for new content - no caching
// Supports all Vercel AI Gateway models via environment variables:
// - XAI: xai/grok-3-mini, xai/grok-beta
// - Google: google/gemini-2.0-flash-lite, google/gemini-1.5-pro
// - OpenAI: openai/gpt-4o, openai/gpt-4o-mini, openai/gpt-3.5-turbo
// - Anthropic: anthropic/claude-3-5-sonnet-20241022
// - Meta: meta/llama-3.1-405b-instruct
interface JokeContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  user: { id: string };
}

async function generateNewJoke(ctx: JokeContext) {
  let enhancedPrompt = env.AI_GATEWAY_PROMPT;
  
  try {
    // Check if AI Gateway is configured
    if (!env.VERCEL_AI_GATEWAY_API_KEY) {
      console.log("Vercel AI Gateway not configured, using fallback joke");
      return {
        joke: "Vercel AI Gateway not configured. Here's a classic: Why did the computer go to the doctor? Because it had a virus!",
        createdAt: new Date(),
        isFromCache: false,
      };
    }

    const modelInfo = getModelInfo(env.AI_GATEWAY_MODEL);

    // Fetch previous jokes for memory
    const memoryCount = env.AI_GATEWAY_JOKE_MEMORY_NUMBER;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const previousJokes: { joke: string }[] = await ctx.db
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .select({ joke: dailyJokes.joke })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .from(dailyJokes)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .where(eq(dailyJokes.user_id, ctx.user.id))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .orderBy(desc(dailyJokes.createdAt))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .limit(memoryCount);

    // Build enhanced prompt with previous jokes
    
    if (previousJokes.length > 0) {
      const jokeList = previousJokes.map((j) => j.joke).join(", ");
      enhancedPrompt = `These are the previous ${previousJokes.length} jokes that you've given. ${jokeList}. Don't repeat yourself and do the following: ${env.AI_GATEWAY_PROMPT}`;
    }

    console.log("🚀 Generating new joke with Vercel AI Gateway...");
    console.log("📱 Model:", `${modelInfo.name} (${modelInfo.id})`);
    console.log("💬 Enhanced Prompt:", enhancedPrompt.substring(0, 100) + "...");
    console.log("🧠 Memory: Using", previousJokes.length, "previous jokes");

    if (!modelInfo.isSupported) {
      console.warn(
        "⚠️  Warning: Using unsupported/unknown model. Supported models:",
        Object.keys(SUPPORTED_MODELS),
      );
    }

    // Use Vercel AI Gateway directly through the AI SDK
    // No custom baseURL needed - the AI SDK automatically routes to the Gateway
    console.log("🚀 Calling AI Gateway for fresh joke...");

    const { text } = await generateText({
      model: env.AI_GATEWAY_MODEL, // e.g., 'xai/grok-3-mini' - automatically uses Gateway
      prompt: enhancedPrompt,
      // The AI SDK automatically handles Vercel AI Gateway when using these model formats
    });

    if (!text) {
      throw new Error("No content generated from AI Gateway");
    }

    // Store the new joke in the database for record keeping
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const newJoke = await ctx.db
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .insert(dailyJokes)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .values({
        user_id: ctx.user.id,
        joke: text.trim(),
        aiModel: env.AI_GATEWAY_MODEL,
        prompt: enhancedPrompt,
      })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .returning();

    console.log("✅ Fresh joke generated and stored");

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const firstJoke = newJoke[0];
    if (!firstJoke) {
      throw new Error("Failed to save joke to database");
    }

    return {
      joke: text.trim(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      createdAt: firstJoke.createdAt,
      isFromCache: false, // Always fresh from AI Gateway
    };
  } catch (error) {
    console.error("Error generating joke with AI Gateway:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      aiModel: env.AI_GATEWAY_MODEL,
      hasApiKey: !!env.VERCEL_AI_GATEWAY_API_KEY,
      prompt: enhancedPrompt.substring(0, 100) + "...",
    });

    // Return fallback joke if AI Gateway fails
    return {
      joke: `AI generation failed: ${error instanceof Error ? error.message : "Unknown error"}. Here's a backup: Why don't programmers like nature? It has too many bugs!`,
      createdAt: new Date(),
      isFromCache: false,
    };
  }
}

export const jokesRouter = createTRPCRouter({
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    console.log("jokesRouter.getCurrent called for user:", ctx.user.id);
    console.log("🔄 Generating fresh joke on browser refresh...");

    try {
      // Always generate a new joke on browser refresh - no caching
      return await generateNewJoke(ctx);
    } catch (error) {
      console.error("Error generating fresh joke:", error);

      // Return fallback joke if AI Gateway fails
      return {
        joke: "Error loading joke, but here's a backup: Why did the scarecrow win an award? Because he was outstanding in his field!",
        createdAt: new Date(),
        isFromCache: false,
      };
    }
  }),

  generateNew: protectedProcedure.mutation(async ({ ctx }) => {
    return await generateNewJoke(ctx);
  }),

  clearCache: protectedProcedure.mutation(async ({ ctx }) => {
    // Delete all jokes for the current user (for login refresh)
    await ctx.db.delete(dailyJokes).where(eq(dailyJokes.user_id, ctx.user.id));

    return { success: true };
  }),
});
