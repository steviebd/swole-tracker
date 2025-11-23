# Playbook Plan Selection - Product Design Requirements

## Overview

Implement user-selectable plan generation for playbooks at Stage 4 (Review), allowing users to choose between Algorithmic Plan (default) and AI Plan, with the ability to toggle per session and add AI Plan later via regeneration.

## Problem Statement

Currently, both AI Plan and Algorithmic Plan are always generated together after clicking "Create Playbook". Users have no control over which plan type to use, and the AI Plan calls an external service with associated costs/latency.

## Goals

1. Give users control over plan selection before creation
2. Default to Algorithmic Plan (free, instant) with optional AI Plan
3. Allow per-session plan toggling in detail view
4. Enable adding AI Plan later via "Regenerate from Latest Session"
5. Reduce unnecessary AI API calls when users only want Algorithmic

---

## Requirements Summary

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Algorithmic Plan pre-selected by default at Stage 4 | Must |
| FR-2 | AI Plan shown as optional with suggestion text | Must |
| FR-3 | At least one plan must be selected to proceed | Must |
| FR-4 | Conditional generation based on selection | Must |
| FR-5 | Session-level active plan tracking | Must |
| FR-6 | Toggle between plans per session in detail view | Must |
| FR-7 | Regenerate from Latest Session (refactor) | Must |
| FR-8 | Prompt to add AI Plan if not present during regeneration | Must |
| FR-9 | If only AI selected, still generate Algorithmic (free) | Should |

### Non-Functional Requirements

- Follow DESIGN_MANIFESTO.md card interaction patterns
- Maintain WCAG 2.2 AA accessibility
- Use chunked database operations (D1 ~90 variable limit)
- Preserve offline-first architecture patterns

---

## Detailed Implementation Plan

### Phase 1: Database Schema Updates

**File:** `src/server/db/schema/playbooks.ts`

#### 1.1 Add to `playbooks` table

```typescript
// Add field to track if AI plan was generated
hasAiPlan: integer("has_ai_plan", { mode: "boolean" }).default(false),
```

#### 1.2 Add to `playbookSessions` table

```typescript
// Track which plan is active for this session
activePlanType: text("active_plan_type", { enum: ["ai", "algorithmic"] })
  .default("algorithmic")
  .notNull(),
```

#### 1.3 Migration Notes

- These are additive changes, no data migration needed
- Existing playbooks will have `hasAiPlan: false` (null treated as false)
- Existing sessions will default to `activePlanType: "algorithmic"`

---

### Phase 2: Schema & Type Updates

**File:** `src/lib/schemas/playbook.ts`

#### 2.1 Update create input schema

```typescript
export const playbookCreateInputSchema = z.object({
  // ... existing fields
  selectedPlans: z.object({
    algorithmic: z.boolean(),
    ai: z.boolean(),
  }).refine(
    (data) => data.algorithmic || data.ai,
    { message: "At least one plan must be selected" }
  ),
});
```

#### 2.2 Add active plan type enum

```typescript
export const activePlanTypeSchema = z.enum(["ai", "algorithmic"]);
export type ActivePlanType = z.infer<typeof activePlanTypeSchema>;
```

#### 2.3 Update session schema

```typescript
export const playbookSessionSchema = z.object({
  // ... existing fields
  activePlanType: activePlanTypeSchema,
});
```

---

### Phase 3: Stage 4 Review UI

**File:** `src/app/_components/playbooks/PlaybookCreationWizard.tsx`

#### 3.1 Add state for plan selection

```typescript
const [selectedPlans, setSelectedPlans] = useState({
  algorithmic: true,  // Pre-selected by default
  ai: false,
});
```

#### 3.2 Replace placeholder cards (lines ~762-781)

Replace the current static placeholder cards with interactive selection cards:

