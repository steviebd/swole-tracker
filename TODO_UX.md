## Strength Persona Dashboard Refresh
- [x] Re-theme hero metrics for strength athletes  
  - Promote `StatsCards` ordering: volume → 1RM trend → streak → goal  
  - Update copy/titles to reference strength focus (e.g. “Weekly Volume Lifted”)  
  - Replace generic gradients with strength palette tokens (material3 roles)  
  - Add analytics events when users tap cards to validate engagement
- [x] Refresh `ReadinessHighlight` for strength context  
  - Shift headline/summary language to coaching cues for heavy lifting  
  - Add swipeable tip carousel (“Warm-up focus”, “Suggested intensity”) with reduced-motion fallback  
  - Emit `analytics.event('readiness_tip_opened', ...)` for CTA tracking  
  - Surface “Last synced” timestamp and readiness delta to reinforce recency

## Offline First Sync Improvements
- [x] Extend `EnhancedSyncIndicator` so manual “Sync Now” appears whenever auto retry fails  
  - Reuse `manualSync` & `canManualSync` from hook; ensure button is keyboard focusable  
  - Provide success/error toast feedback tied into existing notification system  
  - Add `aria-live="polite"` status text for screen readers
- [x] Mirror sync affordance in top status bar (`PreferencesStatusBar`/header chip)  
  - When offline or retries pending, show inline button with icon + “Sync now” label  
  - Use design tokens instead of inline color styles; respect dark/light themes  
  - Debounce manual sync invocations to prevent rapid-fire requests

## Readiness Engagement Lift
- [x] Track usage of “View coaching” and “Start session” CTAs  
  - Wrap links with analytics instrumentation and include readiness tone payload  
  - Log when users dismiss tips to understand underutilization
- [x] Introduce compact “Readiness timeline” sparkline under card  
  - Fetch last 7 readiness scores, render touch-friendly slider to view notes  
  - Provide empty state if data missing with prompt to connect Whoop

## Strength Onboarding & Empty States
- [x] Replace `RecentWorkouts` empty state with guided checklist  
  - Steps: “Create strength template”, “Log first session”, “Set weekly goal”  
  - Attach quick links/actions for each checklist item  
  - Persist completion locally so the state celebrates progress
- [x] Inject strength-focused template suggestions into `WorkoutStarter`  
  - Surface recommended upper/lower splits above template list  
  - Show offline badge when sync queue pending and offer manual sync entry point

## Mobile UX Polishing
- [x] Swap alert() usage for inline toast or banner components  
  - Implement strength-themed variant of global toast (uses Material 3 tokens)  
  - Ensure reduced-motion preference skips slide animations  
  - Review all workout start flows for blocking dialogs
- [x] Reorder Quick Actions & mobile nav for strength workflows  
  - Default card sequence: Resume last session, Start Upper, Start Lower, View Progress  
  - On mobile, promote actions into bottom sheet launcher with haptic-friendly tap targets  
  - Add analytics to measure click-through after changes
