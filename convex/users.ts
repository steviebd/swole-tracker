import { ConvexError, v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { UserIdentity } from "convex/server";

/**
 * User Management Functions
 * 
 * Handles WorkOS authentication integration and user lifecycle.
 * All users are created/retrieved via WorkOS identity integration.
 */

/**
 * Internal mutation to get or create a user from WorkOS identity
 * This should be called from other mutations that need to ensure user exists
 */
export const getOrCreateUser = internalMutation({
  args: {},
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Check if user already exists by WorkOS ID
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q: any) => q.eq("workosId", identity.subject))
      .unique();

    if (existingUser) {
      return existingUser;
    }

    // Create new user from WorkOS identity
    const userId = await ctx.db.insert("users", {
      name: identity.name ?? identity.email ?? "Unknown User",
      email: identity.email ?? "",
      workosId: identity.subject,
    });

    const newUser = await ctx.db.get(userId);
    if (!newUser) {
      throw new ConvexError("Failed to create user");
    }

    return newUser;
  },
});

/**
 * Helper function to get or create user (for use in other mutations)
 * This is the standard pattern for ensuring a user exists
 */
export async function ensureUser(
  ctx: { auth: any; db: any },
  identity: UserIdentity,
) {
  // Check if user already exists by WorkOS ID
  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_workosId", (q: any) => q.eq("workosId", identity.subject))
    .unique();

  if (existingUser) {
    return existingUser;
  }

  // Create new user from WorkOS identity
  const userId = await ctx.db.insert("users", {
    name: identity.name ?? identity.email ?? "Unknown User", 
    email: identity.email ?? "",
    workosId: identity.subject,
  });

  const newUser = await ctx.db.get(userId);
  if (!newUser) {
    throw new ConvexError("Failed to create user");
  }

  return newUser;
}

/**
 * Get current user profile
 */
export const getUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q: any) => q.eq("workosId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      workosId: user.workosId,
      _creationTime: user._creationTime,
    };
  },
});

/**
 * Get user by internal Convex ID (for internal use)
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Only allow users to get their own profile
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q: any) => q.eq("workosId", identity.subject))
      .unique();

    if (!currentUser || currentUser._id !== args.userId) {
      throw new ConvexError("Access denied");
    }

    return currentUser;
  },
});