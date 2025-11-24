#!/usr/bin/env node

/**
 * Simple script to trigger master exercise migration via tRPC endpoint
 */

// You'll need to call this manually from the browser console or use curl
// The endpoint is: POST /api/trpc/workouts.migrateMasterExercises

console.log(`
🚀 To trigger the master exercise migration, you have two options:

OPTION 1: Browser Console (Recommended)
----------------------------------------
1. Open your Swole Tracker app in browser
2. Open Developer Console (F12)
3. Run this command:

fetch('/api/trpc/workouts.migrateMasterExercises', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include'
}).then(r => r.json()).then(console.log);

OPTION 2: curl Command
--------------------
curl -X POST http://localhost:8787/api/trpc/workouts.migrateMasterExercises \\
  -H "Content-Type: application/json" \\
  -b "your-session-cookie" \\
  -v

📝 What this migration does:
- Finds all template exercises without master exercise links
- Creates master exercises for them
- Links template exercises to master exercises
- Fixes the key lift toggle UI issue

✅ After migration:
- All exercises will have masterExerciseId
- Key lift toggle will work properly
- Exercise list will show correct data

🎯 Run this once to fix all existing exercises!
`);
