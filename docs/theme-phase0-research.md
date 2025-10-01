# Theme Refactor – Phase 0 Research

_Audit window: 2025-09-30_

## 1. Color Usage Audit
- Command: `rg --files-with-matches --glob '!design-tokens/material3-palettes.generated.json' '#[0-9A-Fa-f]{3,8}' src`
- Direct hex usage detected in:
  - `src/styles/globals.css` – hard-coded per-theme variables and gradient utilities
  - `src/lib/design-tokens.ts` – legacy Tailwind-scale palettes and semantic colors
  - `src/lib/micro-interactions.ts` – fallback shadows/box-shadows using raw RGBA/hex values
  - `src/design-tokens/tokens.json` – existing brand tokens
- Unique hard-coded hex colors (excluding generated palettes):
  - `src/styles/globals.css`: 64 unique values (per-theme surfaces, gradients, utility classes)
  - `src/lib/design-tokens.ts`: 61 unique values (legacy Tailwind-style scales)
  - `src/lib/micro-interactions.ts`: 3 fallback values for shadows/state layers
  - `src/design-tokens/tokens.json`: 3 brand constants still referenced by legacy components
- Risk notes:
  - Fallback hex values in animation utilities will bypass future Material 3 roles; we need token-backed rgba values
  - Legacy Tailwind-like palettes duplicate brand shades already covered by tonal ramps and should be deprecated or migrated
  - Gradients and glass utilities in `globals.css` rely on direct `var(--primary)` mixes that must be redefined once semantic tokens exist

## 2. Material 3 Implementation Constraints
- Required tonal roles per theme: `primary`, `secondary`, `tertiary`, `error`, `neutral`, `neutralVariant` with tones {0,10,20,30,40,50,60,70,80,90,95,99,100}
- Required scheme roles (light + dark):
  - Core: `primary`, `onPrimary`, `primaryContainer`, `onPrimaryContainer`, etc.
  - Surface system: `surface`, `surfaceContainer`, `surfaceContainerHigh`, `surfaceVariant`, `inverseSurface`
  - State/layer roles: `surfaceTint`, `outline`, `outlineVariant`, `shadow`, `scrim`
- Interaction layers must follow Material 3 opacity guidance (4%, 8%, 12% overlays) per state
- Elevation overlay model needs to combine `surface` + `surfaceTint` at alpha depending on elevation level (0–5)
- Typography/shape tokens should align to Material 3 baselines (type scale naming, 8/12 dp corner radii) while preserving existing brand fonts
- Generated palettes live in `src/design-tokens/material3-palettes.generated.json`; all downstream tokens must source from this file

## 3. Mobile Readability Findings & Gaps
- Existing instrumentation: PostHog session tracking via `src/providers/PostHogProvider.tsx` includes device + theme properties but no contrast metrics; follow-up required to log theme usage and perceived brightness events
- Known UX touchpoints impacting mobile readability:
  - Offline queue banners (`src/app/_components/network-status-banner.tsx`) rely on amber accents that can bloom on AMOLED; plan to validate new tertiary palette for alerts
  - Workout cards use glassmorphism overlays that lighten under sunlight; need state-layer tokens with higher opacity for light themes
  - Form inputs and FAB shadows use hard-coded rgba values in `src/lib/micro-interactions.ts`; these require tokenized opacity adjustments to avoid glare at 400+ lux environments
- Data gaps: no central repository of QA brightness/contrast notes. Next action is to coordinate with QA to log readings (nit levels, lux) during field tests and attach to PostHog events (`theme_audit` proposal)

## Next Checkpoints
- Phase 1 work should replace hard-coded palettes in `src/lib/design-tokens.ts` with references to generated tonal palettes
- Define semantic CSS custom properties for Material 3 roles and plan migration of animation fallbacks
- Schedule mobile QA session to gather empirical readability data before rolling out updated themes
