# Swole Tracker

A modern fitness tracking application built with Next.js, React 19, TypeScript, and the T3 Stack.

## Features

- **Workout Tracking**: Log workouts, exercises, sets, and track progress over time
- **WHOOP Integration**: Sync workout data and recovery metrics from WHOOP devices
- **Offline-First**: Full offline functionality with automatic sync when online
- **Cross-Platform**: Web application with mobile PWA capabilities
- **Real-time Sync**: Live workout session updates and conflict resolution

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Backend**: tRPC v11, Drizzle ORM
- **Database**: Cloudflare D1
- **Authentication**: WorkOS
- **Analytics**: PostHog
- **Package Manager**: Bun

## Getting Started

### Prerequisites

- Node.js 20.19.4+ (managed via Volta)
- Bun package manager
- Cloudflare account with D1 and Workers
- Infisical account with access to the project workspace

### Installation

1. Clone the repository and install dependencies:

```bash
bun install
```

2. Configure Infisical workspace:

Ensure you have access to the Infisical workspace and that all required environment variables are set. The `.infisical.json` file is already configured for this project. Environment variables are managed through Infisical - no local `.env.local` file is needed.

3. Set up your database:

```bash
infisical run -- bun db:push
```

4. Start the development server:

```bash
bun dev
```

This command:

- Dynamically updates `wrangler.toml` with your D1 database ID from Infisical
- Runs Next.js development server with hot reload
- Connects to your remote D1 database for production-like development experience
- Serves your app on `http://localhost:3000` (or next available port)

**Note:** Currently using Next.js dev server. Wrangler dev integration is configured but has build issues that need resolution.

## Scripts

- `bun dev` - Start Workers development server with remote D1 database access
- `bun dev:next` - Start Next.js development server (fallback, no Workers runtime)
- `bun build` - Build the application for production
- `bun deploy` - Deploy the application to Cloudflare Workers
- `bun check` - Run lint + typecheck
- `bun test` - Run unit tests
- `bun run update-wrangler-config [env]` - Regenerate `wrangler.toml` using Infisical secrets (defaults to `dev`; run via `infisical run --env <target> -- bun run update-wrangler-config <target>` before `wrangler` commands)

## Project Structure

- `src/app/` - Next.js App Router pages and components
- `src/server/api/routers/` - tRPC API endpoints
- `src/lib/` - Shared utilities and configurations
- `src/hooks/` - Custom React hooks
- `apps/mobile/` - Mobile app (Android)

## Theming & Design Tokens

- **Material 3 palettes** power Light, Dark, Cool, Warm, and Neutral themes. Source data lives in `src/design-tokens/material3-palettes.generated.json` and compiles to CSS variables in `src/styles/material3-tokens.css`.
- Run `bun run tokens:build` after editing palette seeds to regenerate both JSON + CSS artifacts.
- Automated tests guard accessibility:
  ```bash
  bun run test -- src/__tests__/design-tokens/material3-theme.test.ts \
    src/__tests__/components/theme-selector.test.tsx \
    src/__tests__/hooks/use-reduced-motion.test.ts
  ```
- Consult `docs/material3-theme-guide.md` for rollout checklists, mobile QA guidance, and tooling notes.
- Design context, palette rationale, and state-layer guidance live in `DESIGN_MANIFESTO.md`.

## Contributing

1. Follow the existing code patterns and TypeScript conventions
2. Run `bun check` before committing to ensure code quality
3. Add tests for new features
4. Update documentation as needed

## License

Private project - All rights reserved.
