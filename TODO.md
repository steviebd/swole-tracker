# TODO: WHOOP-Informed Workout Advice Feature

Mark off done for each section as you go.

## 1. Architecture & Data Flow

### 1.1 Data Flow Overview
```
WHOOP API → Server Cache → workout/session/[id] → /api/health-advice → AI Gateway → UI
```

### 1.2 Core Components
- [ ] **Server-side WHOOP data fetching** (existing integration)
- [x] **Health advice API route** (`app/api/health-advice/route.ts`)
- [x] **Client-side advice integration** (workout session page)
- [x] **Deterministic math utilities** (`lib/health-calculations.ts`)

### 1.3 Payload Structures

**Input Schema** (`types/health-advice.ts`):
```typescript
export interface HealthAdviceRequest {
  session_id: string;
  user_profile: {
    experience_level: 'beginner' | 'intermediate' | 'advanced';
    min_increment_kg?: number;
    preferred_rpe?: number;
  };
  whoop: {
    recovery_score?: number;      // 0-100
    sleep_performance?: number;   // 0-100
    hrv_now_ms?: number;
    hrv_baseline_ms?: number;
    rhr_now_bpm?: number;
    rhr_baseline_bpm?: number;
    yesterday_strain?: number;    // 0-21
  };
  workout_plan: {
    exercises: Array<{
      exercise_id: string;
      name: string;
      tags: Array<'strength' | 'hypertrophy' | 'endurance'>;
      sets: Array<{
        set_id: string;
        target_reps?: number;
        target_weight_kg?: number;
        target_rpe?: number;
      }>;
    }>;
  };
  prior_bests: {
    by_exercise_id: Record<string, {
      best_total_volume_kg?: number;
      best_e1rm_kg?: number;
    }>;
  };
}
```

**Output Schema**:
```typescript
export interface HealthAdviceResponse {
  session_id: string;
  readiness: {
    rho: number;                    // 0-1
    overload_multiplier: number;    // 0.9-1.1
    flags: string[];               // ['low_recovery', 'good_sleep']
  };
  per_exercise: Array<{
    exercise_id: string;
    predicted_chance_to_beat_best: number;  // 0-1
    planned_volume_kg?: number;
    best_volume_kg?: number;
    sets: Array<{
      set_id: string;
      suggested_weight_kg?: number;
      suggested_reps?: number;
      rationale: string;
    }>;
  }>;
  session_predicted_chance: number;  // 0-1
  summary: string;
  warnings: string[];
}
```

## 2. Environment Configuration

