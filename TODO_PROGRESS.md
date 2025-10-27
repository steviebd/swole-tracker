# Progress Page Improvements

## 1. KPI Hero Bar
- [x] Replace existing summary cards with:  
  - [x] Estimated 1RM delta card (uses currently focused Strength exercise; shows current vs start-of-range delta + sparkline).  
  - [x] Intensity card (avg kg/session, RPE or strain proxy; includes prior-span comparison).  
  - [x] Goal completion ring (user target workouts/week; show % complete + tooltip describing target).  
  - [x] Optional slot that surfaces most recent readiness signal (WHOOP recovery or manual energy).  
- [x] Each card displays the section’s current time range label.  
- [x] Add shared utility for tiny sparklines to avoid duplicate SVG logic.

## 2. Highlights Module (Merge Achievements + PRs)
- [x] Create unified `ProgressHighlightsSection` with tabs: `PRs`, `Milestones`, `Streaks`.  
- [x] Consolidate data fetching so a single TRPC query returns recent PRs, milestone events, and streak stats for the selected subfilter.  
- [x] Move motivational banner + badge styles into this module; support capped scroll height with “view all” modal.  
- [x] Ensure tab state is URL-hash aware (#highlights?tab=prs) so scroll spy works.

## 3. Strength Progress Section
- [x] Swap custom SVG for shared chart primitives (axes, tooltips, responsive layout).  
- [x] Add data toggles (Top Set, 1RM Estimate, Session Intensity).  
- [x] Surface secondary metrics: rate-of-change %, best week, session quality tags.  
- [x] Keep independent time range control but show active range in section header.  
- [x] Improve session table (sortable, mobile-friendly stacked rows, includes goal tags).

## 4. Consistency Section Enhancements
- [x] Make calendar adapt to selected range: week view = 7-day strip, month view = current calendar, year view = heatmap timeline.  
- [x] Allow editing target workouts/week inline; persist via preferences API.  
- [x] Add summary chips (“Best week”, “Avg intensity”, “Goal completion %”) tied to hero data.  
- [x] Ensure progress bar recalculates based on user target, not hard-coded 3×.
- [x] Look at exercise data and present linked exercises as one combined option instead of having linked exercises broken into seperate items based on template. Ask questions if needed.

## 5. Readiness & Wellness Cohesion
- [ ] Prioritize WHOOP data: top readiness card shows recovery, strain, recommendation when connected.  
- [ ] When manual wellness exists without WHOOP, render condensed energy/sleep cards in the same slot.  
- [ ] If both exist, display manual entries in a “Manual log” subcard with latest note + trend badges, beneath WHOOP metrics.  
- [ ] Provide dual CTA when neither source is active (connect WHOOP vs enable manual wellness).  
- [ ] Add “Last synced” indicator and refetch button inside section header.

## 6. Navigation & Context
- [ ] Convert quick-link nav to sticky scrollspy; highlight active section based on viewport.  
- [ ] Each section header should include its independent time range label and a “Reset filters” control.  
- [ ] Implement shared hook for section time ranges so hero cards can subscribe when needed.

## 7. Data & API Considerations
- [ ] Review TRPC progress endpoints to ensure batch-friendly responses (merge personal records + achievements query).  
- [ ] Expose intensity/goal completion metrics via `/progress` router (consider chunking strategy limits).  
- [ ] Add tests covering new merged highlights query + strength chart data transforms.

## 8. AI Intelligence Suggestion
- [ ] On workout/session/[id] when you select Accept AI for AI Intelligence, what it does is block out the values of the exercise (weight, rep etc for each set). This behiavour shouldn't happen as it's not a valid use case. You want to 1. When accept AI, it updates the value on the highest set. 2. Allow the user to then free edit the exercise and set/s values without blocking it.
