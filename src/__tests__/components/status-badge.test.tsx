import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge, getReadinessStatus, getReadinessClass } from "~/components/ui/status-badge";
import { getStatusClasses, getReadinessStatus as getThemeReadinessStatus } from "~/lib/theme-helpers";

describe("StatusBadge", () => {
  it("renders success status correctly", () => {
    render(<StatusBadge status="success">Success Message</StatusBadge>);
    const badge = screen.getByText("Success Message");
    
    expect(badge).toHaveClass("bg-status-success");
    expect(badge).toHaveClass("text-onTertiary");
    expect(badge).toHaveClass("rounded-full");
    expect(badge).toHaveClass("px-2");
    expect(badge).toHaveClass("py-1");
    expect(badge).toHaveClass("text-xs");
    expect(badge).toHaveClass("font-medium");
  });

  it("renders warning status correctly", () => {
    render(<StatusBadge status="warning">Warning Message</StatusBadge>);
    const badge = screen.getByText("Warning Message");
    
    expect(badge).toHaveClass("bg-status-warning");
    expect(badge).toHaveClass("text-onSecondary");
  });

  it("renders error status correctly", () => {
    render(<StatusBadge status="error">Error Message</StatusBadge>);
    const badge = screen.getByText("Error Message");
    
    expect(badge).toHaveClass("bg-status-danger");
    expect(badge).toHaveClass("text-onError");
  });

  it("applies custom className", () => {
    render(<StatusBadge status="success" className="custom-class">Message</StatusBadge>);
    const badge = screen.getByText("Message");
    
    expect(badge).toHaveClass("custom-class");
  });
});

describe("Theme Helpers", () => {
  describe("getReadinessStatus", () => {
    it("returns success for high readiness", () => {
      expect(getReadinessStatus(0.8)).toBe("success");
      expect(getReadinessStatus(0.71)).toBe("success");
    });

    it("returns warning for medium readiness", () => {
      expect(getReadinessStatus(0.5)).toBe("warning");
      expect(getReadinessStatus(0.41)).toBe("warning");
    });

    it("returns error for low readiness", () => {
      expect(getReadinessStatus(0.3)).toBe("error");
      expect(getReadinessStatus(0.39)).toBe("error");
    });

    it("handles edge cases", () => {
      expect(getReadinessStatus(1.0)).toBe("success");
      expect(getReadinessStatus(0.7)).toBe("success");
      expect(getReadinessStatus(0.4)).toBe("warning");
      expect(getReadinessStatus(0.0)).toBe("error");
    });
  });

  describe("getStatusClasses", () => {
    it("returns correct classes for success status", () => {
      const classes = getStatusClasses("success");
      
      expect(classes.bg).toBe("bg-status-success");
      expect(classes.text).toBe("text-onTertiary");
      expect(classes.border).toBe("border-status-success");
    });

    it("returns correct classes for warning status", () => {
      const classes = getStatusClasses("warning");
      
      expect(classes.bg).toBe("bg-status-warning");
      expect(classes.text).toBe("text-onSecondary");
      expect(classes.border).toBe("border-status-warning");
    });

    it("returns correct classes for error status", () => {
      const classes = getStatusClasses("error");
      
      expect(classes.bg).toBe("bg-status-danger");
      expect(classes.text).toBe("text-onError");
      expect(classes.border).toBe("border-status-danger");
    });
  });

  describe("getReadinessClass", () => {
    it("returns combined classes for high readiness", () => {
      const classes = getReadinessClass(0.8);
      
      expect(classes).toBe("bg-status-success text-onTertiary");
    });

    it("returns combined classes for medium readiness", () => {
      const classes = getReadinessClass(0.5);
      
      expect(classes).toBe("bg-status-warning text-onSecondary");
    });

    it("returns combined classes for low readiness", () => {
      const classes = getReadinessClass(0.3);
      
      expect(classes).toBe("bg-status-danger text-onError");
    });
  });
});

describe("Theme Integration Consistency", () => {
  it("maintains consistency between StatusBadge and theme helpers", () => {
    const readiness = 0.6;
    const status = getReadinessStatus(readiness);
    
    // Test that both approaches return the same status
    expect(getReadinessStatus(readiness)).toBe(getThemeReadinessStatus(readiness));
    
    // Test that StatusBadge would use the same classes as direct helper
    const expectedClasses = getReadinessClass(readiness);
    const statusClasses = getStatusClasses(status);
    
    expect(expectedClasses).toContain(statusClasses.bg);
    expect(expectedClasses).toContain(statusClasses.text);
  });
});