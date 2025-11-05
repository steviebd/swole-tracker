# Expo + React Native Web Monorepo Migration Plan

## Overview

This document outlines the complete migration plan to transform Swole Tracker into a monorepo supporting both web (Next.js) and mobile (Expo) applications with maximum code sharing through React Native Web.

### Key Decisions
- **Monorepo Tool**: Turborepo
- **Mobile Framework**: Expo with Expo Router
- **Code Sharing Strategy**: React Native Web with incremental adoption
- **API Layer**: tRPC shared across platforms via @trpc/react-query
- **Design System**: Material 3 tokens converted to React Native StyleSheet
- **Timeline**: 10-12 weeks to feature-complete mobile app
- **Initial Scope**: Core workout tracking features

---

## Phase 1: Monorepo Foundation (Week 1-2)

### 1.1 Setup Turborepo

**Objective**: Initialize Turborepo and configure the monorepo structure.

**Steps**:
1. Install Turborepo globally or as dev dependency:
   ```bash
   bun add -D turbo
   ```

2. Create `turbo.json` in root:
   ```json
   {
     "$schema": "https://turbo.build/schema.json",
     "globalDependencies": ["**/.env.*local"],
     "pipeline": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": [".next/**", "!.next/cache/**", "dist/**"]
       },
       "dev": {
         "cache": false,
         "persistent": true
       },
       "lint": {
         "dependsOn": ["^lint"]
       },
       "test": {
         "dependsOn": ["^build"],
         "outputs": ["coverage/**"]
       },
       "typecheck": {
         "dependsOn": ["^build"]
       },
       "check": {
         "dependsOn": ["lint", "typecheck"]
       }
     }
   }
   ```

3. Update root `package.json`:
   - Add workspaces configuration for Bun:
     ```json
     {
       "workspaces": [
         "apps/*",
         "packages/*"
       ],
       "scripts": {
         "build": "turbo run build",
         "dev": "turbo run dev",
         "lint": "turbo run lint",
         "test": "turbo run test",
         "typecheck": "turbo run typecheck",
         "check": "turbo run check"
       }
     }
     ```

**Validation**:
- Run `turbo --version` to verify installation
- Verify workspace resolution with `bun install`

---

### 1.2 Restructure to Apps

**Objective**: Move existing Next.js app to `apps/web/` without breaking functionality.

**Steps**:
1. Create directory structure:
   ```bash
   mkdir -p apps/web apps/mobile packages
   ```

2. Move existing Next.js app to `apps/web/`:
   ```bash
   # Move all existing source directories
   mv src apps/web/
   mv public apps/web/
   mv next.config.ts apps/web/
   mv tsconfig.json apps/web/
   mv tailwind.config.ts apps/web/
   mv postcss.config.mjs apps/web/
   mv vitest.config.ts apps/web/
   mv vitest.config.simple.ts apps/web/
   ```

3. Create `apps/web/package.json`:
   ```json
   {
     "name": "@swole-tracker/web",
     "version": "0.1.0",
     "private": true,
     "scripts": {
       "dev": "next dev",
       "dev:next": "next dev",
       "build": "next build",
       "start": "next start",
       "lint": "next lint",
       "typecheck": "tsc --noEmit",
       "check": "bun run lint && bun run typecheck",
       "test": "vitest run",
       "coverage": "vitest run --coverage"
     },
     "dependencies": {
       // Copy from root package.json
     },
     "devDependencies": {
       // Copy from root package.json
     }
   }
   ```

4. Update `apps/web/tsconfig.json` to reference shared packages (will do after creating them):
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "paths": {
         "~/*": ["./src/*"],
         "@swole-tracker/shared": ["../../packages/shared/src"],
         "@swole-tracker/api": ["../../packages/api/src"],
         "@swole-tracker/ui": ["../../packages/ui/src"],
         "@swole-tracker/design-tokens": ["../../packages/design-tokens/src"]
       }
     },
     "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
     "exclude": ["node_modules"]
   }
   ```

5. Update import paths in `apps/web/src/` from `~/` to reference shared packages where applicable (will do incrementally).

6. Move root `wrangler.toml` to `apps/web/wrangler.toml`.

7. Update `apps/web/next.config.ts` to handle monorepo:
   ```typescript
   import { fileURLToPath } from "node:url";
   import createJiti from "jiti";

   const jiti = createJiti(fileURLToPath(import.meta.url));

   // Import env files to validate at build time
   jiti("./src/env");

   /** @type {import("next").NextConfig} */
   const config = {
     // ... existing config ...

     // Add transpilePackages for shared packages
     transpilePackages: [
       "@swole-tracker/shared",
       "@swole-tracker/api",
       "@swole-tracker/ui",
       "@swole-tracker/design-tokens",
     ],
   };

   export default config;
   ```

**Validation**:
- `cd apps/web && bun install`
- `cd apps/web && bun dev` should start the Next.js dev server
- Navigate to `http://localhost:3000` and verify the app works

---

### 1.3 Create Shared Packages Structure

**Objective**: Create the foundational shared packages for code reuse.

#### 1.3.1 Create `packages/shared`

**Purpose**: Shared utilities, constants, types that don't depend on platform-specific APIs.

**Steps**:
1. Create structure:
   ```bash
   mkdir -p packages/shared/src
   ```

2. Create `packages/shared/package.json`:
   ```json
   {
     "name": "@swole-tracker/shared",
     "version": "0.1.0",
     "private": true,
     "main": "./src/index.ts",
     "types": "./src/index.ts",
     "exports": {
       ".": "./src/index.ts"
     },
     "scripts": {
       "lint": "eslint .",
       "typecheck": "tsc --noEmit",
       "test": "vitest run"
     },
     "dependencies": {
       "zod": "^3.23.8"
     },
     "devDependencies": {
       "@types/node": "^20.14.10",
       "typescript": "^5.5.3",
       "vitest": "^2.1.8"
     }
   }
   ```

3. Create `packages/shared/tsconfig.json`:
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "outDir": "dist",
       "rootDir": "src"
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

4. Create `packages/shared/src/index.ts`:
   ```typescript
   // Re-export all shared utilities
   export * from './utils';
   export * from './constants';
   export * from './types';
   ```

5. Identify utilities to move from `apps/web/src/lib/`:
   - Date utilities
   - Number formatting
   - Validation helpers
   - Constants (exercise types, muscle groups, etc.)
   - Move these incrementally

**Validation**:
- `cd packages/shared && bun install`
- `cd packages/shared && bun typecheck`

---

#### 1.3.2 Create `packages/api`

**Purpose**: Shared tRPC routers, hooks, types, and API client setup.

**Steps**:
1. Create structure:
   ```bash
   mkdir -p packages/api/src/routers packages/api/src/hooks
   ```

2. Create `packages/api/package.json`:
   ```json
   {
     "name": "@swole-tracker/api",
     "version": "0.1.0",
     "private": true,
     "main": "./src/index.ts",
     "types": "./src/index.ts",
     "exports": {
       ".": "./src/index.ts",
       "./client": "./src/client.ts",
       "./routers": "./src/routers/index.ts"
     },
     "scripts": {
       "lint": "eslint .",
       "typecheck": "tsc --noEmit",
       "test": "vitest run"
     },
     "dependencies": {
       "@trpc/client": "^11.0.0",
       "@trpc/server": "^11.0.0",
       "@trpc/react-query": "^11.0.0",
       "@tanstack/react-query": "^5.59.16",
       "zod": "^3.23.8",
       "superjson": "^2.2.1",
       "@swole-tracker/shared": "workspace:*"
     },
     "devDependencies": {
       "typescript": "^5.5.3"
     }
   }
   ```

3. Create `packages/api/tsconfig.json`:
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "outDir": "dist",
       "rootDir": "src",
       "paths": {
         "@swole-tracker/shared": ["../shared/src"]
       }
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

4. Move tRPC setup from `apps/web/src/server/api/`:
   ```bash
   # Copy routers to packages/api/src/routers/
   cp -r apps/web/src/server/api/routers/* packages/api/src/routers/

   # Copy root router
   cp apps/web/src/server/api/root.ts packages/api/src/routers/index.ts

   # Copy tRPC context and initialization
   cp apps/web/src/server/api/trpc.ts packages/api/src/trpc.ts
   ```

5. Update imports in copied files to use `@swole-tracker/shared`.

6. Create `packages/api/src/client.ts` for client-side setup:
   ```typescript
   import { createTRPCReact } from '@trpc/react-query';
   import type { AppRouter } from './routers';

   export const api = createTRPCReact<AppRouter>();
   ```

7. Create `packages/api/src/index.ts`:
   ```typescript
   export { api } from './client';
   export type { AppRouter } from './routers';
   export * from './routers';
   ```

**Validation**:
- `cd packages/api && bun install`
- `cd packages/api && bun typecheck`
- Update `apps/web/src/trpc/` to import from `@swole-tracker/api`

---

#### 1.3.3 Create `packages/ui`

**Purpose**: Shared React Native Web components following Material 3 design system.

**Steps**:
1. Create structure:
   ```bash
   mkdir -p packages/ui/src/components packages/ui/src/primitives
   ```

2. Create `packages/ui/package.json`:
   ```json
   {
     "name": "@swole-tracker/ui",
     "version": "0.1.0",
     "private": true,
     "main": "./src/index.ts",
     "types": "./src/index.ts",
     "exports": {
       ".": "./src/index.ts"
     },
     "scripts": {
       "lint": "eslint .",
       "typecheck": "tsc --noEmit",
       "test": "vitest run"
     },
     "dependencies": {
       "react": "^19.0.0",
       "react-native": "^0.76.0",
       "react-native-web": "^0.19.13",
       "@swole-tracker/design-tokens": "workspace:*"
     },
     "devDependencies": {
       "@types/react": "^19.0.0",
       "@types/react-native": "^0.73.0",
       "typescript": "^5.5.3",
       "vitest": "^2.1.8",
       "@testing-library/react-native": "^12.8.1"
     }
   }
   ```

3. Create `packages/ui/tsconfig.json`:
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "jsx": "react-native",
       "outDir": "dist",
       "rootDir": "src",
       "paths": {
         "@swole-tracker/design-tokens": ["../design-tokens/src"]
       }
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

