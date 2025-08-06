Phase 4: Session UX polish and reliability

- Keyboard and overlay ergonomics: ensure numpad + scroll interactions never conflict, refine return focus paths, improve large-template performance
- Undo/redo breadth: extend undo to cover add/remove set and unit toggles; optional redo
- Accessibility: ARIA roles for overlays, toasts; focus traps; screen-reader labels for swipe actions
- Offline robustness: ensure queue flush/resume telemetry and conflict resolution messages
Proceeding to finish Step 1 and Step 2. I will: 1) wire FocusTrap/useReturnFocus into progression-modal.tsx, progression-scope-modal.tsx, and the two inline modals in workout-session.tsx (delete confirm and complete modal); 2) add conservative virtualization (threshold 20) in workout-session.tsx by rendering a windowed slice around the viewport while preserving keys and focus. Confirm to apply these patches now.

Phase 5: Insights and progression

- Auto-progression recommendations based on RPE and historical trend
- Exercise-level insights: best set, volume, estimated 1RM; simple charts
- Template tuning suggestions (e.g., rest too short/long, RPE too high/low)
- Export/share summaries

Phase 6: Advanced gestures and layout

- Multi-select sets for bulk edits
- Long-press context menu (duplicate set, clear values, set RPE/rest for all)
- True asymmetric gesture preferences per user/exercise
- Horizontal “set lanes” option for dense entry

Phase 7: Integrations and data quality

- Whoop overlay for recovery readiness hints in-session
- Master exercise library curation tools and merge/fix flows
- Data validation hardening (unit consistency, outlier detection with soft prompts)

Phase 8: Performance and platform readiness

- Virtualize long exercise lists; concurrent rendering audits
- PWA installability checks; offline shell routes; background sync tuning
- Fast path metrics: TTI, TBT, input latency dashboards (perf_metrics aggregation)

Phase 9: Security and governance

- Rate-limit tuning per route; abuse scenarios
- Audit logs for workout edits/deletes
- Privacy controls for analytics/telemetry collection

Phase 10: Launch hardening

- E2E passes for gestures, numpad, undo, predictive defaults, offline
- Feature flags and kill switches for new engines
- Migration/rollback playbooks and monitoring dashboards
