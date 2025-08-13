  2. Offline/Sync System Gaps

  - Offline queue in src/lib/offline-queue.ts:45 lacks proper retry backoff
  - No conflict resolution for simultaneous edits
  - Missing background sync when app regains connectivity
  - WHOOP sync rate limits may cause data loss during poor connectivity

  3. Mobile Performance Bottlenecks

  - Bundle analysis shows potential code splitting opportunities in workout components
  - React Query cache persistence could be optimized for mobile storage constraints
  - Database queries in src/server/api/routers/workouts.ts could benefit from pagination

  Questions for You

  1. Current Pain Points: What specific performance issues do users report most? (slow loading, sync failures, app crashes?)
  2. Most Used Features: Which features do users access most frequently at the gym? (workout logging, template selection, timer?)
  3. Sync Expectations: When users go offline mid-workout, should changes sync immediately when connection returns or wait for manual trigger?
  4. Performance Budget: What's your target for initial page load time and workout entry response time?
  5. Device Constraints: Are you seeing issues on older Android devices or low-memory phones?

  The agent recommends starting with fixing the missing dependencies, then implementing proper offline queue retry logic with exponential backoff to handle gym WiFi issues.

  Would you like me to create the missing files first, or would you prefer to answer the questions to help prioritize the performance improvements?