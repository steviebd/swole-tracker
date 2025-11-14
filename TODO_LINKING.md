# Template Exercise Linking Refactor Plan

## Overview

Refactor the template creation flow to move exercise linking from step 2 to step 3, implementing intelligent fuzzy matching and bulk linking capabilities.

## Current State Issues

- Exercise linking UI cluttered in step 2 (ExerciseInputWithLinking)
- Manual linking process is tedious for users
- No bulk operations for common exercises
- Fuzzy matching exists but not exposed optimally
- Step 3 is just a basic preview - underutilized

## Proposed New Flow

### Step 1: Template Basics (unchanged)

- Template name input
- Basic validation

### Step 2: Exercise Entry (simplified)

- Pure exercise name entry
- Drag/drop reordering
- Duplicate/remove functionality
- **Remove all linking UI**

### Step 3: Smart Review & Linking (NEW)

- Template summary
- Automatic exercise matching with fuzzy logic
- Bulk linking actions
- Individual override options

## Implementation Plan

### Phase 1: Backend Foundation

#### 1.1 Create Smart Linking Endpoint

**File**: `src/server/api/routers/exercises.ts`

Add new procedure `getSmartLinkingSuggestions`:

```typescript
getSmartLinkingSuggestions: protectedProcedure
  .use(apiCallRateLimit)
  .input(
    z.object({
      exercises: z.array(
        z.object({
          name: z.string(),
          tempId: z.string(),
        }),
      ),
      similarityThreshold: z.number().min(0).max(1).default(0.7),
    }),
  )
  .query(async ({ ctx, input }) => {
    // Implementation details below
  });
```

**Output Schema**:

```typescript
{
  suggestions: {
    exerciseName: string;
    tempId: string;
    matches: {
      masterExerciseId: number;
      masterName: string;
      similarity: number;
      matchType: "exact" | "fuzzy" | "partial";
    }
    [];
    recommendedAction: "auto-link" | "manual-review" | "create-new";
  }
  [];
  summary: {
    totalExercises: number;
    autoLinkCount: number;
    needReviewCount: number;
    createNewCount: number;
  }
}
```

**Implementation Details**:

1. For each exercise name, find potential master exercise matches
2. Use enhanced fuzzy matching (see section 1.3)
3. Categorize by confidence level:
   - `auto-link`: >90% similarity or exact match
   - `manual-review`: 70-90% similarity or multiple close matches
   - `create-new`: <70% similarity or no matches

#### 1.2 Enhance Fuzzy Matching Algorithm

**File**: `src/server/api/routers/exercises.ts`

Create new function `calculateExerciseSimilarity`:

```typescript
function calculateExerciseSimilarity(
  exercise1: string,
  exercise2: string,
): {
  score: number;
  matchType: "exact" | "fuzzy" | "partial";
  details: {
    exactMatch: boolean;
    wordOverlap: number;
    lengthSimilarity: number;
    commonVariations: string[];
  };
} {
  // 1. Exact normalized match (100%)
  const normalized1 = normalizeExerciseName(exercise1);
  const normalized2 = normalizeExerciseName(exercise2);

  if (normalized1 === normalized2) {
    return {
      score: 1.0,
      matchType: "exact",
      details: {
        exactMatch: true,
        wordOverlap: 1.0,
        lengthSimilarity: 1.0,
        commonVariations: [],
      },
    };
  }

  // 2. Common variations (bench ↔ bench press, squat ↔ squats)
  const variations = EXERCISE_VARIATIONS[normalized1.split(" ")[0]];
  if (
    variations?.some((v) => normalized2.includes(v) || v.includes(normalized2))
  ) {
    return {
      score: 0.95,
      matchType: "fuzzy",
      details: {
        exactMatch: false,
        wordOverlap: 0.9,
        lengthSimilarity: 0.9,
        commonVariations: variations,
      },
    };
  }

  // 3. Word-based matching (80-95%)
  const words1 = normalized1.split(" ");
  const words2 = normalized2.split(" ");
  const commonWords = words1.filter((w) => words2.includes(w));
  const wordOverlap =
    commonWords.length / Math.max(words1.length, words2.length);

  if (wordOverlap >= 0.7) {
    return {
      score: 0.7 + wordOverlap * 0.25,
      matchType: "fuzzy",
      details: {
        exactMatch: false,
        wordOverlap,
        lengthSimilarity:
          1 -
          Math.abs(exercise1.length - exercise2.length) /
            Math.max(exercise1.length, exercise2.length),
        commonVariations: [],
      },
    };
  }

  // 4. Partial matching (60-80%)
  const contains =
    exercise1.toLowerCase().includes(exercise2.toLowerCase()) ||
    exercise2.toLowerCase().includes(exercise1.toLowerCase());

  if (contains) {
    return {
      score:
        0.6 +
        (Math.min(exercise1.length, exercise2.length) /
          Math.max(exercise1.length, exercise2.length)) *
          0.2,
      matchType: "partial",
      details: {
        exactMatch: false,
        wordOverlap: 0.3,
        lengthSimilarity: 0.8,
        commonVariations: [],
      },
    };
  }

  // 5. Low similarity
  return {
    score: 0.0,
    matchType: "partial",
    details: {
      exactMatch: false,
      wordOverlap: 0,
      lengthSimilarity: 0.5,
      commonVariations: [],
    },
  };
}
```

