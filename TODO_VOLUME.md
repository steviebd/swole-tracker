# Volume by Exercise Card - Implementation Plan

## Current Issues
- Card shows aggregate volume data but lacks meaningful progression tracking
- No clear strength progression indicators for individual exercises  
- Missing contextual data about performance improvements over time
- Complex visualizations that don't clearly communicate progress
- Focuses on statistics rather than actionable strength progression data

## New Design Goals

### Primary Focus: Individual Exercise Strength Progression
The card should help users answer: "Am I getting stronger in specific movements?"

### User-Selectable Focus
Allow users to choose their primary focus depending on their training block (e.g., Strength/1RM vs. Hypertrophy/Volume). The card will adapt to highlight the selected focus.

### Key Metrics to Display
1. **Estimated 1RM and Volume Trend** - These are the two most important metrics for tracking strength and workload progression.
2. **Top set performance** for each exercise across sessions.
3. **Recent PRs and achievements** per exercise.

### Data Points for Each Exercise
- Latest 1RM estimate vs. previous sessions
- Volume progression trend (increasing/decreasing/plateau)
- Training frequency per exercise
- Best recent performance (heaviest weight × reps)
- Session-to-session comparison for the selected exercise

### Time-Based Analytics
The default time range view will be Quarter, with options for Month, Year, and Week.
- Quarter-over-quarter strength gains
- Monthly volume progression
- Performance consistency (how often they hit target weights/reps)
- Recovery indicators (performance drops that might indicate overtraining)

## Visual Design Requirements

### Simple, Actionable Visualizations
- **Simple trend lines** showing 1RM progression over time.
- **Volume load charts** showing progressive overload.
- **Performance badges** for recent achievements/PRs.
- **Traffic light indicators** for progression status (improving/maintaining/declining).

### Card Layout Structure
```
┌─ Volume by Exercise ──────────────────────────────────┐
│ [Exercise Selector] [Focus: 1RM ▼] [Time: Quarter ▼]  │
├───────────────────────────────────────────────────────┤
│ Current 1RM: 225kg (+10kg from last quarter) 📈       │
│ Volume Trend: +8.5% ↗                                 │
│ Sessions: 24 (2x/week frequency) ✓                    │
├───────────────────────────────────────────────────────┤
│ [1RM Progression Chart - Simple Line]                 │
├───────────────────────────────────────────────────────┤
│ Recent PRs:                                           │
│ • Dec 15: 220kg x 1 (New 1RM!) 🏆                     │
│ • Dec 8: 200kg x 3 (Volume PR) 💪                     │
├───────────────────────────────────────────────────────┤
│ Top Recent Sets:                                      │
│ • 215kg x 2 (Dec 20) - 97% of 1RM                     │
│ • 200kg x 5 (Dec 18) - 91% of 1RM                     │
│ • 185kg x 8 (Dec 16) - 84% of 1RM                     │
└───────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Backend Data Structure
1. **Update progress router** with new exercise-specific queries:
   - `getExerciseStrengthProgression(exerciseName, timeRange)`
   - `getExerciseVolumeProgression(exerciseName, timeRange)`
   - `getExerciseRecentPRs(exerciseName, timeRange)`
   - `getExerciseTopSets(exerciseName, timeRange)`

2. **New data calculations**:
   - 1RM estimation using Brzycki formula: `weight × (36 / (37 - reps))`
   - Volume load calculation: `sets × reps × weight`
   - Progression trend analysis (linear regression on 1RM over time)
   - Performance consistency scoring

3. **Database queries optimization**:
   - Index on `(user_id, exerciseName, workoutDate)` for fast exercise-specific lookups
   - Aggregate queries for volume load trends
   - Window functions for session-to-session comparisons

### Phase 2: Frontend Component Redesign
1. **Replace VolumeTrackingSection** with new `ExerciseProgressionCard`
2. **Exercise selector dropdown** - populate with user's most trained exercises.
3. **Focus selector dropdown** - allow users to switch between `1RM` and `Volume` focus.
4. **Simple metrics display** - focus on 1RM and volume load trends.
5. **Clean chart implementation** - single line chart for 1RM or Volume progression.
6. **Recent achievements section** - highlight PRs and milestones.

### Phase 3: Enhanced Features
1. **Progression status indicators**:
   - 🟢 Improving (trend > +2% per month)
   - 🟡 Maintaining (trend ±2% per month) 
   - 🔴 Declining (trend < -2% per month)

2. **Placeholder for AI Guidance**:
   - Implement a placeholder function or UI element that, when clicked, informs the user about future AI-powered insights.
   - Example insights: "You're 5kg away from a 2x bodyweight squat!", "Consider deloading - performance down 8% last 2 weeks".

## Database Schema Updates

### New Calculated Fields
```sql
-- Add computed columns or create views
ALTER TABLE session_exercises ADD COLUMN one_rm_estimate DECIMAL(5,2);
ALTER TABLE session_exercises ADD COLUMN volume_load DECIMAL(8,2);
```

### New Indexes
```sql
CREATE INDEX idx_session_exercises_user_exercise_date 
ON session_exercises(user_id, exercise_name, workout_date);
```

## API Endpoints Required

### New tRPC Procedures
```typescript
// Get exercise-specific strength progression
getExerciseProgression: protectedProcedure
  .input(z.object({
    exerciseName: z.string(),
    timeRange: z.enum(["quarter", "month", "year", "week"]),
  }))
  .query(async ({ input, ctx }) => {
    // Return: 1RM estimates, volume load, top sets, PRs
  })

// Get user's top exercises by training frequency
getTopExercises: protectedProcedure
  .input(z.object({
    timeRange: z.enum(["quarter", "month", "year"]),
    limit: z.number().default(10),
  }))
  .query(async ({ input, ctx }) => {
    // Return: Most trained exercises with session counts
  })
```

## Success Metrics
- Users can quickly identify their strongest exercises and their progress trend.
- Clear visualization of strength progression over time, tailored to user's focus.
- Actionable insights about training effectiveness.
- Reduced cognitive load compared to current complex charts.
- Increased user engagement with progress tracking.

## Technical Debt to Address
- Remove complex donut charts and distribution analytics from current implementation.
- Simplify API queries to focus on exercise-specific data.
- Consolidate multiple volume metrics into primary strength indicators.
- Improve mobile responsiveness of charts and data display.

## Future Enhancements
- **Exercise Comparison:** An optional feature to compare progression rates between different exercises.
- **Exercise variation grouping** (e.g., "Squat" includes back squat, front squat).
- **Periodization analysis** (strength vs. hypertrophy phases).
- **Injury risk indicators** based on volume spikes.
- **Integration with WHOOP data** for recovery-adjusted progression.
- **Strength standards integration** (beginner/intermediate/advanced).