4. Create basic primitives in `packages/ui/src/primitives/`:
   - `Box.tsx` - Wrapper around `View`
   - `Text.tsx` - Styled text component
   - `Button.tsx` - Touchable button with Material 3 styling
   - `Card.tsx` - Card container
   - `Input.tsx` - Text input field

5. Create `packages/ui/src/index.ts`:
   ```typescript
   export * from './primitives/Box';
   export * from './primitives/Text';
   export * from './primitives/Button';
   export * from './primitives/Card';
   export * from './primitives/Input';
   ```

**Note**: Will implement actual components in Phase 2 after design tokens are ready.

**Validation**:
- `cd packages/ui && bun install`
- `cd packages/ui && bun typecheck`

---

#### 1.3.4 Create `packages/design-tokens`

**Purpose**: Material 3 design tokens converted to React Native StyleSheet format.

**Steps**:
1. Create structure:
   ```bash
   mkdir -p packages/design-tokens/src packages/design-tokens/scripts
   ```

2. Create `packages/design-tokens/package.json`:
   ```json
   {
     "name": "@swole-tracker/design-tokens",
     "version": "0.1.0",
     "private": true,
     "main": "./src/index.ts",
     "types": "./src/index.ts",
     "exports": {
       ".": "./src/index.ts"
     },
     "scripts": {
       "build": "bun run scripts/generate-tokens.ts",
       "typecheck": "tsc --noEmit",
       "test": "vitest run"
     },
     "dependencies": {
       "react-native": "^0.76.0"
     },
     "devDependencies": {
       "typescript": "^5.5.3",
       "vitest": "^2.1.8"
     }
   }
   ```