**Add variation dictionary**:

```typescript
const EXERCISE_VARIATIONS = {
  bench: [
    "bench press",
    "barbell bench",
    "dumbbell bench",
    "db bench",
    "bb bench",
  ],
  squat: [
    "squats",
    "barbell squat",
    "goblet squat",
    "front squat",
    "back squat",
  ],
  deadlift: [
    "deadlifts",
    "conventional deadlift",
    "sumo deadlift",
    "romanian deadlift",
    "rdl",
  ],
  press: ["overhead press", "shoulder press", "military press", "ohp"],
  row: ["rows", "barbell row", "dumbbell row", "cable row", "machine row"],
  curl: ["curls", "bicep curl", "dumbbell curl", "barbell curl", "ez bar curl"],
  extension: ["extensions", "tricep extension", "skullcrusher", "pushdown"],
  fly: ["flyes", "dumbbell fly", "cable fly", "pec deck"],
  raise: ["raises", "lateral raise", "front raise", "rear delt raise"],
  pull: ["pulls", "pull up", "chin up", "lat pulldown", "pull down"],
  // Add more variations as needed
};
```

#### 1.3 Bulk Linking Endpoint

**File**: `src/server/api/routers/exercises.ts`

Enhance existing `bulkCreateOrLink` or create new `bulkCreateAndLinkExercises`:

```typescript
bulkCreateAndLinkExercises: protectedProcedure
  .use(apiCallRateLimit)
  .input(
    z.object({
      templateId: z.number(),
      exercises: z.array(
        z.object({
          name: z.string(),
          orderIndex: z.number(),
          masterExerciseId: z.number().optional(), // if linking
          linkingRejected: z.boolean().optional(), // if explicitly rejected
        }),
      ),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const createdExercises = [];

    for (const exercise of input.exercises) {
      // Create template exercise
      const [templateExercise] = await ctx.db
        .insert(templateExercises)
        .values({
          user_id: ctx.user.id,
          templateId: input.templateId,
          exerciseName: exercise.name,
          orderIndex: exercise.orderIndex,
          linkingRejected: exercise.linkingRejected ?? false,
        })
        .returning();

      // Link to master if specified
      if (exercise.masterExerciseId && !exercise.linkingRejected) {
        await ctx.db.insert(exerciseLinks).values({
          templateExerciseId: templateExercise.id,
          masterExerciseId: exercise.masterExerciseId,
          user_id: ctx.user.id,
        });
      } else if (!exercise.linkingRejected) {
        // Auto-create master exercise if not rejected and no master specified
        await createAndLinkMasterExercise(
          ctx.db,
          ctx.user.id,
          exercise.name,
          templateExercise.id,
          false,
        );
      }

      createdExercises.push(templateExercise);
    }

    return { createdCount: createdExercises.length };
  });
```

### Phase 2: Frontend Step 3

#### 2.1 Create ExerciseLinkingReview Component

**File**: `src/app/_components/exercise-linking-review.tsx`

```typescript
interface ExerciseLinkingReviewProps {
  templateName: string;
  exercises: { name: string; tempId: string }[];
  onConfirm: (linkingDecisions: LinkingDecision[]) => void;
  onBack: () => void;
  isLoading?: boolean;
}

type LinkingDecision = {
  tempId: string;
  action: "link" | "create-new" | "reject";
  masterExerciseId?: number;
};

export function ExerciseLinkingReview({
  templateName,
  exercises,
  onConfirm,
  onBack,
  isLoading = false,
}: ExerciseLinkingReviewProps) {
  // Component implementation in next section
}
```

