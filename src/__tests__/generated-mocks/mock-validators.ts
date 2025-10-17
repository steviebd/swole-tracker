// Mock validation utilities
// Generated on 2025-10-16T03:15:50.035Z

export class MockValidator {
  static validateDatabaseMock(mock: Record<string, unknown>) {
    const required = ["select", "insert", "update", "delete"];
    const missing = required.filter(
      (method) => typeof mock[method] !== "function",
    );

    if (missing.length > 0) {
      throw new Error(
        "Database mock missing methods: " + missing.join(", "),
      );
    }

    return true;
  }

  static validateAPIMock(mock: Record<string, unknown>) {
    const required = ["get", "post", "put", "delete"];
    const missing = required.filter(
      (method) => typeof mock[method] !== "function",
    );

    if (missing.length > 0) {
      throw new Error("API mock missing methods: " + missing.join(", "));
    }

    return true;
  }

  static validateTestData(
    data: Record<string, unknown>,
    schema: Record<string, string>,
  ) {
    // Basic schema validation
    for (const [key, type] of Object.entries(schema)) {
      if (data[key] === undefined) {
        throw new Error("Test data missing required field: " + key);
      }

      if (typeof data[key] !== type) {
        throw new Error(
          "Test data field " +
            key +
            " has wrong type. Expected " +
            type +
            ", got " +
            typeof data[key],
        );
      }
    }

    return true;
  }
}

export const MOCK_VERSION = "1.0.0";
export const validateMockVersion = (version: string) => {
  if (version !== MOCK_VERSION) {
    throw new Error(
      "Mock version mismatch. Expected " + MOCK_VERSION + ", got " + version,
    );
  }
};
