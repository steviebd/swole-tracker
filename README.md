# Swole Tracker Setup Instructions

A mobile-first workout tracking application built with the T3 Stack.

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database (recommended: Supabase)

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

## E2E Testing

This project uses Playwright for end-to-end testing with Clerk's official testing package.

### Prerequisites for Local Testing

1. **Install Playwright browsers:**
   ```bash
   pnpm exec playwright install
   ```

2. **Create a test user in Clerk:**
   - Go to your [Clerk Dashboard](https://dashboard.clerk.com)
   - Create a test user with email/password authentication
   - Enable username/password authentication in your Clerk settings

3. **Environment variables:**
   Copy `.env.example` to `.env.local` and configure the required variables:
   ```env
   PLAYWRIGHT_BASE_URL=http://localhost:3000
   CLERK_SECRET_KEY=your-clerk-secret-key
   CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
   TEST_USER_EMAIL=your-test-user@example.com
   TEST_USER_PASSWORD=your-test-password
   ```

### Running Tests Locally

1. **Run all tests:**
   ```bash
   pnpm exec playwright test
   ```

2. **Run tests with UI mode:**
   ```bash
   pnpm exec playwright test --ui
   ```

3. **Run specific test file:**
   ```bash
   pnpm exec playwright test tests/example.spec.ts
   ```

4. **View test reports:**
   ```bash
   pnpm exec playwright show-report
   ```

### CI/CD Integration

The project includes automated E2E testing through GitHub Actions:

#### Pull Request Testing
- **Trigger:** Pull requests to `main` or `develop` branches
- **Environment:** Local development server with test database
- **Process:**
  1. Sets up PostgreSQL test database
  2. Installs dependencies and Playwright browsers
  3. Builds and starts the application
  4. Runs E2E tests against local server
  5. Uploads test reports and artifacts

#### Production Testing
- **Trigger:** Push to `main` branch
- **Environment:** Production deployment
- **Process:**
  1. Waits for production deployment to be ready
  2. Runs E2E tests against live production site
  3. Uploads test reports with extended retention
  4. Notifies on test failures

### GitHub Secrets Configuration

Configure these secrets in your GitHub repository (Settings → Secrets and variables → Actions):

```
# Required for Clerk authentication testing
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# Test user credentials (must exist in your Clerk dashboard)
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password

# Test database (for PR testing)
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/test_db

# Supabase (if needed for testing)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Production testing URL
PLAYWRIGHT_PRODUCTION_URL=https://your-app.vercel.app
```

### Test File Structure

Tests are located in the `tests/` directory:
- `tests/global.setup.ts` - Global setup using Clerk's `clerkSetup()`
- `tests/example.spec.ts` - Basic page tests
- `tests/auth.spec.ts` - Authentication flow tests using Clerk helpers
- Test reports: `playwright-report/`
- Test results: `test-results/`

### Key Features

- **Clerk Testing Integration**: Uses `@clerk/testing/playwright` for seamless authentication
- **Testing Tokens**: Automatically handles Clerk's bot detection via testing tokens
- **No UI Interaction**: Sign in/out programmatically without clicking through forms
- **Multiple Auth Strategies**: Supports password, phone_code, and email_code authentication

### Best Practices

1. **Use Clerk helpers** (`clerk.signIn()`, `clerk.signOut()`) instead of UI automation
2. **Call `setupClerkTestingToken()` in non-auth tests** to bypass bot detection
3. **Create dedicated test users** in your Clerk dashboard
4. **Keep tests independent** - each test should be able to run in isolation
5. **Use test phone numbers** (+15555550100) and test emails (user+clerk_test@example.com)

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
