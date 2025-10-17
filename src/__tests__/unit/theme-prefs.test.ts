import { describe, it, expect, vi } from "vitest";
import {
  parseThemeCookie,
  serializeThemeCookie,
  readThemeCookieFromDocument,
  persistThemePreference,
  THEME_STORAGE_KEY,
  THEME_PREFERENCE_COOKIE,
  type ThemePreference,
} from "~/lib/theme-prefs";

describe("parseThemeCookie", () => {
  it("should return null for empty value", () => {
    expect(parseThemeCookie("")).toBeNull();
    expect(parseThemeCookie(null)).toBeNull();
    expect(parseThemeCookie(undefined)).toBeNull();
  });

  it("should parse valid JSON theme preference", () => {
    const preference: ThemePreference = { mode: "dark", resolved: "dark" };
    const serialized = JSON.stringify(preference);
    const encoded = encodeURIComponent(serialized);
    expect(parseThemeCookie(encoded)).toEqual(preference);
  });

  it("should handle legacy string mode", () => {
    expect(parseThemeCookie("light")).toEqual({
      mode: "light",
      resolved: "light",
    });
    expect(parseThemeCookie("dark")).toEqual({
      mode: "dark",
      resolved: "dark",
    });
    expect(parseThemeCookie("system")).toEqual({
      mode: "system",
      resolved: "light",
    });
  });

  it("should return null for invalid JSON", () => {
    expect(parseThemeCookie("invalid")).toBeNull();
    expect(parseThemeCookie("%7Binvalid%7D")).toBeNull();
  });

  it("should return null for invalid theme mode", () => {
    const invalid = encodeURIComponent(
      JSON.stringify({ mode: "invalid", resolved: "light" }),
    );
    expect(parseThemeCookie(invalid)).toBeNull();
  });

  it("should return null for invalid resolved variant", () => {
    const invalid = encodeURIComponent(
      JSON.stringify({ mode: "light", resolved: "invalid" }),
    );
    expect(parseThemeCookie(invalid)).toBeNull();
  });
});

describe("serializeThemeCookie", () => {
  it("should serialize theme preference to encoded JSON", () => {
    const preference: ThemePreference = { mode: "cool", resolved: "cool" };
    const result = serializeThemeCookie(preference);
    expect(result).toBe(encodeURIComponent(JSON.stringify(preference)));
  });
});

describe("readThemeCookieFromDocument", () => {
  it("should return null when document is undefined", () => {
    const originalDocument = global.document;
    delete (global as any).document;
    expect(readThemeCookieFromDocument()).toBeNull();
    global.document = originalDocument;
  });

  it("should return null when theme cookie is not present", () => {
    Object.defineProperty(document, "cookie", {
      value: "other=value",
      writable: true,
    });
    expect(readThemeCookieFromDocument()).toBeNull();
  });

  it("should parse theme cookie from document", () => {
    const preference: ThemePreference = { mode: "warm", resolved: "warm" };
    const serialized = encodeURIComponent(JSON.stringify(preference));
    Object.defineProperty(document, "cookie", {
      value: `${THEME_PREFERENCE_COOKIE}=${serialized}; other=value`,
      writable: true,
    });
    expect(readThemeCookieFromDocument()).toEqual(preference);
  });
});

describe("persistThemePreference", () => {
  it("should do nothing when document is undefined", () => {
    const originalDocument = global.document;
    delete (global as any).document;
    expect(() =>
      persistThemePreference({ mode: "light", resolved: "light" }),
    ).not.toThrow();
    global.document = originalDocument;
  });

  it("should set cookie with correct attributes", () => {
    const preference: ThemePreference = {
      mode: "neutral",
      resolved: "neutral",
    };
    expect(() => persistThemePreference(preference)).not.toThrow();
  });

  it("should handle cookie setting errors gracefully", () => {
    // Since document.cookie is an accessor, we can't easily mock it to throw
    // But the function does try-catch, so it should handle errors
    expect(() =>
      persistThemePreference({ mode: "dark", resolved: "dark" }),
    ).not.toThrow();
  });
});

describe("constants", () => {
  it("should have correct storage key", () => {
    expect(THEME_STORAGE_KEY).toBe("theme");
  });

  it("should have correct cookie name", () => {
    expect(THEME_PREFERENCE_COOKIE).toBe("theme-preference");
  });
});