### 2.1 Update `.env.example` ✅
```bash
# Existing AI Gateway (keep unchanged)
AI_GATEWAY_API_KEY=your_key_here
VERCEL_AI_GATEWAY_API_KEY=your_vercel_key_here

# Health/Readiness Feature
AI_GATEWAY_MODEL_HEALTH="xai/grok-3-mini"
AI_GATEWAY_PROMPT_HEALTH="You are a strength coach generating workout load adjustments using WHOOP metrics and prior session data. Always respond with VALID JSON that matches the output_schema below. No prose outside JSON.\n\nGoals:\n- Recommend safe, data-driven overload for today's planned sets (kg or reps)\n- Predict chance to beat session bests\n- Provide concise reasoning and flags\n- Be conservative if metrics are poor or missing; never give unsafe advice\n\nUnits:\n- Use metric (kg)\n- Round load to nearest 2.5 kg unless min_increment_kg is specified\n\nInput contract (you will receive this as the user message JSON):\n{\n  \"session_id\": \"string\",\n  \"user_profile\": {\n    \"experience_level\": \"beginner|intermediate|advanced\",\n    \"min_increment_kg\": number | null,\n    \"preferred_rpe\": number | null\n  },\n  \"whoop\": {\n    \"recovery_score\": number | null,\n    \"sleep_performance\": number | null,\n    \"hrv_now_ms\": number | null,\n    \"hrv_baseline_ms\": number | null,\n    \"rhr_now_bpm\": number | null,\n    \"rhr_baseline_bpm\": number | null,\n    \"yesterday_strain\": number | null\n  },\n  \"workout_plan\": {\n    \"exercises\": [\n      {\n        \"exercise_id\": \"string\",\n        \"name\": \"string\",\n        \"tags\": [\"strength\"|\"hypertrophy\"|\"endurance\"],\n        \"sets\": [\n          {\n            \"set_id\": \"string\",\n            \"target_reps\": number | null,\n            \"target_weight_kg\": number | null,\n            \"target_rpe\": number | null\n          }\n        ]\n      }\n    ]\n  },\n  \"prior_bests\": {\n    \"by_exercise_id\": {\n      \"<exercise_id>\": {\n        \"best_total_volume_kg\": number | null,\n        \"best_e1rm_kg\": number | null\n      }\n    }\n  }\n}\n\nDeterministic algorithm you MUST apply before reasoning:\n1) Compute normalized readiness components (fallback to neutral if missing):\n   let h = hrv_now_ms && hrv_baseline_ms\n     ? clip(hrv_now_ms / hrv_baseline_ms, 0.8, 1.2)\n     : 1.0;\n   let r = rhr_now_bpm && rhr_baseline_bpm\n     ? clip(rhr_baseline_bpm / rhr_now_bpm, 0.8, 1.2)\n     : 1.0;\n   let s = sleep_performance != null ? sleep_performance / 100 : 0.5;\n   let c = recovery_score != null ? recovery_score / 100 : 0.5;\n   let rho = clip(0.4*c + 0.3*s + 0.15*h + 0.15*r, 0, 1);\n   // Optional light dampening for high yesterday_strain (>14): rho -= 0.05 (clip>=0)\n\n2) Overload multiplier (applies to today's planned load):\n   let Delta = clip(1 + 0.3*(rho - 0.5), 0.9, 1.1);\n\n3) Per-set adjustments:\n   - If target_weight_kg exists: new_weight = round_to_increment(target_weight_kg * Delta)\n     Keep reps; optionally adjust reps by ±1 if target_rpe is provided to better match.\n   - If no weight but target_reps exists (e.g., bodyweight): adjust reps by\n       reps' = round(target_reps * Delta)\n     For endurance/very high reps, cap change to ±2 reps.\n   - Respect min_increment_kg if provided; default increment is 2.5 kg.\n\n4) Chance to beat best (per exercise and overall):\n   Define planned_volume = sum(new_weight * target_reps) where numerically valid.\n   Let best_vol = prior_bests[exercise_id].best_total_volume_kg (if present).\n   Let gamma = (best_vol && planned_volume)\n     ? max(0.1, planned_volume / max(1, best_vol))\n     : 1.0; // neutral if missing\n   Probability p_ex = clip(0.5 + 0.35*(rho - 0.5) + 0.15*ln(gamma), 0.05, 0.98)\n   Overall session chance is volume-weighted mean across exercises with volumes,\n   else mean of p_ex.\n\nHelper definitions you must use:\n- clip(x, a, b) = min(max(x, a), b)\n- ln = natural log\n- round_to_increment(x) = nearest user_profile.min_increment_kg or 2.5\n\nSafety & behavior:\n- Never increase load for beginners above +5% in a single day; if Delta would\n  exceed this, cap Delta to 1.05 for experience_level=\"beginner\".\n- If rho < 0.35 or missing critical data (hrv/rhr + recovery_score), prefer no\n  increase; set Delta <= 1.0 and explain why.\n- Do not invent missing numbers; degrade gracefully.\n- If inputs are inconsistent, return warnings and conservative advice.\n- Always include a short coach-style summary and flags.\n- Not medical advice.\n\nOutput schema (respond with EXACTLY this shape):\n{\n  \"session_id\": \"string\",\n  \"readiness\": {\n    \"rho\": number,\n    \"overload_multiplier\": number,\n    \"flags\": string[]\n  },\n  \"per_exercise\": [\n    {\n      \"exercise_id\": \"string\",\n      \"predicted_chance_to_beat_best\": number,\n      \"planned_volume_kg\": number | null,\n      \"best_volume_kg\": number | null,\n      \"sets\": [\n        {\n          \"set_id\": \"string\",\n          \"suggested_weight_kg\": number | null,\n          \"suggested_reps\": number | null,\n          \"rationale\": string\n        }\n      ]\n    }\n  ],\n  \"session_predicted_chance\": number,\n  \"summary\": string,\n  \"warnings\": string[]\n}\n\nFormatting:\n- Return JSON only. No markdown, no extra text.\n- Use concise English, metric units, and conservative tone."

# Optional: AI Gateway Base URL override if needed
# AI_GATEWAY_BASE_URL=https://gateway.ai.vercel.com/v1
```

## 2.2 Update env.t3.gg environment variables ✅
Make sure to ensure that the environment variables created are validated in the project according to AGENT.md

## 3. API Implementation

