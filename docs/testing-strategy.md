# Systematic Testing Strategy for Complex Dependencies

## Overview

This document outlines a systematic approach to handling complex mocking requirements in testing, particularly for applications with multiple layers of dependencies (database, APIs, React hooks, browser APIs, etc.).

## Core Principles

### 1. **Test Boundaries First**
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

### 2. **Progressive Testing Pyramid**
```
┌─────────────┐  High confidence, slow
│ E2E Tests   │  ← Integration behavior
├─────────────┤
│ Integration │  ← Component interactions
├─────────────┤
│ Unit Tests  │  ← Individual functions
└─────────────┘  Fast feedback, low confidence
```

### 3. **Cost-Benefit Analysis**
```typescript
function shouldMock(complexity: number, testValue: number): boolean {
  const MOCK_THRESHOLD = 0.7; // 70% rule
  return (testValue / complexity) > MOCK_THRESHOLD;
}
```

## Implementation Strategy

### Phase 1: Dependency Analysis
1. **Identify Mock Boundaries**: Map out all external dependencies
2. **Assess Complexity**: Rate mocking difficulty (1-10 scale)
3. **Evaluate Test Value**: Determine test coverage importance
4. **Choose Strategy**: Mock vs Integration vs Skip

### Phase 2: Factory-Based Mocking

#### Enhanced Mock Data System

The project now implements a comprehensive centralized mock data generation system with three key components:

1. **Enhanced Mock Factories** (`src/__tests__/mocks/test-data.ts`)
   - Type-safe factories using Drizzle schema inference
   - Comprehensive factories for all major entities (users, workouts, exercises, etc.)
   - Override pattern for custom test scenarios

2. **Centralized Mock Sets** (`src/__tests__/mocks/mock-sets.ts`)
   - Pre-defined realistic data scenarios
   - Deep copy utility to prevent test pollution
   - Reusable mock data sets for common test cases

3. **Specialized Factories** (`src/__tests__/generated-mocks/test-data.ts`)
   - Domain-specific factories for WHOOP, Health Advice, and other features
   - Bulk creation utilities for multiple records

#### Database Mock Factory
```typescript
// src/__tests__/generated-mocks/database-mocks.ts
export function createDatabaseMock() {
  return {
    select: vi.fn(() => createQueryChain()),
    insert: vi.fn(() => createQueryChain()),
    update: vi.fn(() => createQueryChain()),
    delete: vi.fn(() => createQueryChain()),
    query: {
      workoutSessions: { findMany: vi.fn(), findFirst: vi.fn() },
      users: { findMany: vi.fn(), findFirst: vi.fn() },
      // ... all database operations
    },
  };
}
```

#### Mock Data Usage Pattern
```typescript
// Import centralized mock data
import { getMockData } from '~/../__tests__/mocks/mock-sets';
import { createMockUser, createMockWorkoutSession } from '~/../__tests__/mocks/test-data';

// In tests
describe('Router Tests', () => {
  let mockData;
  
  beforeEach(() => {
    mockData = getMockData(); // Fresh copy for each test
  });
  
  it('should handle user data', () => {
    const user = createMockUser({ id: 'test-user' });
    // Test with type-safe mock data
  });
});
```

#### Browser API Mock Factory
```typescript
export function createBrowserAPIMock() {
  return {
    matchMedia: vi.fn((query) => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    localStorage: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      // ...
    },
  };
}
```

### Phase 3: Progressive Testing Levels

#### Dependency Injection over Module Mocking

The Bun test runner does not implement `vi.mock`/`vi.doMock`. Instead of
module-level interception, expose optional dependency parameters on hooks or
components (for example `useDashboardData(options, { useWorkoutStatsHook })`).
Unit tests can pass simple `vi.fn()` implementations through these injection
points, while application code continues to rely on the defaults. This pattern
keeps tests deterministic and works in both `bun test` and `bun coverage`.

#### Level 1: Pure Functions (No Mocks)
```typescript
describe('Pure Functions', () => {
  it('formats duration correctly', () => {
    expect(formatDuration(3600)).toBe('60min');
  });
});
```

#### Level 2: Simple Integration (Factory Mocks)
```typescript
describe('Browser APIs', () => {
  it('responds to motion preferences', () => {
    const browserMock = createBrowserAPIMock();
    browserMock.matchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
    });

    // Test component
    expect(useReducedMotion()).toBe(true);
  });
});
```

