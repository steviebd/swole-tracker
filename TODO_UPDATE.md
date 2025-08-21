# Project Update TODO List

This document outlines the steps to update the project's dependencies and Cloudflare Workers runtime to the latest versions.

## 1. Update Node.js

The project currently uses Node.js version `20.19.4`. The latest LTS version of Node.js 20 should be used.

- [ ] Check for the latest Node.js 20 LTS version.
- [ ] Update the `engines` and `volta` fields in `package.json` to the latest LTS version.
- [ ] Update the `@types/node` dependency to the latest version compatible with the new Node.js version.
- [ ] Run `npm install` to update the `package-lock.json` file.

## 2. Update Wrangler

The project currently uses Wrangler version `^4.30.0`.

- [ ] Check for the latest version of the `wrangler` package.
- [ ] Update the `wrangler` dependency in `package.json` to the latest version.
- [ ] Run `npm install` to update the `package-lock.json` file.

## 3. Update Cloudflare Workers Runtime

The project currently uses a `compatibility_date` of `"2024-09-23"`.

- [ ] Update the `compatibility_date` in `scripts/generate-wrangler-config.ts` to the current date, which is `2025-08-20`.
- [ ] Add a new script `types:generate` to the `package.json` file with the command `wrangler types`.
- [ ] Run the new `types:generate` script to update the Cloudflare Workers types.
- [ ] Review the generated type files for any breaking changes.

## 4. Update Other Dependencies

All dependencies should be updated to their latest supported versions.

- [ ] Run `npm outdated` to identify all outdated dependencies.
- [ ] Update all the outdated dependencies in `package.json` to their latest supported versions.
- [ ] Run `npm install` to update the `package-lock.json` file.
- [ ] Pay special attention to major version updates, as they might introduce breaking changes. Read the release notes for each major update to understand the changes and required migration steps.

## 5. Testing

After updating the dependencies, it's crucial to test the application thoroughly to ensure that everything is working as expected.

- [ ] Run the test suite (`npm test`).
- [ ] Run the end-to-end tests (`npm run e2e`).
- [ ] Manually test the application in a staging environment.