3. Create `packages/design-tokens/tsconfig.json`:
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "outDir": "dist",
       "rootDir": "src"
     },
     "include": ["src/**/*", "scripts/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

4. Create placeholder `packages/design-tokens/src/index.ts`:
   ```typescript
   // This will be generated by the build script
   export const colors = {};
   export const typography = {};
   export const spacing = {};
   export const elevation = {};
   ```

**Note**: Will implement token conversion script in Phase 2.

**Validation**:
- `cd packages/design-tokens && bun install`
- `cd packages/design-tokens && bun typecheck`

---

### 1.4 Create Base TypeScript Configuration

**Objective**: Create shared TypeScript configuration for all packages.

**Steps**:
1. Create `tsconfig.base.json` in root:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "lib": ["ES2022"],
       "module": "ESNext",
       "moduleResolution": "Bundler",
       "resolveJsonModule": true,
       "allowJs": true,
       "checkJs": false,
       "jsx": "preserve",
       "declaration": true,
       "declarationMap": true,
       "sourceMap": true,
       "strict": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noFallthroughCasesInSwitch": true,
       "noUncheckedIndexedAccess": true,
       "skipLibCheck": true,
       "esModuleInterop": true,
       "allowSyntheticDefaultImports": true,
       "forceConsistentCasingInFileNames": true,
       "isolatedModules": true,
       "incremental": true
     }
   }
   ```

2. Update root `tsconfig.json` to reference workspaces:
   ```json
   {
     "files": [],
     "references": [
       { "path": "./apps/web" },
       { "path": "./apps/mobile" },
       { "path": "./packages/shared" },
       { "path": "./packages/api" },
       { "path": "./packages/ui" },
       { "path": "./packages/design-tokens" }
     ]
   }
   ```

**Validation**:
- `bun typecheck` from root should check all packages

---

### 1.5 Configure Turborepo Pipeline

**Objective**: Setup efficient build caching and task orchestration.

**Steps**:
1. Update `turbo.json` with detailed pipeline:
   ```json
   {
     "$schema": "https://turbo.build/schema.json",
     "globalDependencies": ["**/.env.*local"],
     "pipeline": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": [".next/**", "!.next/cache/**", "dist/**"],
         "env": ["NODE_ENV"]
       },
       "dev": {
         "cache": false,
         "persistent": true
       },
       "lint": {
         "outputs": []
       },
       "typecheck": {
         "dependsOn": ["^build"],
         "outputs": []
       },
       "test": {
         "dependsOn": ["^build"],
         "outputs": ["coverage/**"]
       },
       "check": {
         "dependsOn": ["lint", "typecheck"]
       },
       "tokens:build": {
         "outputs": ["packages/design-tokens/src/**"]
       }
     }
   }
   ```

2. Update root `package.json` scripts:
   ```json
   {
     "scripts": {
       "dev": "turbo run dev",
       "dev:web": "turbo run dev --filter=@swole-tracker/web",
       "dev:mobile": "turbo run dev --filter=@swole-tracker/mobile",
       "build": "turbo run build",
       "build:web": "turbo run build --filter=@swole-tracker/web",
       "build:mobile": "turbo run build --filter=@swole-tracker/mobile",
       "lint": "turbo run lint",
       "typecheck": "turbo run typecheck",
       "test": "turbo run test",
       "check": "turbo run check",
       "tokens:build": "turbo run tokens:build --filter=@swole-tracker/design-tokens",
       "clean": "turbo run clean && rm -rf node_modules"
     }
   }
   ```

**Validation**:
- `bun run check` should lint and typecheck all packages
- `bun run build` should build all apps and packages

---

### 1.6 Setup Infisical for Monorepo

**Objective**: Configure Infisical secrets management for both web and mobile apps.

**Steps**:
1. Create `infisical.json` in root (if not exists):
   ```json
   {
     "workspaceId": "<your-workspace-id>",
     "environments": ["dev", "staging", "prod"]
   }
   ```

2. Create separate environment configurations:
   - `apps/web/.infisical.json` for web-specific secrets
   - `apps/mobile/.infisical.json` for mobile-specific secrets (will create in Phase 3)

3. Update `apps/web/scripts/update-wrangler-config.ts` to work from new location.

4. Update scripts to use Infisical from monorepo root:
   ```json
   // In apps/web/package.json
   {
     "scripts": {
       "db:push": "cd ../.. && infisical run --env dev -- bun --cwd apps/web db:push"
     }
   }
   ```

**Validation**:
- `infisical run --env dev -- bun run dev:web` should work
- Database operations should still work with Infisical

---

### 1.7 Update Documentation

**Objective**: Update project documentation to reflect monorepo structure.

**Steps**:
1. Update `README.md`:
   - Add monorepo structure section
   - Update installation instructions
   - Update development workflow for Turborepo

2. Update `CLAUDE.md`:
   - Add monorepo structure
   - Update common commands for Turborepo
   - Add package-specific development instructions

3. Create `apps/web/README.md`:
   - Web-specific setup instructions
   - Local development guide

4. Create `apps/mobile/README.md` (placeholder for Phase 3):
   - Mobile-specific setup instructions
   - Expo development guide

5. Create `packages/README.md`:
   - Overview of shared packages
   - When to add code to each package
   - Development guidelines

**Validation**:
- Documentation accurately reflects new structure
- All commands in docs work correctly

---

## Phase 2: Design System Migration (Week 2-3)

### 2.1 Material 3 Token Conversion Script

**Objective**: Build automated script to convert CSS tokens to React Native StyleSheet.

**Steps**:
1. Create `packages/design-tokens/scripts/generate-tokens.ts`:
   ```typescript
   import fs from 'fs';
   import path from 'path';

   // Read material3-palettes.generated.json from apps/web
   const palettesPath = path.join(__dirname, '../../../apps/web/src/design-tokens/material3-palettes.generated.json');
   const palettes = JSON.parse(fs.readFileSync(palettesPath, 'utf-8'));

   // Parse CSS custom properties from material3-tokens.css
   const cssPath = path.join(__dirname, '../../../apps/web/src/styles/material3-tokens.css');
   const cssContent = fs.readFileSync(cssPath, 'utf-8');

   interface TokenGroups {
     colors: Record<string, string>;
     typography: Record<string, any>;
     spacing: Record<string, number>;
     elevation: Record<string, any>;
   }

   function parseCssTokens(css: string): TokenGroups {
     const tokens: TokenGroups = {
       colors: {},
       typography: {},
       spacing: {},
       elevation: {},
     };

     // Parse :root and [data-theme="dark"] sections
     const rootMatch = css.match(/:root\s*{([^}]+)}/);
     const darkMatch = css.match(/\[data-theme="dark"\]\s*{([^}]+)}/);

     if (rootMatch) {
       parseTokenBlock(rootMatch[1], tokens, 'light');
     }

     if (darkMatch) {
       parseTokenBlock(darkMatch[1], tokens, 'dark');
     }

     return tokens;
   }

   function parseTokenBlock(block: string, tokens: TokenGroups, theme: 'light' | 'dark') {
     const lines = block.split('\n').filter(line => line.trim());

     for (const line of lines) {
       const match = line.match(/--([^:]+):\s*([^;]+);/);
       if (!match) continue;

       const [_, name, value] = match;
       const cleanName = name.trim();
       const cleanValue = value.trim();

       // Categorize tokens
       if (cleanName.startsWith('md-sys-color-')) {
         const colorName = cleanName.replace('md-sys-color-', '');
         if (!tokens.colors[colorName]) {
           tokens.colors[colorName] = {};
         }
         tokens.colors[colorName][theme] = cleanValue;
       } else if (cleanName.startsWith('md-sys-typescale-')) {
         // Parse typography tokens
         const parts = cleanName.replace('md-sys-typescale-', '').split('-');
         const scale = parts.slice(0, -1).join('-');
         const property = parts[parts.length - 1];

         if (!tokens.typography[scale]) {
           tokens.typography[scale] = {};
         }
         tokens.typography[scale][property] = cleanValue;
       }
       // Add spacing, elevation parsing as needed
     }
   }

   function generateReactNativeTokens(tokens: TokenGroups): string {
     return `
   // Auto-generated from Material 3 tokens
   // Do not edit manually - run 'bun run tokens:build' to regenerate

   import { StyleSheet } from 'react-native';

   export const colors = {
     light: ${JSON.stringify(Object.fromEntries(Object.entries(tokens.colors).map(([k, v]) => [k, v.light])), null, 2)},
     dark: ${JSON.stringify(Object.fromEntries(Object.entries(tokens.colors).map(([k, v]) => [k, v.dark])), null, 2)},
   };

   export const typography = ${JSON.stringify(tokens.typography, null, 2)};

   export const spacing = {
     xs: 4,
     sm: 8,
     md: 16,
     lg: 24,
     xl: 32,
     xxl: 48,
   };

   export const elevation = {
     level0: {
       shadowColor: '#000',
       shadowOffset: { width: 0, height: 0 },
       shadowOpacity: 0,
       shadowRadius: 0,
       elevation: 0,
     },
     level1: {
       shadowColor: '#000',
       shadowOffset: { width: 0, height: 1 },
       shadowOpacity: 0.18,
       shadowRadius: 1.0,
       elevation: 1,
     },
     level2: {
       shadowColor: '#000',
       shadowOffset: { width: 0, height: 1 },
       shadowOpacity: 0.20,
       shadowRadius: 1.41,
       elevation: 2,
     },
     level3: {
       shadowColor: '#000',
       shadowOffset: { width: 0, height: 1 },
       shadowOpacity: 0.22,
       shadowRadius: 2.22,
       elevation: 3,
     },
     level4: {
       shadowColor: '#000',
       shadowOffset: { width: 0, height: 2 },
       shadowOpacity: 0.23,
       shadowRadius: 2.62,
       elevation: 4,
     },
     level5: {
       shadowColor: '#000',
       shadowOffset: { width: 0, height: 2 },
       shadowOpacity: 0.25,
       shadowRadius: 3.84,
       elevation: 5,
     },
   };

   export const tokens = {
     colors,
     typography,
     spacing,
     elevation,
   };
   `.trim();
   }

   // Main execution
   const tokens = parseCssTokens(cssContent);
   const output = generateReactNativeTokens(tokens);

   const outputPath = path.join(__dirname, '../src/index.ts');
   fs.writeFileSync(outputPath, output, 'utf-8');

   console.log('✅ Design tokens generated successfully!');
   ```

2. Update `packages/design-tokens/package.json`:
   ```json
   {
     "scripts": {
       "build": "bun run scripts/generate-tokens.ts",
       "typecheck": "tsc --noEmit",
       "test": "vitest run"
     }
   }
   ```

3. Run the script:
   ```bash
   cd packages/design-tokens
   bun run build
   ```

**Validation**:
- `packages/design-tokens/src/index.ts` should be generated
- Colors should match CSS values
- Both light and dark themes should be present
- Typography, spacing, elevation should be defined

---

### 2.2 Create Theme Provider

**Objective**: Create a shared theme provider that works on both web and mobile.

**Steps**:
1. Create `packages/ui/src/theme/ThemeProvider.tsx`:
   ```typescript
   import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
   import { Appearance, ColorSchemeName } from 'react-native';
   import { tokens } from '@swole-tracker/design-tokens';

   type Theme = 'light' | 'dark';

   interface ThemeContextValue {
     theme: Theme;
     setTheme: (theme: Theme) => void;
     colors: typeof tokens.colors.light;
   }

   const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

   export function ThemeProvider({ children }: { children: ReactNode }) {
     const [theme, setThemeState] = useState<Theme>('light');

     useEffect(() => {
       // Listen to system theme changes
       const subscription = Appearance.addChangeListener(({ colorScheme }) => {
         setThemeState(colorScheme === 'dark' ? 'dark' : 'light');
       });

       // Set initial theme
       const systemTheme = Appearance.getColorScheme();
       setThemeState(systemTheme === 'dark' ? 'dark' : 'light');

       return () => subscription.remove();
     }, []);

     const setTheme = (newTheme: Theme) => {
       setThemeState(newTheme);
     };

     const colors = theme === 'dark' ? tokens.colors.dark : tokens.colors.light;

     return (
       <ThemeContext.Provider value={{ theme, setTheme, colors }}>
         {children}
       </ThemeContext.Provider>
     );
   }

   export function useTheme() {
     const context = useContext(ThemeContext);
     if (!context) {
       throw new Error('useTheme must be used within ThemeProvider');
     }
     return context;
   }
   ```

2. Export from `packages/ui/src/index.ts`:
   ```typescript
   export { ThemeProvider, useTheme } from './theme/ThemeProvider';
   ```

**Validation**:
- Theme provider should compile without errors
- `useTheme` hook should return correct theme values

---

### 2.3 Create Base UI Primitives

**Objective**: Implement foundational React Native Web components with Material 3 styling.

#### 2.3.1 Box Component

Create `packages/ui/src/primitives/Box.tsx`:
```typescript
import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { tokens } from '@swole-tracker/design-tokens';

interface BoxProps extends ViewProps {
  spacing?: keyof typeof tokens.spacing;
  elevation?: keyof typeof tokens.elevation;
}

export function Box({ spacing, elevation, style, ...props }: BoxProps) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    box: {
      ...(spacing && { padding: tokens.spacing[spacing] }),
      ...(elevation && tokens.elevation[elevation]),
    },
  });

  return <View style={[styles.box, style]} {...props} />;
}
```

#### 2.3.2 Text Component

Create `packages/ui/src/primitives/Text.tsx`:
```typescript
import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { tokens } from '@swole-tracker/design-tokens';

type TypographyScale = keyof typeof tokens.typography;

interface TextProps extends RNTextProps {
  variant?: TypographyScale;
  color?: string;
}

export function Text({ variant = 'body-large', color, style, ...props }: TextProps) {
  const { colors } = useTheme();

  const typographyStyle = tokens.typography[variant];
  const textColor = color || colors['on-surface'];

  const styles = StyleSheet.create({
    text: {
      color: textColor,
      fontSize: parseInt(typographyStyle?.size || '16'),
      fontWeight: typographyStyle?.weight || 'normal',
      lineHeight: parseInt(typographyStyle?.['line-height'] || '24'),
    },
  });

  return <RNText style={[styles.text, style]} {...props} />;
}
```

#### 2.3.3 Button Component

Create `packages/ui/src/primitives/Button.tsx`:
```typescript
import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { tokens } from '@swole-tracker/design-tokens';

interface ButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  variant?: 'filled' | 'outlined' | 'text';
  label: string;
  loading?: boolean;
}

export function Button({ variant = 'filled', label, loading, disabled, style, ...props }: ButtonProps) {
  const { colors } = useTheme();

  const backgroundColor =
    variant === 'filled' ? colors.primary :
    variant === 'outlined' ? 'transparent' :
    'transparent';

  const textColor =
    variant === 'filled' ? colors['on-primary'] :
    colors.primary;

  const borderColor = variant === 'outlined' ? colors.outline : 'transparent';

  const styles = StyleSheet.create({
    button: {
      backgroundColor,
      borderWidth: variant === 'outlined' ? 1 : 0,
      borderColor,
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 24,
      minHeight: 44, // Touch target size
      justifyContent: 'center',
      alignItems: 'center',
      opacity: disabled ? 0.38 : 1,
      ...tokens.elevation.level1,
    },
  });

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text variant="label-large" color={textColor}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
```

#### 2.3.4 Card Component

Create `packages/ui/src/primitives/Card.tsx`:
```typescript
import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { tokens } from '@swole-tracker/design-tokens';

interface CardProps extends ViewProps {
  elevation?: keyof typeof tokens.elevation;
}

export function Card({ elevation = 'level1', style, ...props }: CardProps) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: tokens.spacing.md,
      ...tokens.elevation[elevation],
    },
  });

  return <View style={[styles.card, style]} {...props} />;
}
```

#### 2.3.5 Input Component

Create `packages/ui/src/primitives/Input.tsx`:
```typescript
import React from 'react';
import { TextInput, TextInputProps, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { tokens } from '@swole-tracker/design-tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      marginBottom: tokens.spacing.md,
    },
    label: {
      marginBottom: tokens.spacing.xs,
    },
    input: {
      backgroundColor: colors['surface-variant'],
      borderWidth: 1,
      borderColor: error ? colors.error : colors.outline,
      borderRadius: 4,
      paddingVertical: 12,
      paddingHorizontal: 16,
      minHeight: 44,
      fontSize: 16,
      color: colors['on-surface'],
    },
    error: {
      marginTop: tokens.spacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="body-small" style={styles.label}>
          {label}
        </Text>
      )}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors['on-surface-variant']}
        {...props}
      />
      {error && (
        <Text variant="body-small" color={colors.error} style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
```

**Validation**:
- All components should compile without errors
- Components should accept standard React Native props
- Theming should work correctly

---

### 2.4 Create Component Tests

**Objective**: Ensure UI components meet accessibility and design standards.

**Steps**:
1. Install testing dependencies in `packages/ui/`:
   ```bash
   cd packages/ui
   bun add -D @testing-library/react-native @testing-library/jest-native vitest
   ```

2. Create `packages/ui/vitest.config.ts`:
   ```typescript
   import { defineConfig } from 'vitest/config';

   export default defineConfig({
     test: {
       environment: 'jsdom',
       setupFiles: ['./test-setup.ts'],
     },
   });
   ```

3. Create `packages/ui/test-setup.ts`:
   ```typescript
   import '@testing-library/jest-native/extend-expect';
   ```

4. Create component tests in `packages/ui/src/__tests__/`:

   Example: `packages/ui/src/__tests__/Button.test.tsx`:
   ```typescript
   import React from 'react';
   import { render, fireEvent } from '@testing-library/react-native';
   import { Button } from '../primitives/Button';
   import { ThemeProvider } from '../theme/ThemeProvider';

   const renderWithTheme = (component: React.ReactElement) => {
     return render(<ThemeProvider>{component}</ThemeProvider>);
   };

   describe('Button', () => {
     it('renders label correctly', () => {
       const { getByText } = renderWithTheme(<Button label="Click Me" />);
       expect(getByText('Click Me')).toBeTruthy();
     });

     it('calls onPress when pressed', () => {
       const onPress = vi.fn();
       const { getByText } = renderWithTheme(
         <Button label="Click Me" onPress={onPress} />
       );

       fireEvent.press(getByText('Click Me'));
       expect(onPress).toHaveBeenCalledTimes(1);
     });

     it('shows loading state', () => {
       const { getByTestId } = renderWithTheme(
         <Button label="Click Me" loading />
       );

       // ActivityIndicator should be present
       expect(getByTestId('activity-indicator')).toBeTruthy();
     });

     it('is disabled when disabled prop is true', () => {
       const onPress = vi.fn();
       const { getByText } = renderWithTheme(
         <Button label="Click Me" disabled onPress={onPress} />
       );

       fireEvent.press(getByText('Click Me'));
       expect(onPress).not.toHaveBeenCalled();
     });

     it('meets minimum touch target size (44x44)', () => {
       const { getByText } = renderWithTheme(<Button label="Click Me" />);
       const button = getByText('Click Me').parent;

       expect(button?.props.style).toMatchObject({
         minHeight: 44,
       });
     });
   });
   ```

5. Create tests for all primitives following the same pattern.

**Validation**:
- `cd packages/ui && bun test`
- All accessibility tests should pass
- Touch target sizes should meet 44x44 minimum

---

### 2.5 Documentation for UI Components

**Objective**: Document the UI component library for developers.

**Steps**:
1. Create `packages/ui/README.md`:
   ```markdown
   # @swole-tracker/ui

   Shared UI component library built with React Native Web and Material 3 design system.

   ## Installation

   This package is part of the Swole Tracker monorepo and is automatically linked via workspaces.

   ## Usage

   ```typescript
   import { Button, Card, Text, ThemeProvider } from '@swole-tracker/ui';

   function App() {
     return (
       <ThemeProvider>
         <Card>
           <Text variant="headline-small">Welcome</Text>
           <Button label="Get Started" onPress={() => {}} />
         </Card>
       </ThemeProvider>
     );
   }
   ```

   ## Components

   ### Primitives

   - `Box` - Flexible container with spacing and elevation
   - `Text` - Typography component with Material 3 scales
   - `Button` - Touch-optimized button with variants
   - `Card` - Surface container with elevation
   - `Input` - Text input field with label and error states

   ### Theme

   - `ThemeProvider` - Theme context provider
   - `useTheme` - Hook to access current theme

   ## Design Tokens

   Components automatically use tokens from `@swole-tracker/design-tokens`:
   - Colors (light/dark)
   - Typography scales
   - Spacing system
   - Elevation levels

   ## Accessibility

   All components meet WCAG 2.2 AA standards:
   - Minimum touch target size: 44x44px
   - Color contrast ratios
   - Screen reader support
   - Keyboard navigation (web)

   ## Testing

   ```bash
   bun test
   ```

   See `src/__tests__/` for component test examples.
   ```

2. Add JSDoc comments to all components.

**Validation**:
- Documentation is clear and comprehensive
- Examples are accurate

---

## Phase 3: Mobile App Foundation (Week 3-5)

### 3.1 Initialize Expo App

**Objective**: Bootstrap the Expo mobile app with TypeScript and Expo Router.

**Steps**:
1. Create Expo app:
   ```bash
   cd apps
   bunx create-expo-app mobile --template expo-template-blank-typescript
   ```

2. Rename package in `apps/mobile/package.json`:
   ```json
   {
     "name": "@swole-tracker/mobile",
     "version": "0.1.0",
     "main": "expo-router/entry"
   }
   ```

3. Install Expo Router and dependencies:
   ```bash
   cd apps/mobile
   bun add expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
   bun add -D @types/react @types/react-native
   ```

4. Setup Expo Router by updating `apps/mobile/app.json`:
   ```json
   {
     "expo": {
       "name": "Swole Tracker",
       "slug": "swole-tracker",
       "scheme": "swole-tracker",
       "version": "1.0.0",
       "orientation": "portrait",
       "icon": "./assets/icon.png",
       "userInterfaceStyle": "automatic",
       "splash": {
         "image": "./assets/splash.png",
         "resizeMode": "contain",
         "backgroundColor": "#ffffff"
       },
       "assetBundlePatterns": ["**/*"],
       "ios": {
         "supportsTablet": true,
         "bundleIdentifier": "com.swoletracker.app"
       },
       "android": {
         "adaptiveIcon": {
           "foregroundImage": "./assets/adaptive-icon.png",
           "backgroundColor": "#ffffff"
         },
         "package": "com.swoletracker.app"
       },
       "web": {
         "favicon": "./assets/favicon.png",
         "bundler": "metro"
       },
       "plugins": [
         "expo-router"
       ],
       "experiments": {
         "typedRoutes": true
       }
     }
   }
   ```

5. Create app directory structure:
   ```bash
   mkdir -p apps/mobile/app/(tabs)
   ```

6. Create `apps/mobile/app/_layout.tsx`:
   ```typescript
   import { Stack } from 'expo-router';
   import { ThemeProvider } from '@swole-tracker/ui';

   export default function RootLayout() {
     return (
       <ThemeProvider>
         <Stack>
           <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
         </Stack>
       </ThemeProvider>
     );
   }
   ```

7. Create `apps/mobile/app/(tabs)/_layout.tsx`:
   ```typescript
   import { Tabs } from 'expo-router';
   import { useTheme } from '@swole-tracker/ui';

   export default function TabLayout() {
     const { colors } = useTheme();

     return (
       <Tabs
         screenOptions={{
           tabBarActiveTintColor: colors.primary,
           tabBarInactiveTintColor: colors['on-surface-variant'],
           tabBarStyle: {
             backgroundColor: colors.surface,
           },
           headerStyle: {
             backgroundColor: colors.surface,
           },
           headerTintColor: colors['on-surface'],
         }}
       >
         <Tabs.Screen
           name="index"
           options={{
             title: 'Home',
             tabBarIcon: () => null, // Add icons later
           }}
         />
         <Tabs.Screen
           name="workouts"
           options={{
             title: 'Workouts',
             tabBarIcon: () => null,
           }}
         />
         <Tabs.Screen
           name="templates"
           options={{
             title: 'Templates',
             tabBarIcon: () => null,
           }}
         />
         <Tabs.Screen
           name="profile"
           options={{
             title: 'Profile',
             tabBarIcon: () => null,
           }}
         />
       </Tabs>
     );
   }
   ```

8. Create placeholder screens:
   - `apps/mobile/app/(tabs)/index.tsx` - Home screen
   - `apps/mobile/app/(tabs)/workouts.tsx` - Workouts screen
   - `apps/mobile/app/(tabs)/templates.tsx` - Templates screen
   - `apps/mobile/app/(tabs)/profile.tsx` - Profile screen

   Example (`index.tsx`):
   ```typescript
   import { View } from 'react-native';
   import { Text, Card } from '@swole-tracker/ui';

   export default function HomeScreen() {
     return (
       <View style={{ flex: 1, padding: 16 }}>
         <Card>
           <Text variant="headline-large">Welcome to Swole Tracker</Text>
           <Text variant="body-medium">Mobile app coming soon</Text>
         </Card>
       </View>
     );
   }
   ```

9. Update `apps/mobile/tsconfig.json`:
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "jsx": "react-native",
       "paths": {
         "@swole-tracker/shared": ["../../packages/shared/src"],
         "@swole-tracker/api": ["../../packages/api/src"],
         "@swole-tracker/ui": ["../../packages/ui/src"],
         "@swole-tracker/design-tokens": ["../../packages/design-tokens/src"]
       }
     },
     "include": ["**/*.ts", "**/*.tsx"],
     "exclude": ["node_modules"]
   }
   ```

