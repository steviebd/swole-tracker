import { describe, it, expect } from "vitest";
import {
  idSchema,
  userIdSchema,
  paginationSchema,
  dateRangeSchema,
  booleanFlagSchema,
  sortSchema,
  unitPreferenceSchema,
  updatePreferencesInput,
  type UpdatePreferencesInput,
} from "~/server/api/schemas/common";

describe("idSchema", () => {
  it("should accept valid string IDs", () => {
    expect(() => idSchema.parse("123")).not.toThrow();
    expect(() => idSchema.parse("abc")).not.toThrow();
    expect(idSchema.parse("test-id")).toBe("test-id");
  });

  it("should accept valid number IDs", () => {
    expect(() => idSchema.parse(123)).not.toThrow();
    expect(() => idSchema.parse(0)).not.toThrow();
    expect(idSchema.parse(456)).toBe(456);
  });

  it("should reject empty strings", () => {
    expect(() => idSchema.parse("")).toThrow();
  });

  it("should reject invalid types", () => {
    expect(() => idSchema.parse(null)).toThrow();
    expect(() => idSchema.parse(undefined)).toThrow();
    expect(() => idSchema.parse({})).toThrow();
  });
});

describe("userIdSchema", () => {
  it("should accept valid user IDs", () => {
    expect(() => userIdSchema.parse("user123")).not.toThrow();
    expect(() => userIdSchema.parse("abc")).not.toThrow();
    expect(userIdSchema.parse("test-user")).toBe("test-user");
  });

  it("should reject empty strings", () => {
    expect(() => userIdSchema.parse("")).toThrow();
    // Note: userIdSchema only checks for minimum length, not whitespace
    expect(userIdSchema.parse("   ")).toBe("   ");
  });

  it("should reject invalid types", () => {
    expect(() => userIdSchema.parse(null)).toThrow();
    expect(() => userIdSchema.parse(undefined)).toThrow();
    expect(() => userIdSchema.parse(123)).toThrow();
  });
});

describe("paginationSchema", () => {
  it("should accept valid pagination parameters", () => {
    const result = paginationSchema.parse({ limit: 10, cursor: "abc" });
    expect(result.limit).toBe(10);
    expect(result.cursor).toBe("abc");
  });

  it("should use default limit", () => {
    const result = paginationSchema.parse({});
    expect(result.limit).toBe(20);
  });

  it("should accept numeric cursor", () => {
    const result = paginationSchema.parse({ cursor: 123 });
    expect(result.cursor).toBe(123);
  });

  it("should reject invalid limits", () => {
    expect(() => paginationSchema.parse({ limit: 0 })).toThrow();
    expect(() => paginationSchema.parse({ limit: -1 })).toThrow();
    expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
    expect(() => paginationSchema.parse({ limit: "invalid" })).toThrow();
  });
});

describe("dateRangeSchema", () => {
  it("should accept valid date ranges", () => {
    const from = new Date("2024-01-01");
    const to = new Date("2024-01-31");
    const result = dateRangeSchema.parse({ from, to });
    expect(result.from).toEqual(from);
    expect(result.to).toEqual(to);
  });

  it("should coerce string dates", () => {
    const result = dateRangeSchema.parse({
      from: "2024-01-01",
      to: "2024-01-31",
    });
    expect(result.from).toEqual(new Date("2024-01-01"));
    expect(result.to).toEqual(new Date("2024-01-31"));
  });

  it("should reject invalid date ranges", () => {
    const from = new Date("2024-01-31");
    const to = new Date("2024-01-01");
    expect(() => dateRangeSchema.parse({ from, to })).toThrow();
  });

  it("should reject invalid dates", () => {
    expect(() =>
      dateRangeSchema.parse({ from: "invalid", to: "2024-01-01" }),
    ).toThrow();
    expect(() =>
      dateRangeSchema.parse({ from: "2024-01-01", to: "invalid" }),
    ).toThrow();
  });
});

describe("booleanFlagSchema", () => {
  it("should coerce various values to boolean", () => {
    expect(booleanFlagSchema.parse(true)).toBe(true);
    expect(booleanFlagSchema.parse(false)).toBe(false);
    expect(booleanFlagSchema.parse("true")).toBe(true);
    expect(booleanFlagSchema.parse("false")).toBe(true); // z.coerce.boolean() treats any non-empty string as true
    expect(booleanFlagSchema.parse(1)).toBe(true);
    expect(booleanFlagSchema.parse(0)).toBe(false);
  });
});

describe("sortSchema", () => {
  it("should accept valid sort parameters", () => {
    const result = sortSchema.parse({ field: "createdAt", direction: "desc" });
    expect(result.field).toBe("createdAt");
    expect(result.direction).toBe("desc");
  });

  it("should use default direction", () => {
    const result = sortSchema.parse({ field: "name" });
    expect(result.field).toBe("name");
    expect(result.direction).toBe("desc");
  });

  it("should reject invalid directions", () => {
    expect(() =>
      sortSchema.parse({ field: "name", direction: "invalid" }),
    ).toThrow();
  });

  it("should accept empty field", () => {
    const result = sortSchema.parse({ field: "" });
    expect(result.field).toBe("");
    expect(result.direction).toBe("desc");
  });
});

describe("unitPreferenceSchema", () => {
  it("should accept valid units", () => {
    expect(unitPreferenceSchema.parse("kg")).toBe("kg");
    expect(unitPreferenceSchema.parse("lbs")).toBe("lbs");
  });

  it("should reject invalid units", () => {
    expect(() => unitPreferenceSchema.parse("grams")).toThrow();
    expect(() => unitPreferenceSchema.parse("pounds")).toThrow();
    expect(() => unitPreferenceSchema.parse("")).toThrow();
  });
});

describe("updatePreferencesInput", () => {
  it("should accept valid preferences", () => {
    const input: UpdatePreferencesInput = { unit: "kg" };
    const result = updatePreferencesInput.parse(input);
    expect(result.unit).toBe("kg");
  });

  it("should accept empty preferences", () => {
    const result = updatePreferencesInput.parse({});
    expect(result.unit).toBeUndefined();
  });

  it("should reject invalid units", () => {
    expect(() => updatePreferencesInput.parse({ unit: "invalid" })).toThrow();
  });
});
