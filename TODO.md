# Enhanced Workout Intelligence with Manual Wellness Input

## Overview
Enhance the existing workout intelligence system to optionally collect **2 manual wellness inputs** alongside Whoop integration, store historical wellness data, and provide comprehensive workout intelligence recommendations with improved security and performance.

**CRITICAL EFFICIENCY UPDATE:** Replace real-time WHOOP API calls with database-stored recovery data from webhooks to eliminate unnecessary API calls and improve performance.

## User Requirements & Clarifications
- **Manual Inputs**: Only 2 total inputs (energy_level, sleep_quality) regardless of Whoop integration status
- **Rate Limiting**: Use existing RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR env variable
- **Data Retention**: Keep data indefinitely (no cleanup needed)
- **Duplication**: One wellness entry per session, solve race conditions
- **AI Model**: Use existing AI_GATEWAY_MODEL_HEALTH env variable
- **Real-time**: Eventual consistency is acceptable
- **Mobile**: Optimize for mobile experience
- **Mandatory**: User configurable in preferences
- **Partial Data**: Handle gracefully with 2 inputs
- **Backfill**: No historical backfill, add safeguards against this
- **Timezone**: Use device system time

## Current State Analysis
**Already Implemented:**
- Subjective wellness mapping (`src/lib/subjective-wellness-mapper.ts`)
- Whoop/manual fallback logic (`WorkoutSessionWithHealthAdvice.tsx`)
- Dual API methods (`useHealthAdvice.ts`)
- SubjectiveWellnessModal component
- Enhanced AI prompt system
- WHOOP workout webhooks and storage (`externalWorkoutsWhoop` table)

**Implementation Issue Identified:**
- Health advice currently makes real-time WHOOP API calls for recovery data
- Should use database-stored WHOOP recovery data from webhooks instead
- Need WHOOP recovery webhooks and storage for efficiency

## Implementation Plan

### Phase 0: WHOOP Recovery Data Efficiency (NEW PRIORITY)

#### 0.1 Add WHOOP Recovery Webhooks
**File:** `src/app/api/webhooks/whoop/recovery/route.ts`

```typescript
// Handle WHOOP recovery/sleep webhooks
export async function POST(req: NextRequest) {
  const payload = await verifyWhoopWebhook(req);
  
  // Store recovery data in database instead of real-time API calls
  await storeWhoopRecoveryData(payload);
  
  return NextResponse.json({ success: true });
}
```

#### 0.2 Update Health Advice to Use Database
**File:** `src/app/api/health-advice/route.ts`

```typescript
// REMOVE: Real-time WHOOP API calls
// REPLACE WITH: Database queries for latest recovery data

const latestRecovery = await db.query.whoopRecovery.findFirst({
  where: and(
    eq(whoopRecovery.user_id, user.id),
    gte(whoopRecovery.date, todayMinus3Days) // Get recent data
  ),
  orderBy: desc(whoopRecovery.date)
});

if (latestRecovery) {
  realWhoopData = {
    recovery_score: latestRecovery.recovery_score,
    sleep_performance: latestRecovery.sleep_performance,
    hrv_now_ms: latestRecovery.hrv_now_ms,
    hrv_baseline_ms: latestRecovery.hrv_baseline_ms,
    rhr_now_bpm: latestRecovery.rhr_now_bpm,
    rhr_baseline_bpm: latestRecovery.rhr_baseline_bpm,
    yesterday_strain: latestRecovery.yesterday_strain,
  };
}
```

#### 0.3 Update AI Prompt Documentation
**File:** `src/lib/ai-prompts/enhanced-health-advice.ts`

```typescript
// UPDATE THIS LINE:
// - whoop contains REAL-TIME data automatically fetched from user's connected WHOOP device OR mapped from manual wellness input

// TO THIS:
// - whoop contains HISTORICAL data from database (stored via webhooks) OR mapped from manual wellness input
```

