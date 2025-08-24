# Auth Refactoring TODO

This document outlines the steps to refactor the web application's authentication logic to make it more organized, maintainable, and easier to understand.

## Step 1: Create a Centralized Auth Library

The first step is to create a centralized library for all authentication-related code in the `src/lib/auth` directory.

- [ ] Create the `src/lib/auth` directory.
- [ ] Move the contents of `src/lib/workos.ts` to a new file at `src/lib/auth/workos.ts`.
- [ ] Create a new file at `src/lib/auth/session.ts` to handle session management (creating, reading, and clearing the session cookie). Extract the session-related logic from the old `src/lib/workos.ts` and move it here. Include error handling for invalid sessions.
- [ ] Create a new file at `src/lib/auth/user.ts` to contain functions for getting the current user from a request. Extract the user-related logic from the old `src/lib/workos.ts` and move it here. Ensure secure handling of user data.
- [ ] Delete the old `src/lib/workos.ts` file.
- [ ] Add unit tests for the new auth functions in `src/lib/auth/` to verify functionality (e.g., using Vitest).

## Step 2: Refactor the API Routes

Once the centralized auth library is in place, refactor the API routes to use it.

- [ ] Refactor the `login` route (`src/app/api/auth/login/route.ts`) to use the `getAuthorizationUrl` function from `src/lib/auth/workos.ts`.
- [ ] Refactor the `logout` route (`src/app/api/auth/logout/route.ts`) to use the `clearSession` function from `src/lib/auth/session.ts`.
- [ ] Find the WorkOS callback route (likely at `src/app/api/auth/callback/route.ts` or similar) and refactor it to use the new auth library for exchanging the code for a token and creating a session.

## Step 3: Refactor the Middleware

Update the middleware to use the new centralized auth library for session and user management.

- [ ] Refactor `src/middleware.ts` to use functions from `src/lib/auth/session.ts` (e.g., for session validation) and `src/lib/auth/user.ts` (e.g., for user checks). This ensures consistent auth handling across protected routes.

## Step 4: Refactor the AuthProvider

Refactor the `AuthProvider` to use the new centralized auth library.

- [ ] Update the `AuthProvider` at `src/providers/AuthProvider.tsx` to use the functions from `src/lib/auth/user.ts` and `src/lib/auth/session.ts` to manage the user's authentication state. This will simplify the provider and make it more focused on its core responsibility of managing the auth state in the UI.

## Step 5: Refactor Whoop Integration (Optional)

After refactoring the core authentication logic, consider refactoring the Whoop integration to use the new centralized auth library for user and session management.

- [ ] Update the Whoop authorize route (`src/app/api/auth/whoop/authorize/route.ts`) to use the `getUserFromRequest` function from `src/lib/auth/user.ts`.
- [ ] Update the Whoop callback route (`src/app/api/auth/whoop/callback/route.ts`) to use the `getUserFromRequest` function from `src/lib/auth/user.ts`.