10. Add scripts to `apps/mobile/package.json`:
    ```json
    {
      "scripts": {
        "start": "expo start",
        "dev": "expo start",
        "android": "expo start --android",
        "ios": "expo start --ios",
        "web": "expo start --web",
        "lint": "eslint .",
        "typecheck": "tsc --noEmit"
      }
    }
    ```

**Validation**:
- `cd apps/mobile && bun install`
- `bun dev` should start Expo dev server
- Scan QR code with Expo Go app
- App should launch with tab navigation
- Theme should work correctly

---

### 3.2 Setup tRPC Client for Mobile

**Objective**: Configure tRPC client for mobile to use shared API.

**Steps**:
1. Install tRPC dependencies in `apps/mobile/`:
   ```bash
   cd apps/mobile
   bun add @trpc/client @trpc/react-query @tanstack/react-query superjson
   ```

2. Create `apps/mobile/lib/api.ts`:
   ```typescript
   import { createTRPCReact } from '@trpc/react-query';
   import { httpBatchLink } from '@trpc/client';
   import superjson from 'superjson';
   import type { AppRouter } from '@swole-tracker/api';

   export const api = createTRPCReact<AppRouter>();

   const getBaseUrl = () => {
     // For development - update with your actual API URL
     if (__DEV__) {
       // Use your local IP for physical devices
       // Or localhost for emulator/simulator
       return 'http://localhost:3000';
     }

     // Production URL
     return 'https://your-production-url.com';
   };

   export const trpcClient = api.createClient({
     transformer: superjson,
     links: [
       httpBatchLink({
         url: `${getBaseUrl()}/api/trpc`,
         headers() {
           return {
             // Add auth headers here
           };
         },
       }),
     ],
   });
   ```

3. Create tRPC provider in `apps/mobile/app/_layout.tsx`:
   ```typescript
   import { Stack } from 'expo-router';
   import { ThemeProvider } from '@swole-tracker/ui';
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   import { api, trpcClient } from '../lib/api';
   import { useState } from 'react';

   export default function RootLayout() {
     const [queryClient] = useState(() => new QueryClient());

     return (
       <api.Provider client={trpcClient} queryClient={queryClient}>
         <QueryClientProvider client={queryClient}>
           <ThemeProvider>
             <Stack>
               <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
             </Stack>
           </ThemeProvider>
         </QueryClientProvider>
       </api.Provider>
     );
   }
   ```

4. Create environment configuration for API URLs:
   - `apps/mobile/.env.development`
   - `apps/mobile/.env.production`

5. Add to `.gitignore`:
   ```
   apps/mobile/.env.*
   !apps/mobile/.env.example
   ```

