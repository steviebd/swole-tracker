# Plateau Feature Debugging Guide

## Quick Browser Console Checks

Copy and paste these into your browser console on the `/progress` page:

### 1. Check if PlateauMilestoneCard is rendering

```javascript
// Check if the component exists in DOM
const card = document.querySelector('[class*="PlateauMilestone"]');
console.log('Card found:', card ? 'YES' : 'NO');
if (!card) {
  console.log('Looking for alternative selectors...');
  const allCards = document.querySelectorAll('[class*="glass-surface"]');
  console.log('Total glass cards found:', allCards.length);
  allCards.forEach((c, i) => {
    console.log(`Card ${i}:`, c.querySelector('h3')?.textContent);
  });
}
```

### 2. Check API data being fetched

```javascript
// Check what the dashboard API returns
fetch('/api/trpc/plateauMilestone.getDashboardData', {
  method: 'GET',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(data => {
  console.log('Dashboard Data:', data);
  if (data.result?.data) {
    const d = data.result.data;
    console.log('Active Plateaus:', d.activePlateaus?.length || 0);
    console.log('Upcoming Milestones:', d.upcomingMilestones?.length || 0);
    console.log('PR Forecasts:', d.prForecasts?.length || 0);
    console.log('Total Key Lifts:', d.summary?.totalKeyLifts || 0);

    if (d.activePlateaus?.length > 0) {
      console.log('Plateaus:', d.activePlateaus);
    }
  }
})
.catch(err => console.error('API Error:', err));
```

### 3. Check your key lifts

```javascript
// Check what exercises are marked as key lifts
fetch('/api/trpc/plateauMilestone.getKeyLifts?input={"json":{"trackingOnly":false,"limit":20,"offset":0}}', {
  method: 'GET',
  credentials: 'include',
})
.then(r => r.json())
.then(data => {
  console.log('Key Lifts Data:', data);
  if (data.result?.data?.keyLifts) {
    const kl = data.result.data.keyLifts;
    console.log(`Found ${kl.length} key lifts:`);
    kl.forEach(lift => {
      console.log(`- ${lift.masterExerciseName || 'Unknown'} (ID: ${lift.masterExerciseId})`);
      console.log(`  Tracking: ${lift.isTracking ? '✅' : '❌'}`);
      console.log(`  Maintenance: ${lift.maintenanceMode ? '🔧' : '✅'}`);
    });
  }
})
.catch(err => console.error('API Error:', err));
```

### 4. Check exercise links for Bench Press

```javascript
// Check if Bench Press has a master exercise link
fetch('/api/trpc/plateauMilestone.checkExerciseLink?input={"json":{"exerciseName":"Bench Press"}}', {
  method: 'GET',
  credentials: 'include',
})
.then(r => r.json())
.then(data => {
  console.log('Exercise Link Check:', data);
  if (data.result?.data) {
    const d = data.result.data;
    console.log('Found:', d.found);
    console.log('Has Link:', d.hasExerciseLink);
    console.log('Has Key Lift:', d.hasKeyLift);
    if (d.diagnosis) {
      console.log('Diagnosis:', d.diagnosis);
    }
    if (d.exerciseLink) {
      console.log('Master Exercise ID:', d.exerciseLink.masterExerciseId);
      console.log('Master Exercise Name:', d.exerciseLink.masterExerciseName);
    }
  }
})
.catch(err => console.error('API Error:', err));
```

### 5. Toggle Bench Press as Key Lift

```javascript
// First, get the master exercise ID from the check above, then:
const masterExerciseId = 123; // REPLACE WITH ACTUAL ID FROM STEP 4

fetch('/api/trpc/plateauMilestone.toggleKeyLift', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    json: {
      masterExerciseId: masterExerciseId,
      action: 'track'
    }
  })
})
.then(r => r.json())
.then(data => {
  console.log('Toggle Result:', data);
  if (data.result?.data?.success) {
    console.log('✅ Key lift enabled!');
    console.log('Message:', data.result.data.message);
    // Reload page to see changes
    setTimeout(() => window.location.reload(), 1000);
  }
})
.catch(err => console.error('Toggle Error:', err));
```

### 6. Check recent workout sessions

```javascript
// Check if you have 3+ Bench Press sessions
fetch('/api/trpc/progress.getExerciseProgression?input={"json":{"exerciseName":"Bench Press","limit":10}}', {
  method: 'GET',
  credentials: 'include',
})
.then(r => r.json())
.then(data => {
  console.log('Workout History:', data);
  if (data.result?.data?.sessions) {
    const sessions = data.result.data.sessions;
    console.log(`Found ${sessions.length} sessions for Bench Press:`);
    sessions.slice(0, 5).forEach((s, i) => {
      console.log(`${i + 1}. ${s.weight}kg × ${s.reps} reps (${s.date})`);
    });

    // Check for plateau pattern
    if (sessions.length >= 3) {
      const last3 = sessions.slice(0, 3);
      const weights = last3.map(s => s.weight);
      const reps = last3.map(s => s.reps);

      const sameWeight = weights.every(w => w === weights[0]);
      const sameReps = reps.every(r => r === reps[0]);

      if (sameWeight && sameReps) {
        console.log('🔴 PLATEAU PATTERN DETECTED!');
        console.log(`Stalled at ${weights[0]}kg × ${reps[0]} reps`);
      } else {
        console.log('✅ Progressing (weight/reps changing)');
      }
    }
  }
})
.catch(err => console.error('API Error:', err));
```

---

## Step-by-Step Debugging Process

1. **Run Check #2 first** - See if dashboard API returns any data
2. **Run Check #3** - See if you have any key lifts configured
3. **Run Check #4** - Verify Bench Press has exercise link
4. **If no key lifts**: Run Check #5 to enable tracking
5. **Run Check #6** - Verify you have 3+ plateau sessions
6. **Run Check #1** - See if card appears in UI

---

## Common Issues & Fixes

### Issue: "Total Key Lifts: 0"
**Fix**: Run Check #5 to enable tracking for Bench Press

### Issue: "Has Link: false"
**Fix**: Run migration in console:
```javascript
fetch('/api/trpc/workouts.migrateMasterExercises', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json()).then(console.log);
```

### Issue: Card shows "Mark exercises as key lifts"
**Fix**: You haven't enabled any key lifts yet. Run Check #5.

### Issue: Less than 3 sessions
**Fix**: Complete more Bench Press workouts (need 3+ sessions at same weight/reps)

---

## Expected Results

Once everything is set up correctly:

1. **Check #2 should return**:
   - `activePlateaus.length >= 1` OR
   - `upcomingMilestones.length >= 1` OR
   - `prForecasts.length >= 1`

2. **Check #3 should show**:
   - "Bench Press" with `isTracking: true`

3. **UI should display**:
   - Card with "Training Insights" header
   - Plateau alerts with recommendations
   - OR milestone progress bars
   - OR PR forecasts

---

## Still Not Working?

Share the console output from Check #2, #3, and #4, and I'll help debug further.
