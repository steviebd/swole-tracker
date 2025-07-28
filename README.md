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

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-public-key
CLERK_SECRET_KEY=your-clerk-secret-key

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

## Features

- **User Authentication**: Clerk Auth
- **Workout Templates**: Create and manage workout templates with custom exercises
- **Workout Sessions**: Start workouts, log exercise data (weight, reps, sets)
- **Progress Tracking**: Auto-populate previous exercise data for easy logging
- **Workout History**: View all past workouts with detailed exercise data
- **Read-Only Workout Views**: View completed workouts with the ability to repeat them
- **Weight Units**: Toggle between kg and lbs with user preference storage
- **Mobile-First Design**: Optimized for mobile devices with dark theme
- **Type-Safe**: Full TypeScript implementation with tRPC
- **Performance Optimized**: 
  - Optimistic updates for instant UI feedback
  - Aggressive caching with 5-minute stale time
  - Background refetching on window focus/reconnect
  - Exponential backoff retry logic
- **Offline Support**:
  - Offline-first approach with cached data
  - Connection status indicator
  - Sync indicator for background operations
  - Automatic retry when connection restored

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

## Production Deployment

### Prerequisites

- Vercel account
- Supabase account
- Clerk account

### Step 1: Setup Supabase Database

1. Create a new project in [Supabase](https://supabase.com)
2. Go to Settings → Database and copy your connection string
3. Update the connection string format:
   ```
   postgresql://postgres.reference:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```

### Step 2: Setup Clerk Authentication

1. Create a new application in [Clerk](https://clerk.com)
2. Go to Developers → API Keys and copy:
   - Publishable key
   - Secret key
3. Configure allowed redirect URLs for your Vercel domain

### Step 3: Deploy to Vercel

1. **Connect Repository:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

2. **Environment Variables:**
   Add these in Vercel Dashboard → Settings → Environment Variables:
   ```env
   # Database
   DATABASE_URL=your-supabase-connection-string
   
   # Clerk Auth
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
   CLERK_SECRET_KEY=sk_test_xxxxx
   ```

3. **Build Settings:**
   - Framework Preset: Next.js
   - Build Command: `pnpm build`
   - Output Directory: `.next`
   - Install Command: `pnpm install`

### Step 4: Initialize Database Schema

After deployment, push your schema to Supabase:

```bash
# Set production DATABASE_URL locally
export DATABASE_URL="your-supabase-connection-string"

# Push schema to production
pnpm db:push
```

### Step 5: Verify Deployment

1. Visit your Vercel domain
2. Test user registration/login
3. Create a workout template to verify database connectivity
4. Check Vercel Function logs for any errors

### Production Checklist

- [ ] Supabase project created and configured
- [ ] Clerk application created with correct redirect URLs
- [ ] Environment variables set in Vercel
- [ ] Database schema pushed to production
- [ ] SSL certificate configured (automatic with Vercel)
- [ ] Custom domain configured (optional)

### Monitoring & Maintenance

- Monitor performance in Vercel Analytics
- Check Supabase logs for database issues
- Monitor Clerk dashboard for authentication metrics
- Set up Vercel monitoring alerts for downtime
