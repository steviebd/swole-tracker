import { describe, it, expect, vi } from "vitest";

// Test the moveSet function directly to verify no auto-save behavior
describe("Move Set - No Auto-Save Bug Fix", () => {
  it("should verify that moveSet function no longer contains enqueue call", () => {
    // Read the source file and verify the auto-save code was removed
    const fs = require("fs");
    const path = require("path");
    
    const hookPath = path.join(process.cwd(), "src/hooks/useWorkoutSessionState.ts");
    const hookContent = fs.readFileSync(hookPath, "utf-8");
    
    // Verify that the auto-save code is NOT present
    expect(hookContent).not.toContain("enqueue(savePayload)");
    expect(hookContent).not.toContain("Enqueuing save after move");
    expect(hookContent).not.toContain("Trigger auto-save after move");
    
    // Verify that the moveSet function still exists and has proper structure
    expect(hookContent).toContain("const moveSet = (");
    expect(hookContent).toContain("exerciseIndex: number");
    expect(hookContent).toContain("setIndex: number");
    expect(hookContent).toContain("direction: \"up\" | \"down\"");
    
    // Verify that undo functionality is still present
    expect(hookContent).toContain("setLastAction");
    expect(hookContent).toContain("editSetFields");
  });

  it("should verify moveSet function structure is intact", () => {
    const fs = require("fs");
    const path = require("path");
    
    const hookPath = path.join(process.cwd(), "src/hooks/useWorkoutSessionState.ts");
    const hookContent = fs.readFileSync(hookPath, "utf-8");
    
    // Find the moveSet function
    const moveSetMatch = hookContent.match(/const moveSet = \([\s\S]*?\n  };/);
    expect(moveSetMatch).toBeTruthy();
    
    const moveSetFunction = moveSetMatch![0];
    
    // Verify key components are present
    expect(moveSetFunction).toContain("reorderInProgressRef.current");
    expect(moveSetFunction).toContain("setExercises((prev)");
    expect(moveSetFunction).toContain("newIndex = direction === \"up\"");
    expect(moveSetFunction).toContain("setLastAction");
    
    // Verify auto-save components are NOT present
    expect(moveSetFunction).not.toContain("enqueue(");
    expect(moveSetFunction).not.toContain("savePayload");
  });
});
