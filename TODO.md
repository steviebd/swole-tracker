# TODO – Homepage Refactor to v1-Dark-Mode Mockup

## Phase 0 – Prep & Component Inventory
- [ ] **0.1** Audit current homepage (`src/app/page.tsx`) – list rendered components.
- [ ] **0.2** Cross-reference with mockup sections.
- [ ] **0.3** Decide reuse vs. full rebuild for each component.
- [ ] **0.4** Document current TRPC calls for mock hook replacement.

## Phase 1 – Layout Shell & Theming Foundation
- [ ] **1.1** Create `HomePageLayout` with `ThemeProvider` integration & v1-dark layout classes.
- [ ] **1.2** Move “page chrome” to `HomePageLayout` (header/footer/background).
- [ ] **1.3** Implement container grids/flex wrappers per mockup spacing.
- [ ] **1.4** Add mock hooks: `useMockStats()`, `useMockFeed()` returning type-safe values.

## Phase 2 – Header Rebuild
- [ ] **2.1** Refactor/replace header component to match mockup structure.
- [ ] **2.2** Insert logo/branding exactly as per mockup.
- [ ] **2.3** Integrate & refactor theme toggle using `ThemeProvider`.
- [ ] **2.4** Add mock profile avatar & dropdown (reuse Clerk if possible).

## Phase 3 – Dashboard Body

### 3.1 – Stats/Grid Cards
- [ ] **3.1.1** Design card container layout matching mockup typography & spacing.
- [ ] **3.1.2** Populate with `useMockStats()` output.

### 3.2 – Activity Feed
- [ ] **3.2.1** Refactor or replace `recent-workouts[-trpc].tsx` components.
- [ ] **3.2.2** Apply mockup styling (spacing, borders, shadows).
- [ ] **3.2.3** Populate with `useMockFeed()`.

### 3.3 – Graphs/Visualizations
- [ ] **3.3.1** Create chart container with placeholder chart (chart.js / skeleton div).
- [ ] **3.3.2** Ensure exact margins, legends, colors per mockup.

## Phase 4 – Interactive Modals
- [ ] **4.1** Refactor `PreferencesModal` styling to match mockup.
- [ ] **4.2** Build any extra modal placeholders (progression, settings).
- [ ] **4.3** Confirm accessibility (keyboard/tab focus, ARIA attributes).

## Phase 5 – Footer & Final Layout
- [ ] **5.1** Implement footer design.
- [ ] **5.2** Final spacing, padding, radius, shadows adjustments.
- [ ] **5.3** Pixel-match review against mockup.

## Phase 6 – Dark Mode Fine-Tuning
- [ ] **6.1** Audit Tailwind theme tokens vs mockup dark mode palette.
- [ ] **6.2** Override tokens for exact match.
- [ ] **6.3** Create a light theme from the same mockup and replace both "light" and "dark" with the V1 themes. Rename V1 Dark and V1 Light to just dark and light.
- [ ] **6.4** Test all 5 current themes for parity.

## Phase 7 – Wrap-Up & Checks
- [ ] **7.1** Remove unused/placeholder components.
- [ ] **7.2** Run `pnpm check` (lint + typecheck) and fix issues.
- [ ] **7.3** Write new tests for refactored components.
- [ ] **7.4** Run `pnpm build` & verify.

---

**Execution Rules for Claude CLI:**
- Work in **small subphases** (`Phase.Subphase`).
- Use `~/` imports and strict TS rules from `.clinerules/AGENT.md`.
- Keep mock hooks type-safe and shape-compatible with real TRPC data.
- Avoid deleting original components until new ones are confirmed functional.
- No lint/tests until Phase 7.
- Pixel-perfect match is mandatory.