### 3.1 Create Health Calculations Utility ✅
- [x] **File**: `lib/health-calculations.ts`
```typescript
export function clip(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateReadiness(whoop: WhoopMetrics): {
  rho: number;
  flags: string[];
} {
  const flags: string[] = [];
  
  // Component calculations with fallbacks
  const c = whoop.recovery_score != null ? whoop.recovery_score / 100 : 0.5;
  const s = whoop.sleep_performance != null ? whoop.sleep_performance / 100 : 0.5;
  
  let h = 1.0;
  if (whoop.hrv_now_ms && whoop.hrv_baseline_ms) {
    h = clip(whoop.hrv_now_ms / whoop.hrv_baseline_ms, 0.8, 1.2);
  } else {
    flags.push('missing_hrv');
  }
  
  let r = 1.0;
  if (whoop.rhr_now_bpm && whoop.rhr_baseline_bpm) {
    r = clip(whoop.rhr_baseline_bpm / whoop.rhr_now_bpm, 0.8, 1.2);
  } else {
    flags.push('missing_rhr');
  }
  
  let rho = clip(0.4 * c + 0.3 * s + 0.15 * h + 0.15 * r, 0, 1);
  
  // Optional strain adjustment
  if (whoop.yesterday_strain && whoop.yesterday_strain > 14) {
    rho = Math.max(0, rho - 0.05);
    flags.push('high_strain_yesterday');
  }
  
  // Add descriptive flags
  if (c < 0.6) flags.push('low_recovery');
  if (s < 0.6) flags.push('poor_sleep');
  if (c >= 0.8) flags.push('good_recovery');
  if (s >= 0.8) flags.push('good_sleep');
  
  return { rho, flags };
}

export function calculateOverloadMultiplier(
  rho: number,
  experienceLevel: string
): number {
  let delta = clip(1 + 0.3 * (rho - 0.5), 0.9, 1.1);
  
  // Beginner safety cap
  if (experienceLevel === 'beginner') {
    delta = Math.min(delta, 1.05);
  }
  
  return delta;
}

export function roundToIncrement(
  weight: number,
  increment: number = 2.5
): number {
  return Math.round(weight / increment) * increment;
}
```

### 3.2 Create API Route ✅
- [x] **File**: `app/api/health-advice/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { z } from 'zod';
import { calculateReadiness, calculateOverloadMultiplier } from '@/lib/health-calculations';

export const runtime = 'edge';

const HealthAdviceRequestSchema = z.object({
  session_id: z.string(),
  user_profile: z.object({
    experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
    min_increment_kg: z.number().optional(),
    preferred_rpe: z.number().optional(),
  }),
  whoop: z.object({
    recovery_score: z.number().min(0).max(100).optional(),
    sleep_performance: z.number().min(0).max(100).optional(),
    hrv_now_ms: z.number().positive().optional(),
    hrv_baseline_ms: z.number().positive().optional(),
    rhr_now_bpm: z.number().positive().optional(),
    rhr_baseline_bpm: z.number().positive().optional(),
    yesterday_strain: z.number().min(0).max(21).optional(),
  }),
  workout_plan: z.object({
    exercises: z.array(z.object({
      exercise_id: z.string(),
      name: z.string(),
      tags: z.array(z.enum(['strength', 'hypertrophy', 'endurance'])),
      sets: z.array(z.object({
        set_id: z.string(),
        target_reps: z.number().positive().optional(),
        target_weight_kg: z.number().positive().optional(),
        target_rpe: z.number().min(1).max(10).optional(),
      })),
    })),
  }),
  prior_bests: z.object({
    by_exercise_id: z.record(z.object({
      best_total_volume_kg: z.number().positive().optional(),
      best_e1rm_kg: z.number().positive().optional(),
    })),
  }),
});

function getApiKey(): string {
  const key = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY;
  if (!key) {
    throw new Error('Missing AI gateway API key');
  }
  return key;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedInput = HealthAdviceRequestSchema.parse(body);
    
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

    const modelId = process.env.AI_GATEWAY_MODEL_HEALTH || 'xai/grok-3-mini';
    const systemPrompt = process.env.AI_GATEWAY_PROMPT_HEALTH || 'You are a strength coach. Return JSON.';
    
    const openai = createOpenAI({
      apiKey: getApiKey(),
    });

    const result = await generateText({
      model: openai(modelId),
      system: systemPrompt,
      prompt: JSON.stringify(validatedInput),
      temperature: 0.2,
      maxTokens: 2000,
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
```

### 3.3 Input Validation & Rate Limiting ✅
- [x] Add Zod schemas to `server/api/schemas/health-advice.ts`
- [ ] Implement basic rate limiting using Vercel KV or Upstash Redis
- [x] Add request timeout handling (10s max)

## 4. UI Implementation

### 4.1 Workout Session Page Updates ✅
- [x] **File**: `app/workout/session/[id]/page.tsx`
- [x] Add health advice fetching hook
- [x] Display readiness score and flags prominently
- [x] Show per-set suggestions with accept/override controls
- [x] Add probability visualization (progress bar/gauge)
- [x] Include AI summary and warnings

### 4.2 Health Advice Hook ✅
- [x] **File**: `hooks/useHealthAdvice.ts`
```typescript
'use client';
import { useState, useCallback } from 'react';
import type { HealthAdviceRequest, HealthAdviceResponse } from '@/types/health-advice';

export function useHealthAdvice() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<HealthAdviceResponse | null>(null);

  const fetchAdvice = useCallback(async (request: HealthAdviceRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/health-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch advice');
      }
      
      const data = await response.json();
      setAdvice(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { advice, loading, error, fetchAdvice };
}
```

