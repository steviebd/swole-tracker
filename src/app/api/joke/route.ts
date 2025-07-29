import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { env } from '~/env';

export async function GET() {
  // This route is deprecated - using tRPC jokes.getCurrent instead
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use the tRPC jokes.getCurrent endpoint instead.' },
    { status: 410 }
  );
}
