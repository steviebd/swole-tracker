# UI & UX Audit – Swole Tracker

## Stakeholder Priorities
- **Persona focus:** Design first for in-gym mobile athletes; prioritize thumb-friendly interactions, quick scanning, and robust offline behavior.
- **Visual language:** Maintain the existing gradient + glassmorphism brand system; improvements should enhance readability/contrast without changing the aesthetic.
- **Global status:** Surface offline sync queues and health-advice readiness globally (header/status tray) so athletes can check state mid-session.
- **Integrations roadmap:** No additional device partners planned; IA can stay tuned to Supabase data and Whoop insights.
- **Dashboard approach:** Keep a curated homepage layout rather than user-configurable widgets.

## Global Shell & Navigation
- [x] Header (`src/components/dashboard-header.tsx`) only exposes theme toggle, bell, preferences, and avatar; surface primary nav (Dashboard, Workouts, Progress, Templates, Whoop) plus a mobile drawer so athletes can jump flows without relying on browser back.
- Audit gradient/glass treatments for mobile contrast issues. Keep the branded styling but tweak elevation, blur, and overlay opacity so metrics stay legible in all lighting conditions.
- [x] Establish a reusable page shell primitive (breadcrumb, title, actions) instead of hand-rolling one per page (`/workouts`, `/templates`, `/progress`); this keeps heading hierarchy and spacing consistent on small screens.
- Normalize loading and empty states across dashboards. Several views lean on custom `skeleton-*` utilities while others use `<Skeleton>`; align visuals and announce loading state to screen readers.
- Audit focus handling for card grids and large buttons. Quick actions, template cards, and workout cards wrap everything in `<Link>` without explicit focus styles, making keyboard navigation hard to track.
- [x] Elevate offline/persistence cues into the global shell (header badge, sync tray). Components such as `enhanced-sync-indicator` and `offline-workout-manager` should appear consistently across pages.

## / (Home Dashboard)
- Logged-out hero sits inside `motion.div` with dense copy; add a secondary CTA (“Try a demo”) or supporting imagery to communicate value quickly to first-time visitors.
- Logged-in dashboard shows Stats, Quick Actions, Weekly Progress, and Recent Workouts with disparate shadows/gradients. Align card heights, typography, and spacing so the grid feels cohesive while preserving brand gradients.
- [x] Quick actions render as large gradient CTAs; on mobile the three stacked cards feel heavy. Collapse into a horizontal scroll row or compact list for one-handed reach.
- [x] `RecentWorkoutsSection` header renders a button labelled “View all workouts” without navigation; replace it with an actual `<Link>` so athletes can jump to `/workouts` immediately.
- [x] Surface readiness insights (AI coaching highlights, Whoop readiness) on the dashboard so mobile athletes don’t have to open `/progress` during a session.

## /progress
- [x] Sticky glass header consumes vertical space on mobile; shrink padding and move filter controls into a compact toolbar that remains reachable with one thumb.
- [x] Summary cards reuse generic numbers; pair each metric with delta vs. previous period and microcopy describing why the change matters.
- [x] Volume and exercise lists rely on single long scrolls. Introduce tabs or anchored sections (PRs, Consistency, Wellness, Whoop) so athletes can jump without losing context.
- Exercise list lacks filters/search; add quick search, tag filters, and “pin favorites” to help athletes locate key lifts quickly.
- Wellness & Whoop sections show raw metrics; add short “What to do today” blurbs and iconography that connect data to actionable decisions.

## /workouts (History)
- Page header only offers a back button; add filtering (template, date range), quick search, and a sticky mobile action bar for export/repeat.
- Cards vs. table toggle defaults to cards; remember the user’s choice and expose the toggle as a segmented control with accessible labels.
- Card view shows “Best” metric but not duration/volume trends; add badges for PBs, offline sessions, and total sets so mobile users can scan quickly.
- Table view lacks pagination/lazy loading; for heavy data add monthly grouping, virtualized lists, or infinite scroll with year breakpoints.
- Export CSV button fires `refetch` without a strong feedback loop. Add spinner, disable state, and toast/snackbar confirmation once the download starts.