**Component Structure**:

```typescript
export function ExerciseLinkingReview(props: ExerciseLinkingReviewProps) {
  const [linkingDecisions, setLinkingDecisions] = useState<LinkingDecision[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch suggestions on mount
  const { data: suggestionsData, isLoading: suggestionsLoading } = api.exercises.getSmartLinkingSuggestions.useQuery(
    { exercises },
    { enabled: exercises.length > 0 }
  );

  // Initialize decisions based on suggestions
  useEffect(() => {
    if (suggestionsData) {
      const initialDecisions: LinkingDecision[] = suggestionsData.suggestions.map(suggestion => ({
        tempId: suggestion.tempId,
        action: suggestion.recommendedAction === 'auto-link' ? 'link' :
                suggestion.recommendedAction === 'create-new' ? 'create-new' : 'link',
        masterExerciseId: suggestion.recommendedAction === 'auto-link' ?
                          suggestion.matches[0]?.masterExerciseId : undefined
      }));
      setLinkingDecisions(initialDecisions);
      setSuggestions(suggestionsData);
      setLoading(false);
    }
  }, [suggestionsData]);

  // Bulk action handlers
  const acceptAllAutoLinks = () => {
    if (!suggestions) return;

    const updatedDecisions = linkingDecisions.map(decision => {
      const suggestion = suggestions.suggestions.find(s => s.tempId === decision.tempId);
      if (suggestion?.recommendedAction === 'auto-link') {
        return {
          ...decision,
          action: 'link' as const,
          masterExerciseId: suggestion.matches[0]?.masterExerciseId
        };
      }
      return decision;
    });
    setLinkingDecisions(updatedDecisions);
  };

  const createNewForUnmatched = () => {
    if (!suggestions) return;

    const updatedDecisions = linkingDecisions.map(decision => {
      const suggestion = suggestions.suggestions.find(s => s.tempId === decision.tempId);
      if (suggestion?.recommendedAction === 'create-new') {
        return { ...decision, action: 'create-new' as const };
      }
      return decision;
    });
    setLinkingDecisions(updatedDecisions);
  };

  const handleConfirm = () => {
    onConfirm(linkingDecisions);
  };

  if (loading || suggestionsLoading) {
    return <ExerciseLinkingReviewSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Template Summary */}
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{templateName}</h3>
            <p className="text-muted-foreground text-sm">
              {exercises.length} exercises • {exercises.length * 4}-{exercises.length * 6} min
            </p>
          </div>
        </div>
      </Card>

      {/* Linking Summary */}
      {suggestions && (
        <Card padding="md">
          <h4 className="font-medium mb-3">Smart Linking Results</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{suggestions.summary.autoLinkCount}</div>
              <div className="text-xs text-muted-foreground">Auto-linked</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{suggestions.summary.needReviewCount}</div>
              <div className="text-xs text-muted-foreground">Need Review</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{suggestions.summary.createNewCount}</div>
              <div className="text-xs text-muted-foreground">Create New</div>
            </div>
          </div>
        </Card>
      )}

      {/* Bulk Actions */}
      <Card padding="md">
        <h4 className="font-medium mb-3">Bulk Actions</h4>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={acceptAllAutoLinks}>
            Accept All Auto-Links
          </Button>
          <Button variant="outline" size="sm" onClick={createNewForUnmatched}>
            Create New for Unmatched
          </Button>
        </div>
      </Card>

      {/* Exercise-by-Exercise Review */}
      <Card padding="lg">
        <h4 className="font-medium mb-4">Exercise Review</h4>
        <div className="space-y-4">
          {suggestions?.suggestions.map((suggestion) => (
            <ExerciseReviewItem
              key={suggestion.tempId}
              suggestion={suggestion}
              decision={linkingDecisions.find(d => d.tempId === suggestion.tempId)}
              onDecisionChange={(newDecision) => {
                setLinkingDecisions(prev =>
                  prev.map(d => d.tempId === suggestion.tempId ? newDecision : d)
                );
              }}
            />
          ))}
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleConfirm} disabled={isLoading}>
          {isLoading ? 'Creating Template...' : 'Create Template'}
        </Button>
      </div>
    </div>
  );
}
```