#### 0.4 Performance Benefits
- **Eliminate real-time WHOOP API calls** during health advice generation
- **Reduce API rate limiting** issues with WHOOP
- **Improve response times** for workout intelligence
- **Enable offline capabilities** when WHOOP API is unavailable
- **Historical recovery analysis** for trend tracking
- **More reliable data** (webhooks vs. polling)

### Phase 1: Database Schema Enhancement

#### 1.1 Add WHOOP Recovery Data Storage
```sql
-- Add table for WHOOP recovery/sleep data from webhooks
CREATE TABLE swole-tracker_whoop_recovery (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(256) NOT NULL,
  date DATE NOT NULL,
  
  -- Recovery metrics from WHOOP webhooks
  recovery_score INTEGER CHECK (recovery_score >= 0 AND recovery_score <= 100),
  sleep_performance INTEGER CHECK (sleep_performance >= 0 AND sleep_performance <= 100),
  hrv_now_ms DECIMAL(10,2),
  hrv_baseline_ms DECIMAL(10,2),
  rhr_now_bpm INTEGER,
  rhr_baseline_bpm INTEGER,
  yesterday_strain DECIMAL(5,2),
  
  -- Metadata
  raw_data JSONB, -- Store full WHOOP recovery payload
  timezone_offset VARCHAR(20),
  webhook_received_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, date), -- One recovery entry per user per day
  
  -- Indexes
  INDEX(user_id, date), -- For date-range queries
  INDEX(user_id, webhook_received_at) -- For latest data queries
);
```

#### 1.2 Create Wellness Data Table
```sql
-- Add to drizzle schema
CREATE TABLE swole-tracker_wellness_data (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(256) NOT NULL,
  session_id INTEGER REFERENCES swole-tracker_workout_sessions(id),
  date DATE NOT NULL,
  
  -- Manual wellness inputs (2 total)
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  
  -- Metadata
  device_timezone VARCHAR(50), -- Store device timezone for context
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(), -- Prevent backfill attempts
  
  -- Context
  has_whoop_data BOOLEAN DEFAULT FALSE,
  whoop_data JSONB, -- Store actual Whoop metrics for comparison
  notes TEXT CHECK (LENGTH(notes) <= 500), -- Limit notes length
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints & Security
  UNIQUE(user_id, session_id), -- One wellness entry per session (prevents race conditions)
  CHECK(submitted_at >= created_at - INTERVAL '5 minutes'), -- Prevent historical backfill
  CHECK(date >= CURRENT_DATE - INTERVAL '1 day'), -- Only allow current/recent dates
  
  -- Indexes for performance
  INDEX(user_id, date), -- For historical queries
  INDEX(user_id, session_id), -- For session-specific queries
  INDEX(user_id, submitted_at) -- For chronological ordering
);
```

#### 1.2 Add User Preference for Manual Wellness
```sql
-- Add to existing user preferences/settings table
ALTER TABLE user_preferences ADD COLUMN enable_manual_wellness BOOLEAN DEFAULT FALSE;
```

### Phase 2: Simplified Wellness System

#### 2.1 Update Wellness Data Types
**File:** `src/lib/subjective-wellness-mapper.ts`

```typescript
export interface ManualWellnessData {
  // Only 2 manual inputs for simplicity
  energyLevel: number; // 1-10 (How energetic do you feel?)
  sleepQuality: number; // 1-10 (How well did you sleep?)
  
  // Metadata
  deviceTimezone: string; // Device timezone
  notes?: string; // Optional context
}

export interface WellnessDataEntry {
  id?: number;
  userId: string;
  sessionId?: number;
  date: Date;
  wellnessData: ManualWellnessData;
  hasWhoopData: boolean;
  whoopData?: WhoopMetrics;
  deviceTimezone: string;
  submittedAt: Date;
  notes?: string;
}
```

#### 2.2 Mobile-Optimized Wellness Modal Component
**File:** `src/app/_components/health-advice/ManualWellnessModal.tsx`

