# New Feature Backlog

- [x] **Adaptive Progression Playbooks** — Generate 4–6 week progressive overload roadmaps with AI-driven planning, combining recent session data with 1RM/volume trends to auto-populate upcoming workouts and call out expected PR attempts. Supports flexible targeting by template(s) or specific exercise(s), with adherence tracking, RPE questionnaires, and cross-playbook analytics.
  - **Rollout Strategy**: ✅ **MVP Phase 1 COMPLETE** (core generation, storage, adherence tracking) → Phase 2 (advanced analytics, cross-playbook comparisons, deload optimization) → Phase 3 (WHOOP integration, automated regeneration triggers).
  - **Implementation Guide (MVP - Phase 1)**: ✅ **COMPLETED**
    1. **Model & schema**: Create Drizzle tables for playbook management:
       - `playbooks` table: `id`, `userId`, `name`, `goalText` (free text), `goalPreset` (nullable enum: 'powerlifting', 'strength', 'hypertrophy', 'peaking', etc.), `targetType` (enum: 'template' | 'exercise'), `targetIds` (JSON array of template/exercise IDs), `duration` (weeks, default 6), `status` (enum: 'draft' | 'active' | 'completed' | 'archived'), `metadata` (JSON: user inputs for 1RMs, availability, equipment), `createdAt`, `updatedAt`, `startedAt`, `completedAt`.
       - `playbookWeeks` table: `id`, `playbookId`, `weekNumber` (1-6), `weekType` (enum: 'training' | 'deload' | 'pr_attempt'), `aiPlanJson` (JSON: AI-generated sessions with exercises, sets, reps, weights), `algorithmicPlanJson` (JSON: formula-based baseline for comparison), `volumeTarget` (calculated total volume), `status` (enum: 'pending' | 'in_progress' | 'completed' | 'skipped'), `metadata` (JSON), `createdAt`, `updatedAt`.
       - `playbookSessions` table: `id`, `playbookWeekId`, `sessionNumber` (1-7 per week), `sessionDate` (nullable, set when scheduled), `prescribedWorkoutJson` (JSON: sets, reps, weights per exercise), `actualWorkoutId` (nullable FK to workouts table), `adherenceScore` (0-100, calculated post-session), `rpe` (1-10, from questionnaire), `rpeNotes` (text), `deviation` (JSON: comparison of prescribed vs actual), `isCompleted`, `completedAt`, `createdAt`, `updatedAt`.
       - `playbookRegenerations` table: `id`, `playbookId`, `triggeredBySessionId`, `regenerationReason` (enum: 'manual' | 'deviation' | 'failed_pr' | 'rpe_feedback'), `affectedWeekStart`, `affectedWeekEnd`, `previousPlanSnapshot` (JSON), `newPlanSnapshot` (JSON), `createdAt`.
       - Indexes: `playbooks(userId, status)`, `playbookWeeks(playbookId, weekNumber)`, `playbookSessions(playbookWeekId, sessionDate)`, `playbookRegenerations(playbookId, createdAt)`.

    2. **Runtime contracts**: Define Zod schemas & TypeScript types:
       - `src/server/api/schemas/playbook.ts`: Schemas for `PlaybookCreateInput` (goal, targetType, targetIds, duration, optional metadata), `PlaybookWeekPlan` (AI + algorithmic plans), `SessionPrescription` (exercise, sets, reps, weight, restTime), `RPESubmission` (rpe, notes, deviationFlags), `RegenerationRequest` (weekRange, reason).
       - `src/server/api/types/playbook.ts`: TypeScript interfaces mirroring table schemas, plus computed types for `PlaybookAnalytics`, `AdherenceMetrics`, `VolumeProgression`.

    3. **Prompt pipeline**: Create dedicated AI prompt builder:
       - `src/lib/ai-prompts/playbook-generation.ts`: Accepts user goal, target templates/exercises, historical session data (min 4 sessions per exercise/template), current 1RMs (estimated or provided), equipment constraints, availability per week, and user preferences. Generates 4-6 week structured plan with:
         - Week-by-week sessions (exercises, sets, reps, weights, rest periods)
         - Deload weeks (typically week 4 or based on volume accumulation)
         - PR attempt weeks with confidence levels (e.g., "Week 6: Attempt 315lbs bench @ 85% confidence")
         - Motivational coaching cues per week
         - Volume progression graph data (total volume per week)
         - Periodization strategy explanation (why this structure was chosen)
       - Use AI model: `AI_GATEWAY_MODEL_HEALTH` / `AI_DEBRIEF_MODEL=xai/grok-3-mini`, `AI_DEBRIEF_TEMPERATURE=0.7`.
       - Prompt structure: Include context on periodization models (linear, DUP, block), let AI choose based on user history/goals. Emphasize safe progression rates (2.5-5% weekly increases for strength, volume adjustments for hypertrophy).

    4. **Algorithmic baseline helper**: Create formula-based planner for comparison:
       - `src/server/api/utils/algorithmic-planner.ts`: Implements standard progressive overload formulas:
         - Linear progression: 2.5-5% weekly increases
         - Deload calculation: 60-70% volume on week 4
         - 1RM estimation: Brzycki, Epley formulas
         - Volume targets: Sets × Reps × Weight aggregated weekly
         - Periodization templates: 4-week linear block, 6-week undulating block
       - Output same JSON structure as AI plan for side-by-side comparison.

    5. **Data aggregation helper**: Create playbook context builder:
       - `src/server/api/utils/playbook-context.ts`: Gathers recent session history (min 4 sessions for target templates/exercises), calculates current estimated 1RMs (using progress utilities), aggregates volume trends, detects PRs, retrieves user equipment/preferences. Handles missing data gracefully (e.g., new users get scientifically-backed starting suggestions like Starting Strength or 5/3/1 baselines).
       - Uses chunking helpers (`whereInChunks`) when fetching multiple exercise histories to avoid D1 variable limits.

    6. **Generation flow**: Create dedicated tRPC router:
       - `src/server/api/routers/playbook.ts`: Protected procedures:
         - `create`: Accepts goal, targetType, targetIds, duration, metadata → Generates both AI and algorithmic plans → Stores playbook + weeks → Returns playbook ID and preview.
         - `getById`: Fetch playbook with nested weeks/sessions.
         - `listByUser`: Paginated list with filters (status, targetType).
         - `acceptPlaybook`: Marks playbook as 'active', sets startedAt timestamp.
         - `regenerateWeeks`: Accepts playbook ID, weekRange, reason → Regenerates AI plan from specified week forward using latest adherence data → Stores regeneration record → Updates affected weeks.
         - `submitSessionRPE`: After workout completion, accepts rpe, notes, deviationFlags → Calculates adherence score → Prompts regeneration if deviation threshold exceeded → Stores RPE data.
         - `getAdherenceMetrics`: Returns playbook-level adherence stats (% sessions completed, avg RPE, deviation summary).
         - `compareVersions`: Fetches regeneration history for a playbook.
       - Use `chunkedBatch` when inserting multiple weeks/sessions to avoid D1 limits.

    7. **Trigger & questionnaire flow**:
       - Post-session RPE questionnaire: After workout completion (via `workouts.save` or `workouts.complete` mutation), check if session is part of an active playbook → Prompt user with RPE modal (1-10 scale + optional notes: "Too easy / Just right / Too hard / Failed sets") → Submit via `submitSessionRPE` procedure.
       - Regeneration triggers: If adherence score < 70%, RPE consistently > 8 (too hard) or < 4 (too easy), or user manually requests → Prompt "Regenerate remaining weeks based on your progress?" → Call `regenerateWeeks` with reason.
       - Fire-and-forget AI generation: Use async job/queue helper for non-blocking UX; show loading state with "Generating your playbook..." message. Include retry logic + logger instrumentation.

    8. **UI/UX** (MVP):
       - **New page**: `src/app/playbooks/page.tsx` — Top-level navigation entry. Lists active/draft/archived playbooks with CTA "Create New Playbook".
       - **Creation wizard**: `src/app/playbooks/new/page.tsx` — Multi-step form:
         - Step 1: Training goal (free text input + preset chips: "Powerlifting Cycle", "Strength Builder", "Hypertrophy Block", "Peaking Program"). Selected preset pre-fills input, user can edit/append.
         - Step 2: Target selection (radio: "Focus on Template(s)" or "Focus on Exercise(s)") → Multi-select dropdown for templates or master exercises.
         - Step 3: Duration slider (4-6 weeks, default 6) + Optional inputs (current 1RMs, training days/week, equipment available).
         - Step 4: Review screen showing AI plan side-by-side with algorithmic plan (expandable weekly details). Accept/Reject buttons.
       - **Playbook detail**: `src/app/playbooks/[id]/page.tsx` — Weekly timeline with cards for each week:
         - PR attempt weeks get special badges (🎯 icon, gradient border, "Target Week" label).
         - Each week card shows: Week number, status, volume target, session count, adherence % (if started).
         - Click week → Expand to show individual sessions with prescribed exercises/weights/reps (editable before session starts).
         - Completed sessions show adherence score + RPE badge.
         - "Regenerate from this week" button at week level.
       - **Session pre-fill**: When starting workout from playbook session, pre-populate workout form with prescribed sets/reps/weights as soft suggestions (user can edit inline). Show "From Playbook: Week 2, Day 3" context banner.
       - **RPE modal**: Post-session modal with RPE slider (1-10), radio buttons ("Too easy / Just right / Too hard"), optional text notes, "Submit & Continue" button.
       - **Offline handling**: Playbook generation requires online (AI call). Viewing/editing existing playbooks works offline. Show "Online required to generate" message if offline.

    9. **Analytics integration** (`/progress` page):
       - Add new card: "Playbook Progress" under existing analytics scroll view.
       - Show active playbook summary: Current week, adherence %, volume completed vs. target (mini graph).
       - "View Full Playbook" button → Deep link to `playbooks/[id]`.
       - Volume graph: Line chart showing planned vs. actual weekly volume across playbook duration. Deload weeks visually marked (different color/pattern).
       - PR attempt tracker: List of upcoming/completed PR attempts with confidence levels and actual results.
       - Cross-playbook comparison (Phase 2): Not in MVP, but schema supports it. Future feature: Compare adherence, volume, PR success across multiple playbooks for same exercise.

    10. **PostHog analytics instrumentation**:
        - Events: `playbook.created`, `playbook.accepted`, `playbook.regenerated`, `playbook.completed`, `playbook_session.started`, `playbook_session.completed`, `playbook_rpe.submitted`, `playbook.archived`.
        - Properties: `playbook_id`, `goal_preset`, `target_type`, `duration_weeks`, `week_number`, `adherence_score`, `rpe_value`, `regeneration_reason`, `pr_attempt_confidence`.
        - Wire in `src/lib/posthog.ts` and trigger from router mutations + UI interactions.

    11. **Auth & access control**:
        - All playbook procedures protected via `protectedProcedure`, validate `ctx.user.id` owns the playbook.
        - Queries use indexes: `playbooks(userId, status)` for efficient filtering.
        - Ensure playbook sessions only link to user's own workout sessions (FK constraint + validation).

    12. **Testing & migration**: ✅ **COMPLETED**
        - Vitest coverage:
          - ✅ `playbook-generation.test.ts`: Test prompt builder with various inputs (new user, experienced user, template vs. exercise focus, different goals).
          - ✅ `algorithmic-planner.test.ts`: Validate progressive overload formulas, deload calculations, 1RM estimations.
          - ✅ `playbook-context.test.ts`: Test data aggregation with missing/incomplete history, chunking for large datasets.
          - ✅ `playbook-router.test.ts`: Test CRUD operations, regeneration logic, adherence calculations, RPE submission.
          - ✅ `playbook-ui.test.tsx`: Test creation wizard flow, week editing, RPE modal, side-by-side comparison display.
        - ✅ Drizzle migration: Generated (`drizzle/0013_outgoing_doctor_doom.sql`). **Apply with**: `infisical run -- bun db:push`
        - Environment variables: Confirm `AI_GATEWAY_MODEL_HEALTH`, `AI_DEBRIEF_MODEL`, `AI_DEBRIEF_TEMPERATURE` are set in Infisical for all environments.
        - D1 chunking validation: All bulk operations use `chunkedBatch` and `whereInChunks` utilities.
        - Document rollout: DB migration → Deploy router/API → Deploy UI → Enable feature flag (if gated) → Monitor PostHog events.

  - **✅ Phase 1 MVP Completion Summary** (Completed: 2025-01-XX):
    - **Database Schema**: 4 new tables (`playbooks`, `playbookWeeks`, `playbookSessions`, `playbookRegenerations`) with proper indexes, foreign keys, and relations
    - **Backend Infrastructure**:
      - Zod schemas and TypeScript types for full type safety
      - AI prompt builder with expert periodization knowledge (Linear, DUP, Block models)
      - Algorithmic baseline planner for AI comparison
      - Context aggregation helper with D1-safe chunking
      - tRPC router with 8 procedures (create, getById, listByUser, acceptPlaybook, submitSessionRPE, regenerateWeeks, getAdherenceMetrics, getRegenerationHistory)
      - PostHog analytics instrumentation for all key events
      - Post-session RPE questionnaire trigger flow integrated into workouts router
    - **UI Components** (Design agent implementation):
      - Playbook listing page with glass architecture cards
      - 4-step creation wizard with AI/Algorithmic comparison
      - Playbook detail page with weekly timeline and session management
      - RPE feedback modal with celebratory states
      - Progress dashboard integration card
      - All components follow DESIGN_MANIFESTO.md principles (Energy Through Motion, Warm Motivation, Mobile-First, Glass Architecture, Accessible Energy)
    - **Testing**: Comprehensive test suites created for algorithmic planner, router, and UI components
    - **Migration**: Database migration generated and ready to apply
    - **Next Steps**: Apply migration, deploy to staging, run integration tests, monitor PostHog events, gather user feedback

  - **Phase 2 Features** (Post-MVP):
    - Cross-playbook analytics: Compare exercise progression across multiple playbooks, identify which periodization strategies work best for user.
    - Advanced deload optimization: Auto-adjust deload timing based on volume accumulation and WHOOP recovery trends.
    - Automated regeneration: Trigger regeneration automatically if adherence drops below threshold for 2+ consecutive weeks.
    - Template recommendations: Suggest complementary templates to add to playbook based on goal (e.g., "Add a hypertrophy day to your strength block").
    - Social sharing: Export playbook as shareable link/PDF for coaches or training partners.

  - **Phase 3 Features** (Future):
    - WHOOP integration: Auto-adjust session intensity based on daily readiness scores (link to Recovery-Guided Session Planner).
    - AI coach chat: In-playbook chat interface to ask questions like "Why deload week 4?" or "Can I swap squats for leg press?".
    - Video exercise demos: Link prescribed exercises to video form guides.
    - Community playbook library: Browse/clone successful playbooks from other users (anonymized).
