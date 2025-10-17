# Systematic Mocking Strategy for Complex Dependencies

## 1. Dependency Analysis Phase

### Identify Mock Boundaries
```typescript
// ❌ Avoid: Mocking everything
vi.mock('~/server/db/index', () => ({ /* 50 lines of complex mocks */ }));

// ✅ Prefer: Clear contract boundaries
interface DatabasePort {
  findUser(id: string): Promise<User>;
  saveWorkout(data: WorkoutData): Promise<Workout>;
}

class MockDatabase implements DatabasePort {
  // Simple, focused mocks
}
```

### Layer Identification
```
┌─────────────────┐
│   Component     │ ← Test component in isolation
├─────────────────┤
│   Custom Hooks  │ ← Mock at hook level
├─────────────────┤
│   tRPC Layer    │ ← Mock API calls
├─────────────────┤
│   Database      │ ← Mock database operations
├─────────────────┤
│   External APIs │ ← Mock HTTP requests
└─────────────────┘
```

## 2. Factory-Based Mocking

### Database Mock Factory
```typescript
// Use factory pattern for consistent mocking
const dbMock = createDrizzleMock();

// Configure specific query behavior
dbMock.select.mockImplementation((fields) => {
  if (fields?.id) {
    return createQueryChain([{ id: 'user-123', name: 'Test' }]);
  }
  return createQueryChain([]);
});
```

### React Hook Mock Factory
```typescript
// Hook dependencies mock
const workoutStatsMock = createReactHookMock({
  currentStreak: 5,
  weeklyGoal: { current: 3, target: 3 },
});

// Test different hook states
workoutStatsMock.setValue({
  currentStreak: 0,
  weeklyGoal: { current: 1, target: 3 },
});
```

## 3. Progressive Testing Strategy

### Test Pyramid Application
```
┌─────────────┐  High confidence, slow
│ E2E Tests   │  ← Integration behavior
├─────────────┤
│ Integration │  ← Component interactions
├─────────────┤
│ Unit Tests  │  ← Individual functions
└─────────────┘  Fast feedback, low confidence
```

### When to Skip vs Mock Complex Dependencies

**Skip when:**
- Mocking complexity > implementation complexity
- Test would duplicate integration tests
- External service dependencies are unstable

**Mock when:**
- Pure logic testing needed
- Fast feedback required
- Deterministic test behavior needed

## 4. Mock Maintenance Patterns

### Contract Testing
```typescript
// Define expected behavior contracts
interface ComponentContract {
  given: { userId: string };
  when: { action: 'loadData' };
  then: { displaysData: boolean, showsError: boolean };
}

// Test against contracts, not implementations
describe('UserProfile', () => {
  testContract('loads user data', {
    given: { userId: '123' },
    when: { action: 'loadData' },
    then: { displaysData: true }
  });
});
```

### Mock Versioning
```typescript
// Version mocks to detect breaking changes
const MOCK_VERSION = '1.0.0';

class VersionedMock {
  constructor(version: string) {
    if (version !== MOCK_VERSION) {
      throw new Error('Mock version mismatch - update tests');
    }
  }
}
```

## 5. Practical Examples

### Testing Complex Hooks
```typescript
// Instead of mocking useSharedWorkoutData directly
describe('useWorkoutStats', () => {
  // Test pure logic with controlled inputs
  test('calculates streak correctly', () => {
    const stats = calculateWorkoutStats({
      thisWeek: ['2024-01-01', '2024-01-02', '2024-01-03'],
      lastWeek: ['2023-12-25']
    });

    expect(stats.currentStreak).toBe(3);
  });

  // Integration test for hook composition
  test('integrates with data source', () => {
    renderHook(() => useWorkoutStats(), {
      wrapper: ({ children }) => (
        <MockDataProvider data={mockWorkoutData}>
          {children}
        </MockDataProvider>
      )
    });
  });
});
```

### Testing Database Operations
```typescript
// Prefer integration tests for database logic
describe('WorkoutRepository', () => {
  test('saves workout with exercises', async () => {
    // Use test database or comprehensive mocking
    const repo = new WorkoutRepository(testDb);
    await repo.saveWorkout(mockWorkoutData);

    expect(await repo.findById(mockWorkoutData.id)).toEqual(mockWorkoutData);
  });
});

// Unit test pure query logic
describe('workoutQueries', () => {
  test('builds correct select query', () => {
    const query = buildWorkoutQuery({ userId: '123' });
    expect(query.where.user_id).toBe('123');
  });
});
```

## 6. Tooling and Automation

### Mock Generation Scripts
```bash
# Generate mocks from schema
npm run generate-mocks

# Update mocks when contracts change
npm run update-mock-contracts
```

### CI Integration
```yaml
# Test different mock complexity levels
test:unit:fast:  # Simple mocks only
test:unit:full:  # All mocks
test:integration: # Real dependencies
```

## 7. Decision Framework

### When to Choose Each Approach

| Scenario | Recommended Approach | Reasoning |
|----------|---------------------|-----------|
| Pure functions | Direct testing | No mocking needed |
| Simple hooks | Direct testing | Fast, reliable |
| Complex hooks | Skip → Integration | Mock complexity too high |
| Database ops | Integration tests | Test real behavior |
| External APIs | Mock at HTTP layer | Control external dependencies |
| Browser APIs | Factory mocks | Consistent across tests |

### Cost-Benefit Analysis

```typescript
function shouldMock(complexity: number, testValue: number): boolean {
  const MOCK_THRESHOLD = 0.7; // 70% rule
  return (testValue / complexity) > MOCK_THRESHOLD;
}

// Example usage
shouldMock(
  complexity: 8, // hours to mock
  testValue: 6   // hours test provides value
); // Returns false - skip mocking
```

## 8. Documentation and Communication

### Mock Documentation
```typescript
/**
 * @mock-strategy Factory-based mocking
 * @complexity Medium (3/10)
 * @coverage 85% of hook logic
 * @alternatives Integration tests, E2E tests
 * @maintenance Monthly review required
 */
describe('useWorkoutStats', () => {
  // Tests focus on formatWorkoutStats (pure function)
  // Hook integration tested via E2E scenarios
});
```

### Team Guidelines
1. **New complex dependencies**: Always assess mocking vs integration cost
2. **Mock maintenance**: Regular reviews and updates
3. **Test boundaries**: Clear contracts between layers
4. **Documentation**: Every mock strategy documented
5. **CI feedback**: Fast feedback for simple mocks, comprehensive for complex ones
