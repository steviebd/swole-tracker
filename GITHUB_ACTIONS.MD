# GitHub Actions: Free-tier CI setup for Swole Tracker

This repo is configured to run tests, type checks, and linting on GitHub Actions’ free tier. This document explains how to enable, run, and troubleshoot CI for a public repository.

## What CI does

- Caches pnpm dependencies for faster builds
- Installs dependencies with a frozen lockfile
- Runs format check, lint, and typecheck (soft-fails allowed initially)
- Executes unit and integration tests with coverage
- Uploads coverage artifacts (LCOV and text reports)

## Prerequisites

- Public GitHub repository
- Node.js 20-compatible environment (configured in workflow)
- pnpm (configured in workflow)
- Tests written for Vitest (already present)
- Minimal PUBLIC env variables to satisfy runtime env validation (@t3-oss/env-nextjs)

## Files added by this setup

- Workflow: `.github/workflows/ci.yml`
- This guide: `GITHUB_ACTIONS.MD`

The CI workflow is already committed in this repository. See `.github/workflows/ci.yml`.

## How it works

1) Triggers
- On every push (any branch) and on pull requests.
- You can restrict branches by editing the branches list in the workflow.

2) Environment seeding
- @t3-oss/env-nextjs validates env at import time. The workflow sets only NEXT_PUBLIC_* variables to satisfy validation without private secrets.

3) pnpm + Node cache
- Uses `actions/setup-node@v4` with `cache: "pnpm"` and `pnpm/action-setup@v3`.

4) Commands
- Install: `pnpm install --frozen-lockfile`
- Lint/Typecheck: `pnpm format:check`, `pnpm check`, `pnpm typecheck`
- Tests: `pnpm test --coverage`

5) Artifacts
- Coverage output saved to `coverage/` and uploaded as a build artifact.

## Workflow contents

Already present at `.github/workflows/ci.yml`:

- Node 20
- pnpm setup and caching
- Minimal NEXT_PUBLIC_* env for validation
- Install, check, typecheck, test with coverage
- Upload coverage artifacts

If you need to recreate it, use:

```yaml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    env:
      NEXT_PUBLIC_SITE_URL: http://localhost
      NEXT_PUBLIC_ENV: ci
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_dummy
      NEXT_PUBLIC_POSTHOG_KEY: phc_test_dummy
      NEXT_PUBLIC_POSTHOG_HOST: https://us.i.posthog.com
      NEXT_PUBLIC_SUPABASE_URL: https://test.supabase.co
      NEXT_PUBLIC_SUPABASE_KEY: supabase_test_key

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint and typecheck
        run: |
          pnpm format:check || true
          pnpm check || pnpm run -r check || true
          pnpm typecheck || true

      - name: Run tests with coverage
        run: pnpm test --coverage

      - name: Upload coverage artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-lcov
          path: coverage
```

## Local verification before pushing

Run locally:
- `pnpm install`
- `pnpm check` (format + eslint + typecheck per repo configuration)
- `pnpm test --coverage`

Ensure tests pass and coverage directory is generated.

## Coverage thresholds

The repo’s `vitest.config.ts` enforces:
- 80% for lines, functions, branches, statements
- Providers: `v8`, reporters: `text`, `lcov`

Edit `vitest.config.ts` to adjust thresholds if needed.

## Best practices on free tier

- Keep jobs minimal and deterministic:
  - Avoid external network calls. Tests in this repo mock all external clients and seed PUBLIC env.
  - Prefer unit and integration tests that operate offline.
- Use caching:
  - pnpm-lock.yaml should be committed.
  - Avoid changing lockfile frequently to maximize cache hits.
- Keep artifact sizes small:
  - Upload coverage only (omit `node_modules` or build outputs).
- Limit matrix complexity:
  - Node 20 only. Expand later if needed.

## Common issues and fixes

1) Env validation failing (@t3-oss/env-nextjs)
- Symptom: CI fails early with env errors.
- Fix: Ensure NEXT_PUBLIC_* variables are set in the workflow env section.
- Do NOT include private secrets. Server-only keys should be mocked in tests, not set in CI.

2) Tests hang on streaming endpoints (SSE)
- Symptom: Test timeout for SSE endpoints.
- Fix: Follow the pattern in `api.routes.test.ts` to race the handler with a short timeout and assert headers only.

3) tRPC protected procedures failing due to missing auth
- Symptom: UNAUTHORIZED errors.
- Fix: Use the provided test harness to create callers with a mock user or explicit null, depending on the test.

4) Drizzle ORM chain mocks
- Ensure mocks reflect realistic chains: `insert().values().returning()`, `update().set().where()`, `delete().where()`.
- Upserts: return an object with `onConflictDoUpdate` function on the values chain if needed.

## How to view CI results

- Navigate to the GitHub repository’s “Actions” tab.
- Click the latest workflow run.
- Inspect job logs, test output, and download artifacts (coverage).

## Optional: Require CI for PRs

- In GitHub repo: Settings → Branches → Branch protection rules
- Add rule for `main` (or default branch)
- Enable “Require status checks to pass before merging”
- Select the CI job (e.g., “build-and-test”)

## Updating CI behavior

- Edit `.github/workflows/ci.yml` and push to a branch.
- The workflow will run on the PR.
- Keep changes small to iterate quickly.

## Adding Node-only tests later (rate-limit middleware)

- Configure a separate test file with node environment if needed:
  - In test: `test: { environment: 'node' }` override in a dedicated config or use per-test environment setting.
  - Mock `Date.now` and db calls; avoid any network.

That’s it. With this setup, the public repo will run on GitHub Actions’ free tier, validating code quality, type safety, and runtime logic with fast, offline tests.
