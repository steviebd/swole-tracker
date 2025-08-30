# Complete WorkOS + Convex JWT Authentication Migration
## Full Codebase Refactor Roadmap

### 🎯 **Executive Summary**
This is a **complete authentication architecture migration** from a hybrid/broken system to pure WorkOS + Convex JWT. The audit reveals **50+ files** that need refactoring across all layers of the application.

---

## 🧠 **Decision Log: The Auth "Single Source of Truth"**

To ensure consistency, we will follow these rules for accessing authentication state:

1.  **UI Visibility (Show/Hide Elements):**
    *   **Rule:** Always use Convex's `<Authenticated>`, `<Unauthenticated>`, and `<AuthLoading>` components.
    *   **Reason:** This keeps the UI perfectly synchronized with the backend's session state, preventing flashes of incorrect content.

2.  **Accessing User Data (Client-Side):**
    *   **Rule:** Create and use a new `useCurrentUser` hook that wraps a Convex query (e.g., `api.users.getCurrent`).
    *   **Reason:** This decouples the UI from the WorkOS `user` object, provides a consistent data structure, and ensures user data is always fresh from the database.

3.  **Programmatic Actions (Sign Out, etc.):**
    *   **Rule:** Use the `useAuth` hook from `@workos-inc/authkit-nextjs` for actions like `signOut`.
    *   **Reason:** This hook provides the necessary client-side functions to interact with the AuthKit session.

---

## 🏗️ **Current Architecture Problems**

### **Multiple Auth Providers Conflict**
```
❌ AuthKitClientProvider.tsx (WorkOS AuthKit)
❌ ConvexClientProvider.tsx (Custom JWT + localStorage) 
❌ convex-auth-provider.tsx (Alternative Convex)
❌ AuthProvider.tsx (Hybrid wrapper combining all)
```

### **Inconsistent Authentication Patterns**
- Server-side: `withAuth()` from WorkOS
- Client-side: Custom `useAuth()` hook
- Convex: `ctx.auth.getUserIdentity()`
- Manual: localStorage JWT management

### **CONSTRAINTS**

- Make sure we are doing Next.JS with JWT as per https://docs.convex.dev/auth/authkit
- Ensure that we follow best practice and not create unnecessary complexity with custom code
---

## 📋 **Phase-by-Phase Complete Migration**

### **Phase 1: Core Infrastructure Cleanup** ⚡ CRITICAL

#### **1.1 Provider Architecture Overhaul**
- [x] **Delete conflicting providers:**
  - [x] Delete `/src/app/AuthKitClientProvider.tsx`
  - [x] Delete `/src/app/_components/convex-auth-provider.tsx`
  - [x] Backup and replace `/src/app/ConvexClientProvider.tsx`
  - [x] Delete `/src/providers/AuthProvider.tsx`

- [x] **Implement single provider chain in `src/app/layout.tsx`:**
  ```typescript
  // src/app/layout.tsx
  <AuthKitProvider>
    <ConvexProviderWithAuth client={convex} useAuth={useAuthFromAuthKit}>
      <PostHogProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </PostHogProvider>
    </ConvexProviderWithAuth>
  </AuthKitProvider>
  ```

#### **1.2 Environment & Configuration**
- [x] **Add missing environment variables:**
  ```env
  WORKOS_COOKIE_PASSWORD=<32+ character password>
  WORKOS_CLIENT_ID=client_01K2H5DEX4CYA6KK88FN1JMJ0R
  WORKOS_API_KEY=<your-api-key>
  NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback
  ```
