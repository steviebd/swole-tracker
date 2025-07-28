# Swole Tracker Setup Instructions

A mobile-first workout tracking application built with the T3 Stack.

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database (recommended: Supabase)
- Discord application for OAuth

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://username:password@host:port/database"

# NextAuth.js
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Discord OAuth
DISCORD_CLIENT_ID="your-discord-client-id" 
DISCORD_CLIENT_SECRET="your-discord-client-secret"
```

## Setup Steps

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up your database:**
   ```bash
   pnpm db:push
   ```

3. **Start the development server:**
   ```bash
   pnpm dev
   ```

4. **Build for production:**
   ```bash
   pnpm build
   ```

## Discord OAuth Setup

1. Go to https://discord.com/developers/applications
2. Create a new application
3. Go to OAuth2 settings
4. Add redirect URI: `http://localhost:3000/api/auth/callback/discord`
5. Copy the Client ID and Client Secret to your `.env` file

## Features

- **User Authentication**: Discord OAuth via NextAuth.js
- **Workout Templates**: Create and manage workout templates with custom exercises
- **Workout Sessions**: Start workouts, log exercise data (weight, reps, sets)
- **Progress Tracking**: Auto-populate previous exercise data for easy logging
- **Weight Units**: Toggle between kg and lbs with user preference storage
- **Mobile-First Design**: Optimized for mobile devices with dark theme
- **Type-Safe**: Full TypeScript implementation with tRPC

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm check` - Run linting and type checking
- `pnpm format:write` - Format code with Prettier
- `pnpm db:push` - Push database schema changes
- `pnpm db:studio` - Open Drizzle Studio for database management

## Database Schema

The application uses the following main tables:
- `workout_templates` - User-created workout templates
- `template_exercises` - Exercises within templates
- `workout_sessions` - Individual workout sessions
- `session_exercises` - Exercise data logged during sessions
- `user_preferences` - User settings (weight units, etc.)

## Deployment

This application is ready for deployment on Vercel. Make sure to:
1. Set up your environment variables in Vercel
2. Update the NEXTAUTH_URL to your production domain
3. Update Discord OAuth redirect URI to your production domain
