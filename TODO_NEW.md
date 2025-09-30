# New Feature Backlog

- [ ] **Adaptive Progression Playbooks** — Generate 4–6 week progressive overload roadmaps per template, combining recent session data with 1RM/volume trends to auto-populate upcoming workouts and call out expected PR attempts.
  - Key touchpoints: `src/server/api/routers/progress.ts` (new planner endpoints), `src/app/templates` (plan editor UI), `src/lib/ai-prompts/enhanced-health-advice.ts` (extend prompt with block-level context).
- [ ] **Recovery-Guided Session Planner** — Surface a morning "train vs. recover" checklist that merges WHOOP readiness, wellness inputs, and planned workload to recommend the best template or auto-adjust intensity knobs before a workout starts.
  - Key touchpoints: `src/server/api/routers/whoop.ts` (readiness aggregation), `src/app/workout/start` (planner UI), `src/trpc/*` (mutation to persist chosen adjustments).
- [ ] **AI Debrief & Goal Tracking Feed** — After each logged session, push an AI-generated debrief that highlights PRs, adherence, and next focus areas, storing snapshots so users can review streaks and coaching cues over time.
  - Key touchpoints: `src/server/api/routers/health-advice.ts` (persist debrief records), `src/app/workouts/[id]` (post-session panel), `src/lib/analytics` (track engagement).
- [ ] **Offline Conflict Resolution Center** — Provide a dedicated screen to review queued offline actions, resolve merge conflicts, and retry failed syncs, so heavy travelers trust the offline-first story.
  - Key touchpoints: `src/lib/offline-storage.ts`, `src/lib/mobile-offline-queue.ts` (expose queue snapshots), `src/app/workouts` (new management UI).
- [ ] **Plateau & Milestone Alerts** — Detect stalled lifts, forecast time-to-PR, and trigger milestone badges with tailored next steps so lifters stay motivated and see tangible progress.
  - Key touchpoints: `src/server/api/routers/progress.ts` (plateau detection utilities), `src/providers/PostHogProvider.tsx` / `src/lib/posthog.ts` (event tracking), `src/components/notifications` (toast/banner delivery).
