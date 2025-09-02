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

## Recent Updates

### Token System Refactoring (Latest)

The complex design token system has been simplified and removed:

- **Removed**: Complex token build scripts (`build-tokens.js`, `build-mobile-tokens.js`)
- **Removed**: Generated CSS token files and JSON schemas
- **Removed**: TypeScript token utilities and mobile token generation
- **Simplified**: Package.json scripts no longer include token building steps
- **Result**: Faster development builds, simpler deployment process

The application now uses standard Tailwind CSS v4 theming without the overhead of a complex token generation system.

## Contributing

1. Follow the existing code patterns and TypeScript conventions
2. Run `bun check` before committing to ensure code quality
3. Add tests for new features
4. Update documentation as needed

## License

Private project - All rights reserved.