**Features:**
- **2 slider inputs only**: Energy Level (1-10), Sleep Quality (1-10)
- **Mobile-optimized**: Large touch targets, thumb-friendly sliders
- **Security**: Rate limiting via RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR
- **Race condition prevention**: Disable submit if already submitted for session
- **Validation**: Client and server-side input validation with Zod
- **Error handling**: Graceful degradation for partial data
- Optional notes field (max 500 chars)
- Quick presets (Great Day: 8,8 | Average: 6,6 | Tough Day: 3,4)
- **Anti-backfill**: Only allow submission for current/recent workouts

### Phase 3: Database Integration

#### 3.1 Wellness Data Router
**File:** `src/server/api/routers/wellness.ts`

**Endpoints:**
```typescript
export const wellnessRouter = createTRPCRouter({
  // Save wellness data for a session
  save: protectedProcedure
    .input(saveWellnessSchema)
    .use(rateLimitMiddleware('wellness_submission')) // Use RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR
    .mutation(async ({ ctx, input }) => {
      // SECURITY: Always filter by user_id
      // RACE CONDITIONS: Use INSERT ON CONFLICT DO NOTHING or UPDATE
      // VALIDATION: Validate timezone, prevent backfill
      // ERROR HANDLING: Graceful failure with meaningful messages
    }),
    
  // Get wellness data for a session
  getBySessionId: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      // SECURITY: Filter by user_id AND session ownership
      // PERFORMANCE: Use indexed query on (user_id, session_id)
      return await ctx.db.query.wellnessData.findFirst({
        where: and(
          eq(wellnessData.userId, ctx.user.id),
          eq(wellnessData.sessionId, input.sessionId)
        )
      });
    }),
    
  // Get wellness history for trend analysis
  getHistory: protectedProcedure
    .input(z.object({ 
      limit: z.number().min(1).max(100).default(30), // Prevent excessive queries
      offset: z.number().min(0).default(0),
      startDate: z.date().optional(),
      endDate: z.date().optional()
    }))
    .query(async ({ ctx, input }) => {
      // SECURITY: Always filter by user_id
      // PERFORMANCE: Use indexed query on (user_id, date)
      // PAGINATION: Limit results to prevent large payloads
      const { limit, offset, startDate, endDate } = input;
      
      return await ctx.db.query.wellnessData.findMany({
        where: and(
          eq(wellnessData.userId, ctx.user.id),
          startDate ? gte(wellnessData.date, startDate) : undefined,
          endDate ? lte(wellnessData.date, endDate) : undefined
        ),
        orderBy: desc(wellnessData.date),
        limit,
        offset
      });
    }),
    
  // Get wellness statistics/trends
  getStats: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      // Return average scores, trends, correlations
    }),
    
  // Delete wellness data
  delete: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Soft delete or hard delete wellness data
    })
});
```

#### 3.2 Health Advice Integration
**File:** `src/server/api/routers/health-advice.ts`

**Enhancement:**
- Modify `save` mutation to also save wellness data
- Include wellness data in historical queries
- Link wellness entries to health advice records

### Phase 4: User Preferences Integration

#### 4.1 Settings Modal Enhancement
**File:** `src/app/_components/SettingsModal.tsx`

**Add section:**
```typescript
// Workout Intelligence Settings
<div className="space-y-4">
  <h3>Workout Intelligence</h3>
  
  <label className="flex items-center space-x-2">
    <input 
      type="checkbox" 
      checked={preferences.enableManualWellness}
      onChange={(e) => updatePreference('enableManualWellness', e.target.checked)}
    />
    <span>Include manual wellness input with workout intelligence</span>
  </label>
  
  <p className="text-sm text-gray-600">
    When enabled, you'll be prompted to rate your energy and sleep quality 
    for more personalized workout recommendations (mobile-optimized).
  </p>
</div>
```

### Phase 5: Enhanced Workout Intelligence Flow

#### 5.1 Updated Component Logic
**File:** `src/app/_components/WorkoutSessionWithHealthAdvice.tsx`

