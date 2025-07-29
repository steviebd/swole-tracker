import { eq, and, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateText } from 'ai';

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { dailyJokes } from "~/server/db/schema";
import { env } from "~/env";

// Supported AI models via Vercel AI Gateway
const SUPPORTED_MODELS = {
  // XAI (fast, good for creative tasks)
  'xai/grok-3-mini': 'XAI Grok 3 Mini',
  'xai/grok-beta': 'XAI Grok Beta',
  
  // Google (strong reasoning, good for complex tasks)
  'google/gemini-2.0-flash-lite': 'Google Gemini 2.0 Flash Lite',
  'google/gemini-1.5-pro': 'Google Gemini 1.5 Pro',
  
  // OpenAI (balanced, reliable)
  'openai/gpt-4o': 'OpenAI GPT-4o',
  'openai/gpt-4o-mini': 'OpenAI GPT-4o Mini',
  'openai/gpt-3.5-turbo': 'OpenAI GPT-3.5 Turbo',
  
  // Anthropic (thoughtful, detailed responses)
  'anthropic/claude-3-5-sonnet-20241022': 'Anthropic Claude 3.5 Sonnet',
  
  // Meta (open source)
  'meta/llama-3.1-405b-instruct': 'Meta Llama 3.1 405B',
} as const;

function getModelInfo(modelId: string) {
  const modelName = SUPPORTED_MODELS[modelId as keyof typeof SUPPORTED_MODELS];
  return {
    id: modelId,
    name: modelName || 'Unknown Model',
    isSupported: !!modelName,
  };
}

// Helper function to generate new joke with proper error handling
// Supports all Vercel AI Gateway models via environment variables:
// - XAI: xai/grok-3-mini, xai/grok-beta
// - Google: google/gemini-2.0-flash-lite, google/gemini-1.5-pro
// - OpenAI: openai/gpt-4o, openai/gpt-4o-mini, openai/gpt-3.5-turbo
// - Anthropic: anthropic/claude-3-5-sonnet-20241022
// - Meta: meta/llama-3.1-405b-instruct
async function generateNewJoke(ctx: any) {
  try {
    // Check if AI Gateway is configured
    if (!env.VERCEL_AI_GATEWAY_API_KEY) {
      console.log('Vercel AI Gateway not configured, using fallback joke');
      return {
        joke: "Vercel AI Gateway not configured. Here's a classic: Why did the computer go to the doctor? Because it had a virus!",
        createdAt: new Date(),
        isFromCache: false,
      };
    }

    const modelInfo = getModelInfo(env.AI_GATEWAY_MODEL);
    
    console.log('🚀 Generating new joke with Vercel AI Gateway...');
    console.log('📱 Model:', `${modelInfo.name} (${modelInfo.id})`);
    console.log('💬 Prompt:', env.AI_GATEWAY_PROMPT?.substring(0, 50) + '...');
    
    if (!modelInfo.isSupported) {
      console.warn('⚠️  Warning: Using unsupported/unknown model. Supported models:', Object.keys(SUPPORTED_MODELS));
    }
    
    // Use Vercel AI Gateway directly through the AI SDK
    // No custom baseURL needed - the AI SDK automatically routes to the Gateway
    console.log('🚀 Using Vercel AI Gateway through AI SDK...');
    
    const { text } = await generateText({
      model: env.AI_GATEWAY_MODEL, // e.g., 'xai/grok-3-mini' - automatically uses Gateway
      prompt: env.AI_GATEWAY_PROMPT,
      // The AI SDK automatically handles Vercel AI Gateway when using these model formats
    });

    if (!text) {
      throw new Error('No content generated from AI Gateway');
    }

    // Store the new joke in the database
    const newJoke = await ctx.db
      .insert(dailyJokes)
      .values({
        user_id: ctx.user.id,
        joke: text.trim(),
        aiModel: env.AI_GATEWAY_MODEL,
        prompt: env.AI_GATEWAY_PROMPT,
      })
      .returning();

    console.log('Successfully generated and stored new joke');

    return {
      joke: text.trim(),
      createdAt: newJoke[0]!.createdAt,
      isFromCache: false,
    };
  } catch (error) {
    console.error('Error generating joke with AI Gateway:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      aiModel: env.AI_GATEWAY_MODEL,
      hasApiKey: !!env.VERCEL_AI_GATEWAY_API_KEY,
      prompt: env.AI_GATEWAY_PROMPT?.substring(0, 100) + '...',
    });
    
    // Return fallback joke if AI Gateway fails
    return {
      joke: `AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Here's a backup: Why don't programmers like nature? It has too many bugs!`,
      createdAt: new Date(),
      isFromCache: false,
    };
  }
}

export const jokesRouter = createTRPCRouter({
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    console.log('jokesRouter.getCurrent called for user:', ctx.user.id);
    
    try {
      const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);
      
      // Check if user has a recent joke (within 20 hours)
      const existingJoke = await ctx.db
        .select()
        .from(dailyJokes)
        .where(
          and(
            eq(dailyJokes.user_id, ctx.user.id),
            gte(dailyJokes.createdAt, twentyHoursAgo)
          )
        )
        .orderBy(dailyJokes.createdAt)
        .limit(1);

      if (existingJoke.length > 0) {
        const joke = existingJoke[0]!;
        return {
          joke: joke.joke,
          createdAt: joke.createdAt,
          isFromCache: true,
        };
      }

      // No recent joke found, generate a new one with AI Gateway
      return await generateNewJoke(ctx);
      
    } catch (error) {
      console.error('Database error in getCurrent:', error);
      
      // Return fallback joke if database fails
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
    await ctx.db
      .delete(dailyJokes)
      .where(eq(dailyJokes.user_id, ctx.user.id));
      
    return { success: true };
  }),
});
