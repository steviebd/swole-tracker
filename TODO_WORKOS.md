# Todo: Implement WorkOS Authentication

**Objective:** Replace the current hardcoded `shared-user-123` authentication system with a robust, production-ready authentication flow using WorkOS as the identity provider and Convex for the backend.

---

### Prerequisites

Before starting, ensure you have access to the project's secrets, which are managed in Infisical. The development server (run with `bun run dev`) should automatically pull these secrets into the environment.

The following environment variables are required:

- `WORKOS_API_KEY`: Your WorkOS API Key.
- `WORKOS_CLIENT_ID`: The Client ID for your WorkOS project.
- `CONVEX_SITE_URL`: The deployment URL of the Convex project (e.g., `https://your-project.convex.cloud`).
- `JWT_SECRET_KEY`: A long, random, securely generated string used to sign the application's internal JWTs.

---

## Phase 1: Configure Convex Backend

The goal of this phase is to ensure the Convex backend is ready to handle authenticated requests.

**1.1. Create the Authentication Configuration File**

Convex requires a configuration file to understand how to validate JWTs.

- Create a new file at `convex/auth.config.ts`.
- Add the following code to the file. This configures a single JWT provider, which will be our own Next.js application.

```typescript
// convex/auth.config.ts

export default {
  providers: [
    {
      // This domain should match the `iss` (issuer) field in the JWT.
      domain: process.env.CONVEX_SITE_URL,
      // The applicationID is a unique identifier for our app within the Convex deployment.
      applicationID: "convex",
    },
  ],
};
```

**1.2. Verify User Schema and Mutations**

The database schema and user management functions are already well-prepared.

- **Schema (`convex/schema.ts`):** The `users` table is correctly defined with `workosId`, `email`, `firstName`, and `lastName`. No changes are needed.
- **Mutations (`convex/users.ts`):** The file contains an `ensure` mutation for creating/updating users from WorkOS data. This is exactly what we need. No changes are needed here.

---

## Phase 2: Implement Next.js API Authentication Routes

We will create three API routes in the Next.js application (`src/app/api/auth/`) to handle the server-side logic of the WorkOS authentication flow.

**2.1. Create the Login Route**

This route initiates the login process by redirecting the user to the WorkOS hosted sign-in page.

- Create a new file at `src/app/api/auth/login/route.ts`.
- Add the following code:

```typescript
// src/app/api/auth/login/route.ts

import { WorkOS } from '@workos-inc/node';
import { NextResponse } from 'next/server';

const workos = new WorkOS(process.env.WORKOS_API_KEY);
const clientId = process.env.WORKOS_CLIENT_ID;

export async function GET() {
  const authorizationURL = workos.userManagement.getAuthorizationUrl({
    provider: 'authkit',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    clientId,
  });

  return NextResponse.redirect(authorizationURL);
}
```

**2.2. Create the Callback Route**

This is the most critical route. WorkOS redirects the user here after a successful sign-in. This route handles exchanging the authorization code for a user profile, ensuring the user exists in our Convex DB, creating a session JWT, and setting it as a cookie.

- Create a new file at `src/app/api/auth/callback/route.ts`.
- You will need to install a JWT library: `bun add jose`.
- Add the following code:

```typescript
// src/app/api/auth/callback/route.ts

import { WorkOS } from '@workos-inc/node';
import { SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';

const workos = new WorkOS(process.env.WORKOS_API_KEY);
const clientId = process.env.WORKOS_CLIENT_ID;

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return new Response('Authorization code not found', { status: 400 });
  }

  try {
    // 1. Get user profile from WorkOS
    const { user } = await workos.userManagement.authenticateWithCode({
      code,
      clientId,
    });

    // 2. Ensure user exists in Convex DB
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const userId = await convex.mutation(api.users.ensure, {
      workosId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    // 3. Create a session JWT for our application
    const secret = new TextEncoder().encode(process.env.JWT_SECRET_KEY);
    const token = await new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(process.env.CONVEX_SITE_URL) // Must match domain in auth.config.ts
      .setAudience('convex') // Must match applicationID in auth.config.ts
      .setExpirationTime('2w') // Session lifetime
      .sign(secret);

    // 4. Set the token in a secure, HttpOnly cookie and redirect
    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Authentication callback error:', error);
    return new Response('Authentication failed', { status: 500 });
  }
}
```

**2.3. Create the Logout Route**

This route clears the session cookie and redirects the user to the homepage.

- Create a new file at `src/app/api/auth/logout/route.ts`.
- Add the following code:

```typescript
// src/app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/', req.url));
  // Clear the cookie
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });

  return response;
}
```

---

## Phase 3: Integrate Frontend Components

Update the UI to allow users to log in and out.

**3.1. Add Login/Logout Buttons**

In `src/app/page.tsx` (or a shared header component), use the `useConvexAuth` hook to conditionally display a "Login" or "Logout" link.

```tsx
// Example for src/app/page.tsx

import { useConvexAuth } from "convex/react";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <div>
      {/* ... other page content ... */}

      {isLoading ? (
        <div>Loading...</div>
      ) : isAuthenticated ? (
        <a href="/api/auth/logout">Log Out</a>
      ) : (
        <a href="/api/auth/login">Log In</a>
      )}

      {/* ... other page content ... */}
    </div>
  );
}
```

---

## Phase 4: Secure Convex Data Access & Remove Hardcoding

The final step is to refactor all backend queries and mutations to use the authenticated user from the context instead of a hardcoded ID.

**4.1. Find All Hardcoded User References**

Search the entire codebase for the string `"shared-user-123"`. This ID is used in `convex/users.ts` in the `initializeSharedUser` and `getSharedUserId` functions. These functions, and any code that calls them, are the primary targets for refactoring.

**4.2. Refactor Queries and Mutations**

Modify all data access functions to use the identity provided by `ctx.auth`.

**Example Refactor:**

**Before (Hardcoded):**
```typescript
// convex/some_file.ts
export const someQuery = query({
  args: { userId: v.id("users") }, // userId is passed from the client
  handler: async (ctx, args) => {
    return await ctx.db.query("workoutSessions")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .collect();
  },
});
```

**After (Secure):**
```typescript
// convex/some_file.ts
export const someQuery = query({
  args: {}, // No userId needed from client
  handler: async (ctx, args) => {
    // 1. Get the user's identity from the authenticated session
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("You must be logged in.");
    }

    // 2. Find the corresponding user document in the 'users' table
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q) => q.eq("workosId", identity.subject))
      .unique();
      
    if (!user) {
      throw new ConvexError("User not found.");
    }

    // 3. Use the user._id to query their data
    return await ctx.db.query("workoutSessions")
      .filter(q => q.eq(q.field("userId"), user._id))
      .collect();
  },
});
```
Apply this pattern to all relevant queries and mutations.

---

## Phase 5: Cleanup

Once all data access has been migrated to the new authentication system, remove the now-obsolete code.

- Delete the `initializeSharedUser` and `getSharedUserId` functions from `convex/users.ts`.
- Remove any frontend code that was responsible for calling these functions.
