import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
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

    // Use the helper function to get or create user
    return await ensureUser(ctx, identity);
  },
});

/**
 * Public mutation to ensure current authenticated user exists in database
 * This is called when a user first logs in to create their database record
 */
export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Use the helper function to get or create user
    const user = await ensureUser(ctx, identity);
    return user._id;
  },
});

/**
 * Mutation to sync user data from WorkOS webhooks
 * Ensures user exists and updates profile data if changed
 * This is called exclusively from WorkOS webhook handlers
 * Updated: firstName and lastName are optional fields
 */
export const ensureUserFixed = mutation({
  args: {
    workosId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()), // MUST be optional - fixed validation
    lastName: v.optional(v.string()),   // MUST be optional - fixed validation
    // Force redeployment
    _debug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate required fields
    if (!args.workosId.trim()) {
      throw new ConvexError("WorkOS ID is required");
    }
    if (!args.email.trim()) {
      throw new ConvexError("Email is required");
    }

    // Check if user already exists by WorkOS ID
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q: any) => q.eq("workosId", args.workosId))
      .unique();

    if (existingUser) {
      // Check if any user data has changed and needs updating
      const needsUpdate = 
        existingUser.email !== args.email ||
        existingUser.firstName !== args.firstName ||
        existingUser.lastName !== args.lastName;

      if (needsUpdate) {
        // Construct display name from firstName/lastName or fallback to email
        const displayName = createDisplayName(
          args.firstName, 
          args.lastName, 
          args.email, 
          existingUser.name
        );

        await ctx.db.patch(existingUser._id, {
          email: args.email,
          firstName: args.firstName,
          lastName: args.lastName,
          name: displayName,
        });
      }
      return existingUser._id;
    }

    // Create new user from WorkOS webhook data
    const displayName = createDisplayName(args.firstName, args.lastName, args.email);

    const userId = await ctx.db.insert("users", {
      workosId: args.workosId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      name: displayName,
    });

    return userId;
  },
});

/**
 * Helper function to create a user with optional first/last names
 */
function createDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
  fallback = "Unknown User"
): string {
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ').trim();
  }
  return email || fallback;
}

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
  const displayName = createDisplayName(
    identity.givenName, 
    identity.familyName, 
    identity.email, 
    identity.name
  );

  const userId = await ctx.db.insert("users", {
    name: displayName,
    email: identity.email ?? "",
    firstName: identity.givenName || undefined,
    lastName: identity.familyName || undefined,
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