**Flow Changes:**
1. Check user preference for manual wellness
2. If enabled + has Whoop: Show simplified modal (2 inputs) alongside Whoop data
3. If enabled + no Whoop: Show simplified modal (2 inputs) as primary data
4. If disabled: Use existing Whoop-only or fallback logic
5. **Rate limiting**: Enforce via RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR
6. **Race condition prevention**: Check if wellness already submitted for session
7. **Mobile optimization**: Touch-friendly interface with haptic feedback
8. Save wellness data to database with anti-backfill validation
9. Include wellness data in health advice request with proper error handling

#### 5.2 Enhanced Hook
**File:** `src/hooks/useHealthAdvice.ts`

**New method:**
```typescript
const fetchAdviceWithManualData = useCallback(async (
  request: Omit<HealthAdviceRequest, 'whoop'>,
  wellnessData: ManualWellnessData,
  whoopData?: WhoopMetrics
) => {
  try {
    // SECURITY: Validate input data with Zod
    // RATE LIMITING: Check rate limits before submission
    // RACE CONDITIONS: Prevent duplicate submissions
    
    // Save wellness data to database (with error handling)
    await trpc.wellness.save.mutate({
      ...wellnessData,
      sessionId: request.sessionId,
      deviceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    // Call health advice API with combined data
    return await fetchHealthAdvice({
      ...request,
      manualWellness: wellnessData,
      whoop: whoopData
    });
  } catch (error) {
    // GRACEFUL DEGRADATION: Continue with available data
    logger.warn('Wellness data submission failed, proceeding with available data', error);
    return await fetchHealthAdvice({ ...request, whoop: whoopData });
  }
}, []);
```

### Phase 6: Progress Dashboard Integration

#### 6.1 Wellness History Component
**File:** `src/app/_components/WellnessHistoryChart.tsx`

**Features:**
- Line chart showing wellness trends over time
- Correlation with workout performance
- Filter by date range
- Export data functionality
- **Mobile-responsive**: Touch-friendly chart interactions

#### 6.2 Enhanced Progress Dashboard
**File:** `src/app/_components/ProgressDashboard.tsx`

**Add section:**
- Wellness trends card
- Correlation insights (wellness vs. workout performance)
- Recommendations based on patterns
- **Mobile layout**: Collapsible sections for small screens

### Phase 7: AI Prompt Enhancement

#### 7.1 Updated Health Advice Prompt
**File:** `src/lib/ai-prompts/enhanced-health-advice.ts`

**Specific Changes Needed:**

1. **Update Input Contract** to include manual wellness data:
```typescript
"manual_wellness": {
  "energy_level": number | null,      // 1-10 (How energetic do you feel?)
  "sleep_quality": number | null,     // 1-10 (How well did you sleep?)
  "has_whoop_data": boolean,
  "device_timezone": string | null,   // User's timezone for context
  "notes": string | null              // Optional user notes (max 500 chars)
},
```

2. **Simplified Readiness Calculation** to incorporate manual wellness:
```typescript
// Update deterministic algorithm section:
1) Simplified readiness computation:
   // Simplified manual wellness integration (2 inputs only)
   let manual_energy = manual_wellness?.energy_level ? manual_wellness.energy_level / 10 : null;
   let manual_sleep = manual_wellness?.sleep_quality ? manual_wellness.sleep_quality / 10 : null;

   // Compute WHOOP-based metrics (existing logic)
   let h = hrv_now_ms && hrv_baseline_ms ? clip(hrv_now_ms / hrv_baseline_ms, 0.8, 1.2) : 1.0;
   let r = rhr_now_bpm && rhr_baseline_bpm ? clip(rhr_baseline_bpm / rhr_now_bpm, 0.8, 1.2) : 1.0;
   let s = sleep_performance != null ? sleep_performance / 100 : 0.5;
   let c = recovery_score != null ? recovery_score / 100 : 0.5;

   // Enhanced readiness calculation based on data availability:
   if (manual_wellness && !manual_wellness.has_whoop_data) {
     // Manual-only mode: Simple 2-input formula
     let manual_composite = (
       (manual_energy || 0.5) * 0.6 +  // Energy is primary indicator
       (manual_sleep || 0.5) * 0.4     // Sleep quality is secondary
     );
     let rho = clip(manual_composite, 0, 1);
   } else if (manual_wellness && manual_wellness.has_whoop_data) {
     // Enhanced mode: Combine WHOOP + 2 manual inputs
     let whoop_readiness = 0.4*c + 0.3*s + 0.15*h + 0.15*r;
     let manual_adjustment = (
       (manual_energy || 0.5) * 0.7 +   // Energy feeling
       (manual_sleep || 0.5) * 0.3     // Sleep feeling vs WHOOP sleep
     );
     // Weighted blend: 75% WHOOP (objective), 25% manual (subjective context)
     let rho = clip(whoop_readiness * 0.75 + manual_adjustment * 0.25, 0, 1);
   } else {
     // WHOOP-only mode (existing logic)
     let rho = clip(0.4*c + 0.3*s + 0.15*h + 0.15*r, 0, 1);
   }
```