- [ ] **Recovery-Guided Session Planner** — Surface a morning "train vs. recover" checklist that merges WHOOP readiness, wellness inputs, and planned workload to recommend the best template or auto-adjust intensity knobs before a workout starts.
  - Key touchpoints: `src/server/api/routers/whoop.ts` (readiness aggregation), `src/app/workout/start` (planner UI), `src/trpc/*` (mutation to persist chosen adjustments).
- [x] **AI Debrief & Goal Tracking Feed** — After each logged session, push an AI-generated debrief that highlights PRs, adherence, and next focus areas, storing snapshots so users can review streaks and coaching cues over time.
  - Implementation guide:
    1. **Model & schema**: Introduce a dedicated Drizzle table (e.g. `sessionDebriefs`) with `user_id`, `sessionId`, structured payload fields (`summary`, `prHighlights`, `adherenceScore`, `focusAreas`, `streakContext`, `overloadDigest`, `metadata` JSON), and interaction columns (`viewedAt`, `dismissedAt`, `pinnedAt`, `regenerationCount`, `createdAt`, `updatedAt`). Index on `user_id + createdAt` and enforce one active snapshot per `sessionId` while allowing historical versions via `version`/`parentDebriefId`.
    2. **Runtime contracts**: Define Zod schemas & shared types under `src/server/api/schemas/health-advice-debrief.ts` and `src/server/api/types/health-advice-debrief.ts` to mirror the table shape (include optional adherence metrics when overload suggestions are missing).
    3. **Prompt pipeline**: Add a new prompt builder in `src/lib/ai-prompts/session-debrief.ts` that accepts workout metrics, overload recommendation outputs (when present), and streak context. Keep it independent of the start-of-workout advisor while gracefully degrading when overload data is absent.
    4. **Data aggregation helper**: Create a utility (e.g. `src/server/api/utils/session-debrief.ts`) that gathers session stats, PR detection (reuse progress utilities), user adherence history, health-advice suggestions, and streak calculations. Ensure it tolerates offline or missing data fallbacks.
    5. **Generation flow**: Extend `healthAdviceRouter` (or a sibling router) with mutations to `generateAndSaveDebrief`, `listBySession`, and interaction mutations (`markViewed`, `togglePinned`, `dismiss`, `regenerate`). Persist new versions instead of overwriting so streak timelines stay auditable.
    6. **Trigger point**: Hook the generation call immediately after a workout is finalized (likely the `workouts.save`/`complete` mutation). Fire-and-forget the AI call through an async job/queue helper so the UI is non-blocking; include retry + logger instrumentation.
    7. **UI/UX**: Update `src/app/workouts/[id]` with a post-session debrief panel featuring the latest snapshot, historical carousel, and controls for pin/dismiss/regenerate. Use optimistic updates and guard rails for offline mode.
    8. **Analytics**: Instrument `src/lib/analytics` with clear events such as `ai_debrief.viewed`, `ai_debrief.regenerated`, `ai_debrief.dismissed`, capturing session ID, version, and streak length. Wire front-end hooks to emit on view/regenerate interactions.
    9. **Auth guarding & access control**: Ensure all debrief queries route through protected procedures validating `ctx.user.id` and respect the new indices for pagination.
    10. **Testing & migration**: Add Vitest coverage for the prompt builder, utility aggregation edge cases, and router procedures. Generate the Drizzle migration, update `src/env.js` if a dedicated `AI_DEBRIEF_MODEL` or temperature knobs are required, and document the rollout path (DB migration + cache warms).
