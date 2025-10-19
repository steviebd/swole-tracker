## Chunking Strategy

- Introduced shared database helpers to stay under Cloudflare D1 variable limits.
- All bulk inserts/updates now use chunked batches (typically <= 90 params per statement).
- Large IN clauses go through `whereInChunks` to avoid exceeding parameter caps.
- Whoop sync, analytics, and debrief generation rely on paging data in manageable slices.
- This design trades a few extra DB round trips for guaranteed success under D1 constraints.