#### 2.2 ExerciseReviewItem Component

**File**: `src/app/_components/exercise-review-item.tsx`

```typescript
interface ExerciseReviewItemProps {
  suggestion: SuggestionItem
  decision?: LinkingDecision
  onDecisionChange: (decision: LinkingDecision) => void
}

function ExerciseReviewItem({ suggestion, decision, onDecisionChange }: ExerciseReviewItemProps) {
  const [showMatches, setShowMatches] = useState(false);

  const handleLink = (masterExerciseId: number) => {
    onDecisionChange({
      tempId: suggestion.tempId,
      action: 'link',
      masterExerciseId
    });
  };

  const handleCreateNew = () => {
    onDecisionChange({
      tempId: suggestion.tempId,
      action: 'create-new'
    });
  };

  const handleReject = () => {
    onDecisionChange({
      tempId: suggestion.tempId,
      action: 'reject'
    });
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="font-medium">{suggestion.exerciseName}</h5>
        <StatusBadge recommendation={suggestion.recommendedAction} />
      </div>

      {/* Auto-linked case */}
      {suggestion.recommendedAction === 'auto-link' && suggestion.matches.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-green-800">Auto-linked to:</div>
              <div className="text-green-700">{suggestion.matches[0]!.masterName}</div>
              <div className="text-xs text-green-600">
                {Math.round(suggestion.matches[0]!.similarity * 100)}% match
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowMatches(!showMatches)}>
                Change
              </Button>
              <Button size="sm" variant="ghost" onClick={handleReject}>
                Don't Link
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manual review case */}
      {suggestion.recommendedAction === 'manual-review' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <div className="text-sm font-medium text-yellow-800 mb-2">Multiple matches found:</div>
          {showMatches ? (
            <div className="space-y-2">
              {suggestion.matches.map((match) => (
                <div key={match.masterExerciseId} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm">{match.masterName}</div>
                    <div className="text-xs text-yellow-600">
                      {Math.round(match.similarity * 100)}% {match.matchType} match
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleLink(match.masterExerciseId)}>
                    Use This
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={handleCreateNew} className="w-full">
                Create New Exercise
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-sm text-yellow-700">
                {suggestion.matches.length} potential matches
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowMatches(true)}>
                  Review Matches
                </Button>
                <Button size="sm" variant="outline" onClick={handleCreateNew}>
                  Create New
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create new case */}
      {suggestion.recommendedAction === 'create-new' && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-blue-800">Will create as new exercise</div>
              <div className="text-xs text-blue-600">No similar exercises found</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowMatches(!showMatches)}>
                Search Manually
              </Button>
              <Button size="sm" onClick={handleCreateNew}>
                Create New
              </Button>
            </div>
          </div>

          {showMatches && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <ManualExerciseSearch
                exerciseName={suggestion.exerciseName}
                onSelect={(masterId) => handleLink(masterId)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

#### 2.3 Supporting Components

**StatusBadge Component**:

```typescript
function StatusBadge({ recommendation }: { recommendation: string }) {
  const variants = {
    'auto-link': { bg: 'bg-green-100', text: 'text-green-800', label: 'Auto-Linked' },
    'manual-review': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Review Needed' },
    'create-new': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Create New' }
  };

  const variant = variants[recommendation as keyof typeof variants];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${variant.bg} ${variant.text}`}>
      {variant.label}
    </span>
  );
}
```

**ManualExerciseSearch Component**:

```typescript
function ManualExerciseSearch({
  exerciseName,
  onSelect
}: {
  exerciseName: string
  onSelect: (masterExerciseId: number) => void
}) {
  const [query, setQuery] = useState(exerciseName);
  const [open, setOpen] = useState(false);

  const { data: searchResults } = api.exercises.searchMaster.useQuery(
    { q: query, limit: 10 },
    { enabled: open }
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search exercises..."
        className="w-full px-3 py-2 border rounded-md text-sm"
      />

      {open && searchResults && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {searchResults.items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelect(Math.abs(item.id)); // Handle negative IDs for non-master
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Phase 3: Integration & Refactoring

#### 3.1 Simplify ExerciseInput Component

**File**: `src/app/_components/exercise-input-with-linking.tsx` → `src/app/_components/exercise-input.tsx`

Remove all linking-related code:

- Remove `ExerciseLinkPicker` import and usage
- Remove `templateExerciseId` prop
- Remove linking state and mutations
- Remove "Link" button and linking UI
- Keep only the input field and basic functionality

```typescript
interface ExerciseInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ExerciseInput({
  value,
  onChange,
  placeholder,
  className,
  style,
}: ExerciseInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      style={style}
    />
  );
}
```

#### 3.2 Update TemplateForm Component

**File**: `src/app/_components/template-form.tsx`

Major changes:

1. Import new `ExerciseLinkingReview` component
2. Update form state to track linking decisions
3. Modify step 3 to use linking review
4. Update form submission logic

**Key Changes**:

```typescript
// Add new state for linking decisions
const [linkingDecisions, setLinkingDecisions] = useState<LinkingDecision[]>([]);

