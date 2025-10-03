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
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Analytics**: PostHog
- **Package Manager**: Bun

## Getting Started

### Prerequisites

- Node.js 20.19.4+ (managed via Volta)
- Bun package manager
- PostgreSQL database (Supabase recommended)

### Installation

1. Clone the repository and install dependencies:

```bash
bun install
```

2. Copy environment variables and configure:

```bash
cp .env.example .env.local
```

3. Set up your database:

```bash
bun db:push
```

4. Start the development server:

```bash
bun dev
```

## Scripts

- `bun dev` - Start development server with Turbopack
- `bun build` - Build the application for production
- `bun preview` - Build and start production server locally
- `bun check` - Run lint + typecheck
- `bun test` - Run unit tests
- `bun e2e` - Run end-to-end tests

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
  bun run test -- src/__tests__/design-tokens/material3-theme.test.ts \\
    src/__tests__/components/theme-selector.test.tsx \\
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