3. **Simplified Analysis Instructions**:
```typescript
Simplified Analysis Principles (2-Input Focus):
- When manual wellness data is provided, use it to contextualize WHOOP metrics
- Pay attention to discrepancies between objective (WHOOP) and subjective (manual) data
- If manual energy is low despite good WHOOP metrics, recommend cautious approach
- If manual sleep quality differs significantly from WHOOP sleep, investigate factors
- Use energy level as primary subjective indicator for workout readiness
- Include wellness context in rationale (e.g., "Despite good WHOOP metrics, reported low energy suggests...")
- Factor wellness notes into recommendations when provided
- **Mobile context**: Acknowledge this data was entered on mobile for convenience
```

4. **Enhanced Output Schema** to include wellness context:
```typescript
"wellness_analysis": {
  "data_sources": string[], // ["whoop", "manual"] or ["manual_only"]
  "wellness_flags": string[], // ["energy_mismatch", "sleep_quality_issue", "low_energy_warning"]
  "wellness_notes": string | null, // User's manual notes if provided
  "mobile_entry": boolean // Flag indicating mobile-optimized entry
},
```

5. **Updated Summary Instructions**:
```typescript
Summary Enhancement:
- Acknowledge data sources used (WHOOP + manual vs manual-only)
- Address any discrepancies between objective and subjective data
- Include energy and sleep-specific recommendations
- Mention the value of consistent 2-input wellness tracking for better recommendations
- **Mobile-friendly**: Keep recommendations concise for mobile reading
```

**Complete Integration Example:**
The AI should be able to handle scenarios like:
- "WHOOP shows 85% recovery but you reported feeling drained (3/10 energy) - taking a conservative approach"
- "No WHOOP data available, using your wellness inputs (7/10 energy, 8/10 sleep) for recommendations"
- "Your low energy (4/10) despite good sleep quality (8/10) suggests focusing on lighter intensity today"

### Phase 8: Historical Data & Analytics

#### 8.1 Wellness Analytics Service
**File:** `src/lib/wellness-analytics.ts`

**Functions:**
- Calculate wellness trends
- Identify patterns and correlations
- Generate insights and recommendations
- Export data for external analysis

#### 8.2 Historical Workout Intelligence View
**File:** `src/app/_components/HistoricalWorkoutIntelligence.tsx`

**Features:**
- View past workout intelligence sessions
- See wellness data used for each session
- Compare predicted vs. actual performance
- Learn from historical patterns

## Implementation Priority

### High Priority (MVP)
1. **Database schema creation** with security constraints
2. **Simplified wellness data types** (2 inputs)
3. **Mobile-optimized wellness modal** (2 inputs)
4. **Rate limiting implementation** using existing env variable
5. **Race condition prevention** in database layer
6. **User preference toggle** with secure defaults
7. **Anti-backfill safeguards** in validation layer

### Medium Priority
1. **Wellness data persistence** with proper error handling
2. **Historical wellness queries** with pagination and security
3. **Mobile-optimized progress dashboard** integration
4. **Updated AI prompts** for 2-input model
5. **Performance optimization** for mobile experience

