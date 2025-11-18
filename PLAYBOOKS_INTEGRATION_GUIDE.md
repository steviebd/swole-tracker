# Playbooks Integration Guide

## Quick Reference: Connecting UI to Backend

This guide shows how to integrate the Playbook UI components with existing workout session flows.

---

## 1. RPE Modal Trigger (Post-Workout)

### Integration Point
**File:** `src/app/workout/session/local/[localId]/page.tsx` (or wherever workout save happens)

### When to Trigger
After `workouts.save` mutation succeeds, check if the response includes `playbookSessionId`.

### Example Integration

```typescript
import { RPEFeedbackModal } from "~/components/playbooks/RPEFeedbackModal";

// In your workout session page component
const [rpeModalOpen, setRpeModalOpen] = useState(false);
const [playbookSessionData, setPlaybookSessionData] = useState<{
  sessionId: number;
  weekNumber: number;
  sessionNumber: number;
} | null>(null);

const saveWorkoutMutation = api.workouts.save.useMutation({
  onSuccess: (data) => {
    // Existing success handling...

    // NEW: Check if this workout was part of a playbook
    if (data.playbookSessionId) {
      setPlaybookSessionData({
        sessionId: data.playbookSessionId,
        weekNumber: data.playbookWeekNumber, // Add to mutation response
        sessionNumber: data.playbookSessionNumber, // Add to mutation response
      });
      setRpeModalOpen(true);
    }
  },
});

// In component return
return (
  <>
    {/* Existing workout UI */}

    {/* RPE Modal */}
    {playbookSessionData && (
      <RPEFeedbackModal
        open={rpeModalOpen}
        onOpenChange={setRpeModalOpen}
        playbookSessionId={playbookSessionData.sessionId}
        weekNumber={playbookSessionData.weekNumber}
        sessionNumber={playbookSessionData.sessionNumber}
        onSuccess={() => {
          // Optional: Refetch playbook adherence metrics
          // Or show additional celebratory UI
        }}
      />
    )}
  </>
);
```

---

## 2. Session Pre-Fill Banner (Start Workout)

### Integration Point
**File:** `src/app/workout/start/page.tsx` (or template selection page)

### When to Show
When user starts a workout from an active playbook session.

### Example Integration

```typescript
import { Alert } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Target } from "lucide-react";

// In your workout start page
const { data: activePlaybook } = api.playbooks.listByUser.useQuery({
  status: "active",
  limit: 1,
  offset: 0,
});

const currentPlaybookSession = activePlaybook?.[0]
  ? getCurrentScheduledSession(activePlaybook[0]) // Helper function
  : null;

// In component return (above template selection)
{currentPlaybookSession && (
  <Alert variant="default" className="mb-6 border-primary bg-primary/5">
    <div className="flex items-center gap-3">
      <Target className="size-5 text-primary" />
      <div className="flex-1">
        <p className="font-semibold">From Playbook: {activePlaybook[0].name}</p>
        <p className="text-sm text-muted-foreground">
          Week {currentPlaybookSession.weekNumber}, Session {currentPlaybookSession.sessionNumber}
        </p>
      </div>
      <Badge variant="default">Scheduled</Badge>
    </div>
  </Alert>
)}
```

### Helper Function Example

```typescript
function getCurrentScheduledSession(playbook: Playbook) {
  // Find the current week (first week with status "active" or "pending")
  const currentWeek = playbook.weeks.find(
    (w) => w.status === "active" || w.status === "pending"
  );

  if (!currentWeek) return null;

  // Find the next uncompleted session
  const nextSession = currentWeek.sessions.find(
    (s) => !s.isCompleted
  );

  if (!nextSession) return null;

  return {
    weekNumber: currentWeek.weekNumber,
    sessionNumber: nextSession.sessionNumber,
    prescribedWorkout: JSON.parse(nextSession.prescribedWorkoutJson),
  };
}
```

---

## 3. Navigation Links

### Add to Main Navigation
**File:** `src/components/layout/navigation.tsx` (or wherever nav is defined)

```typescript
const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/workout/start", label: "Start Workout", icon: Play },
  { href: "/playbooks", label: "Playbooks", icon: Target }, // NEW
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/templates", label: "Templates", icon: Grid },
];
```

### Add to Dashboard Quick Actions
**File:** `src/app/_components/Dashboard.tsx` (or main dashboard)

```typescript
import { Target } from "lucide-react";

// In quick actions section
<Card variant="glass" interactive onActivate={() => router.push("/playbooks")}>
  <CardContent className="flex items-center gap-4 p-6">
    <div className="rounded-full bg-primary/10 p-3">
      <Target className="size-6 text-primary" />
    </div>
    <div>
      <h3 className="font-semibold">Training Playbooks</h3>
      <p className="text-sm text-muted-foreground">
        Structured progression plans
      </p>
    </div>
  </CardContent>
</Card>
```

---

## 4. Backend Schema Updates