## /workouts/[id] (Session Debrief)
- Header only shows template name/date; add quick stats (total volume, exercises, duration) and highlight achievements/debrief notes inline.
- `SessionDebriefPanel` occupies a single tall column; on larger screens split into summary vs. set breakdown columns while keeping mobile stacked.
- Add contextual actions (“Repeat workout”, “Share summary”) and a banner indicating sync status or AI insights relevant to that session.

## /workout/start
- Template grid lacks search, muscle group filters, or sorting; add filters and quick chips so athletes can find a plan fast between sets.
- Selected template panel can get long; collapse long exercise lists behind “Show full list” accordions to keep the primary actions in view.
- Date/time picker defaults to current moment via native input; offer quick shortcuts (Today AM/PM, Yesterday) and respect locale preferences.
- Provide an explicit “Start freestyle workout” path instead of alerting when no template is selected.
- Surface sync/offline state before navigation so athletes know the session will store locally if the gym has poor reception.

## /workout/session/[id]
- Session page lacks a mobile-friendly information hierarchy; add a sticky subheader with template name, elapsed time, sync status, and “Complete workout” CTA.
- Exercises are virtualized for large templates but lack navigation. Provide a collapsible index or jump menu so athletes can move between muscle groups without endless scrolling.
- Set cards rely on drag & swipe gestures; add visible handles, swipe hints, and keyboard-accessible alternatives to support a range of users.
- Measurement units/RPE toggles live in each set; surface current unit at exercise level and allow bulk overrides.
- Health advice drawer is hidden behind “Get advice.” Preload readiness summary as a chip in the header and show a callout when new guidance is available.
- Add undo/redo or change history affordances so athletes know when edits synced or remain queued offline.

## /workout/session/local/[localId]
- [x] Page displays a message but doesn’t redirect. Add timed redirect to `/workouts`, include guidance on checking the offline queue, and link to support if migration failed.

## /templates
- [x] Template list renders cards vertically; add search, sort (recent, most used), and grouping by tags/muscle groups to help athletes prep mid-session.
- [x] Display quick stats on each card (last used, sessions completed, avg duration) and provide inline duplication actions.
- Replace `window.confirm` deletes with a modal dialog that matches brand styling and offers undo.

## /templates/new & /templates/[id]/edit
- Form is a long scroll; break into sections (Basics, Exercises, Preview) with a sticky mobile stepper that shows progress.
- Exercise rows should expose linked master exercises, drag handles, and quick actions (duplicate, swap) without leaving the page.
- Provide validation summaries and helper text (e.g., recommended rep ranges, rest times) to support less experienced athletes.
- Add a live preview panel estimating session duration/volume so users see the result of their plan.

## /exercises
- Table includes a “Migrate” button without context; show migration status (last run, pending count) and disable when no work is required.
- Equip each exercise row with inline quick actions (rename, merge, tag as favorite) instead of a secondary detail row.
- Introduce tags or muscle group metadata to support search and filtering; extend search to cover those attributes.
- Provide create/edit master exercise flows so admins can add exercises without templating first.

## /connect-whoop
- Page drops users directly into `WhoopWorkouts`; add an overview card summarizing connection state, last sync, and quick re-auth.
- Provide filters (date range, sync status) and inline error badges so athletes instantly spot failed pulls.
- Show a “Connect Whoop” CTA when the athlete arrives without a linked account instead of redirecting to `/`.

## Legal Pages (/privacy, /terms)
- `LegalLayout` injects raw HTML; ensure markdown conversion preserves ordered lists and add a table of contents for long documents.
- Include a breadcrumb/back link to preferences or dashboard, and align “Last updated” placement with compliance expectations.

## Auth Pages (/auth/login, /auth/register)
- Provide password visibility toggles and caps-lock warnings so mobile athletes avoid typos.
- Google sign-in is the primary action; add fallback messaging for regions where OAuth is blocked and surface Supabase errors via toasts.
- Add inline success/error states that auto-focus on the first invalid field, plus CTA buttons sized for mobile reach.
- Ensure layout accommodates mobile keyboards, preventing jumps when alerts appear.

## Error & Edge Pages
- `not-found.tsx` should offer branded navigation chips (“Go home”, “Start workout”, “View templates”) and maintain the app shell so it feels consistent.
- Add a dedicated `/sign-in` route that simply re-exports the login page to avoid broken links.

## Outstanding Questions
- None at this time; priorities and guardrails captured in “Stakeholder Priorities.”