6. Create `apps/mobile/.env.example`:
   ```
   API_URL=http://localhost:3000
   ```

**Validation**:
- App should compile without errors
- tRPC client should be available via hooks
- Test a simple query in one of the screens

---

### 3.3 Implement WorkOS Authentication

**Objective**: Setup WorkOS authentication flow for mobile app.

**Steps**:
1. Install WorkOS and auth dependencies:
   ```bash
   cd apps/mobile
   bun add @workos-inc/authkit-expo expo-auth-session expo-web-browser expo-secure-store
   ```

2. Update `apps/mobile/app.json` with auth configuration:
   ```json
   {
     "expo": {
       "scheme": "swole-tracker",
       "plugins": [
         "expo-router",
         [
           "@workos-inc/authkit-expo",
           {
             "clientId": "YOUR_WORKOS_CLIENT_ID"
           }
         ]
       ]
     }
   }
   ```

3. Create `apps/mobile/lib/auth.ts`:
   ```typescript
   import { useAuthKit } from '@workos-inc/authkit-expo';
   import * as SecureStore from 'expo-secure-store';

   const AUTH_TOKEN_KEY = 'auth_token';

   export function useAuth() {
     const { signIn, signOut, user, isLoading } = useAuthKit({
       clientId: process.env.EXPO_PUBLIC_WORKOS_CLIENT_ID!,
       redirectUri: 'swole-tracker://auth/callback',
     });

     const saveToken = async (token: string) => {
       await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
     };

     const getToken = async () => {
       return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
     };

     const clearToken = async () => {
       await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
     };

     return {
       signIn,
       signOut: async () => {
         await clearToken();
         await signOut();
       },
       user,
       isLoading,
       saveToken,
       getToken,
     };
   }
   ```

4. Create auth screens:
   - `apps/mobile/app/auth/sign-in.tsx`
   - `apps/mobile/app/auth/callback.tsx`

5. Add authentication guard to tab layout:
   ```typescript
   // In apps/mobile/app/(tabs)/_layout.tsx
   import { useAuth } from '../../lib/auth';
   import { Redirect } from 'expo-router';

   export default function TabLayout() {
     const { user, isLoading } = useAuth();

     if (isLoading) {
       return <LoadingScreen />;
     }

     if (!user) {
       return <Redirect href="/auth/sign-in" />;
     }

     // ... rest of tab layout
   }
   ```

6. Update tRPC client to include auth token:
   ```typescript
   // In apps/mobile/lib/api.ts
   import { getToken } from './auth';

   export const trpcClient = api.createClient({
     transformer: superjson,
     links: [
       httpBatchLink({
         url: `${getBaseUrl()}/api/trpc`,
         async headers() {
           const token = await getToken();
           return {
             authorization: token ? `Bearer ${token}` : '',
           };
         },
       }),
     ],
   });
   ```

**Validation**:
- Sign in flow should work
- Token should be securely stored
- Authenticated requests should include token
- Sign out should clear token and redirect

---

### 3.4 Setup Offline-First Infrastructure

**Objective**: Configure TanStack Query persistence and offline queue for mobile.

**Steps**:
1. Install persistence dependencies:
   ```bash
   cd apps/mobile
   bun add @tanstack/react-query-persist-client @react-native-async-storage/async-storage
   ```

2. Create persister in `apps/mobile/lib/query-persister.ts`:
   ```typescript
   import AsyncStorage from '@react-native-async-storage/async-storage';
   import { createAsyncStoragePersister } from '@tanstack/react-query-persist-client';

   export const asyncStoragePersister = createAsyncStoragePersister({
     storage: AsyncStorage,
     throttleTime: 1000,
   });
   ```

3. Update `apps/mobile/app/_layout.tsx` to use persister:
   ```typescript
   import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
   import { asyncStoragePersister } from '../lib/query-persister';

   export default function RootLayout() {
     const [queryClient] = useState(
       () =>
         new QueryClient({
           defaultOptions: {
             queries: {
               gcTime: 1000 * 60 * 60 * 24, // 24 hours
               staleTime: 1000 * 60 * 5, // 5 minutes
             },
           },
         })
     );

     return (
       <api.Provider client={trpcClient} queryClient={queryClient}>
         <PersistQueryClientProvider
           client={queryClient}
           persistOptions={{ persister: asyncStoragePersister }}
         >
           <ThemeProvider>
             <Stack>
               <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
             </Stack>
           </ThemeProvider>
         </PersistQueryClientProvider>
       </api.Provider>
     );
   }
   ```

4. Move offline queue hook from web to shared:
   ```bash
   # Copy from apps/web/src/hooks/use-offline-save-queue.ts
   cp apps/web/src/hooks/use-offline-save-queue.ts packages/shared/src/hooks/
   ```

5. Update hook to work with React Native:
   ```typescript
   // In packages/shared/src/hooks/use-offline-save-queue.ts
   import AsyncStorage from '@react-native-async-storage/async-storage';

   // Replace localStorage with AsyncStorage
   // Make all storage operations async
   ```

6. Create network state detector:
   ```typescript
   // apps/mobile/lib/network-state.ts
   import NetInfo from '@react-native-community/netinfo';
   import { useEffect, useState } from 'react';

   export function useNetworkState() {
     const [isOnline, setIsOnline] = useState(true);

     useEffect(() => {
       const unsubscribe = NetInfo.addEventListener(state => {
         setIsOnline(state.isConnected ?? true);
       });

       return () => unsubscribe();
     }, []);

     return isOnline;
   }
   ```

7. Install NetInfo:
   ```bash
   cd apps/mobile
   bun add @react-native-community/netinfo
   ```

**Validation**:
- Query persistence should work
- Network state detection should work
- Offline mutations should queue
- Data should sync when coming online

---

## Phase 4: Core Workout Features (Week 5-8)

### 4.1 Migrate Workout Logic to Shared Package

**Objective**: Move workout-related hooks and utilities to `packages/shared` for reuse.

**Steps**:
1. Identify shared workout logic in `apps/web/src/hooks/`:
   - `useWorkoutSessionState.ts` - Main workout state management
   - Workout validation utilities
   - Exercise calculation helpers

2. Create `packages/shared/src/hooks/workout/` directory.

3. Move and adapt `useWorkoutSessionState.ts`:
   ```bash
   cp apps/web/src/hooks/useWorkoutSessionState.ts packages/shared/src/hooks/workout/useWorkoutSessionState.ts
   ```

4. Update to remove platform-specific dependencies:
   - Replace `localStorage` with abstract storage interface
   - Create storage adapter pattern for web/mobile

5. Create `packages/shared/src/storage/` for storage abstraction:
   ```typescript
   // packages/shared/src/storage/types.ts
   export interface StorageAdapter {
     getItem(key: string): Promise<string | null>;
     setItem(key: string, value: string): Promise<void>;
     removeItem(key: string): Promise<void>;
   }

   // packages/shared/src/storage/context.tsx
   import { createContext, useContext } from 'react';
   import type { StorageAdapter } from './types';

   const StorageContext = createContext<StorageAdapter | undefined>(undefined);

   export function StorageProvider({
     adapter,
     children
   }: {
     adapter: StorageAdapter;
     children: React.ReactNode;
   }) {
     return (
       <StorageContext.Provider value={adapter}>
         {children}
       </StorageContext.Provider>
     );
   }

   export function useStorage() {
     const context = useContext(StorageContext);
     if (!context) {
       throw new Error('useStorage must be used within StorageProvider');
     }
     return context;
   }
   ```

6. Create platform-specific storage adapters:
   ```typescript
   // apps/web/src/lib/storage-adapter.ts
   import type { StorageAdapter } from '@swole-tracker/shared';

   export const webStorageAdapter: StorageAdapter = {
     async getItem(key: string) {
       return localStorage.getItem(key);
     },
     async setItem(key: string, value: string) {
       localStorage.setItem(key, value);
     },
     async removeItem(key: string) {
       localStorage.removeItem(key);
     },
   };

   // apps/mobile/lib/storage-adapter.ts
   import AsyncStorage from '@react-native-async-storage/async-storage';
   import type { StorageAdapter } from '@swole-tracker/shared';

   export const mobileStorageAdapter: StorageAdapter = {
     async getItem(key: string) {
       return await AsyncStorage.getItem(key);
     },
     async setItem(key: string, value: string) {
       await AsyncStorage.setItem(key, value);
     },
     async removeItem(key: string) {
       await AsyncStorage.removeItem(key);
     },
   };
   ```

7. Update workout hook to use storage adapter:
   ```typescript
   // In packages/shared/src/hooks/workout/useWorkoutSessionState.ts
   import { useStorage } from '../../storage';

   export function useWorkoutSessionState() {
     const storage = useStorage();

     // Replace all localStorage calls with storage adapter
     // ...
   }
   ```

8. Move workout calculation helpers:
   ```bash
   mkdir -p packages/shared/src/utils/workout
   cp apps/web/src/lib/workout-cache-helpers.ts packages/shared/src/utils/workout/
   ```

9. Update imports in both web and mobile apps.

**Validation**:
- `packages/shared` should compile
- Web app should still work with new imports
- No platform-specific code in shared package

---

### 4.2 Build Mobile Workout Session UI

**Objective**: Create mobile-optimized workout session interface.

**Steps**:
1. Create workout session screen structure:
   ```bash
   mkdir -p apps/mobile/app/workout
   ```

2. Create `apps/mobile/app/workout/new.tsx`:
   ```typescript
   import { useState } from 'react';
   import { View, ScrollView, StyleSheet } from 'react-native';
   import { Stack, router } from 'expo-router';
   import { Text, Button, Card } from '@swole-tracker/ui';
   import { useWorkoutSessionState } from '@swole-tracker/shared';
   import { api } from '../../lib/api';

   export default function NewWorkoutScreen() {
     const {
       exercises,
       addExercise,
       updateSet,
       completeWorkout,
     } = useWorkoutSessionState();

     const saveWorkout = api.workouts.create.useMutation();

     const handleSave = async () => {
       await completeWorkout(async (data) => {
         await saveWorkout.mutateAsync(data);
         router.back();
       });
     };

     return (
       <>
         <Stack.Screen
           options={{
             title: 'New Workout',
             headerRight: () => (
               <Button
                 variant="text"
                 label="Save"
                 onPress={handleSave}
                 loading={saveWorkout.isPending}
               />
             ),
           }}
         />
         <ScrollView style={styles.container}>
           {/* Workout UI */}
         </ScrollView>
       </>
     );
   }

   const styles = StyleSheet.create({
     container: {
       flex: 1,
       padding: 16,
     },
   });
   ```

