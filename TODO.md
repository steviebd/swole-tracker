  1. Offline/Sync System Gaps

  - Offline queue in src/lib/offline-queue.ts:45 lacks proper retry backoff
  - No conflict resolution for simultaneous edits
  - Missing background sync when app regains connectivity
  - WHOOP sync rate limits may cause data loss during poor connectivity
  - Note we have had breakages (cookies and auth session) that have been refactored previously to local storage which shouldn't happen again.

  2. Mobile Performance Bottlenecks

  - Bundle analysis shows potential code splitting opportunities in workout components
  - React Query cache persistence could be optimized for mobile storage constraints
  - Database queries in src/server/api/routers/workouts.ts could benefit from pagination

  Questions for You

  1. Current Pain Points: What specific performance issues do users report most? (slow loading, sync failures, app crashes?) Slow loading and unresponsiveness
  2. Most Used Features: Which features do users access most frequently at the gym? (workout logging, template selection, timer?) Workout logging and /workout/session/id as the highest trafficked area.
  3. Sync Expectations: When users go offline mid-workout, should changes sync immediately when connection returns or wait for manual trigger? Immediately when the connection returns
  4. Performance Budget: What's your target for initial page load time and workout entry response time? 2 seconds
  5. Device Constraints: Are you seeing issues on older Android devices or low-memory phones? No

