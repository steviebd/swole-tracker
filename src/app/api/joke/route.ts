import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { env } from '~/env';

export async function GET() {
  try {
    // Check if AI Gateway is configured
    if (!env.AI_GATEWAY_API_KEY) {
      return NextResponse.json(
        { 
          error: 'AI Gateway is not configured. Please set up Vercel AI Gateway in your dashboard and add the API key to your environment variables.' 
        },
        { status: 503 }
      );
    }

    console.log('Fetching joke with Vercel AI Gateway...');
    console.log('Model:', env.AI_GATEWAY_MODEL);
    console.log('Prompt:', env.AI_GATEWAY_PROMPT);
    
    // Create Google provider that will be routed through Vercel AI Gateway
    // when AI_GATEWAY_API_KEY is set in environment
    const google = createGoogleGenerativeAI({
      // The AI SDK will automatically use AI_GATEWAY_API_KEY when available
    });
    
    // Extract just the model name if it includes provider prefix
    const modelName = env.AI_GATEWAY_MODEL.replace('google/', '');
    
    const { text } = await generateText({
      model: google(modelName), // Use the configured Gemini model
      prompt: env.AI_GATEWAY_PROMPT,
      maxTokens: 150,
      temperature: 0.9,
    });

    if (!text) {
      throw new Error('No content generated from AI Gateway');
    }

    console.log('Successfully generated joke via Vercel AI Gateway');
    
    return NextResponse.json({
      joke: text.trim(),
    });
  } catch (error) {
    console.error('Error fetching joke from Vercel AI Gateway:', error);
    
    // Provide helpful error messages
    let errorMessage = 'Failed to fetch joke';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for common configuration issues
      if (error.message.includes('API key') || error.message.includes('401')) {
        errorMessage = 'AI Gateway API key is invalid or missing. Please check your Vercel AI Gateway setup in your dashboard.';
      } else if (error.message.includes('model') || error.message.includes('404')) {
        errorMessage = 'AI model not available. Please check your Vercel AI Gateway configuration.';
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
