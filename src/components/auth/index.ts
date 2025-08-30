/**
 * Authentication components and utilities
 * 
 * This module exports all authentication-related components and hooks
 * for enhanced error handling, session management, and multi-tab synchronization.
 */

// Error Boundary Components
export { AuthErrorBoundary } from "./AuthErrorBoundary";
export { SessionExpiryModal, useSessionExpiryHandler } from "./SessionExpiryModal";

// Auth Action Components
export { SignOutButton } from "./sign-out";

// Hook Utilities
export { useMultiTabSync } from "../../hooks/useMultiTabSync";
export { useTokenRefreshHandler } from "../../hooks/useTokenRefreshHandler";
export { useCurrentUser } from "../../hooks/useCurrentUser";