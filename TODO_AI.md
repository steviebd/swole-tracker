# Workout Intelligence / Health Advice Audit (Second Review)

## Overview
- Date: 2025-02-14
- Context: `src/app/workout/session/[id]` AI advice panel (`WorkoutSessionWithHealthAdvice`) plus `/api/health-advice` pipeline.
- Goal: Re-evaluate the "Get Workout Intelligence" flow, confirm data pipelines, and provide a more detailed and comprehensive set of follow-up tasks.

---

## Confirmed Behaviours
- Server route pulls the latest WHOOP recovery + sleep payloads from D1 (2-day lookback) and gracefully falls back to neutral defaults when nothing is stored (`src/app/api/health-advice/route.ts:95-198`).
- Manual wellness submissions are persisted via `api.wellness.save` and reused when fetching advice; values are mapped onto WHOOP-style metrics so the AI path remains consistent (`src/lib/subjective-wellness-mapper.ts:34-112`, `WorkoutSessionWithHealthAdvice.tsx:245-293`).
- Rest guidance already exists at two levels: per-set `suggested_rest_seconds` (rendered inside `SetSuggestions`) and high-level `recovery_recommendations` calculated server-side.

---

## Issues To Address
1.  **WHOOP status mislabelled**
    -   `useHealthAdvice` sets `hasIntegration: !!whoopStatus`, so any resolved query— even when the user never connected— flips the flag to true.
    -   Result: UI shows “Reconnect WHOOP” banners instead of the intended “Quick wellness check” copy when WHOOP was never set up.
    -   File refs:
        -   `src/hooks/useHealthAdvice.ts:415` – bogus `hasIntegration` computation.
        -   `src/app/_components/WorkoutSessionWithHealthAdvice.tsx:457-468` – button label logic relying on `hasIntegration`.

2.  **Suggestion acceptance never persisted**
    -   `handleAcceptSuggestion` updates local state + mutation for sets, but never calls the hook’s `acceptSuggestion`, so `healthAdvice.user_accepted_suggestions` remains 0.
    -   Analytics (`trackHealthAdviceUsage`) therefore under-report actual acceptance.
    -   File refs:
        -   `src/app/_components/WorkoutSessionWithHealthAdvice.tsx:315-399` – missing call to `acceptSuggestion`.
        -   `src/hooks/useHealthAdvice.ts:351-369` – helper that should be invoked.

3.  **Suggestion overrides/rejections not tracked**
    -   `handleOverrideSuggestion` in `WorkoutSessionWithHealthAdvice.tsx` only updates local component state. It does not call the `rejectSuggestion` function from the `useHealthAdvice` hook.
    -   Result: There is no tracking for when a user dismisses or overrides an AI suggestion, leading to an incomplete picture of the feature's utility.
    -   File refs:
        -   `src/app/_components/WorkoutSessionWithHealthAdvice.tsx:401-407` - `handleOverrideSuggestion` is missing a call to `rejectSuggestion`.
        -   `src/hooks/useHealthAdvice.ts:371-394` - The `rejectSuggestion` hook exists but is unused.

4.  **Recovery recommendations hidden** *(UX opportunity)*
    -   API’s `recovery_recommendations` block (when AI path runs) is never displayed.
    -   Users only see per-set rest, missing the longer-form advice about between-session rest/notes.
    -   File refs:
        -   `src/app/api/health-advice/route.ts:600-638` – existing data.
        -   `src/app/_components/WorkoutSessionWithHealthAdvice.tsx` – no consumer for the block.

---

## Suggested Follow-Up Tasks
1.  **Fix WHOOP status flags**
    -   In `src/hooks/useHealthAdvice.ts`, change `hasIntegration` to reflect actual integration presence. A reliable check would be using a dedicated flag from the API like `whoopStatus?.hasEverConnected ?? false`.
    -   Adjust button and modal messaging in `WorkoutSessionWithHealthAdvice` to handle three states cleanly: never connected, disconnected, and actively connected.

2.  **Persist suggestion acceptance and rejection**
    -   In `src/app/_components/WorkoutSessionWithHealthAdvice.tsx`, inside `handleAcceptSuggestion`, invoke the `acceptSuggestion()` hook after the `updateSessionSets` mutation succeeds.
    -   Similarly, in `handleOverrideSuggestion`, invoke `rejectSuggestion()` to ensure overrides are tracked.
    -   Consider adding a toast/inline confirmation so users know the log saved.
    -   Verify `user_accepted_suggestions` column increments and PostHog metrics show correct acceptance and rejection rates.

3.  **Surface recovery recommendations**
    -   In `src/app/_components/WorkoutSessionWithHealthAdvice.tsx`, add a new component (e.g., a `RecoveryCard`) to be rendered beneath the `AISummary`.
    -   This component should display the content of `advice.recovery_recommendations` when present, including rest guidance, between-session interval, and additional notes for fast visibility.

4.  **Code Quality: Refactor `WorkoutSessionWithHealthAdvice`**
    -   The `WorkoutSessionWithHealthAdvice.tsx` component is overly large and handles too many responsibilities (state management, data fetching, rendering, etc.).
    -   **Suggestion:** Break it down into smaller, more focused components. For example, the health advice panel, the modals, and the main workout session could be further isolated. This is a larger task but would improve long-term maintainability.

5.  **Telemetry polish (optional)**
    -   Capture `interactionTimeMs` when accepting/overriding suggestions so `aiSuggestionHistory` keeps richer stats.
    -   If feasible, log when manual wellness is used vs. WHOOP to monitor adoption.

---

## Notes for Implementer
- Re-test the flow with both WHOOP-connected and manual-only profiles (`WorkoutSessionWithHealthAdvice`) after changes.
- Run `bun test` to make sure analytics router + wellness mapper tests still pass if you modify helper functions.
- Remember environment guardrails: health advice endpoint requires WorkOS session, so use existing mocks or storybook-style harness for UI verification.