#### Level 3: Complex Integration (Conditional)
```typescript
describe('Complex Hooks', () => {
  it.skip('integrates with data source', () => {
    // Skip if mocking complexity > test value
    // Reason: Complex dependency mocking required
  });
});
```

## Tooling & Automation

### Mock Generation Script
```bash
# Generate mocks from schema
npm run generate-mocks

# Auto-generates:
# - Database mocks from schema
# - API mocks from routes
# - Test data factories
# - Validation utilities
```

### Mock Versioning
```typescript
const MOCK_VERSION = '1.0.0';

class VersionedMock {
  constructor(version: string) {
    if (version !== MOCK_VERSION) {
      throw new Error('Mock version mismatch');
    }
  }
}
```

## Decision Framework

### When to Choose Each Approach

| Scenario | Recommended | Reasoning |
|----------|-------------|-----------|
| Pure functions | Direct testing | No dependencies |
| Simple hooks | Direct testing | Easy to test |
| Browser APIs | Factory mocks | Consistent interface |
| Database ops | Integration tests | Test real behavior |
| External APIs | Mock at HTTP layer | Control external deps |
| Complex hooks | Skip → Integration | Mock cost too high |

### Skip Criteria
- **Mocking complexity** > **implementation complexity**
- **Mock maintenance cost** > **test value**
- **External service instability**
- **Better covered by integration/E2E tests**

## Practical Examples

### Example 1: Database Operations
```typescript
// ❌ Avoid: Complex inline mocking
const mockDb = {
  select: vi.fn(() => ({ /* 50 lines */ })),
  // ...
};

// ✅ Prefer: Factory approach
const dbMock = createDrizzleMock();
// Configure specific behavior
dbMock.select.mockReturnValue(
  createQueryChain([{ id: 'user-123' }])
);
```

### Example 2: Hook Dependencies
```typescript
// ❌ Avoid: Module-level mocking issues
vi.mock('~/hooks/complex-hook', () => ({
  useComplexHook: vi.fn(),
}));

// ✅ Prefer: Factory with control
const hookMock = createReactHookMock(defaultData);
hookMock.setValue(customData);
```

### Example 3: Progressive Strategy with Centralized Mocks
```typescript
describe('useWorkoutStats', () => {
  let mockData;
  
  beforeEach(() => {
    mockData = getMockData(); // Fresh mock data for each test
  });

  // Level 1: Test pure logic
  test('calculates streak', () => {
    expect(calculateStreak(dates)).toBe(3);
  });

  // Level 2: Test with centralized mocks
  test('integrates with data source', () => {
    const dbMock = createDatabaseMock();
    dbMock.query.workoutSessions.findMany.mockResolvedValue([mockData.workoutWithExercises.workout]);
    
    // Test with type-safe mock data
    expect(useWorkoutStats()).toBeDefined();
  });

  // Level 3: Integration test
  test('end-to-end flow', () => {
    // Test real behavior in E2E suite
  });
});
```

## Maintenance & Evolution

### Regular Review Process
1. **Monthly mock audit**: Check for outdated mocks
2. **Schema change review**: Update mocks when schema changes
3. **Test coverage analysis**: Ensure mocks don't hide integration issues
4. **Performance monitoring**: Keep unit tests fast

### Evolution Strategy
1. **Start simple**: Direct testing where possible
2. **Add factories**: For common mocking patterns
3. **Automate generation**: For schema/API derived mocks
4. **Integration focus**: For complex business logic

## Team Guidelines

### New Complex Dependencies
1. **Assess mocking cost** before implementation
2. **Document decisions** in test files
3. **Use factories** for reusable mocks
4. **Version mocks** for breaking changes
5. **Prefer integration tests** when mocking is complex

### Code Review Checklist
- [ ] Mock complexity justified?
- [ ] Test provides real value?
- [ ] Mock maintenance documented?
- [ ] Integration test coverage considered?
- [ ] Factory pattern used where applicable?

## Conclusion

Systematic mocking requires balancing test value against maintenance cost. Use this framework to:

1. **Analyze dependencies** systematically
2. **Choose appropriate testing level** for each component
3. **Use factory patterns** for maintainable mocks
4. **Automate mock generation** where possible
5. **Focus integration testing** on high-value scenarios

This approach ensures reliable, maintainable tests that provide good coverage without excessive complexity.
