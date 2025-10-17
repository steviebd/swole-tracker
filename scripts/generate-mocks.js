#!/usr/bin/env node

/**
 * Systematic Mock Generation Script
 *
 * Generates consistent mocks based on schema definitions and usage patterns.
 * This ensures mocks stay in sync with actual implementations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MockGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '..', 'src', '__tests__', 'generated-mocks');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // Generate database mocks from schema
  generateDatabaseMocks() {
    const schemaPath = path.join(__dirname, '..', 'src', 'server', 'db', 'schema.ts');

    if (!fs.existsSync(schemaPath)) {
      console.warn('Schema file not found, skipping database mock generation');
      return;
    }

    // Read schema to understand table structure
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');

    // Extract table names (simplified regex)
    const tableMatches = schemaContent.match(/export const (\w+) = table/g) || [];
    const tables = tableMatches.map(match => match.replace('export const ', '').replace(' = table', ''));

    const mockContent = `// Auto-generated database mocks
// Generated from schema.ts on ${new Date().toISOString()}
// DO NOT EDIT MANUALLY

import { vi } from 'vitest';

export const createDatabaseMock = () => {
  const tables = ${JSON.stringify(tables, null, 2)};

  const createQueryChain = (result = []) => ({
    where: vi.fn(() => createQueryChain(result)),
    select: vi.fn(() => createQueryChain(result)),
    from: vi.fn(() => createQueryChain(result)),
    innerJoin: vi.fn(() => createQueryChain(result)),
    leftJoin: vi.fn(() => createQueryChain(result)),
    orderBy: vi.fn(() => createQueryChain(result)),
    groupBy: vi.fn(() => createQueryChain(result)),
    limit: vi.fn(() => createQueryChain(result)),
    offset: vi.fn(() => createQueryChain(result)),
    values: vi.fn(() => createQueryChain(result)),
    set: vi.fn(() => createQueryChain(result)),
    onConflictDoUpdate: vi.fn(() => createQueryChain(result)),
    returning: vi.fn(async () => result),
    execute: vi.fn(async () => result),
    all: vi.fn(async () => result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  });

  return {
    select: vi.fn(() => createQueryChain()),
    insert: vi.fn(() => createQueryChain()),
    update: vi.fn(() => createQueryChain()),
    delete: vi.fn(() => createQueryChain()),
    // Add specific table mocks
    ${tables.map(table => `${table}: createQueryChain()`).join(',\n    ')}
  };
};

export const MOCK_VERSION = '1.0.0';
export const MOCK_GENERATED_AT = '${new Date().toISOString()}';
`;

    fs.writeFileSync(
      path.join(this.outputDir, 'database-mocks.ts'),
      mockContent
    );

    console.log(`✓ Generated database mocks for ${tables.length} tables`);
  }

  // Generate API route mocks
  generateAPIMocks() {
    const routesDir = path.join(__dirname, '..', 'src', 'app', 'api');

    if (!fs.existsSync(routesDir)) {
      console.warn('API routes directory not found, skipping API mock generation');
      return;
    }

    const mockContent = `// Auto-generated API mocks
// Generated on ${new Date().toISOString()}

import { vi } from 'vitest';

export const createAPIMock = (baseURL = 'http://localhost:3000') => ({
  get: vi.fn((url) => Promise.resolve({
    data: null,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { url: baseURL + url },
  })),
  post: vi.fn((url, data) => Promise.resolve({
    data: null,
    status: 201,
    statusText: 'Created',
    headers: {},
    config: { url: baseURL + url, data },
  })),
  put: vi.fn((url, data) => Promise.resolve({
    data: null,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { url: baseURL + url, data },
  })),
  delete: vi.fn((url) => Promise.resolve({
    data: null,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { url: baseURL + url },
  })),
});
`;

    fs.writeFileSync(
      path.join(this.outputDir, 'api-mocks.ts'),
      mockContent
    );

    console.log('✓ Generated API mocks');
  }

  // Generate test data factories
  generateTestDataFactories() {
    const factories = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      },
      workout: {
        id: 'workout-123',
        user_id: 'user-123',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 3600000).toISOString(),
        duration: 3600,
        createdAt: new Date().toISOString(),
      },
      exercise: {
        id: 'exercise-123',
        name: 'Bench Press',
        category: 'chest',
        createdAt: new Date().toISOString(),
      },
    };

    const mockContent = `// Auto-generated test data factories
// Generated on ${new Date().toISOString()}

export const createUser = (overrides = {}) => ({
  ...${JSON.stringify(factories.user, null, 2)},
  ...overrides,
});

export const createWorkout = (overrides = {}) => ({
  ...${JSON.stringify(factories.workout, null, 2)},
  ...overrides,
});

export const createExercise = (overrides = {}) => ({
  ...${JSON.stringify(factories.exercise, null, 2)},
  ...overrides,
});

// Bulk creation utilities
export const createUsers = (count, overrides = {}) =>
  Array.from({ length: count }, (_, i) =>
    createUser({ id: 'user-' + (i + 1), ...overrides })
  );

export const createWorkouts = (count, userId = 'user-123', overrides = {}) =>
  Array.from({ length: count }, (_, i) =>
    createWorkout({
      id: 'workout-' + (i + 1),
      user_id: userId,
      ...overrides
    })
  );
`;

    fs.writeFileSync(
      path.join(this.outputDir, 'test-data.ts'),
      mockContent
    );

    console.log('✓ Generated test data factories');
  }

  // Generate mock validation utilities
  generateMockValidators() {
    const mockContent = `// Mock validation utilities
// Generated on ${new Date().toISOString()}

export class MockValidator {
  static validateDatabaseMock(mock) {
    const required = ['select', 'insert', 'update', 'delete'];
    const missing = required.filter(method => typeof mock[method] !== 'function');

    if (missing.length > 0) {
      throw new Error('Database mock missing methods: ' + missing.join(', '));
    }

    return true;
  }

  static validateAPIMock(mock) {
    const required = ['get', 'post', 'put', 'delete'];
    const missing = required.filter(method => typeof mock[method] !== 'function');

    if (missing.length > 0) {
      throw new Error('API mock missing methods: ' + missing.join(', '));
    }

    return true;
  }

  static validateTestData(data, schema) {
    // Basic schema validation
    for (const [key, type] of Object.entries(schema)) {
      if (data[key] === undefined) {
        throw new Error('Test data missing required field: ' + key);
      }

      if (typeof data[key] !== type) {
        throw new Error('Test data field ' + key + ' has wrong type. Expected ' + type + ', got ' + typeof data[key]);
      }
    }

    return true;
  }
}

export const MOCK_VERSION = '1.0.0';
export const validateMockVersion = (version) => {
  if (version !== MOCK_VERSION) {
    throw new Error('Mock version mismatch. Expected ' + MOCK_VERSION + ', got ' + version);
  }
};
`;

    fs.writeFileSync(
      path.join(this.outputDir, 'mock-validators.ts'),
      mockContent
    );

    console.log('✓ Generated mock validation utilities');
  }

  run() {
    console.log('🔄 Generating systematic mocks...\n');

    try {
      this.generateDatabaseMocks();
      this.generateAPIMocks();
      this.generateTestDataFactories();
      this.generateMockValidators();

      console.log('\n✅ All mocks generated successfully!');
      console.log('📁 Mocks saved to:', this.outputDir);

      // Generate README for the mocks
      this.generateReadme();

    } catch (error) {
      console.error('❌ Error generating mocks:', error.message);
      process.exit(1);
    }
  }

  generateReadme() {
    const readme = `# Generated Mocks

This directory contains auto-generated mocks for systematic testing.

## Files

- \`database-mocks.ts\` - Drizzle ORM database mocks
- \`api-mocks.ts\` - HTTP API request mocks
- \`test-data.ts\` - Test data factories
- \`mock-validators.ts\` - Mock validation utilities

## Usage

\`\`\`typescript
import { createDatabaseMock } from './generated-mocks/database-mocks';
import { createUser } from './generated-mocks/test-data';

// Use in tests
const dbMock = createDatabaseMock();
const testUser = createUser({ name: 'Custom User' });
\`\`\`

## Generation

Run \`npm run generate-mocks\` to regenerate these files when:
- Database schema changes
- API routes change
- Test data requirements change

## Versioning

Mocks are versioned to detect breaking changes. Update \`MOCK_VERSION\` when making breaking changes to mock contracts.

Generated on: ${new Date().toISOString()}
`;

    fs.writeFileSync(
      path.join(this.outputDir, 'README.md'),
      readme
    );
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new MockGenerator();
  generator.run();
}

export default MockGenerator;