3. Create exercise list component:
   ```typescript
   // apps/mobile/components/workout/ExerciseList.tsx
   import { View, FlatList } from 'react-native';
   import { Card, Text } from '@swole-tracker/ui';
   import type { Exercise } from '@swole-tracker/shared';

   interface ExerciseListProps {
     exercises: Exercise[];
     onExercisePress: (exercise: Exercise) => void;
   }

   export function ExerciseList({ exercises, onExercisePress }: ExerciseListProps) {
     return (
       <FlatList
         data={exercises}
         keyExtractor={(item) => item.id}
         renderItem={({ item }) => (
           <Card onPress={() => onExercisePress(item)}>
             <Text variant="title-medium">{item.name}</Text>
             <Text variant="body-small">{item.sets.length} sets</Text>
           </Card>
         )}
       />
     );
   }
   ```

4. Create set tracking component:
   ```typescript
   // apps/mobile/components/workout/SetTracker.tsx
   import { View, StyleSheet } from 'react-native';
   import { Input, Text, Button } from '@swole-tracker/ui';
   import { useState } from 'react';

   interface SetTrackerProps {
     setNumber: number;
     onComplete: (weight: number, reps: number) => void;
   }

   export function SetTracker({ setNumber, onComplete }: SetTrackerProps) {
     const [weight, setWeight] = useState('');
     const [reps, setReps] = useState('');

     const handleComplete = () => {
       onComplete(parseFloat(weight), parseInt(reps));
       setWeight('');
       setReps('');
     };

     return (
       <View style={styles.container}>
         <Text variant="title-small">Set {setNumber}</Text>
         <Input
           label="Weight (lbs)"
           value={weight}
           onChangeText={setWeight}
           keyboardType="numeric"
           placeholder="0"
         />
         <Input
           label="Reps"
           value={reps}
           onChangeText={setReps}
           keyboardType="numeric"
           placeholder="0"
         />
         <Button
           label="Complete Set"
           onPress={handleComplete}
           disabled={!weight || !reps}
         />
       </View>
     );
   }

   const styles = StyleSheet.create({
     container: {
       gap: 12,
     },
   });
   ```

5. Create rest timer component:
   ```typescript
   // apps/mobile/components/workout/RestTimer.tsx
   import { useEffect, useState } from 'react';
   import { View, StyleSheet } from 'react-native';
   import { Text, Button } from '@swole-tracker/ui';

   interface RestTimerProps {
     duration: number; // seconds
     onComplete: () => void;
   }

   export function RestTimer({ duration, onComplete }: RestTimerProps) {
     const [remaining, setRemaining] = useState(duration);
     const [isActive, setIsActive] = useState(false);

     useEffect(() => {
       let interval: NodeJS.Timeout;

       if (isActive && remaining > 0) {
         interval = setInterval(() => {
           setRemaining((prev) => {
             if (prev <= 1) {
               setIsActive(false);
               onComplete();
               return 0;
             }
             return prev - 1;
           });
         }, 1000);
       }

       return () => clearInterval(interval);
     }, [isActive, remaining, onComplete]);

     const formatTime = (seconds: number) => {
       const mins = Math.floor(seconds / 60);
       const secs = seconds % 60;
       return `${mins}:${secs.toString().padStart(2, '0')}`;
     };

     return (
       <View style={styles.container}>
         <Text variant="headline-large">{formatTime(remaining)}</Text>
         <Button
           label={isActive ? 'Pause' : 'Start Rest'}
           onPress={() => setIsActive(!isActive)}
         />
       </View>
     );
   }

   const styles = StyleSheet.create({
     container: {
       alignItems: 'center',
       padding: 16,
     },
   });
   ```

6. Add navigation to workout session:
   ```typescript
   // In apps/mobile/app/(tabs)/index.tsx
   import { Button } from '@swole-tracker/ui';
   import { router } from 'expo-router';

   export default function HomeScreen() {
     return (
       <View>
         <Button
           label="Start Workout"
           onPress={() => router.push('/workout/new')}
         />
       </View>
     );
   }
   ```

**Validation**:
- Can navigate to workout screen
- Can add exercises
- Can track sets with weight/reps
- Rest timer works correctly
- Data persists during session

---

### 4.3 Implement Template System

**Objective**: Build template CRUD UI for mobile.

**Steps**:
1. Create template screens:
   ```bash
   mkdir -p apps/mobile/app/templates
   ```

2. Create `apps/mobile/app/templates/index.tsx`:
   ```typescript
   import { View, FlatList } from 'react-native';
   import { Stack, router } from 'expo-router';
   import { Card, Text, Button } from '@swole-tracker/ui';
   import { api } from '../../lib/api';

   export default function TemplatesScreen() {
     const { data: templates, isLoading } = api.templates.getAll.useQuery();

     return (
       <>
         <Stack.Screen
           options={{
             title: 'Templates',
             headerRight: () => (
               <Button
                 variant="text"
                 label="New"
                 onPress={() => router.push('/templates/new')}
               />
             ),
           }}
         />
         <FlatList
           data={templates}
           keyExtractor={(item) => item.id}
           renderItem={({ item }) => (
             <Card onPress={() => router.push(`/templates/${item.id}`)}>
               <Text variant="title-medium">{item.name}</Text>
               <Text variant="body-small">
                 {item.exercises.length} exercises
               </Text>
             </Card>
           )}
         />
       </>
     );
   }
   ```

3. Create template editor:
   ```typescript
   // apps/mobile/app/templates/new.tsx
   import { useState } from 'react';
   import { View, ScrollView } from 'react-native';
   import { Stack, router } from 'expo-router';
   import { Input, Button } from '@swole-tracker/ui';
   import { api } from '../../lib/api';

   export default function NewTemplateScreen() {
     const [name, setName] = useState('');
     const [exercises, setExercises] = useState([]);

     const createTemplate = api.templates.create.useMutation();

     const handleSave = async () => {
       await createTemplate.mutateAsync({ name, exercises });
       router.back();
     };

     return (
       <>
         <Stack.Screen options={{ title: 'New Template' }} />
         <ScrollView>
           <Input
             label="Template Name"
             value={name}
             onChangeText={setName}
             placeholder="e.g., Push Day"
           />
           {/* Exercise selection UI */}
           <Button
             label="Save Template"
             onPress={handleSave}
             loading={createTemplate.isPending}
             disabled={!name}
           />
         </ScrollView>
       </>
     );
   }
   ```

4. Create template detail view:
   ```typescript
   // apps/mobile/app/templates/[id].tsx
   import { useLocalSearchParams } from 'expo-router';
   import { api } from '../../lib/api';
   import { View } from 'react-native';
   import { Text, Card } from '@swole-tracker/ui';

   export default function TemplateDetailScreen() {
     const { id } = useLocalSearchParams();
     const { data: template } = api.templates.getById.useQuery({
       id: id as string
     });

     if (!template) return null;

     return (
       <View>
         <Text variant="headline-medium">{template.name}</Text>
         {/* Display template exercises */}
       </View>
     );
   }
   ```

5. Add "Start from Template" functionality:
   ```typescript
   // In apps/mobile/app/workout/new.tsx
   import { useLocalSearchParams } from 'expo-router';

   export default function NewWorkoutScreen() {
     const { templateId } = useLocalSearchParams();

     // If templateId exists, pre-populate workout with template exercises
     // ...
   }
   ```

**Validation**:
- Can view template list
- Can create new template
- Can view template details
- Can start workout from template

---

### 4.4 Build Workout History

**Objective**: Create workout history views with filtering.

**Steps**:
1. Create history screen:
   ```typescript
   // apps/mobile/app/(tabs)/workouts.tsx
   import { useState } from 'react';
   import { View, FlatList } from 'react-native';
   import { api } from '../../lib/api';
   import { Card, Text } from '@swole-tracker/ui';
   import { router } from 'expo-router';

   export default function WorkoutsScreen() {
     const { data: workouts, isLoading } = api.workouts.getRecent.useQuery({
       limit: 50,
     });

     return (
       <FlatList
         data={workouts}
         keyExtractor={(item) => item.id}
         renderItem={({ item }) => (
           <Card onPress={() => router.push(`/workout/${item.id}`)}>
             <Text variant="title-medium">
               {new Date(item.date).toLocaleDateString()}
             </Text>
             <Text variant="body-small">
               {item.totalVolume} lbs • {item.duration} mins
             </Text>
           </Card>
         )}
       />
     );
   }
   ```

2. Create workout detail view:
   ```typescript
   // apps/mobile/app/workout/[id].tsx
   import { useLocalSearchParams } from 'expo-router';
   import { ScrollView, View } from 'react-native';
   import { api } from '../../lib/api';
   import { Card, Text } from '@swole-tracker/ui';

   export default function WorkoutDetailScreen() {
     const { id } = useLocalSearchParams();
     const { data: workout } = api.workouts.getById.useQuery({
       id: id as string,
     });

     if (!workout) return null;

     return (
       <ScrollView>
         <Card>
           <Text variant="headline-medium">
             {new Date(workout.date).toLocaleDateString()}
           </Text>
           {/* Display workout summary */}
         </Card>

         {workout.exercises.map((exercise) => (
           <Card key={exercise.id}>
             <Text variant="title-medium">{exercise.name}</Text>
             {exercise.sets.map((set, idx) => (
               <Text key={idx} variant="body-small">
                 Set {idx + 1}: {set.weight} lbs × {set.reps} reps
               </Text>
             ))}
           </Card>
         ))}
       </ScrollView>
     );
   }
   ```

