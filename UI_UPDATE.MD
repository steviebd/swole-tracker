Decisions integrated

- Platforms: Android/iPhone prioritized, then Desktop, iPad

- Mode: one-handed quick logging

- Themes: Replace Horizon_wow with three dark-only themes: CalmDark (default), BoldDark (neon gradients), PlayfulDark

- Breaks allowed: data model and routing changes permitted

- KPIs: time-to-log-set, error rate, accessibility score

- Non-negotiables: swipe-to-bottom and drag-moving exercises, offline queue, TRPC/Drizzle, Clerk

- Specifics:

  1. Custom in-app numeric pad with big targets and shortcuts (+2.5/+5/+10, last used)
  2. Right-swipe quick action = Collapse/Expand
  3. Predictive defaults = opt-in via user setting (requires schema + SQL script; pnpm db:push)
  4. Set metadata (RPE, rest) as first-class in UI
  5. Undo duration persistent until next action
  6. Keep heavy backdrop blur even on low-tier Android (maintain look/feel)
  7. BoldDark pushes neon gradients aggressively
  8. AB testing per-session
  9. No specific locales initially

Execution plan with deliverables

Phase 0: Foundations (1–2 weeks) A. Theme split and tokens

- Create base tokens file and three theme variants:

  - tokens/base.css: structure, spacing, radii, elevation scale, shared utilities.
  - tokens/calmdark.css, tokens/bolddark.css, tokens/playfuldark.css: colors, focus rings, motion curves, overlays.

- Refactor globals.css to import base + theme variables via :root[data-theme="CalmDark"|"BoldDark"|"PlayfulDark"].

- Replace all Horizon_wow references in CSS and ThemeProvider; default to CalmDark.

B. ThemeProvider upgrade

- Update enum to “CalmDark”, “BoldDark”, “PlayfulDark”. Keep html.dark + data-theme.
- Add session-based AB flagging support; per-session assignment function.

C. Component primitives

- Buttons (primary/secondary/ghost/destructive): ensure AA+ contrast.
- Inputs (numeric, segmented, steppers): 44px+ targets, smooth focus states.
- Surfaces (card, overlay/sheet, app bar, FAB).
- Toast/Inline notice with persistent undo until next action.

D. Reduced-motion only (keep heavy blur per requirement). Maintain blur stack but ensure GPU-friendly CSS.

Phase 1: Interaction model (2–3 weeks) A. Thumb-first session shell

- Bottom action bar anchored above keyboard: primary quick actions “Add Set”, “Save”, “Complete”.
- Active section (expanded), Parked section (swiped-to-bottom collapsed list). Large targets, right-thumb bias.

B. Gesture UX

- Swipe left → Move to End (existing), Swipe right → Collapse/Expand (new).
- Drag reorder with explicit handle; add subtle haptic-like animations at insertion.
- Show “Moved to End – Undo” inline chip; undo persists until next user action.

C. Custom numeric pad overlay

- Large touch targets (grid), shortcuts: +2.5/+5/+10, “last used”.
- Accessory toggles: unit switch, RPE quick pickers (6–10), rest presets (30/60/90s).
- Opens from any numeric input; returns focus to field; supports hardware keyboard fallback.

Phase 2: Data model and state (1–2 weeks) A. Drizzle schema changes (with SQL)

- sets: add columns rpe (smallint or numeric), rest_seconds (int), perceived_difficulty (enum), is_estimate (boolean), is_default_applied (boolean).
- preferences: add predictive_defaults_enabled (boolean), right_swipe_action (enum; default “collapse_expand”), default_increments JSON (e.g., {kg: [2.5,5,10], lbs: [5,10,20]}).
- sessions: add theme_used (enum), device_type (enum), perf_metrics JSON (for future KPIs).
- Provide SQL migration script and pnpm db:push instructions.

B. TRPC routers/zod

- Update validation schemas and infer types. Extend getLastExerciseData to return per-exercise defaults and last used increments.
- Extend save payload to include metadata fields and version for optimistic conflict resolution.

C. State architecture

- Introduce local reducer store for session page to isolate re-renders.
- Standardize optimistic queue payload versioning for offline queue.

Phase 3: Performance and a11y (1–2 weeks) A. Performance

- Memoize ExerciseCard/SetList; stabilize props.
- Layer promotion with transform and will-change on animated elements.
- Consider windowing for long lists; if not, at least threshold-based lazy rendering.

B. Accessibility

- Ensure contrast ≥ AA for all themes.
- Keyboard and screen reader support: all gesture-only actions have visible equivalents; ARIA for sheets/modals; focus management when numeric pad opens/closes.

Phase 4: Themes BoldDark and PlayfulDark (1 week)

- BoldDark: neon gradients, brighter focus, snappier motion; still readable in dim environments.
- PlayfulDark: softer hues, spring motion with bounded overshoot; maintain contrast checks.

Phase 5: Telemetry and rollout (ongoing)

- Instrument KPIs: time-to-log-set (focus→save), validation error counts, a11y checks (axe), runtime markers for FPS during interactions.
- AB test per-session between CalmDark baseline and Bold/Playful variations or gesture tweaks.
- Iterate based on metrics.

Key code changes, at a glance

- ThemeProvider.tsx: new theme enum, AB assignment, session-tagging.
- styles: split globals.css, create tokens/*.css, refactor glass utilities to base tokens, implement theme overrides.
- Session UI: rewrite WorkoutSession layout, update ExerciseCard to support right-swipes and persistent Undo; update SetList to open numeric pad overlay.
- New components: NumericPadOverlay, UndoChip, BottomActionBar.
- Drizzle migrations + TRPC schema updates as above.

SQL and commands

- Prepare a migration SQL file with all column additions and enums.
- Run pnpm db:generate; pnpm db:push (or your alias pnpm db:push).
- Update routers/types, then pnpm check.

Open confirmations before implementation

1. Numeric pad design: grid 3x4 layout with dedicated shortcut row (+2.5/+5/+10, last used). Confirm inclusion of backspace, clear, and +/- toggle.
2. RPE and rest placement: show inline in SetInput row as compact segmented controls, not hidden. Confirm layout: weight | reps | sets | RPE | Rest.
3. Undo persistence: the inline chip remains until any subsequent user action; confirm that navigation also dismisses it without applying undo.
4. Right-swipe sensitivity: adopt same thresholds as left-swipe or slightly higher to avoid accidental expand/collapse?
5. AB test detail: per-session assignment randomization 50/50 across Calm vs Bold vs Playful or staged (Calm baseline vs one variant at a time)?