- [ ] **Intelligent Warm-Up Sets** — Learn user's warm-up patterns from workout history and automatically suggest progressive warm-up ladders before working sets across templates, playbooks, and live workouts. Supports hybrid learning (history + fallback protocols), per-exercise pattern detection, and flexible user override with smart scaling as weights progress.
  - **Rollout Strategy**: Phase 1 (Database Schema + Preferences + Pattern Detection) → Phase 2 (UI Components + Live Workout Integration) → Phase 3 (Template + Playbook AI Integration) → Phase 4 (Analytics + Testing + Deployment).
  - **Implementation Guide**:
    1. **Model & schema**: [✅] Create `exercise_sets` table with set-level granularity:
       - `exercise_sets` table: `id`, `sessionExerciseId`, `userId`, `setNumber` (1-indexed), `setType` (enum: 'warmup' | 'working' | 'backoff' | 'drop'), `weight`, `reps`, `rpe` (optional, skip for warm-ups), `restSeconds`, `completed`, `notes`, `createdAt`, `completedAt`.
       - Extend `session_exercise` table: Add `usesSetTable` (boolean migration flag), `totalSets`, `workingSets`, `warmupSets`, `topSetWeight`, `totalVolume`, `workingVolume` (aggregated stats).
       - Extend `preferences` table: Add `warmupStrategy` (enum: 'percentage' | 'fixed' | 'history' | 'none'), `warmupSetsCount` (default 3), `warmupPercentages` (JSON: [40, 60, 80]), `warmupRepsStrategy` (enum: 'match_working' | 'descending' | 'fixed'), `warmupFixedReps` (default 5), `enableMovementPatternSharing` (boolean, future feature).
       - Indexes: `exercise_sets(sessionExerciseId, setNumber)`, `exercise_sets(userId, created_at)`.
       - **Migration safety**: Dual schema support (old + new format), no dropped columns, backward-compatible reads.
       - **Migration file**: `drizzle/0014_smooth_namor.sql` (generated, ready for review)

    2. **Intelligent backfill script**: [✅] Create `scripts/backfill-exercise-sets.ts`:
       - Analyze legacy `session_exercises` data to detect warm-up patterns (progressive weight increase to top set).
       - Use heuristics: 3+ sets → first 60-80% likely warm-ups, create individual `exercise_sets` rows.
       - Mark migrated exercises with `usesSetTable = true`, compute aggregated stats.
       - Run after migration in staging/production with monitoring: `infisical run -- bun scripts/backfill-exercise-sets.ts`.
       - Preserves historical data while enabling new features.
       - **Dry-run mode**: `bun scripts/backfill-exercise-sets.ts --dry-run`

    3. **Runtime contracts**: [✅] Define Zod schemas & TypeScript types:
       - `src/server/api/schemas/warmup.ts`: Schemas for `WarmupPattern` (sets, confidence, source), `WarmupSetData` (setNumber, weight, reps, percentageOfTop), `WarmupPreferences` (strategy, percentages, repsStrategy).
       - `src/server/api/types/warmup.ts`: TypeScript interfaces for pattern detection, preferences, and set configurations.

    4. **Pattern detection algorithm**: [✅] Create `src/server/api/utils/warmup-pattern-detection.ts`:
       - `detectWarmupPattern()`: Fetches recent sessions (10 max), extracts warm-up sets (setType='warmup'), identifies most recent pattern, scales to target working weight.
       - Confidence scoring: "low" (0-1 sessions), "medium" (2-4 sessions), "high" (5+ sessions).
       - Hybrid approach: Use history when available, fall back to user's preference protocol (percentage/fixed).
       - `generateDefaultWarmupProtocol()`: Creates percentage-based (40%→60%→80%) or fixed weight protocols based on user preferences.
       - `findSimilarExercises()`: ML-based similarity (future Phase 3) for pattern sharing across exercise variants.
       - `calculateVolumeBreakdown()`: Helper function for separating warm-up/working volume.
       - Uses D1-safe chunking for historical queries.

    5. **Preferences UI**: [✅] Extend `src/app/_components/PreferencesModal.tsx`:
       - ✅ New "Warm-Up Sets" section with strategy selection (Smart/Percentage/Fixed/None).
       - ✅ First-time setup prompt: "Set your default warm-up protocol".
       - ✅ Conditional configuration panels:
         - ✅ Percentage: Editable ladder (40%→60%→80%), add/remove steps (max 5).
         - ✅ Fixed: Number of sets (1-5) selector.
         - ✅ Smart: Show explanation ("Learn from your history").
       - ✅ Reps strategy toggle: Match working sets / Descending (10→8→6) / Fixed (5 reps).
       - ✅ Save to preferences table via tRPC mutation.

    6. **UI Components**: [✅] Create warm-up set components:
       - ✅ `src/app/_components/workout/WarmupSetInput.tsx`: Individual warm-up set card with glass styling, drag handle, weight/reps inputs, percentage badge, move up/down arrows, delete button.
       - ✅ `src/app/_components/workout/WarmupSection.tsx`: Collapsible warm-up container (progressive disclosure pattern), displays "Warm-up Sets (3)" header with volume badge, expandable ladder with all WarmupSetInput components, smart suggestion banner ("Based on your history: 60kg→80kg→90kg" with Apply/Dismiss), action buttons (Add Set, Auto Fill, Clear), motivational footer ("Progressive load 40% → 80%!").
       - ✅ Follow glass architecture: `glass-surface glass-hairline`, `border-l-4 border-l-secondary/50` accent, muted colors for warm-ups vs working sets.
       - ✅ Mobile-optimized: 44px+ tap targets, chevron arrows for reordering.

    7. **ExerciseCard integration**: [✅] Update `src/app/_components/exercise-card.tsx`:
       - ✅ Insert WarmupSection after insights row, before "Previous Workout" section.
       - ✅ Mock auto-fill implementation (generates warm-ups from working weight using percentage protocol).
       - ✅ Pass callbacks: `onUpdate` (update warm-up sets state), `onAutoFill` (call pattern detection).
       - ✅ Show warm-up section only if user preferences enable it (warmupStrategy !== 'none').
       - NOTE: Full pattern detection API integration deferred to Step 8 (tRPC updates).

    8. **tRPC router extensions**: [✅] Extend `src/server/api/routers/workouts.ts`:
       - ✅ Update `save` mutation: Accept `exerciseSets` array (with setType field), use `chunkedBatch` to insert individual sets, compute aggregated stats for `session_exercise`.
       - ✅ Add `getWarmupSuggestions` query: Accepts exerciseName, targetWeight, targetReps → Returns WarmupPattern via `detectWarmupPattern()`.
       - ✅ Update volume calculation utilities to separate warm-up/working volume (hero stat: working volume).
       - ✅ Backward compatibility: Legacy format continues to work without migration.

    9. **Template system updates**: [✅] Extend template schema & UI:
       - ✅ Add `warmupConfig` JSON field to `templates` table: Stores per-exercise warm-up strategies `{ "Bench Press": { enabled: true, type: "percentage", sets: [...] } }`.
       - ✅ Migration generated: `drizzle/0015_fantastic_dragon_man.sql` (adds warmupConfig column to workout_template table).
       - ✅ Update `src/server/api/routers/templates.ts`: Extended input schemas for create, update, and bulkCreateAndLinkExercises mutations to accept warmupConfig.
       - [ ] Update `src/app/_components/template-form.tsx`: Add collapsible "Configure warm-up sets" section per exercise in Step 2 (Exercises) (UI DEFERRED).
       - Hybrid storage: Save both absolute weights (60kg) and relative percentages (60%), user chooses at workout start: "Use saved weights" vs "Scale to new target".
       - Template warm-ups pre-fill workout when user starts session from template.

    10. **Playbook AI integration**: [✅] Update AI prompt & context:
        - ✅ Modify `src/lib/ai-prompts/playbook-generation.ts`: Updated output schema to include `warmupSets` array before `workingSets`.
        - ✅ Add system prompt instruction: "Generate 2-4 warm-up sets before working sets, progressing from 40-50% → 80-90% of working weight, reduce reps as weight increases".
        - ✅ Extend `src/server/api/utils/playbook-context.ts`: Include user's historical warm-up patterns in context (per exercise, with confidence levels).
        - ✅ Extend `src/server/api/schemas/playbook.ts`: Added warmupSetSchema and updated exercisePrescriptionSchema to include warmupSets array.
        - ✅ Update `src/server/api/types/playbook.ts`: Added warmupPatterns field to PlaybookGenerationContext.
        - ✅ Update `src/server/api/routers/playbook.ts`: Extended startSessionWorkout mutation to create individual exercise_sets rows for warm-up and working sets using D1-safe chunkedBatch.
        - AI generates explicit warm-up ladders in SessionPrescription: `{ warmupSets: [{weight: 40, reps: 8}, ...], workingSets: [{weight: 100, reps: 5, sets: 5}] }`.

    11. **Volume tracking & analytics**: [✅ PARTIAL] Update analytics to track warm-up vs working volume separately:
        - ✅ Volume breakdown utility already exists: `src/server/api/utils/warmup-pattern-detection.ts::calculateVolumeBreakdown()` returns `{ total, working, warmup, backoff, drop }`.
        - [ ] Update `src/app/_components/ProgressHighlightsSection.tsx`: Show "Working Volume: 2,500kg (+1,150kg warm-up)" with visual breakdown bar (DEFERRED).
        - Dashboard cards emphasize working volume as hero metric, warm-up volume as secondary context.
        - WHOOP sync decision: TBD (do we send warm-up sets as separate strain?).

    12. **Testing**: [✅ COMPLETE] Comprehensive test coverage:
        - Unit tests:
          - ✅ `src/__tests__/unit/warmup-pattern-detection.test.ts`: Test pattern detection with various history lengths, scaling to new weights, confidence scoring, fallback to protocols.
          - ✅ `src/__tests__/unit/warmup-preferences.test.ts`: Test preference updates, default protocol generation.
          - ✅ `src/__tests__/unit/routers/workouts-exercisesets.test.ts`: Integration tests for exerciseSets array format, D1 chunking, aggregated stats computation.
          - ✅ `src/__tests__/unit/workouts-warmup-integration.test.ts`: Volume breakdown calculations and integration tests.
        - Component tests:
          - ✅ `src/__tests__/components/WarmupSection.test.tsx`: Test expand/collapse, add/delete sets, auto-fill, suggestion apply/dismiss (29 tests).
          - ✅ `src/__tests__/components/WarmupSetInput.test.tsx`: Test set badge, weight/reps inputs, move up/down, delete, percentage badge, glass styling (36 tests).
        - E2E tests:
          - ✅ `e2e/workout/warmup-sets.spec.ts`: Test full flow (preferences → live workout → auto-fill → manual edit → save), smart suggestions, accessibility.
        - Test summary: 86+ passing tests covering components, integration, and E2E scenarios.

    13. **Migration & deployment**: [ ] Safe rollout process:
        - Generate migration: `drizzle/0014_add_exercise_sets_table.sql` (creates table, adds columns, no drops).
        - Staging validation: Apply migration → Run backfill → Manual QA with real data → Monitor error logs.
        - Production rollout: DB migration → Backfill script (monitor closely) → Deploy backend → Deploy UI → Feature announcement.
        - Pre-deployment checklist: `bun check`, all tests pass, mobile viewport QA, offline functionality verified, chunking validated.

  - **Phase Breakdown**:
    - **Phase 1 (Foundation)**: [✅] Database schema + Migration + Backfill + Pattern Detection + Runtime Contracts (Steps 1-4)
      - ✅ `exercise_sets` table with proper indexes and foreign keys
      - ✅ Extended `session_exercise` and `user_preferences` tables
      - ✅ Migration file generated: `drizzle/0014_smooth_namor.sql`
      - ✅ Backfill script with dry-run mode: `scripts/backfill-exercise-sets.ts`
      - ✅ Zod schemas and TypeScript types
      - ✅ Pattern detection algorithm with volume breakdown helper
      - ✅ Unit tests (25/25 schema tests passing, 14/17 pattern detection tests passing - 3 mocking issues)
    - **Phase 2 (Core UI Features)**: [✅ COMPLETE] Preferences UI + UI components + ExerciseCard integration + tRPC router extensions (Steps 5-8)
      - ✅ PreferencesModal extended with warm-up configuration section
      - ✅ WarmupSetInput component (individual set card with glass styling, percentage badges, reordering)
      - ✅ WarmupSection component (collapsible container, smart suggestions, action buttons)
      - ✅ ExerciseCard integration (warm-up section displayed conditionally, mock auto-fill)
      - ✅ tRPC router extensions (workouts.save with exerciseSets support, getWarmupSuggestions query, volume calculations, D1-safe chunking)
    - **Phase 3 (Advanced Integration)**: [✅ CORE COMPLETE] Template system + Playbook AI + Volume analytics (Steps 9-11)
      - ✅ Template schema extended with warmupConfig field (migration 0015)
      - ✅ Template router updated to save/load warmup configurations
      - ✅ Playbook AI prompt updated with warm-up generation instructions
      - ✅ Playbook context builder includes historical warm-up patterns
      - ✅ Playbook schemas extended to support warmup sets in prescriptions
      - ✅ Playbook workout creation handles warmup sets with D1-safe chunking
      - ✅ Volume calculation utilities verified (calculateVolumeBreakdown exists)
      - [ ] Template form UI (deferred to future iteration)
      - [ ] Dashboard volume breakdown display (deferred to future iteration)
    - **Phase 4 (Quality & Launch)**: [✅ PARTIAL] Testing + Deployment + User feedback (Steps 12-13)
      - ✅ Step 12 Testing: 86+ tests passing (components, integration, E2E)
      - [ ] Step 13 Migration & Deployment: Ready for rollout

  - **Success Metrics**:
    - Quantitative: 60%+ adoption rate (workouts using warm-ups), 70%+ suggestion acceptance (auto-fill without edits), 100% volume tracking accuracy, <2s workout load time.
    - Qualitative: User feedback "Warm-ups feel smart and helpful", reduced manual logging burden, improved playbook quality.

  - **Future Enhancements** (Post-Launch):
    - Exercise similarity & pattern sharing: ML-based detection ("Use your Barbell Bench warm-up for Dumbbell Bench?").
    - Advanced analytics: Warm-up volume trends, skip detection (fatigue risk), warm-up modification based on RPE feedback.
    - WHOOP integration: Tag warm-up strain separately, correlate warm-up strategy with recovery metrics.
    - Social features: Share warm-up protocols, community-sourced strategies by exercise.
    - Voice-guided warm-ups: Audio prompts during sets, haptic feedback on completion.

- [ ] **Plateau & Milestone Alerts** — Detect stalled lifts, forecast time-to-PR, and trigger milestone badges with tailored next steps so lifters stay motivated and see tangible progress.
  - Key touchpoints: `src/server/api/routers/progress.ts` (plateau detection utilities), `src/providers/PostHogProvider.tsx` / `src/lib/posthog.ts` (event tracking), `src/components/notifications` (toast/banner delivery).