```typescript
{/* Plan Selection Cards */}
<div className="grid gap-4 md:grid-cols-2">
  {/* Algorithmic Plan Card - Default Selected */}
  <button
    type="button"
    onClick={() => setSelectedPlans(prev => ({ ...prev, algorithmic: !prev.algorithmic }))}
    className={cn(
      "rounded-lg border-2 p-4 text-left transition-all",
      selectedPlans.algorithmic
        ? "border-secondary bg-secondary/10"
        : "border-border bg-background hover:border-secondary/50"
    )}
  >
    <div className="mb-2 flex items-center gap-2">
      <Zap className="text-secondary size-4" />
      <h5 className="font-semibold">Algorithmic Plan</h5>
      {selectedPlans.algorithmic && (
        <Check className="text-secondary ml-auto size-4" />
      )}
    </div>
    <p className="text-muted-foreground text-xs">
      Science-based progressive overload
    </p>
  </button>

  {/* AI Plan Card - Optional */}
  <button
    type="button"
    onClick={() => setSelectedPlans(prev => ({ ...prev, ai: !prev.ai }))}
    className={cn(
      "rounded-lg border-2 p-4 text-left transition-all",
      selectedPlans.ai
        ? "border-primary bg-primary/10"
        : "border-border bg-background hover:border-primary/50"
    )}
  >
    <div className="mb-2 flex items-center gap-2">
      <Sparkles className="text-primary size-4" />
      <h5 className="font-semibold">AI Plan</h5>
      {selectedPlans.ai && (
        <Check className="text-primary ml-auto size-4" />
      )}
    </div>
    <p className="text-muted-foreground text-xs">
      {selectedPlans.ai
        ? "Personalized using your history and goals"
        : "Add AI for personalized coaching and PR predictions based on your history"
      }
    </p>
  </button>
</div>

{/* Validation message */}
{!selectedPlans.algorithmic && !selectedPlans.ai && (
  <p className="text-destructive text-sm">
    Please select at least one plan type
  </p>
)}
```

#### 3.3 Update form submission

Pass `selectedPlans` to the create mutation:

```typescript
const handleCreate = () => {
  if (!selectedPlans.algorithmic && !selectedPlans.ai) {
    return; // Validation prevents this
  }

  createPlaybook.mutate({
    // ... existing fields
    selectedPlans,
  });
};
```

#### 3.4 Disable Create button if no plan selected

```typescript
<Button
  onClick={handleCreate}
  disabled={!selectedPlans.algorithmic && !selectedPlans.ai}
>
  Create Playbook
</Button>
```

---

### Phase 4: Create Mutation Updates

**File:** `src/server/api/routers/playbook.ts`

#### 4.1 Update create procedure (lines ~114-243)

```typescript
create: protectedProcedure
  .input(playbookCreateInputSchema)
  .mutation(async ({ ctx, input }) => {
    const { selectedPlans } = input;

    // Build context
    const context = await buildPlaybookContext(ctx.db, userId, input);

    // Conditional generation
    let aiWeeks: WeeklyAiPlan[] | null = null;
    let algorithmicWeeks: WeeklyAlgorithmicPlan[];

    if (selectedPlans.ai) {
      // Generate both (AI selected means we want AI, Algorithmic is always free)
      [aiWeeks, algorithmicWeeks] = await Promise.all([
        generateAIPlan(context),
        Promise.resolve(generateAlgorithmicPlan(context)),
      ]);
    } else {
      // Only Algorithmic
      algorithmicWeeks = generateAlgorithmicPlan(context);
    }

    // Determine default active plan type
    const defaultActivePlanType: ActivePlanType = selectedPlans.ai ? "ai" : "algorithmic";

    // Create playbook record
    const [playbook] = await ctx.db
      .insert(playbooks)
      .values({
        // ... existing fields
        hasAiPlan: selectedPlans.ai,
      })
      .returning();

    // Create weeks
    const weekRows = algorithmicWeeks.map((algoWeek, idx) => {
      const aiWeek = aiWeeks?.[idx] ?? null;
      return {
        playbookId: playbook.id,
        weekNumber: algoWeek.weekNumber,
        weekType: algoWeek.weekType,
        aiPlanJson: aiWeek ? JSON.stringify(aiWeek) : null,
        algorithmicPlanJson: JSON.stringify(algoWeek),
        volumeTarget: aiWeek?.volumeTarget ?? algoWeek.volumeTarget,
        status: "pending",
      };
    });

    await chunkedBatch(ctx.db, weekRows, (chunk) => {
      return ctx.db.insert(playbookWeeks).values(chunk);
    });

    // Create sessions from active plan
    const sourcePlan = selectedPlans.ai ? aiWeeks : algorithmicWeeks;

    for (const week of createdWeeks) {
      const weekPlan = sourcePlan?.find((w) => w.weekNumber === week.weekNumber);
      if (!weekPlan) continue;

      for (const session of weekPlan.sessions) {
        sessionRows.push({
          playbookWeekId: week.id,
          sessionNumber: session.sessionNumber,
          prescribedWorkoutJson: JSON.stringify(session),
          activePlanType: defaultActivePlanType, // Set active plan
          // ... other fields
        });
      }
    }

    await chunkedBatch(ctx.db, sessionRows, (chunk) => {
      return ctx.db.insert(playbookSessions).values(chunk);
    });

    return { id: playbook.id };
  }),
```

