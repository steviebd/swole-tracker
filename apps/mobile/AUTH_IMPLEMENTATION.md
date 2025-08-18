# Supabase Auth Integration with Expo Router

This document describes the updated Supabase authentication integration in the mobile app with proper Expo Router navigation support.

## Overview

The authentication system has been completely redesigned to work seamlessly with Expo Router, providing:

- Smooth navigation transitions between authenticated/unauthenticated states
- Proper loading states during auth changes
- Session persistence between app launches
- Clean sign out functionality with cache clearing
- Centralized auth state management

## Key Components

### 1. AuthProvider (`/components/providers/AuthProvider.tsx`)

**Purpose**: Centralized authentication state management and logic.

**Features**:
- Manages session state and auth loading states
- Handles AppState changes for token auto-refresh
- Provides sign in, sign up, and sign out methods
- Proper error handling with user-friendly messages
- Session persistence using AsyncStorage

**Key Methods**:
- `signIn(email, password)` - Sign in with email/password
- `signUp(email, password)` - Sign up with email/password  
- `signOut()` - Sign out and clear all data

### 2. Updated Root Layout (`/app/_layout.tsx`)

**Purpose**: Route protection and smooth auth transitions.

**Features**:
- Uses `useProtectedRoute` hook for automatic redirects
- Shows loading states during auth initialization
- Waits for auth to initialize before navigation
- Wraps app with AuthProvider and TRPCProvider

**Navigation Logic**:
- Unauthenticated users → `/(auth)/login`
- Authenticated users in auth routes → `/(tabs)`
- Loading states prevent navigation flashes

### 3. Enhanced Auth Component (`/components/Auth.tsx`)

**Purpose**: Combined login/signup form with improved UX.

**Features**:
- Toggle between sign in and sign up modes
- Form validation (email format, password length)
- Loading states with disabled inputs
- Clear error messaging
- Handles email verification flow

### 4. Updated Account Component (`/components/Account.tsx`)

**Purpose**: Profile management with proper auth integration.

**Features**:
- Uses AuthProvider for session data
- Confirmation dialog for sign out
- Profile loading states
- Error handling for profile operations
- Automatic navigation after sign out

### 5. Updated TRPCProvider (`/components/providers/TRPCProvider.tsx`)

**Purpose**: Query cache management tied to auth state.

**Features**:
- Clears cache when user signs out
- Monitors auth state changes
- Proper loading states during setup
- Session-aware query persistence

## Authentication Flow

### App Launch
1. AuthProvider initializes and checks for existing session
2. Root layout shows loading screen during initialization
3. Once initialized, navigation logic kicks in:
   - Session exists → Navigate to `/(tabs)`
   - No session → Navigate to `/(auth)/login`

### Sign In Process
1. User enters credentials in Auth component
2. AuthProvider handles sign in with Supabase
3. On success, session state updates automatically
4. Root layout detects session change and navigates to `/(tabs)`
5. TRPCProvider sets up query cache for authenticated user

### Sign Out Process
1. User taps sign out in Account component
2. Confirmation dialog appears
3. AuthProvider calls Supabase sign out
4. Session state clears automatically
5. TRPCProvider clears query cache
6. Root layout detects session loss and navigates to `/(auth)/login`

## Session Persistence

**Automatic Persistence**:
- Supabase handles session storage in AsyncStorage
- Sessions persist between app launches
- Auto-refresh tokens when app becomes active

**Cache Management**:
- Query cache persists between sessions
- Cache is cleared on sign out
- Failed queries are retried appropriately

## Loading States

The app provides consistent loading experiences:

**Initialization Loading**:
- Shown while auth state is being determined
- Prevents navigation flashes

**Auth Action Loading**:
- Sign in/up buttons show loading spinners
- Form inputs disabled during auth actions
- Clear feedback on success/error

**Profile Loading**:
- Loading screen while fetching profile data
- Loading states for profile updates

## Error Handling

**User-Friendly Messages**:
- Form validation errors
- Network/server error handling
- Clear sign out error handling

**Graceful Degradation**:
- App continues to work if cache setup fails
- Network errors don't crash the app
- Retry logic for failed requests

## Security Features

**Data Protection**:
- All cached data cleared on sign out
- Session tokens handled securely by Supabase
- No sensitive data in local storage

**Route Protection**:
- Automatic redirects for unauthorized access
- Session verification on app resume
- Proper token refresh handling

## Usage Examples

### Using Auth in Components

```tsx
import { useAuth } from '../components/providers/AuthProvider';

function MyComponent() {
  const { session, isLoading, signOut } = useAuth();
  
  if (isLoading) return <LoadingScreen />;
  if (!session) return <Text>Not signed in</Text>;
  
  return (
    <View>
      <Text>Welcome {session.user.email}</Text>
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
}
```

### Custom Auth Hooks

```tsx
import { useRequireAuth } from '../hooks/useAuthRedirect';

function ProtectedScreen() {
  const { isAuthenticated } = useRequireAuth();
  
  // Automatically redirects if not authenticated
  return <YourProtectedContent />;
}
```

## Files Modified/Created

**Created**:
- `/components/providers/AuthProvider.tsx` - Centralized auth management
- `/components/ui/LoadingScreen.tsx` - Consistent loading UI
- `/hooks/useAuthRedirect.ts` - Auth navigation helpers

**Modified**:
- `/app/_layout.tsx` - Route protection and navigation
- `/components/Auth.tsx` - Enhanced auth form
- `/components/Account.tsx` - Profile management
- `/app/(tabs)/profile.tsx` - Simplified profile screen
- `/components/providers/TRPCProvider.tsx` - Cache management
- `/components/ui/Button.tsx` - Color consistency
- `/components/ui/Input.tsx` - Color consistency
- `/components/ui/index.ts` - Export updates

## Testing the Implementation

1. **Fresh Install**: Sign up with new email, verify persistence
2. **Sign In/Out**: Test navigation flows and loading states
3. **App Resume**: Close/reopen app, verify session persistence
4. **Network Issues**: Test offline scenarios and error handling
5. **Profile Management**: Update profile, test loading states

The implementation provides a robust, user-friendly authentication experience that works seamlessly with Expo Router navigation patterns.