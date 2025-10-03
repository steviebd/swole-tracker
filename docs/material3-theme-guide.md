# Material 3 Theming Guide

> Developer-facing guidance for maintaining Swole Tracker’s Material 3 themes across light, dark, cool, warm, and neutral modes.

## Source of Truth
- **Palettes** live in `src/design-tokens/material3-palettes.generated.json`. Every theme exposes tonal values (`0 – 100`) plus paired light/dark schemes.
- **Build pipeline**: run `bun run tokens:build` to regenerate `material3-palettes.generated.json` (from base values) and compile `src/styles/material3-tokens.css`.
- **Semantic access**: components should consume roles from `~/lib/design-tokens` (e.g. `getSemanticTokens`, `surfaceTokens`) instead of hard-coded CSS variables.

## Editing Palettes Safely
1. Update the seed data (see `src/design-tokens/component-variants.ts` or palette JSON if adjusting direct tones).
2. Execute `bun run tokens:build`.
3. Review the diff in both JSON + CSS outputs to confirm expected tonal shifts only.
4. Run the contrast test suite:  
   ```bash
   bun run test -- src/__tests__/design-tokens/material3-theme.test.ts
   ```
5. Spot-check impacted screens with `bun dev` in at least one light theme (Light/Warm) and one dark theme (Dark/Cool).

## Mobile QA Checklist
- **Contrast audit**: Verify primary/secondary actions and tertiary success states in bright gym lighting and dim rooms. All text-on-container pairs should pass WCAG 2.2 AA (contrast tests enforce baseline).
- **Touch feedback**: Ensure interactive elements express state layers (`data-state-layer` attributes) and retain visible focus rings with external keyboards.
- **Reduced motion**: Toggle motion preferences (`Settings → Accessibility → Reduce Motion`) and confirm Theme Selector + dashboard transitions fall back to static states.
- **Elevation overlays**: Inspect elevated cards under Dark/Cool themes—`--md-sys-elevation-level*` tokens should be visible without flattening content.
- **Offline skeletons**: Load the dashboard in offline mode; skeleton/text contrast should remain compliant in every theme.

## Rollout & Tooling
- **Documentation updates**: log rationale for palette adjustments in `DESIGN_MANIFESTO.md` and keep this guide in sync.
- **Tests to run before deploy**:
  - `bun run tokens:build`
  - `bun run test -- src/__tests__/design-tokens/material3-theme.test.ts src/__tests__/components/theme-selector.test.tsx src/__tests__/hooks/use-reduced-motion.test.ts`
  - `bun check`
- **Telemetry**: after deployment, monitor PostHog theme usage events and accessibility feedback tickets for the first 48 hours.
- **Feature flags**: for major palette reshuffles, consider wrapping theme toggles in a percentage rollout to gather user sentiment gradually.

## Common Pitfalls
- Forgetting to rerun the build script after editing JSON seeds → stale CSS tokens.
- Introducing motion-only feedback → respect `useReducedMotion` and provide static fallbacks.
- Hard-coding gradient colors → use `--gradient-*` variables (regenerated with tokens) to stay aligned with palette updates.
- Ignoring warm/neutral variants while QA-ing only light/dark → always test at least one warm or neutral scheme before sign-off.

Need help? Reach out in `#design-system` with the palette diff, screenshots, and test output.
