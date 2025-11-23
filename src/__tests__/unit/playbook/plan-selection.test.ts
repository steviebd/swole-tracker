import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  playbookCreateInputSchema,
  activePlanTypeSchema,
  type PlaybookCreateInput,
} from "~/server/api/schemas/playbook";

// Mock environment variables
vi.mock("~/env", () => ({
  env: {
    AI_DEBRIEF_MODEL: "gpt-4",
    AI_DEBRIEF_TEMPERATURE: "0.7",
  },
}));

// Mock logger
vi.mock("~/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the playbook generation prompt
vi.mock("~/lib/ai-prompts/playbook-generation", () => ({
  buildPlaybookGenerationPrompt: vi.fn(() => ({
    system: "You are a fitness expert AI.",
    prompt: "Generate a workout plan.",
  })),
}));

describe("Playbook Plan Selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("playbookCreateInputSchema", () => {
    it("should validate input with algorithmic plan only", () => {
      const input: PlaybookCreateInput = {
        name: "Test Playbook",
        targetType: "template",
        targetIds: [1, 2, 3],
        duration: 6,
        selectedPlans: {
          algorithmic: true,
          ai: false,
        },
      };

      const result = playbookCreateInputSchema.parse(input);
      expect(result).toEqual(input);
      expect(result.selectedPlans.algorithmic).toBe(true);
      expect(result.selectedPlans.ai).toBe(false);
    });

    it("should validate input with both plans", () => {
      const input: PlaybookCreateInput = {
        name: "Test Playbook",
        targetType: "template",
        targetIds: [1, 2, 3],
        duration: 6,
        selectedPlans: {
          algorithmic: true,
          ai: true,
        },
      };

      const result = playbookCreateInputSchema.parse(input);
      expect(result).toEqual(input);
    });

    it("should require at least one plan to be selected", () => {
      const input = {
        name: "Test Playbook",
        targetType: "template",
        targetIds: [1, 2, 3],
        duration: 6,
        selectedPlans: {
          algorithmic: false,
          ai: false,
        },
      };

      expect(() => playbookCreateInputSchema.parse(input)).toThrow();
    });

    it("should allow AI plan to be optional", () => {
      const input: PlaybookCreateInput = {
        name: "Test Playbook",
        targetType: "template",
        targetIds: [1, 2, 3],
        duration: 6,
        selectedPlans: {
          algorithmic: true,
          ai: false,
        },
      };

      const result = playbookCreateInputSchema.parse(input);
      expect(result.selectedPlans.ai).toBe(false);
    });
  });

  describe("activePlanTypeSchema", () => {
    it("should validate 'ai' as a valid plan type", () => {
      const result = activePlanTypeSchema.parse("ai");
      expect(result).toBe("ai");
    });

    it("should validate 'algorithmic' as a valid plan type", () => {
      const result = activePlanTypeSchema.parse("algorithmic");
      expect(result).toBe("algorithmic");
    });

    it("should reject invalid plan types", () => {
      expect(() => activePlanTypeSchema.parse("invalid")).toThrow();
      expect(() => activePlanTypeSchema.parse("AI")).toThrow();
      expect(() => activePlanTypeSchema.parse("ALGORITHMIC")).toThrow();
    });
  });

  describe("Plan Selection Logic", () => {
    it("should validate that at least one plan is selected", () => {
      const invalidInputs = [
        {
          selectedPlans: {
            algorithmic: false,
            ai: false,
          },
        },
      ];

      invalidInputs.forEach((input, index) => {
        expect(() =>
          playbookCreateInputSchema.parse({
            name: "Test",
            targetType: "template",
            targetIds: [1],
            duration: 6,
            ...input,
          }),
        ).toThrow();
      });
    });

    it("should allow AI plan to be optional", () => {
      const validInputs = [
        {
          selectedPlans: {
            algorithmic: true,
            ai: false,
          },
        },
        {
          selectedPlans: {
            algorithmic: true,
            ai: true,
          },
        },
      ];

      validInputs.forEach((input) => {
        expect(() =>
          playbookCreateInputSchema.parse({
            name: "Test",
            targetType: "template",
            targetIds: [1],
            duration: 6,
            ...input,
          }),
        ).not.toThrow();
      });
    });
  });
});