---

### Phase 5: Session-Level Plan Toggle

**File:** `src/app/_components/playbooks/PlaybookDetailView.tsx`

#### 5.1 Add mutation for updating session active plan

```typescript
const updateSessionPlanType = api.playbook.updateSessionPlanType.useMutation({
  onSuccess: () => {
    utils.playbook.getById.invalidate({ id: playbookId });
  },
});
```

#### 5.2 Move toggle to session level

Current implementation has toggle at week level (lines ~209-233). Refactor to session level:

```typescript
{/* Session Card */}
<div className="session-card">
  <div className="session-header">
    <h4>Session {session.sessionNumber}</h4>

    {/* Plan Toggle - only if both plans exist */}
    {session.aiPlanJson && session.algorithmicPlanJson && (
      <div className="flex items-center gap-1">
        <Button
          variant={session.activePlanType === "ai" ? "default" : "outline"}
          size="xs"
          onClick={() => updateSessionPlanType.mutate({
            sessionId: session.id,
            planType: "ai",
          })}
        >
          <Sparkles className="size-3 mr-1" />
          AI
        </Button>
        <Button
          variant={session.activePlanType === "algorithmic" ? "default" : "outline"}
          size="xs"
          onClick={() => updateSessionPlanType.mutate({
            sessionId: session.id,
            planType: "algorithmic",
          })}
        >
          <Zap className="size-3 mr-1" />
          Algo
        </Button>
      </div>
    )}
  </div>

  {/* Render active plan content */}
  {renderSessionContent(
    session.activePlanType === "ai"
      ? session.aiPlan
      : session.algorithmicPlan
  )}
</div>
```

#### 5.3 Add router procedure for session plan update

**File:** `src/server/api/routers/playbook.ts`

```typescript
updateSessionPlanType: protectedProcedure
  .input(z.object({
    sessionId: z.string(),
    planType: activePlanTypeSchema,
  }))
  .mutation(async ({ ctx, input }) => {
    const { sessionId, planType } = input;

    await ctx.db
      .update(playbookSessions)
      .set({ activePlanType: planType })
      .where(eq(playbookSessions.id, sessionId));

    return { success: true };
  }),
```

---

### Phase 6: Regeneration Refactor

**File:** `src/server/api/routers/playbook.ts`

#### 6.1 Rename and refactor regenerateWeeks procedure

Current procedure is `regenerateWeeks`. Refactor to `regenerateFromLatestSession`:

```typescript
regenerateFromLatestSession: protectedProcedure
  .input(z.object({
    playbookId: z.string(),
    addAiPlan: z.boolean().optional(), // For prompting to add AI
  }))
  .mutation(async ({ ctx, input }) => {
    const { playbookId, addAiPlan } = input;

    // Get playbook
    const playbook = await ctx.db.query.playbooks.findFirst({
      where: eq(playbooks.id, playbookId),
      with: {
        weeks: {
          with: {
            sessions: true,
          },
        },
      },
    });

    if (!playbook) throw new TRPCError({ code: "NOT_FOUND" });

    // Find latest completed session
    const allSessions = playbook.weeks.flatMap(w => w.sessions);
    const completedSessions = allSessions
      .filter(s => s.status === "completed")
      .sort((a, b) => {
        // Sort by week number then session number
        const weekA = playbook.weeks.find(w => w.id === a.playbookWeekId)!;
        const weekB = playbook.weeks.find(w => w.id === b.playbookWeekId)!;
        if (weekA.weekNumber !== weekB.weekNumber) {
          return weekB.weekNumber - weekA.weekNumber;
        }
        return b.sessionNumber - a.sessionNumber;
      });

    const latestSession = completedSessions[0];
    if (!latestSession) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No completed sessions to regenerate from"
      });
    }

    const latestWeek = playbook.weeks.find(w => w.id === latestSession.playbookWeekId)!;

    // Determine if we should generate AI plan
    const shouldGenerateAi = playbook.hasAiPlan || addAiPlan;

    // Build context including completed session history
    const context = await buildPlaybookContext(ctx.db, playbook.userId, {
      ...playbook,
      // Include history up to latest session
    });

    // Generate plans for remaining weeks
    const remainingWeekNumbers = playbook.weeks
      .filter(w => w.weekNumber > latestWeek.weekNumber)
      .map(w => w.weekNumber);

    let aiWeeks: WeeklyAiPlan[] | null = null;
    let algorithmicWeeks: WeeklyAlgorithmicPlan[];

    if (shouldGenerateAi) {
      [aiWeeks, algorithmicWeeks] = await Promise.all([
        generateAIPlan(context, remainingWeekNumbers),
        Promise.resolve(generateAlgorithmicPlan(context, remainingWeekNumbers)),
      ]);
    } else {
      algorithmicWeeks = generateAlgorithmicPlan(context, remainingWeekNumbers);
    }

    // Update playbook hasAiPlan if AI was added
    if (addAiPlan && !playbook.hasAiPlan) {
      await ctx.db
        .update(playbooks)
        .set({ hasAiPlan: true })
        .where(eq(playbooks.id, playbookId));
    }

    // Update weeks and sessions
    // ... (similar to current regenerateWeeks implementation)

    // Log regeneration
    await ctx.db.insert(playbookRegenerations).values({
      playbookId,
      regeneratedAt: new Date(),
      reason: `Regenerated from session ${latestSession.sessionNumber} of week ${latestWeek.weekNumber}`,
      weeksAffected: JSON.stringify(remainingWeekNumbers),
    });

    return {
      success: true,
      regeneratedWeeks: remainingWeekNumbers,
      aiPlanAdded: addAiPlan && !playbook.hasAiPlan,
    };
  }),
```

#### 6.2 Update detail view regeneration UI

**File:** `src/app/_components/playbooks/PlaybookDetailView.tsx`

```typescript
const [showAddAiPrompt, setShowAddAiPrompt] = useState(false);

const handleRegenerate = () => {
  if (!playbook.hasAiPlan) {
    // Show prompt to add AI plan
    setShowAddAiPrompt(true);
  } else {
    // Regenerate directly
    regenerateFromLatestSession.mutate({
      playbookId: playbook.id
    });
  }
};

// Prompt dialog
{showAddAiPrompt && (
  <Dialog open={showAddAiPrompt} onOpenChange={setShowAddAiPrompt}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add AI Plan?</DialogTitle>
        <DialogDescription>
          Would you like to add AI-powered personalization to your regenerated plan?
          This will provide coaching cues and PR predictions based on your history.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            regenerateFromLatestSession.mutate({
              playbookId: playbook.id,
              addAiPlan: false,
            });
            setShowAddAiPrompt(false);
          }}
        >
          No, keep Algorithmic only
        </Button>
        <Button
          onClick={() => {
            regenerateFromLatestSession.mutate({
              playbookId: playbook.id,
              addAiPlan: true,
            });
            setShowAddAiPrompt(false);
          }}
        >
          <Sparkles className="size-4 mr-2" />
          Yes, add AI Plan
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}

// Button
<Button onClick={handleRegenerate}>
  <RefreshCw className="size-4 mr-2" />
  Regenerate from Latest Session
</Button>
```

---

## Acceptance Criteria

### Stage 4 Review UI
- [ ] Algorithmic Plan card is pre-selected by default
- [ ] AI Plan card shows suggestion text when not selected
- [ ] Cards follow DESIGN_MANIFESTO interaction patterns
- [ ] At least one plan must be selected to proceed
- [ ] Visual feedback on card selection (border, background)
- [ ] Check icon appears on selected cards

### Plan Generation
- [ ] Only selected plans are generated
- [ ] If AI selected, Algorithmic is also generated (free)
- [ ] `hasAiPlan` correctly set on playbook record
- [ ] Sessions created with correct `activePlanType`

