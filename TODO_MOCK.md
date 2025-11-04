# PDR: Centralized and Seeded Mock Data Generation

**Author:** Gemini
**Date:** 2025-11-04
**Status:** Proposed

## 1. Overview

This document outlines a plan to evolve our testing framework's mock data strategy. The new strategy will focus on generating realistic, high-quality test data by seeding it from a database, while ensuring data privacy through rigorous sanitization. This will supplement, not entirely replace, our existing manual mock data factories.

## 2. Analysis of Current State

Our current test suite uses a mix of mock data generation strategies:
- **Existing Factories:** `src/__tests__/mocks/test-data.ts` provides a good starting point with manual factory functions.
- **Inline Mocking:** Many tests define mock data inline (e.g., `src/__tests__/unit/routers/workouts-router.test.ts`), leading to code duplication, inconsistency, and a high maintenance burden when schemas change.

The primary drawback of the current approach is that manually created data may not reflect the complexity and edge cases of real user data.

## 3. Proposed Solution: A Hybrid Approach

I propose a hybrid system that combines the benefits of realistic, database-seeded data with the simplicity of manual mocks for targeted unit tests.

### 3.1. Key Components

1.  **Database Seeding Script:** A new script will be created to fetch data from a database (e.g., a staging environment or a sanitized production backup).
2.  **Data Sanitization:** The core of the seeding script will be a robust sanitization process to anonymize all Personally Identifiable Information (PII). **This is a critical security requirement.**
3.  **Generated Mock Data File:** The sanitized data will be written to a type-safe TypeScript file that can be imported directly into our tests.
4.  **Mock Data Provider:** A utility will provide a clean, deep-copied instance of the seeded or manual mock data to each test, preventing cross-test pollution.

### 3.2. Directory Structure

```
scripts/
└── seed-test-data.ts      <-- New: Script to generate test data

src/
└── __tests__/
    ├── generated-mocks/
    │   └── seeded-data.ts   <-- New: Auto-generated from the seeding script
    └── mocks/
        ├── mock-provider.ts   <-- New: Provides access to all mock data
        └── test-data.ts       <-- Keep for simple/manual mocks
```

## 4. Implementation Plan

### Step 1: Create the Database Seeding Script

We will create a new script at `scripts/seed-test-data.ts` that performs the following actions:

1.  **Connects** to the database using environment variables for credentials.
2.  **Fetches** a representative set of data (e.g., 10 users, their last 20 workouts, and associated exercises).
3.  **Sanitizes** the data. For example:
    -   Replace user names with generated fake names (e.g., using `@faker-js/faker`).
    -   Replace emails with placeholder addresses like `user_1@example.com`.
    -   Anonymize any other PII.
4.  **Writes** the sanitized data to `src/__tests__/generated-mocks/seeded-data.ts`.

**File:** `scripts/seed-test-data.ts` (Conceptual)

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { faker } from '@faker-js/faker';
import fs from 'fs/promises';
import path from 'path';

// Assume DB connection details are in environment variables
const db = drizzle(postgres(process.env.DATABASE_URL!));

async function generate() {
  const users = await db.query.users.findMany({ limit: 10 });
  // ... fetch related workouts, exercises, etc.

  const sanitizedUsers = users.map(user => ({
    ...user,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    // ... nullify or anonymize other PII fields
  }));

  const output = `// This file is auto-generated. Do not edit directly.\n\nexport const seededData = ${JSON.stringify({ users: sanitizedUsers, /* ... */ }, null, 2)};`;

  const outputPath = path.join(__dirname, '../src/__tests__/generated-mocks/seeded-data.ts');
  await fs.writeFile(outputPath, output);
}

generate();
```

### Step 2: Create the Mock Data Provider

A central provider will offer access to both the new seeded data and existing manual mocks.

**File:** `src/__tests__/mocks/mock-provider.ts`

```typescript
import { seededData } from '../generated-mocks/seeded-data';
import * as manualMocks from './test-data';

// Deep-clone to prevent test pollution
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

export const getMockData = () => ({
  seeded: deepClone(seededData),
  manual: {
    user: manualMocks.createMockUser,
    workout: manualMocks.createMockWorkout,
  }
});
```

### Step 3: Refactor an Existing Test

We will refactor `src/__tests__/unit/routers/workouts-router.test.ts` to use the realistic seeded data.

**File:** `src/__tests__/unit/routers/workouts-router.test.ts` (Refactored)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { workoutsRouter } from "~/server/api/routers/workouts";
import { getMockData } from "~/../__tests__/mocks/mock-provider.ts"; // Adjusted path

// ... (keep createMockDb and other setup)

describe("workoutsRouter", () => {
  let mockDb;
  let mockCtx;
  let mockData;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    mockData = getMockData(); // Get a fresh set of mock data
    // Use the first user from our realistic seeded data
    const testUser = mockData.seeded.users[0];
    mockCtx = {
      db: mockDb,
      user: { id: testUser.id },
      requestId: "test-request",
      headers: new Headers(),
    };
  });

  describe("getRecent", () => {
    it("should return recent workouts for a user", async () => {
      // Use realistic data from the seeded mock file
      const recentWorkouts = mockData.seeded.workouts.filter(w => w.userId === mockCtx.user.id);
      mockDb.query.workoutSessions.findMany.mockResolvedValue(recentWorkouts);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getRecent({ limit: 5 });

      expect(result.length).toBeLessThanOrEqual(5);
      expect(result[0].userId).toBe(mockCtx.user.id);
    });
  });
});
```

### Step 4: Add a `package.json` Script

We'll add a script to `package.json` to make running the seeding process easy.

```json
"scripts": {
  "test:seed-data": "bun run scripts/seed-test-data.ts"
}
```

## 5. Benefits

- **High-Fidelity Testing:** Tests run against data that mirrors real-world usage, increasing the likelihood of catching edge cases.
- **Drastically Reduced Manual Effort:** Eliminates the tedious process of creating and maintaining complex mock objects by hand.
- **Security by Design:** A mandatory sanitization step prevents sensitive production data from ever entering the test suite.
- **Improved Developer Experience:** A simple command (`bun run test:seed-data`) refreshes the entire test dataset.
