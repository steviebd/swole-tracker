"use client";

// Re-export WorkOS AuthKit components and hooks for backwards compatibility
export { useAuth } from "@workos-inc/authkit-nextjs/components";

// The AuthProvider functionality is handled by AuthKitProvider in ConvexClientProvider
// This file exists for backwards compatibility with existing imports