### Session-Level Toggle
- [ ] Toggle appears per session (not per week)
- [ ] Toggle only visible if both plans exist
- [ ] Clicking toggle updates session's `activePlanType`
- [ ] Active plan content renders correctly
- [ ] Toggle state persists on page reload

### Regeneration
- [ ] "Regenerate from Latest Session" replaces old regeneration
- [ ] Finds latest completed session correctly
- [ ] Only regenerates weeks after latest session
- [ ] Prompts to add AI if `hasAiPlan` is false
- [ ] Updates `hasAiPlan` if AI added during regeneration
- [ ] Logs regeneration in `playbookRegenerations` table

### Accessibility
- [ ] Cards are keyboard navigable
- [ ] Toggle buttons have proper ARIA labels
- [ ] Color contrast meets WCAG 2.2 AA
- [ ] Focus states are visible

---

## Testing Requirements

### Unit Tests

```typescript
// src/__tests__/unit/routers/playbook-plan-selection.test.ts

describe("Playbook Plan Selection", () => {
  describe("create mutation", () => {
    it("generates only algorithmic when AI not selected", async () => {});
    it("generates both plans when AI is selected", async () => {});
    it("sets hasAiPlan correctly", async () => {});
    it("sets activePlanType to ai when both selected", async () => {});
    it("sets activePlanType to algorithmic when only algo selected", async () => {});
    it("rejects when no plan selected", async () => {});
  });

  describe("updateSessionPlanType mutation", () => {
    it("updates session activePlanType", async () => {});
    it("fails for non-existent session", async () => {});
  });

  describe("regenerateFromLatestSession mutation", () => {
    it("finds latest completed session", async () => {});
    it("regenerates only remaining weeks", async () => {});
    it("prompts for AI when hasAiPlan is false", async () => {});
    it("adds AI plan when addAiPlan is true", async () => {});
    it("logs regeneration correctly", async () => {});
  });
});
```

### Component Tests

```typescript
// src/__tests__/components/playbook-creation-wizard.test.tsx

describe("PlaybookCreationWizard Stage 4", () => {
  it("renders plan selection cards", () => {});
  it("pre-selects algorithmic by default", () => {});
  it("shows suggestion text on unselected AI card", () => {});
  it("toggles card selection on click", () => {});
  it("disables create button when no plan selected", () => {});
  it("shows validation error when no plan selected", () => {});
});
```

### E2E Tests

```typescript
// e2e/playbook-plan-selection.spec.ts

describe("Playbook Plan Selection E2E", () => {
  it("creates playbook with only algorithmic plan", async () => {});
  it("creates playbook with both plans", async () => {});
  it("toggles plan per session in detail view", async () => {});
  it("regenerates from latest session", async () => {});
  it("adds AI plan during regeneration", async () => {});
});
```

---

## Migration Notes

### Backward Compatibility

- Existing playbooks will have `hasAiPlan` default to `false` (or null)
- Existing sessions will have `activePlanType` default to `"algorithmic"`
- No data migration needed - additive schema changes only

### Rollback Plan

If issues arise:
1. Revert schema changes (remove new columns)
2. Revert UI to placeholder cards
3. Revert to generating both plans always

---

## Files to Modify Summary

| File | Type | Changes |
|------|------|---------|
| `src/server/db/schema/playbooks.ts` | Schema | Add `hasAiPlan`, `activePlanType` |
| `src/lib/schemas/playbook.ts` | Types | Add `selectedPlans`, `activePlanType` schema |
| `src/app/_components/playbooks/PlaybookCreationWizard.tsx` | UI | Plan selection cards at Stage 4 |
| `src/server/api/routers/playbook.ts` | API | Conditional generation, new mutations |
| `src/app/_components/playbooks/PlaybookDetailView.tsx` | UI | Session toggle, regeneration UI |
| `src/server/api/utils/algorithmic-planner.ts` | Logic | Support partial week generation |

---

## Open Questions

None - all requirements clarified with stakeholder.

---

## References

- Current implementation exploration completed
- DESIGN_MANIFESTO.md reviewed for interaction patterns
- Chunking requirements from CLAUDE.md (D1 ~90 variable limit)