// Update step 3 rendering
{currentStep === "preview" && (
  <ExerciseLinkingReview
    templateName={watchedName}
    exercises={watchedExercises.map((ex, index) => ({
      name: ex.exerciseName,
      tempId: `temp-${index}` // Generate temp ID for tracking
    }))}
    onConfirm={handleLinkingConfirm}
    onBack={prevStep}
    isLoading={isLoading}
  />
)}

// Add new handler for linking confirmation
const handleLinkingConfirm = async (decisions: LinkingDecision[]) => {
  setLinkingDecisions(decisions);

  // Prepare exercises for submission
  const exercisesForSubmission = watchedExercises.map((ex, index) => {
    const decision = decisions.find(d => d.tempId === `temp-${index}`);
    return {
      name: ex.exerciseName.trim(),
      orderIndex: index,
      masterExerciseId: decision?.masterExerciseId,
      linkingRejected: decision?.action === 'reject'
    };
  }).filter(ex => ex.name !== '');

  // Submit template with linking decisions
  if (template) {
    await updateTemplate.mutateAsync({
      id: template.id,
      name: watchedName.trim(),
      exercises: exercisesForSubmission.map(ex => ex.name),
      linkingDecisions: exercisesForSubmission
    });
  } else {
    await createTemplateWithLinking.mutateAsync({
      name: watchedName.trim(),
      exercises: exercisesForSubmission
    });
  }
};
```

#### 3.3 Update Template Creation API

**File**: `src/server/api/routers/templates.ts`

Modify `create` mutation to handle linking decisions:

```typescript
create: protectedProcedure
  .use(templateRateLimit)
  .input(
    z.object({
      name: z.string().min(1),
      exercises: z.array(
        z.object({
          name: z.string().min(1),
          orderIndex: z.number(),
          masterExerciseId: z.number().optional(),
          linkingRejected: z.boolean().optional(),
        }),
      ),
      dedupeKey: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    // Create template
    const [template] = await ctx.db
      .insert(workoutTemplates)
      .values({
        user_id: ctx.user.id,
        name: input.name,
        dedupeKey: input.dedupeKey,
      })
      .returning();

    // Create exercises with linking
    for (const exercise of input.exercises) {
      const [templateExercise] = await ctx.db
        .insert(templateExercises)
        .values({
          user_id: ctx.user.id,
          templateId: template.id,
          exerciseName: exercise.name,
          orderIndex: exercise.orderIndex,
          linkingRejected: exercise.linkingRejected ?? false,
        })
        .returning();

      // Handle linking
      if (exercise.masterExerciseId && !exercise.linkingRejected) {
        await ctx.db.insert(exerciseLinks).values({
          templateExerciseId: templateExercise.id,
          masterExerciseId: exercise.masterExerciseId,
          user_id: ctx.user.id,
        });
      } else if (!exercise.linkingRejected) {
        // Auto-create master exercise
        await createAndLinkMasterExercise(
          ctx.db,
          ctx.user.id,
          exercise.name,
          templateExercise.id,
          false,
        );
      }
    }

    return template;
  });
```

### Phase 4: Polish & Optimization

#### 4.1 Add Loading States

Create skeleton components for loading states:

- `ExerciseLinkingReviewSkeleton`
- `ExerciseReviewItemSkeleton`

#### 4.2 Add Animations

Use Framer Motion or CSS transitions for:

- Exercise list expansion/collapse
- Match selection
- Bulk action feedback
- Step transitions

#### 4.3 Keyboard Shortcuts

Add keyboard navigation:

- `Tab` between exercises
- `Enter` to accept auto-link
- `Space` to toggle match expansion
- `Escape` to cancel linking

#### 4.4 Accessibility

Ensure WCAG compliance:

- Proper ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast mode support

#### 4.5 Performance Optimization

For large exercise lists (>20 exercises):

- Virtual scrolling for exercise list
- Debounced search in manual search
- Lazy loading of match details
- Memoized similarity calculations

### Testing Strategy

#### Unit Tests

**Backend Tests** (`src/__tests__/unit/server/api/routers/exercises.test.ts`):

```typescript
describe("getSmartLinkingSuggestions", () => {
  it("should find exact matches", async () => {
    // Test exact matching logic
  });

  it("should handle common variations", async () => {
    // Test bench ↔ bench press variations
  });

  it("should categorize recommendations correctly", async () => {
    // Test auto-link vs manual-review categorization
  });
});

describe("calculateExerciseSimilarity", () => {
  it("should return 1.0 for exact matches", () => {
    expect(
      calculateExerciseSimilarity("Bench Press", "bench press").score,
    ).toBe(1.0);
  });

  it("should handle variations correctly", () => {
    expect(
      calculateExerciseSimilarity("Squat", "squats").score,
    ).toBeGreaterThan(0.9);
  });
});
```

**Frontend Tests** (`src/__tests__/unit/components/exercise-linking-review.test.tsx`):

```typescript
describe("ExerciseLinkingReview", () => {
  it("should display linking summary correctly", () => {
    // Test summary rendering
  });

  it("should handle bulk actions", () => {
    // Test accept all auto-links
  });

  it("should allow individual exercise decisions", () => {
    // Test manual override
  });
});
```

#### Integration Tests

**E2E Tests** (`e2e/templates/create-template-with-linking.spec.ts`):

```typescript
test("should create template with smart linking", async ({ page }) => {
  // 1. Navigate to create template
  // 2. Enter template name
  // 3. Add exercises (bench press, squat, deadlift)
  // 4. Proceed to linking step
  // 5. Verify auto-linking suggestions
  // 6. Accept auto-links
  // 7. Create template
  // 8. Verify template created with correct links
});

test("should handle manual linking decisions", async ({ page }) => {
  // Test manual review and selection
});
```

#### Performance Tests

Test with large datasets:

- 50+ exercises in template
- 1000+ master exercises in database
- Concurrent template creation

### Database Schema Changes (Optional)

#### Add Linking Confidence Field

```sql
ALTER TABLE template_exercises ADD COLUMN linking_confidence REAL;
-- Stores confidence score of automatic linking (0.0-1.0)
```

#### Add Performance Index

```sql
CREATE INDEX template_exercise_user_linking_idx
ON template_exercise(user_id, linkingRejected, linking_confidence);
```

### Migration Strategy

#### Phase 1: Backend (Week 1)

1. Implement new API endpoints
2. Add comprehensive tests
3. Deploy backend changes

#### Phase 2: Frontend (Week 2)

1. Create new components
2. Update template form
3. Add comprehensive tests
4. Deploy frontend changes

#### Phase 3: Integration (Week 3)

1. End-to-end testing
2. Performance optimization
3. Bug fixes
4. Full deployment

#### Phase 4: Polish (Week 4)

1. User acceptance testing
2. Accessibility audit
3. Final optimizations
4. Documentation updates

### Success Metrics

- **User Experience**: Reduce template creation time by 30%
- **Linking Accuracy**: Auto-link 80%+ of common exercises correctly
- **Error Reduction**: 50% fewer duplicate master exercises
- **User Satisfaction**: Positive feedback on simplified flow

### Rollback Plan

If issues arise:

1. Keep old linking logic as fallback
2. Feature flag to disable new flow
3. Database schema changes are backward compatible
4. Can revert to step 2 linking within 24 hours

---

## Implementation Priority

1. **High Priority**: Backend API endpoints, basic frontend components
2. **Medium Priority**: Enhanced fuzzy matching, bulk actions
3. **Low Priority**: Animations, advanced keyboard shortcuts, performance optimizations

This plan provides a comprehensive roadmap for refactoring the template exercise linking system to be more intelligent, efficient, and user-friendly.