- [ ] **Secret Management:**
    *   **Note:** All secrets should be managed using Infisical. The `dev` script in `package.json` already uses `infisical run`.
    *   **Action:** Find the `WORKOS_API_KEY` and `WORKOS_CLIENT_ID` in the [WorkOS Dashboard](https://dashboard.workos.com/). Generate a secure `WORKOS_COOKIE_PASSWORD` (32+ characters) and add them all to Infisical.

- [x] **Update Convex auth config:**
  ```typescript
  // convex/auth.config.ts
  const clientId = process.env.WORKOS_CLIENT_ID!;
  
  export default {
    providers: [
      {
        type: 'customJwt',
        issuer: 'https://api.workos.com/',
        algorithm: 'RS256',
        jwks: `https://api.workos.com/sso/jwks/${clientId}`,
        applicationID: clientId,
      },
      {
        type: 'customJwt',
        issuer: `https://api.workos.com/user_management/${clientId}`,
        algorithm: 'RS256', 
        jwks: `https://api.workos.com/sso/jwks/${clientId}`,
        applicationID: clientId,
      },
    ],
  };
  ```

#### **1.3 Middleware Implementation**
- [x] **Replace disabled middleware:**
  ```typescript
  // middleware.ts
  import { authkitMiddleware } from '@workos-inc/authkit-nextjs';
  
  export default authkitMiddleware({
    middlewareAuth: {
      enabled: true,
      // The login page is the only unauthenticated route.
      // All other pages should require authentication.
      unauthenticatedPaths: ['/login'],
    },
  });
  
  export const config = {
    matcher: [
      '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*',
    ],
  };
  ```

---

### **Phase 2: API Routes & Server-Side Auth** 🔥 HIGH PRIORITY

#### **2.1 Authentication API Routes**
- [x] **Delete custom API routes:**
    - [ ] Delete `src/app/api/auth/login/route.ts`
    - [ ] Delete `src/app/api/auth/callback/route.ts`
    - **Reason:** `authkitMiddleware` provides these routes automatically. Relying on the built-in routes reduces custom code and potential errors.

- [x] **Create a new logout route:**
  ```typescript
  // src/app/api/auth/logout/route.ts
  import { workos } from '@workos-inc/authkit-nextjs';
  
  export async function GET() {
    await workos.logout();
    return new Response(null, { status: 200 });
  }
  ```

#### **2.2 Server-Side Protected Routes**
- [x] **Migrate server-side auth pages:**
  - [x] `/src/app/workout/session/local/[localId]/page.tsx`
  - [x] `/src/app/connect-whoop/page.tsx`
  
  ```typescript
  // Replace withAuth() with proper JWT verification
  import { getUser } from '@workos-inc/authkit-nextjs';
  
  export default async function ProtectedPage() {
    const { user } = await getUser();
    if (!user) redirect('/sign-in');
    
    return <PageContent />;
  }
  ```

#### **2.3 SSE & Real-time Endpoints**
- [x] **Update SSE endpoint:**
  ```typescript
  // src/app/api/sse/workout-updates/route.ts
  // Replace WorkOS auth with JWT verification
  // Ensure proper user isolation
  ```

#### **2.4 User Profile Synchronization**
- [x] **Create a Convex mutation to sync user data:**
  ```typescript
  // convex/users.ts
  export const ensure = internalMutation({
    args: {
      workosId: s.string(),
      email: s.string(),
      firstName: s.string(),
      lastName: s.string(),
    },
    handler: async (ctx, args) => {
      const user = await ctx.db
        .query("users")
        .withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
        .unique();
      
      if (user) {
        // Optional: Update user data if it has changed
        if (user.email !== args.email || user.firstName !== args.firstName || user.lastName !== args.lastName) {
          await ctx.db.patch(user._id, {
            email: args.email,
            firstName: args.firstName,
            lastName: args.lastName,
          });
        }
        return;
      }

      await ctx.db.insert("users", {
        workosId: args.workosId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
      });
    },
  });
  ```
- [x] **Create a WorkOS webhook handler:**
    *   **Action:** Create a new API route `src/app/api/webhooks/workos/route.ts` to receive `user.created` and `user.updated` events from WorkOS.
    *   **Security:** The webhook must be secured by verifying the WorkOS signature.
    *   **Logic:** The handler will call the `users.ensure` mutation with the user data from the webhook payload.

---

### **Phase 3: Client-Side Authentication** 🟡 MEDIUM PRIORITY

#### **3.1 Authentication Pages**
- [ ] **Update sign-in page:**
  ```typescript
  // src/app/sign-in/page.tsx
  // Remove @workos-inc/authkit-react usage
  // Use simple redirect to /api/auth/login
  ```

- [ ] **Clean up auth redirect pages:**
  - [ ] `/src/app/auth/login/page.tsx` ✅ (already simple)
  - [ ] `/src/app/auth/register/page.tsx` ✅ (already simple)
  - [ ] `/src/app/auth/auth-code-error/page.tsx` (update error handling)

#### **3.2 Protected Client Pages**  
- [ ] **Update client-side auth gating:**
  - [ ] `/src/app/workouts/page.tsx`
  - [ ] `/src/app/templates/page.tsx`
  - [ ] `/src/app/progress/page.tsx`
  
  ```typescript
  // Replace custom useAuth() with Convex components
  import { Authenticated, Unauthenticated } from "convex/react";
  
  export default function ProtectedPage() {
    return (
      <>
        <Unauthenticated>
          <SignInPrompt />
        </Unauthenticated>
        <Authenticated>
          <PageContent />
        </Authenticated>
      </>
    );
  }
  ```

#### **3.3 Home Page Authentication**
- [ ] **Update main landing page:**
  ```typescript
  // src/app/page.tsx
  // Use Convex auth components instead of AuthProvider
  ```

---

### **Phase 4: UI Components** 🟡 MEDIUM PRIORITY

#### **4.1 Authentication Components**
- [ ] **Update sign-in components:**
  - [ ] `/src/components/auth/sign-in.tsx`
  - [ ] `/src/app/_components/sign-in-buttons.tsx`
  
  ```typescript
  // Remove custom WorkOS URL building
  // Simple redirect to /api/auth/login
  const handleSignIn = () => {
    window.location.href = '/api/auth/login';
  };
  ```

- [ ] **Update sign-out components:**
  - [ ] `/src/components/auth/sign-out.tsx`
  
  ```typescript
  // Use WorkOS signOut function
  import { useAuth } from '@workos-inc/authkit-nextjs';
  
  const { signOut } = useAuth();
  ```

#### **4.2 Navigation Components**
- [ ] **Update header components:**
  - [ ] `/src/app/_components/header.tsx`
  - [ ] `/src/app/_components/HomePageHeader.tsx`  
  - [ ] `/src/components/dashboard/dashboard-header.tsx`
  
  ```typescript
  // Replace custom useAuth() with WorkOS useAuth()
  import { useAuth } from '@workos-inc/authkit-nextjs';
  
  const { user, signOut } = useAuth();
  ```

---

### **Phase 5: Convex Backend** 🔵 LOW PRIORITY (Mostly Compatible)

#### **5.1 Convex Functions Audit**
All Convex functions already use the correct pattern and should work with JWT:
- [ ] **Verify user isolation works:** `ctx.auth.getUserIdentity()`
- [ ] **Test authentication propagation** to all functions
- [ ] **No changes needed** to core logic

#### **5.2 Database Schema**
- [ ] **Verify user mapping:** `workosId` field should map to JWT subject
- [ ] **Test user data isolation** across all tables
- [ ] **No schema changes required**

---

### **Phase 6: Error Handling & UX** 🔵 LOW PRIORITY

#### **6.1 Error Boundaries**
- [ ] **Add authentication error boundaries:**
  ```typescript
  // src/components/auth/AuthErrorBoundary.tsx
  export function AuthErrorBoundary({ children }) {
    return (
      <ErrorBoundary
        fallback={<AuthErrorFallback />}
        onError={(error) => {
          console.error('Auth Error:', error);
          analytics.track('auth_error', { error: error.message });
        }}
      >
        {children}
      </ErrorBoundary>
    );
  }
  ```

#### **6.2 Loading States**
- [ ] **Initial Load:** Use a skeleton UI (already partially implemented in `page.tsx`) to prevent layout shifts while the initial auth state is being determined.
- [ ] **Auth Transitions:** Use the `<AuthLoading>` component from `convex/react` to show a loading indicator during the brief period after sign-in/sign-out when the session is being established or destroyed.
- [ ] **Token Refresh Failure:** The `ConvexProviderWithAuth` will automatically handle token refresh. If it fails (e.g., the refresh token is invalid), the user will be logged out. We will implement a listener for this event to show a modal: "Your session has expired. Please sign in again." with a button to redirect to the login page.

#### **6.3 Multi-tab Support**
- [ ] **Implement multi-tab logout sync:**
    *   **Action:** Use the `BroadcastChannel` API. When the user logs out on one tab, send a "logout" message.
    *   **Logic:** Other tabs will listen for this message and call `window.location.reload()` to force a re-evaluation of the auth state, which will redirect them to the login page.

---

## 🧪 **Testing Strategy**

### **Phase 1 Testing**
- [ ] Provider chain loads without errors
- [ ] JWT tokens flow from WorkOS to Convex  
- [ ] Middleware properly covers all routes
- [ ] No more `POST / 500` errors

### **Phase 2 Testing**
- [ ] OAuth login flow works end-to-end
- [ ] Server-side protected routes work
- [ ] Logout clears session properly
- [ ] SSE endpoints respect authentication
- [ ] User profile is created/updated in Convex DB after sign-in.

### **Phase 3 Testing**
- [ ] Client-side auth gating works
- [ ] Protected pages redirect properly
- [ ] Authentication state persists

### **Phase 4 Testing**
- [ ] UI components reflect auth state
- [ ] Sign-in/out flows work smoothly
- [ ] Navigation updates properly

### **Phase 5 Testing**
- [ ] All Convex queries work when authenticated
- [ ] User data isolation maintained
- [ ] Database operations succeed

### **Phase 6 Testing**
- [ ] Error scenarios handled gracefully
- [ ] Loading states display properly
- [ ] Multi-tab behavior works

---

## 📊 **Migration Impact Assessment**

### **Files to Modify: 50+**
- **Critical (9 files):** Provider layer, auth config, middleware
- **High (12 files):** API routes, server-side protected pages
- **Medium (15 files):** Client pages, UI components  
- **Low (20+ files):** Convex functions, schema, utilities

### **Risk Assessment**
- **High Risk:** Provider changes (affects entire app)
- **Medium Risk:** Server-side auth migration
- **Low Risk:** UI components, Convex functions

### **Timeline Estimate**
- **Phase 1:** 2-3 days (Critical infrastructure)
- **Phase 2:** 2-3 days (API routes & server-side)
- **Phase 3:** 1-2 days (Client-side pages)
- **Phase 4:** 1-2 days (UI components)
- **Phase 5:** 1 day (Backend verification)
- **Phase 6:** 1-2 days (Polish & testing)

**Total: 8-13 days for complete migration**

---

## 🚨 **Critical Success Factors**

1. **Single Source of Truth:** One authentication provider chain
2. **Consistent Patterns:** Same auth hooks throughout app
3. **Proper Error Handling:** Graceful authentication failures
4. **Comprehensive Testing:** All user flows work
5. **Security Validation:** JWT verification, HTTPS, secure cookies
6. **Performance:** No authentication-related delays
7. **User Experience:** Smooth login/logout, loading states

---

## 🔧 **Rollback Plan**

- [ ] Create `auth-backup` branch before starting
- [ ] Document current working state
- [ ] Test rollback procedure in staging
- [ ] Keep environment variable backups
- [ ] Document emergency rollback steps

**This is the most comprehensive authentication refactor roadmap covering every aspect of your codebase.**