### Low Priority (Future Enhancement)
1. **Advanced analytics** and trend insights
2. **Data export functionality** for user portability
3. **Pattern recognition** for wellness-performance correlations
4. **Expanded inputs** (only if user feedback demands it)
5. **Offline sync** capabilities for mobile

## Technical Considerations

### Security
- **User Isolation**: All wellness data filtered by `user_id` with proper authorization
- **Rate Limiting**: Use RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR for submissions
- **Input Validation**: Zod schemas for client and server validation
- **Anti-Backfill**: Database constraints prevent historical data manipulation
- **Race Conditions**: UNIQUE constraints and proper transaction handling
- **Soft Delete**: Options for data removal with audit trail

### Performance
- **Database Indexes**: Optimized for (user_id, date) and (user_id, session_id) queries
- **Pagination**: Limit results to prevent large payloads (max 100 items)
- **Caching**: React Query for client-side caching with proper invalidation
- **Mobile Optimization**: Minimize network requests, offline support
- **Graceful Degradation**: Continue with available data if wellness submission fails

### UX/UI (Mobile-First)
- **Simplified Interface**: Only 2 inputs for quick mobile entry
- **Touch-Friendly**: Large sliders with haptic feedback
- **Progressive Enhancement**: Works without wellness data
- **Quick Presets**: Tap to select common wellness states
- **Error Handling**: Clear feedback for validation errors

### Testing
- **Unit tests**: Wellness mapping functions, validation logic
- **Integration tests**: Database operations with proper user isolation
- **Security tests**: Rate limiting, authorization, input validation
- **Performance tests**: Database query efficiency, mobile responsiveness
- **E2E tests**: Complete mobile workflow, error scenarios
- **Race condition tests**: Concurrent submission handling

## Success Metrics

### User Engagement
- % of users who enable manual wellness input
- Frequency of wellness data entry
- Correlation between wellness tracking and workout consistency

### Accuracy Improvements
- Comparison of workout performance predictions with/without wellness data
- User satisfaction with enhanced recommendations
- Reduction in workout intelligence errors

### Data Quality
- Completeness of wellness data entries
- Consistency of user inputs over time
- Correlation strength between wellness and performance

## Migration Strategy

### Phase 1: Database Migration
- Create new tables with backward compatibility
- Migrate existing health advice data
- Add user preferences with safe defaults

### Phase 2: Feature Flag Rollout
- Deploy with feature flag disabled by default
- Gradual rollout to beta users
- Monitor performance and user feedback

### Phase 3: Full Release
- Enable for all users with opt-in preference
- Monitor adoption rates and system performance
- Iterate based on user feedback

## Security & Performance Code Review Integration

### Critical Security Requirements
1. **Input Validation**: All wellness data must be validated with Zod schemas
2. **User Authorization**: Every database query filtered by `ctx.user.id`
3. **Rate Limiting**: Implement submission limits using existing environment variables
4. **SQL Injection Prevention**: Use Drizzle ORM parameterized queries only
5. **Data Integrity**: Prevent historical backfill with database constraints

### Performance Optimizations
1. **Database Indexing**: Strategic indexes on (user_id, date) and (user_id, session_id)
2. **Query Optimization**: Limit result sets, use pagination for large datasets
3. **Mobile Performance**: Minimize payload sizes, implement offline caching
4. **Error Handling**: Graceful degradation when wellness data unavailable
5. **Race Condition Prevention**: Use database constraints and proper transaction handling

### Mobile-First Considerations
1. **Touch Interface**: Large, thumb-friendly controls for 2-input system
2. **Network Efficiency**: Batch operations, minimize round trips
3. **Offline Support**: Local storage for when network unavailable
4. **Performance**: Lazy loading, code splitting for mobile bundle size
5. **UX Patterns**: Native mobile patterns for better user experience

## Notes
- This builds on the excellent existing foundation
- Maintains backward compatibility with current Whoop-only users
- Provides clear value proposition for simplified wellness tracking
- Scales to support future analytics and insights features
- **Security-first**: All implementations must pass security review
- **Mobile-optimized**: Primary interface designed for mobile use
- **Performance-focused**: Database and query optimizations throughout