### 4.3 UI Components
- [ ] **File**: `components/health-advice/ReadinessIndicator.tsx`
- [ ] **File**: `components/health-advice/SetSuggestions.tsx`  
- [ ] **File**: `components/health-advice/ProbabilityGauge.tsx`
- [ ] **File**: `components/health-advice/AISummary.tsx`

## 5. Testing Strategy

### 5.1 Unit Tests ✅
- [x] **File**: `__tests__/unit/health-calculations.test.ts`
```typescript
import { calculateReadiness, calculateOverloadMultiplier, clip } from '@/lib/health-calculations';

describe('Health Calculations', () => {
  test('clip function bounds values correctly', () => {
    expect(clip(0.5, 0.8, 1.2)).toBe(0.8);
    expect(clip(1.5, 0.8, 1.2)).toBe(1.2);
    expect(clip(1.0, 0.8, 1.2)).toBe(1.0);
  });

  test('calculateReadiness with complete data', () => {
    const whoop = {
      recovery_score: 80,
      sleep_performance: 90,
      hrv_now_ms: 50,
      hrv_baseline_ms: 45,
      rhr_now_bpm: 55,
      rhr_baseline_bpm: 60,
    };
    
    const { rho, flags } = calculateReadiness(whoop);
    expect(rho).toBeGreaterThan(0.7);
    expect(flags).toContain('good_recovery');
    expect(flags).toContain('good_sleep');
  });

  test('beginner safety cap applies', () => {
    const delta = calculateOverloadMultiplier(0.9, 'beginner');
    expect(delta).toBeLessThanOrEqual(1.05);
  });
});
```

### 5.2 Integration Tests ✅
- [x] **File**: `__tests__/unit/health-advice-integration.test.ts`
- [x] Test input validation edge cases
- [x] Test safety guardrails (low readiness, beginner caps)
- [x] Schema validation tests
- [x] End-to-end calculation workflow

## 6. Analytics & Logging ✅

### 6.1 Telemetry Events ✅
- [x] **File**: `lib/analytics/health-advice.ts`
```typescript
export function trackHealthAdviceUsage({
  sessionId,
  readiness,
  overloadMultiplier,
  userAcceptedSuggestions,
  modelUsed,
}: {
  sessionId: string;
  readiness: number;
  overloadMultiplier: number;
  userAcceptedSuggestions: number;
  modelUsed: string;
}) {
  // Log to your existing analytics provider
}
```

### 6.2 Logging Strategy ✅
- [x] Log anonymized readiness scores and multipliers
- [x] Track suggestion acceptance rates
- [x] Monitor API response times and error rates
- [x] Track safety cap triggers and blocked advice

## 7. Safety & Guardrails ✅

### 7.1 Server-Side Safety ✅
- [x] Enforce beginner cap server-side (cannot be bypassed by client)
- [x] Block advice when `rho < 0.35`
- [x] Validate AI responses match expected schema
- [x] Log safety interventions via analytics

### 7.2 UI Safety Messaging ✅
- [x] Prominent "Not medical advice" disclaimer
- [x] Conservative messaging for poor readiness
- [x] Clear explanation of overload logic in UI components
- [x] User can override suggestions individually

### 7.3 Data Validation ✅
- [x] Sanitize WHOOP metrics (Zod schema validation with ranges)
- [x] Validate exercise data completeness
- [x] Handle missing/stale data gracefully with fallbacks

## 8. Acceptance Criteria

### 8.1 Performance
- [ ] API responds in <300ms p95 with valid data
- [ ] UI loads without blocking workout start
- [ ] Graceful handling of AI gateway timeouts

### 8.2 Functionality  
- [ ] Model switching works (test with 2+ models from Vercel list)
- [ ] Beginner safety cap never exceeded
- [ ] Poor readiness blocks overload suggestions
- [ ] User can accept/override per-set suggestions

### 8.3 Quality Assurance
- [ ] All tests pass in CI
- [ ] End-to-end session works with real WHOOP data
- [ ] Error states display helpful messages
- [ ] Mobile responsive design

---

## Validation Needed

**Repo-specific assumptions to verify:**
1. Current WHOOP integration endpoints and data shape
2. Existing workout/session data models 
3. How "bests" are currently tracked (volume vs e1RM vs single session)
4. User profile storage (experience level, preferences)
5. Existing analytics/logging infrastructure
6. Current UI component library and styling approach

**Dependencies to confirm:**
- Vercel AI SDK version and configuration
- Zod for validation (or existing validation library)
- Rate limiting approach (KV, Redis, or simple in-memory)
- Analytics provider integration
