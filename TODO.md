# TODO: Swole Tracker – Dark Theme v1 Implementation & Theming Roadmap

__Repository:__ root\
__Mockup Source:__ `/apps/v1-dark-mode` is sole source of truth\
__Tech Stack:__ Verified with `AGENT.md` – Next.js 15 App Router, Tailwind v4, Drizzle ORM, Clerk Auth

__Conventions:__

- After each major step, run Prettier + `pnpm check` (lint + typecheck) + relevant tests
- Keep commits atomic, with descriptive messages
- Submit PRs by micro-phase; smaller is better
- Shared styles via Tailwind component classes / `@apply` in global CSS for common patterns

---

## Phase 0 – Environment Verification

- [ ] Confirm local install and run:

  - [ ] `pnpm install`
  - [ ] `pnpm dev` (verify dev server)
  - [ ] `pnpm check` (lint + typecheck)
  - [ ] `pnpm test` (unit + component tests)

- [ ] Confirm `/apps/v1-dark-mode` mockup assets (colors, spacing, typography)

---

## Phase 1 – Tailwind v4 Dark Mode & Token Setup (Dark only)

- [ ] Locate `tailwind.config.ts` in project root (`tailwind.config.js` replaced in v4)

- [ ] Set `darkMode: 'class'`

- [ ] Configure `content` paths for Next.js App Router:

  ```ts
  content: [
    './src/**/*.{js,jsx,ts,tsx,mdx}',
    './apps/**/*.{js,jsx,ts,tsx,mdx}'
  ]
  ```

- [ ] Extract tokens from mockup (bg, surface, borders, accents, content colors, overlays)

- [ ] Create shared color tokens in `theme.extend.colors`

- [ ] Add font family from mockup in `theme.extend.fontFamily` (e.g., InterVariable)

- [ ] Shared style utilities:

  - [ ] `.card` class for bg/border/shadow/radius
  - [ ] `.muted-text` class for secondary content
  - Defined in `src/styles/globals.css` with `@apply`

- [ ] Apply `class="dark"` to `<html>` in `src/app/layout.tsx` (server layout)

- [ ] Ensure `<body>` in layout includes `bg-base-100 text-content-100`

---

## Phase 2 – App Shell & Navigation

- [ ] Create `src/app/_components/Sidebar.tsx`:

  - Uses shared style utilities; bg-base-200, border-border-200, sticky
  - Populated with `NavItem` links using `next/link`

- [ ] Create `src/app/_components/NavItem.tsx`:
  - Wraps Next.js `Link`, applies active styles based on `usePathname`

- [ ] Place Sidebar in `src/app/layout.tsx` alongside `<main>`

- [ ] Add `StartWorkoutButton` as shared UI primitive

---

## Phase 3 – Dashboard Skeleton

- [ ] `src/app/page.tsx`:

  - Header row w/ Dashboard title + `StartWorkoutButton`
  - `SummaryCardGrid` with mock data

- [ ] Components:

  - `SummaryCard` & `SummaryCardGrid`
  - `VolumeChart` (Recharts, dynamic import to reduce bundle)
  - `HistoryList` & `HistoryListItem`

- [ ] Apply responsive layout via CSS grid

---

## Phase 4 – Shared UI Primitives

- [ ] `/src/app/_components/ui/`:

  - `Button` (variants: primary, ghost, danger)
  - `Card`
  - `Badge`
  - `Input`, `Label`

- [ ] Use shared classes (`@apply`) for consistency across components

---

## Phase 5 – Accessibility & Theming Polish

- [ ] Global focus states: visible outlines, ring-primary
- [ ] ARIA attributes on navigational landmarks
- [ ] Keyboard navigation QA
- [ ] Tweaks to match mockup contrast/shadow exactly

---

## Phase 6 – Testing

- [ ] Unit/component tests with Vitest + RTL for:

  - Sidebar/NavItem active states
  - SummaryCard + SummaryCardGrid render
  - VolumeChart presence (skip tooltip actual hover in JSDOM)
  - HistoryList render/content

- [ ] Add integration test for Dashboard page

---

## Phase 7 – Cleanup & Docs

- [ ] Remove unused CSS/old components

- [ ] Update README with:

  - Dark mode token structure
  - How to add new themes
  - Development/test commands

- [ ] Final Prettier + lint pass

---

## Phase 8 – Future Work (Post–Dark Mode Launch)

- [ ] Create 4 other themes based on Dark mode structure:

  - Extract token definitions for each
  - Theme switch logic in `ThemeProvider`
  - Persistence in localStorage

- [ ] Implement theme toggle UI

- [ ] Add E2E tests for theme switching

---

### Key Changes from Original TODO.md

- Tailored to __Next.js App Router + Tailwind v4__ (no `index.html`, `main.jsx` assumptions)
- Strict alignment with `/apps/v1-dark-mode` as source of truth
- Micro-phases for PR friendliness
- Shared styles (`@apply`) to reduce repetition
- Unit/component tests match existing `src/__tests__` approach
- Added a clear future Phase 8 for theme expansion

---

If this aligns with your needs, we can now go step-by-step to actually replace your `TODO.md` with this refined breakdown and begin the implementation phases.
