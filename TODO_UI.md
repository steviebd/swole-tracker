# TODO_UI – Theme Refactor & Color System Overhaul

## Current State Review
- Existing CSS variables in `src/styles/globals.css` define Light, Dark, Cool, Warm, and Neutral themes with custom amber-focused palettes but lack Material 3 tonal structure.
- Design tokens in `src/design-tokens/tokens.json` reference generic `--primary`/`--foreground` variables without separate semantic categories for surfaces, outlines, or container states.
- Theme selector logic (`src/components/ThemeSelector.tsx`) and component styles assume a single accent color path, limiting future palette variance.
- Mobile web currently inherits desktop theming without platform-specific contrast validation or dynamic color adjustments for ambient light.

## Strategic Goals
- Adopt Material 3 color system (primary, secondary, tertiary, neutral, neutral-variant, error) across all five themes while preserving Swole Tracker’s energetic brand voice.
- Deliver first-class mobile experience: ensure contrast on OLED screens, reduce glare in gyms, and validate gestures/touch states across themes.
- Centralize design tokens so semantic color names map cleanly to CSS variables, React components, and charting layers.
- Enable scalable theme authoring with documentation, previews, and automated regression tests.

## Phase 0 – Research & Baseline (Design + Frontend)
- [x] Audit color usage via tooling (`rg`, Stylelint reports, component scanning) to catalog hard-coded colors and legacy gradients. _(see `docs/theme-phase0-research.md`)_
- [x] Benchmark Material 3 implementation requirements (tonal steps, state layers, elevation overlays) and capture constraints in `DESIGN_MANIFESTO.md`.
- [x] Collect mobile-specific feedback (QA notes, analytics) on readability in gyms/night mode to guide palette testing. _(mobile findings logged in `docs/theme-phase0-research.md`)_

## Phase 1 – Material 3 Token Architecture (Design Systems)
- [x] Generate Material 3 tonal palettes (0–100) for brand, neutral, neutral-variant, and error families across all five themes.
- [x] Introduce semantic tokens for states (e.g., `surface-container-high`, `on-primary`, `outline-variant`) and map them to CSS custom properties.
- [x] Define typography, shape, and motion tokens that complement the new color system (updated type scales, state-layer opacity constants).
- [x] Document naming conventions and token layering rules in `DESIGN_MANIFESTO.md` + internal design tools.

## Phase 2 – Theme Implementation (Frontend)
- [x] Refactor `src/styles/globals.css` to derive theme variables from the new semantic tokens for Light, Dark, Cool, Warm, and Neutral modes.
- [x] Rework `src/components/ThemeSelector.tsx` to surface richer previews (e.g., chips/cards showing primary/secondary/tertiary swatches) and ensure the five entry points remain intact.
- [x] Build a token-to-CSS synchronization script (optionally `scripts/generate-theme-tokens.ts`) to prevent drift between JSON tokens and stylesheets.
- [x] Add unit tests or snapshot checks that verify each theme exports required Material 3 roles.

## Phase 3 – Component & Layout Integration (Frontend + Design)
- [ ] Update shared components (buttons, cards, forms, charts) to use semantic tokens rather than direct `--primary` references; ensure state layers comply with Material 3 interaction styles.
- [ ] Refresh gradient utilities and glassmorphism overlays to leverage new tonal mappings while preserving performance.
- [ ] Ensure chart libraries and data viz respect tertiary/neutral roles, including accessibility-friendly color fallbacks for colorblind users.
- [ ] Validate offline/low-power states (e.g., skeleton screens, loading shimmers) against new color specs.

## Phase 4 – Mobile QA & Accessibility (QA + Frontend)
- [ ] Run mobile contrast audits (WCAG 2.2 AA) in bright/dim settings; update tokens where contrast fails.
- [ ] Test touch states, focus rings, and reduced-motion preferences across iOS Safari, Android Chrome, and PWA installs.
- [ ] Implement Material 3 elevation overlays (alpha blends) for dark mode surfaces and verify on OLED devices.
- [ ] Coordinate with accessibility reviewers to validate screen reader announcements and theme switching interactions.

## Phase 5 – Documentation, Tooling, and Rollout (Design Ops)
- [ ] Update `DESIGN_MANIFESTO.md` and developer docs with Material 3 guidelines, palette rationale, and mobile-first considerations.
- [ ] Produce before/after visuals and QA checklist for release notes; ensure marketing assets reflect the new palette.
- [ ] Add automated regression checks (visual diff or Percy) focusing on theming-critical screens (dashboard, workout detail, AI coaching).
- [ ] Plan gradual rollout with feature flagging or staged deployment; gather telemetry on theme usage and performance post-launch.

## Risks & Dependencies
- Tight coupling between components and legacy `--primary` tokens could extend migration; schedule code freeze windows as needed.
- Material 3 compliance may require refactoring chart/third-party components that lack multi-role color support.
- Mobile contrast requirements might necessitate bespoke overrides per theme (e.g., Warm vs Cool) to meet accessibility targets.
- Documentation and test coverage must be updated in lockstep to avoid regressions during future palette tweaks.