### Add to `workouts` table (if not already present)
```sql
-- Migration: Add playbook session reference
ALTER TABLE workouts
ADD COLUMN playbook_session_id INTEGER REFERENCES playbook_sessions(id);

CREATE INDEX idx_workouts_playbook_session
ON workouts(playbook_session_id);
```

### Update `workouts.save` mutation response
**File:** `src/server/api/routers/workouts.ts`

```typescript
// In workouts.save mutation
return {
  id: savedWorkout.id,
  // ... existing fields

  // NEW: Include playbook session info if present
  playbookSessionId: savedWorkout.playbookSessionId,
  playbookWeekNumber: playbookSession?.week.weekNumber,
  playbookSessionNumber: playbookSession?.sessionNumber,
};
```

---

## 5. Playbook Session Linking

### When User Starts Workout from Playbook
**File:** `src/app/workout/start/page.tsx` or workout creation logic

```typescript
// Pass playbookSessionId through workout creation flow
const startWorkoutFromPlaybook = (playbookSessionId: number) => {
  router.push(
    `/workout/start?playbookSessionId=${playbookSessionId}`
  );
};

// In workout save mutation
const saveWorkoutMutation = api.workouts.save.useMutation({
  // ...
});

const handleSaveWorkout = () => {
  const playbookSessionId = searchParams.get("playbookSessionId");

  saveWorkoutMutation.mutate({
    // ... existing workout data
    playbookSessionId: playbookSessionId
      ? parseInt(playbookSessionId)
      : undefined,
  });
};
```

### Update Playbook Session on Save
**Backend:** `src/server/api/routers/workouts.ts`

```typescript
// In workouts.save mutation
if (input.playbookSessionId) {
  await ctx.db
    .update(playbookSessions)
    .set({
      actualWorkoutId: savedWorkout.id,
      isCompleted: true,
      completedAt: new Date(),
      sessionDate: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(playbookSessions.id, input.playbookSessionId));
}
```

---

## 6. Progress Dashboard Integration (Already Done!)

The `PlaybookProgressCard` is already integrated into the Progress Dashboard via:

**File:** `src/app/_components/ProgressHighlightsSection.tsx`

```typescript
import { PlaybookProgressCard } from "./playbooks/PlaybookProgressCard";

// Renders in highlights section after badges
<PlaybookProgressCard />
```

No additional integration needed - card will automatically:
- Show/hide based on active playbook status
- Display adherence metrics
- Navigate to playbook detail on click

---

## 7. Regeneration Flow

### Trigger Regeneration
**File:** `src/app/_components/playbooks/PlaybookDetailView.tsx` (already scaffolded)

```typescript
const regenerateWeeksMutation = api.playbooks.regenerateWeeks.useMutation({
  onSuccess: () => {
    // Refetch playbook data
    queryClient.invalidateQueries(["playbooks", playbookId]);
  },
});

const handleRegenerateFromWeek = (weekNumber: number) => {
  const confirmed = window.confirm(
    `Regenerate weeks ${weekNumber} to ${playbook.duration}?`
  );

  if (confirmed) {
    regenerateWeeksMutation.mutate({
      playbookId: playbook.id,
      weekStart: weekNumber,
      weekEnd: playbook.duration,
      reason: "User requested regeneration",
    });
  }
};

// Add to "Regenerate from Week X" button
<Button
  variant="outline"
  size="lg"
  className="gap-2"
  onClick={() => handleRegenerateFromWeek(currentWeek)}
>
  <RefreshCw className="size-4" />
  Regenerate from Week {currentWeek}
</Button>
```

---

## 8. Analytics Events (PostHog)

### Track Key User Actions

```typescript
import { analytics } from "~/lib/analytics";

// Playbook created
analytics.track("playbook_created", {
  playbook_id: result.id,
  goal_preset: input.goalPreset,
  duration_weeks: input.duration,
});

// Playbook accepted
analytics.track("playbook_accepted", {
  playbook_id: playbookId,
  duration_weeks: playbook.duration,
});

// RPE submitted
analytics.track("playbook_rpe_submitted", {
  playbook_id: playbookId,
  session_id: sessionId,
  rpe_value: rpe,
  difficulty: difficulty,
});

// Playbook viewed
analytics.track("playbook_viewed", {
  playbook_id: playbookId,
  status: playbook.status,
});

// Week regenerated
analytics.track("playbook_regenerated", {
  playbook_id: playbookId,
  weeks_regenerated: weekEnd - weekStart + 1,
  reason: reason,
});
```

---

## 9. Template/Exercise Selection Integration

### Multi-Select Dropdown Component
**Needed for:** Playbook Creation Wizard Step 2

**Recommended Approach:**
Use existing `VirtualizedSelect` component (if available) or create new:

```typescript
// In PlaybookCreationWizard.tsx - Step 2
import { VirtualizedSelect } from "~/components/ui/VirtualizedSelect";

// Fetch templates or exercises
const { data: templates } = api.templates.list.useQuery(
  {},
  { enabled: formData.targetType === "template" }
);

const { data: exercises } = api.exercises.list.useQuery(
  {},
  { enabled: formData.targetType === "exercise" }
);

// In render
{formData.targetType === "template" ? (
  <VirtualizedSelect
    options={templates?.map((t) => ({
      value: t.id,
      label: t.name,
    })) || []}
    value={formData.targetIds}
    onChange={(ids) => setFormData({ ...formData, targetIds: ids })}
    placeholder="Select templates..."
    multiple
  />
) : (
  <VirtualizedSelect
    options={exercises?.map((e) => ({
      value: e.id,
      label: e.name,
    })) || []}
    value={formData.targetIds}
    onChange={(ids) => setFormData({ ...formData, targetIds: ids })}
    placeholder="Select exercises..."
    multiple
  />
)}
```

---

## 10. Advanced Options Integration

### Current 1RMs Input
**Needed for:** Playbook Creation Wizard Step 3

```typescript
// In PlaybookCreationWizard.tsx - Step 3 advanced options
const [currentMaxes, setCurrentMaxes] = useState<Record<string, number>>({});

// For each selected exercise, show 1RM input
{formData.targetType === "exercise" && formData.targetIds.map((exerciseId) => {
  const exercise = exercises?.find((e) => e.id === exerciseId);
  return (
    <Input
      key={exerciseId}
      label={`${exercise?.name} 1RM`}
      type="number"
      placeholder="kg"
      value={currentMaxes[exerciseId] || ""}
      onChange={(e) =>
        setCurrentMaxes({
          ...currentMaxes,
          [exerciseId]: parseFloat(e.target.value),
        })
      }
      hint="Optional: Helps AI create better progression"
    />
  );
})}

// Include in metadata when creating playbook
metadata: {
  currentMaxes,
  trainingDays: formData.trainingDays,
  equipment: formData.equipment,
}
```

---

## Testing Checklist

### Manual Testing Flow
1. Create a new playbook via wizard
2. Accept the playbook (status changes to "active")
3. Navigate to playbook detail, expand weeks
4. Start a workout from playbook session
5. Complete workout and save
6. Verify RPE modal appears
7. Submit RPE feedback
8. Check playbook detail - session marked complete
9. View Progress Dashboard - playbook card shows updated stats
10. Regenerate weeks from current week
11. Verify new weeks appear with updated plan

### Edge Cases
- Offline playbook creation (shows error)
- No active playbook (progress card shows empty state)
- All sessions completed (playbook status → completed)
- Multiple playbooks (only one active at a time)
- Wizard abandoned mid-flow (data not saved)

---

## Performance Optimizations

### Data Fetching
```typescript
// Prefetch playbook data on list page
const router = useRouter();
const queryClient = useQueryClient();

const handleViewPlaybook = (id: number) => {
  // Prefetch before navigation
  queryClient.prefetchQuery({
    queryKey: ["playbooks", id],
    queryFn: () => api.playbooks.getById.query({ id }),
  });

  router.push(`/playbooks/${id}`);
};
```

### Image/Icon Optimization
- All icons from `lucide-react` (tree-shakeable)
- No custom images required
- Emoji for visual flair (native rendering)

### Bundle Size
- Recharts only imported in PlaybookProgressCard (code-split)
- Framer Motion already used app-wide
- All components lazy-loaded at route level

---

## Deployment Checklist

- [ ] Run `bun check` (lint + typecheck)
- [ ] Run `bun run test` (all tests pass)
- [ ] Test on mobile viewport (Chrome DevTools)
- [ ] Test offline mode (disable network)
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Test keyboard navigation (Tab, Enter, Space)
- [ ] Test reduced-motion mode (OS settings)
- [ ] Verify all Material 3 tokens resolve
- [ ] Check Lighthouse scores (Performance 90+, A11y 95+)
- [ ] Deploy to staging environment
- [ ] Run E2E tests (Playwright)
- [ ] Monitor PostHog for analytics events
- [ ] Check Sentry for errors
- [ ] Production deployment

---

## Support & Documentation

### For Developers
- See `PLAYBOOKS_UI_IMPLEMENTATION.md` for full component details
- See `DESIGN_MANIFESTO.md` for design principles
- See `docs/material3-theme-guide.md` for theming
- See `CLAUDE.md` for project-wide guidelines

### For Users
- Create playbook walkthrough (onboarding tooltip)
- RPE explanation tooltip
- PR week celebration modal
- Playbook completion certificate (future)

---

## Next Steps

1. **Backend Integration:** Connect workout saves to playbook sessions
2. **Template Selection:** Wire up multi-select in wizard Step 2
3. **Advanced Options:** Add 1RM inputs in wizard Step 3
4. **Plan Comparison:** Implement side-by-side AI vs Algorithmic view in Step 4
5. **Testing:** Write unit + E2E tests
6. **Analytics:** Verify PostHog events firing
7. **Polish:** Add micro-interactions (haptics, confetti)

---

Happy training! 💪