3. Add filtering and search:
   ```typescript
   // In apps/mobile/app/(tabs)/workouts.tsx
   import { Input } from '@swole-tracker/ui';

   export default function WorkoutsScreen() {
     const [filter, setFilter] = useState('');

     // Add filter UI above list
     return (
       <View>
         <Input
           placeholder="Search workouts..."
           value={filter}
           onChangeText={setFilter}
         />
         <FlatList ... />
       </View>
     );
   }
   ```

4. Add calendar view option (optional):
   ```bash
   bun add react-native-calendars
   ```

**Validation**:
- Can view workout history
- Can navigate to workout details
- Search/filter works
- Performance is good with many workouts

---

## Phase 5: Polish & Testing (Week 8-10)

### 5.1 Incremental RNW Component Adoption in Web

**Objective**: Gradually replace web components with shared RNW components.

**Steps**:
1. Identify high-value components to migrate first:
   - Buttons (most used)
   - Cards (layout)
   - Form inputs (workout tracking)

2. Create migration plan:
   ```markdown
   # Component Migration Priority

   1. Button (100+ usages)
   2. Card (50+ usages)
   3. Input (30+ usages)
   4. Text (evaluate case-by-case)
   ```

3. Set up React Native Web in Next.js:
   ```bash
   cd apps/web
   bun add react-native-web
   ```

4. Configure Next.js to handle RNW:
   ```typescript
   // apps/web/next.config.ts
   const config = {
     webpack: (config) => {
       config.resolve.alias = {
         ...(config.resolve.alias || {}),
         'react-native$': 'react-native-web',
       };
       return config;
     },
     transpilePackages: [
       '@swole-tracker/shared',
       '@swole-tracker/api',
       '@swole-tracker/ui',
       '@swole-tracker/design-tokens',
       'react-native',
       'react-native-web',
     ],
   };
   ```

5. Migrate components incrementally:
   ```typescript
   // Example: Replace Button in one file
   // Before:
   import { Button } from '~/components/ui/button';

   // After:
   import { Button } from '@swole-tracker/ui';
   ```

6. Test each migration thoroughly:
   - Visual regression testing
   - Accessibility testing
   - Performance testing

7. Create codemods for automated migration (optional):
   ```bash
   npx jscodeshift -t codemods/migrate-button.ts apps/web/src
   ```

**Validation**:
- Both old and new components work during transition
- No visual regressions
- Accessibility maintained
- Performance not degraded

---

### 5.2 Design System Consistency

**Objective**: Ensure visual consistency across platforms.

**Steps**:
1. Create visual testing setup:
   ```bash
   cd apps/mobile
   bun add -D @storybook/react-native
   ```

2. Create component stories:
   ```typescript
   // Example: Button.stories.tsx
   import { Button } from '@swole-tracker/ui';

   export default {
     title: 'Primitives/Button',
     component: Button,
   };

   export const Primary = () => (
     <Button label="Primary Button" variant="filled" />
   );

   export const Outlined = () => (
     <Button label="Outlined Button" variant="outlined" />
   );
   ```

3. Document component usage guidelines:
   ```markdown
   # Button Usage Guidelines

   ## When to Use
   - Primary actions (filled variant)
   - Secondary actions (outlined variant)
   - Tertiary actions (text variant)

   ## Accessibility
   - Always provide descriptive label
   - Minimum touch target: 44x44px
   - Loading state for async actions
   ```

4. Create design review checklist:
   - [ ] Matches Material 3 spec
   - [ ] Works in light and dark themes
   - [ ] Meets touch target size (44x44px)
   - [ ] Accessible color contrast (WCAG 2.2 AA)
   - [ ] Smooth animations (respect reduced motion)
   - [ ] Tested on physical device

5. Set up automated visual regression testing:
   ```bash
   bun add -D @playwright/test
   ```

**Validation**:
- Components look identical across platforms
- Dark mode works correctly
- Animations are smooth
- All accessibility standards met

---

### 5.3 Comprehensive Testing

**Objective**: Ensure code quality and reliability through testing.

#### 5.3.1 Unit Tests

**Steps**:
1. Test shared utilities:
   ```typescript
   // packages/shared/src/__tests__/utils/workout.test.ts
   import { calculateTotalVolume } from '../utils/workout';

   describe('calculateTotalVolume', () => {
     it('calculates total volume correctly', () => {
       const exercises = [
         { sets: [{ weight: 100, reps: 10 }] },
         { sets: [{ weight: 50, reps: 12 }] },
       ];
       expect(calculateTotalVolume(exercises)).toBe(1600);
     });
   });
   ```

2. Test React hooks:
   ```typescript
   // packages/shared/src/__tests__/hooks/useWorkoutSessionState.test.ts
   import { renderHook, act } from '@testing-library/react-hooks';
   import { useWorkoutSessionState } from '../../hooks/workout';

   describe('useWorkoutSessionState', () => {
     it('adds exercise correctly', () => {
       const { result } = renderHook(() => useWorkoutSessionState());

       act(() => {
         result.current.addExercise({ name: 'Bench Press' });
       });

       expect(result.current.exercises).toHaveLength(1);
       expect(result.current.exercises[0].name).toBe('Bench Press');
     });
   });
   ```

3. Test UI components:
   ```typescript
   // packages/ui/src/__tests__/Button.test.tsx (already created in Phase 2)
   ```

4. Set coverage requirements:
   ```json
   // packages/shared/vitest.config.ts
   export default defineConfig({
     test: {
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
         thresholds: {
           lines: 80,
           functions: 80,
           branches: 80,
           statements: 80,
         },
       },
     },
   });
   ```

**Validation**:
- Run `bun test` in all packages
- Coverage meets thresholds
- All tests pass

---

#### 5.3.2 Component Tests

**Steps**:
1. Test mobile screens:
   ```typescript
   // apps/mobile/__tests__/screens/NewWorkout.test.tsx
   import { render, fireEvent } from '@testing-library/react-native';
   import NewWorkoutScreen from '../../app/workout/new';

   describe('NewWorkoutScreen', () => {
     it('allows adding exercises', () => {
       const { getByText, getByPlaceholderText } = render(<NewWorkoutScreen />);

       fireEvent.press(getByText('Add Exercise'));
       // ... test exercise addition
     });
   });
   ```

2. Test critical user flows:
   - Creating a workout
   - Completing a set
   - Saving a template
   - Viewing history

**Validation**:
- All critical flows have tests
- Tests are maintainable and readable

---

#### 5.3.3 E2E Tests (Optional but Recommended)

