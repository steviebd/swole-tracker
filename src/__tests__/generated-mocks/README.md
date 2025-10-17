# Generated Mocks

This directory contains auto-generated mocks for systematic testing.

## Files

- `database-mocks.ts` - Drizzle ORM database mocks
- `api-mocks.ts` - HTTP API request mocks
- `test-data.ts` - Test data factories
- `mock-validators.ts` - Mock validation utilities

## Usage

```typescript
import { createDatabaseMock } from './generated-mocks/database-mocks';
import { createUser } from './generated-mocks/test-data';

// Use in tests
const dbMock = createDatabaseMock();
const testUser = createUser({ name: 'Custom User' });
```

## Generation

Run `npm run generate-mocks` to regenerate these files when:
- Database schema changes
- API routes change
- Test data requirements change

## Versioning

Mocks are versioned to detect breaking changes. Update `MOCK_VERSION` when making breaking changes to mock contracts.

Generated on: 2025-10-16T03:15:50.035Z
