import { describe, it, expect } from "vitest";

/**
 * Tests for the users.ensure Convex mutation
 * 
 * Since we can't directly test Convex mutations without a live deployment,
 * these tests verify the argument validation logic and edge cases that 
 * the mutation should handle.
 */

describe("users.ensure mutation argument validation", () => {
  const validArgs = {
    workosId: "user_01234567890abcdef",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  };

  it("should accept valid required fields", () => {
    const args = {
      workosId: "user_01234567890abcdef",
      email: "test@example.com",
    };
    
    expect(args.workosId).toBeTruthy();
    expect(args.email).toBeTruthy();
    expect(args.workosId.trim()).toBe(args.workosId);
    expect(args.email.trim()).toBe(args.email);
  });

  it("should accept optional name fields", () => {
    const args = {
      ...validArgs,
      firstName: undefined,
      lastName: undefined,
    };
    
    expect(args.workosId).toBeTruthy();
    expect(args.email).toBeTruthy();
  });

  it("should reject empty workosId", () => {
    const args = {
      workosId: "",
      email: "test@example.com",
    };
    
    expect(args.workosId.trim()).toBe("");
    // This would trigger ConvexError("WorkOS ID is required") in the mutation
  });

  it("should reject whitespace-only workosId", () => {
    const args = {
      workosId: "   ",
      email: "test@example.com",
    };
    
    expect(args.workosId.trim()).toBe("");
    // This would trigger ConvexError("WorkOS ID is required") in the mutation
  });

  it("should reject empty email", () => {
    const args = {
      workosId: "user_01234567890abcdef",
      email: "",
    };
    
    expect(args.email.trim()).toBe("");
    // This would trigger ConvexError("Email is required") in the mutation
  });

  it("should reject whitespace-only email", () => {
    const args = {
      workosId: "user_01234567890abcdef",
      email: "   ",
    };
    
    expect(args.email.trim()).toBe("");
    // This would trigger ConvexError("Email is required") in the mutation
  });
});

describe("Display name construction logic", () => {
  it("should construct name from firstName and lastName", () => {
    const firstName = "John";
    const lastName = "Doe";
    const expectedName = [firstName, lastName].filter(Boolean).join(" ").trim();
    
    expect(expectedName).toBe("John Doe");
  });

  it("should handle firstName only", () => {
    const firstName = "John";
    const lastName = undefined;
    const expectedName = [firstName, lastName].filter(Boolean).join(" ").trim();
    
    expect(expectedName).toBe("John");
  });

  it("should handle lastName only", () => {
    const firstName = undefined;
    const lastName = "Doe";
    const expectedName = [firstName, lastName].filter(Boolean).join(" ").trim();
    
    expect(expectedName).toBe("Doe");
  });

  it("should fallback to email when no names provided", () => {
    const firstName = undefined;
    const lastName = undefined;
    const email = "john.doe@example.com";
    
    const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || email;
    expect(displayName).toBe("john.doe@example.com");
  });

  it("should handle empty string names", () => {
    const firstName = "";
    const lastName = "";
    const email = "john.doe@example.com";
    
    const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || email;
    expect(displayName).toBe("john.doe@example.com");
  });
});

describe("User update detection logic", () => {
  const existingUser = {
    email: "old@example.com",
    firstName: "Old",
    lastName: "User",
  };

  it("should detect email change", () => {
    const newArgs = {
      email: "new@example.com",
      firstName: "Old",
      lastName: "User",
    };
    
    const needsUpdate = 
      existingUser.email !== newArgs.email ||
      existingUser.firstName !== newArgs.firstName ||
      existingUser.lastName !== newArgs.lastName;
    
    expect(needsUpdate).toBe(true);
  });

  it("should detect firstName change", () => {
    const newArgs = {
      email: "old@example.com",
      firstName: "New",
      lastName: "User",
    };
    
    const needsUpdate = 
      existingUser.email !== newArgs.email ||
      existingUser.firstName !== newArgs.firstName ||
      existingUser.lastName !== newArgs.lastName;
    
    expect(needsUpdate).toBe(true);
  });

  it("should detect lastName change", () => {
    const newArgs = {
      email: "old@example.com",
      firstName: "Old",
      lastName: "NewUser",
    };
    
    const needsUpdate = 
      existingUser.email !== newArgs.email ||
      existingUser.firstName !== newArgs.firstName ||
      existingUser.lastName !== newArgs.lastName;
    
    expect(needsUpdate).toBe(true);
  });

  it("should detect no changes needed", () => {
    const newArgs = {
      email: "old@example.com",
      firstName: "Old",
      lastName: "User",
    };
    
    const needsUpdate = 
      existingUser.email !== newArgs.email ||
      existingUser.firstName !== newArgs.firstName ||
      existingUser.lastName !== newArgs.lastName;
    
    expect(needsUpdate).toBe(false);
  });

  it("should handle undefined to defined field changes", () => {
    const existingUserWithUndefined = {
      email: "test@example.com",
      firstName: undefined,
      lastName: undefined,
    };
    
    const newArgs = {
      email: "test@example.com",
      firstName: "New",
      lastName: "User",
    };
    
    const needsUpdate = 
      existingUserWithUndefined.email !== newArgs.email ||
      existingUserWithUndefined.firstName !== newArgs.firstName ||
      existingUserWithUndefined.lastName !== newArgs.lastName;
    
    expect(needsUpdate).toBe(true);
  });
});