**Steps**:
1. Install Detox or Maestro:
   ```bash
   # Using Maestro (simpler)
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. Create E2E test flows:
   ```yaml
   # apps/mobile/.maestro/complete-workout.yaml
   appId: com.swoletracker.app
   ---
   - launchApp
   - tapOn: "Start Workout"
   - tapOn: "Add Exercise"
   - inputText: "Bench Press"
   - tapOn: "Weight"
   - inputText: "135"
   - tapOn: "Reps"
   - inputText: "10"
   - tapOn: "Complete Set"
   - tapOn: "Save Workout"
   - assertVisible: "Workout saved"
   ```

3. Add to CI/CD pipeline.

**Validation**:
- Critical flows work end-to-end
- Tests run reliably in CI

---

### 5.4 Performance Optimization

**Objective**: Ensure smooth performance on lower-end devices.

**Steps**:
1. Install performance monitoring:
   ```bash
   cd apps/mobile
   bun add @shopify/react-native-performance
   ```

2. Add performance marks:
   ```typescript
   import { performance } from '@shopify/react-native-performance';

   performance.mark('workout-save-start');
   await saveWorkout();
   performance.mark('workout-save-end');
   performance.measure('workout-save', 'workout-save-start', 'workout-save-end');
   ```

3. Optimize FlatList rendering:
   ```typescript
   <FlatList
     data={workouts}
     windowSize={5}
     maxToRenderPerBatch={10}
     removeClippedSubviews
     initialNumToRender={10}
   />
   ```

4. Implement list virtualization for large datasets.

5. Optimize bundle size:
   ```bash
   # Analyze bundle
   npx react-native-bundle-visualizer
   ```

6. Lazy load screens:
   ```typescript
   const TemplatesScreen = lazy(() => import('./templates'));
   ```

7. Test on lower-end devices:
   - Android: Test on device with 2GB RAM
   - iOS: Test on iPhone SE (1st/2nd gen)

**Validation**:
- App starts in < 3 seconds
- List scrolling is smooth (60 FPS)
- No memory leaks
- Bundle size is reasonable (< 5MB)

---

## Phase 6: Advanced Features & Launch Prep (Week 10-12)

### 6.1 WHOOP Integration (Optional for MVP)

**Objective**: Migrate WHOOP sync functionality for mobile.

**Steps**:
1. Move WHOOP logic to shared package:
   ```bash
   mkdir -p packages/shared/src/integrations/whoop
   cp -r apps/web/src/lib/whoop/* packages/shared/src/integrations/whoop/
   ```

2. Create WHOOP connection UI for mobile:
   ```typescript
   // apps/mobile/app/settings/whoop.tsx
   import { Button, Card, Text } from '@swole-tracker/ui';
   import { api } from '../../lib/api';

   export default function WhoopSettingsScreen() {
     const { data: connection } = api.whoop.getConnection.useQuery();
     const connect = api.whoop.connect.useMutation();

     return (
       <Card>
         <Text variant="headline-small">WHOOP Integration</Text>
         {connection ? (
           <Text>Connected</Text>
         ) : (
           <Button
             label="Connect WHOOP"
             onPress={() => connect.mutate()}
           />
         )}
       </Card>
     );
   }
   ```

3. Implement background sync:
   ```bash
   bun add expo-background-fetch expo-task-manager
   ```

4. Create background sync task:
   ```typescript
   import * as BackgroundFetch from 'expo-background-fetch';
   import * as TaskManager from 'expo-task-manager';

   const WHOOP_SYNC_TASK = 'whoop-sync';

   TaskManager.defineTask(WHOOP_SYNC_TASK, async () => {
     // Sync WHOOP data
     return BackgroundFetch.BackgroundFetchResult.NewData;
   });

   BackgroundFetch.registerTaskAsync(WHOOP_SYNC_TASK, {
     minimumInterval: 60 * 60, // 1 hour
     stopOnTerminate: false,
     startOnBoot: true,
   });
   ```

**Validation**:
- Can connect WHOOP account
- Data syncs reliably
- Background sync works
- Battery usage is acceptable

---

### 6.2 Analytics & Monitoring

**Objective**: Set up PostHog and error tracking for mobile.

**Steps**:
1. Install PostHog:
   ```bash
   cd apps/mobile
   bun add posthog-react-native expo-file-system expo-application expo-device expo-localization
   ```

2. Initialize PostHog:
   ```typescript
   // apps/mobile/lib/analytics.ts
   import PostHog from 'posthog-react-native';

   export const posthog = new PostHog(
     process.env.EXPO_PUBLIC_POSTHOG_API_KEY!,
     {
       host: 'https://app.posthog.com',
     }
   );
   ```

3. Add analytics to app root:
   ```typescript
   // apps/mobile/app/_layout.tsx
   import { posthog } from '../lib/analytics';

   export default function RootLayout() {
     useEffect(() => {
       posthog.screen('App Started');
     }, []);

     // ... rest of layout
   }
   ```

4. Track key events:
   ```typescript
   // Track workout completion
   posthog.capture('workout_completed', {
     duration: workout.duration,
     exercises: workout.exercises.length,
     totalVolume: workout.totalVolume,
   });
   ```

5. Set up error tracking:
   ```bash
   bun add @sentry/react-native
   npx @sentry/wizard -i reactNative -p ios android
   ```

6. Configure Sentry:
   ```typescript
   // apps/mobile/app/_layout.tsx
   import * as Sentry from '@sentry/react-native';

   Sentry.init({
     dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
     enableInExpoDevelopment: false,
     debug: __DEV__,
   });
   ```

**Validation**:
- Analytics events are tracked
- Errors are reported to Sentry
- Performance monitoring works
- User privacy is respected

---

### 6.3 App Store Preparation

**Objective**: Prepare app for iOS App Store and Google Play Store submission.

#### 6.3.1 App Assets

**Steps**:
1. Create app icons:
   - iOS: 1024x1024 PNG
   - Android: Adaptive icon (foreground + background)

2. Create splash screens:
   - Use `expo-splash-screen` for dynamic splash

3. Generate all required assets:
   ```bash
   npx expo prebuild
   ```

4. Update `app.json` with final metadata:
   ```json
   {
     "expo": {
       "name": "Swole Tracker",
       "slug": "swole-tracker",
       "version": "1.0.0",
       "orientation": "portrait",
       "icon": "./assets/icon.png",
       "userInterfaceStyle": "automatic",
       "splash": {
         "image": "./assets/splash.png",
         "resizeMode": "contain",
         "backgroundColor": "#FF6B35"
       },
       "ios": {
         "bundleIdentifier": "com.swoletracker.app",
         "buildNumber": "1",
         "supportsTablet": true,
         "infoPlist": {
           "NSCameraUsageDescription": "Used to take workout photos",
           "NSPhotoLibraryUsageDescription": "Used to save workout photos"
         }
       },
       "android": {
         "package": "com.swoletracker.app",
         "versionCode": 1,
         "adaptiveIcon": {
           "foregroundImage": "./assets/adaptive-icon.png",
           "backgroundColor": "#FF6B35"
         },
         "permissions": []
       }
     }
   }
   ```

---

#### 6.3.2 App Store Listing

**Steps**:
1. Write app description:
   ```
   Swole Tracker - Your Ultimate Workout Companion

   Track your workouts with ease. Swole Tracker helps you log exercises,
   monitor progress, and achieve your fitness goals.

   Features:
   • Simple workout logging
   • Exercise templates
   • Progress tracking
   • Offline support
   • WHOOP integration (optional)

   Perfect for gym-goers who want reliable, mobile-optimized fitness tracking.
   ```

2. Create screenshots (required sizes):
   - iPhone 6.7": 1290 x 2796
   - iPhone 6.5": 1242 x 2688
   - iPad Pro 12.9": 2048 x 2732
   - Android: Various sizes

3. Record app preview videos (optional but recommended).

4. Prepare privacy policy and terms of service.

---

#### 6.3.3 EAS Build Setup

**Steps**:
1. Install EAS CLI:
   ```bash
   bun add -g eas-cli
   ```

2. Configure EAS:
   ```bash
   cd apps/mobile
   eas init
   ```

3. Create `eas.json`:
   ```json
   {
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal"
       },
       "preview": {
         "distribution": "internal",
         "ios": {
           "simulator": true
         }
       },
       "production": {
         "env": {
           "EXPO_PUBLIC_API_URL": "https://api.swoletracker.com"
         }
       }
     },
     "submit": {
       "production": {
         "ios": {
           "appleId": "your-apple-id@email.com",
           "ascAppId": "your-app-store-connect-app-id"
         },
         "android": {
           "serviceAccountKeyPath": "./service-account-key.json"
         }
       }
     }
   }
   ```

4. Build for production:
   ```bash
   # iOS
   eas build --platform ios --profile production

   # Android
   eas build --platform android --profile production
   ```

5. Submit to stores:
   ```bash
   # iOS
   eas submit --platform ios --latest

   # Android
   eas submit --platform android --latest
   ```

**Validation**:
- Builds complete successfully
- App runs on TestFlight/Internal Testing
- No crashes or critical bugs
- Performance is acceptable

---

### 6.4 Final Testing & QA

**Objective**: Comprehensive testing before launch.

**Testing Checklist**:

#### Functional Testing
- [ ] User can create account
- [ ] User can log in/out
- [ ] User can start a workout
- [ ] User can add exercises
- [ ] User can track sets (weight, reps)
- [ ] User can save workout
- [ ] User can view workout history
- [ ] User can create templates
- [ ] User can use templates for workouts
- [ ] Offline mode works
- [ ] Data syncs when online
- [ ] WHOOP integration works (if included)

#### UI/UX Testing
- [ ] All screens match design system
- [ ] Dark mode works correctly
- [ ] Touch targets are at least 44x44px
- [ ] Animations are smooth
- [ ] Loading states are shown
- [ ] Error states are handled gracefully
- [ ] Empty states are informative

#### Accessibility Testing
- [ ] Screen reader navigation works
- [ ] Color contrast meets WCAG 2.2 AA
- [ ] All interactive elements are accessible
- [ ] Form labels are descriptive
- [ ] Error messages are clear

#### Performance Testing
- [ ] App starts in < 3 seconds
- [ ] List scrolling is smooth
- [ ] No memory leaks
- [ ] Works on low-end devices
- [ ] Battery usage is reasonable
- [ ] Network usage is efficient

#### Security Testing
- [ ] Auth tokens are stored securely
- [ ] API requests are authenticated
- [ ] No sensitive data in logs
- [ ] SSL pinning (if applicable)

#### Cross-Device Testing
- [ ] iPhone (latest)
- [ ] iPhone SE (smaller screen)
- [ ] Android flagship (Samsung/Pixel)
- [ ] Android mid-range device
- [ ] Tablet (optional)

---

## Migration Checklist

### Phase 1 Complete
- [ ] Turborepo initialized
- [ ] Apps restructured (web, mobile)
- [ ] Shared packages created (shared, api, ui, design-tokens)
- [ ] TypeScript configuration
- [ ] Infisical configured
- [ ] Documentation updated

### Phase 2 Complete
- [ ] Design token conversion script
- [ ] Theme provider
- [ ] Base UI primitives (Box, Text, Button, Card, Input)
- [ ] Component tests
- [ ] UI documentation

### Phase 3 Complete
- [ ] Expo app initialized
- [ ] Expo Router configured
- [ ] tRPC client setup
- [ ] WorkOS authentication
- [ ] Offline-first infrastructure

### Phase 4 Complete
- [ ] Workout logic in shared package
- [ ] Mobile workout session UI
- [ ] Template system
- [ ] Workout history

### Phase 5 Complete
- [ ] Incremental RNW adoption on web
- [ ] Design consistency
- [ ] Comprehensive tests
- [ ] Performance optimizations

### Phase 6 Complete
- [ ] WHOOP integration (optional)
- [ ] Analytics & monitoring
- [ ] App Store preparation
- [ ] Final testing & QA
- [ ] Launch! 🚀

---

## Maintenance & Future Work

### Post-Launch
1. **Monitor Analytics**
   - Track crash rates
   - Monitor performance metrics
   - Analyze user behavior
   - Gather feedback

2. **Iterate on Feedback**
   - Fix critical bugs immediately
   - Prioritize feature requests
   - Improve UX based on data

3. **Ongoing Development**
   - Add remaining web features
   - Implement advanced analytics
   - Build social features
   - Add workout recommendations

### Long-Term Goals
- Full feature parity with web
- Advanced offline sync
- Apple Watch / Wear OS integration
- Social features (share workouts, challenges)
- AI-powered workout recommendations
- Progressive Web App (PWA) for web

---

## Resources & References

### Documentation
- [Turborepo Docs](https://turbo.build/repo/docs)
- [Expo Docs](https://docs.expo.dev/)
- [React Native Web](https://necolas.github.io/react-native-web/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Material 3 Design](https://m3.material.io/)

### Tools
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [PostHog](https://posthog.com/docs)
- [Sentry](https://docs.sentry.io/platforms/react-native/)
- [Maestro](https://maestro.mobile.dev/)

### Community
- [Expo Discord](https://chat.expo.dev/)
- [React Native Community](https://reactnative.dev/community/overview)

---

## Notes for Future Agents

1. **Critical**: Always use chunking helpers for D1 bulk operations (see CLAUDE.md)
2. **Storage**: Platform-specific adapters required for shared hooks
3. **Theme**: Regenerate tokens after palette changes with `bun run tokens:build`
4. **Testing**: Maintain 80%+ coverage for shared packages
5. **Performance**: Test on physical devices, not just simulators
6. **Accessibility**: WCAG 2.2 AA is non-negotiable
7. **Offline**: Test all features offline before shipping

Good luck! 🚀
