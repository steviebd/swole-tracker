import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { env } from '~/env';
import { healthAdviceRequestSchema } from '~/server/api/schemas/health-advice';
import { calculateReadiness, calculateOverloadMultiplier } from '~/lib/health-calculations';

export const runtime = 'edge';

function getApiKey(): string {
  const key = env.AI_GATEWAY_API_KEY || env.VERCEL_AI_GATEWAY_API_KEY;
  if (!key) {
    throw new Error('Missing AI gateway API key');
  }
  return key;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedInput = healthAdviceRequestSchema.parse(body);
    
    // Server-side safety checks
    const { rho, flags } = calculateReadiness(validatedInput.whoop);
    const delta = calculateOverloadMultiplier(rho, validatedInput.user_profile.experience_level);
    
    // Block unsafe advice
    if (rho < 0.35) {
      return NextResponse.json({
        session_id: validatedInput.session_id,
        readiness: { rho, overload_multiplier: 1.0, flags: [...flags, 'unsafe_readiness'] },
        per_exercise: [],
        session_predicted_chance: 0.3,
        summary: 'Your recovery metrics suggest taking it easy today. Stick to your planned loads.',
        warnings: ['Low readiness detected - no overload recommended'],
      });
    }

    const modelId = env.AI_GATEWAY_MODEL_HEALTH || 'xai/grok-3-mini';
    const systemPrompt = env.AI_GATEWAY_PROMPT_HEALTH || 'You are a strength coach. Return JSON.';
    
    // Check if AI Gateway is configured
    let hasKey = false;
    try {
      getApiKey();
      hasKey = true;
    } catch {
      hasKey = false;
    }

    if (!hasKey) {
      // Fallback response when AI Gateway is not configured
      return NextResponse.json({
        session_id: validatedInput.session_id,
        readiness: { rho, overload_multiplier: delta, flags },
        per_exercise: validatedInput.workout_plan.exercises.map(exercise => ({
          exercise_id: exercise.exercise_id,
          predicted_chance_to_beat_best: 0.5,
          planned_volume_kg: null,
          best_volume_kg: null,
          sets: exercise.sets.map(set => ({
            set_id: set.set_id,
            suggested_weight_kg: set.target_weight_kg ? Math.round((set.target_weight_kg * delta) / 2.5) * 2.5 : null,
            suggested_reps: set.target_reps ? Math.round(set.target_reps * delta) : null,
            rationale: 'AI Gateway not configured - using basic calculation'
          }))
        })),
        session_predicted_chance: 0.5,
        summary: 'Basic load adjustment applied based on readiness score. Configure AI Gateway for detailed analysis.',
        warnings: ['AI Gateway not configured - using simplified calculations'],
      });
    }

    // Dynamically import AI SDK (similar to jokes router pattern)
    const { generateText } = await import("ai");
    
    const result = await generateText({
      model: modelId,
      system: systemPrompt,
      prompt: JSON.stringify(validatedInput),
    });

    const aiResponse = JSON.parse(result.text);
    
    // Server-side validation of AI response
    if (!aiResponse.session_id || !aiResponse.readiness) {
      throw new Error('Invalid AI response structure');
    }
    
    return NextResponse.json(aiResponse);
    
  } catch (error: any) {
    console.error('Health advice API error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate health advice', detail: error.message },
      { status: 500 }
    );
  }
}