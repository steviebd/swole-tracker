export type ThemeMode = "system" | "light" | "dark" | "cool" | "warm" | "neutral";

export type ThemeVariant = "light" | "dark" | "cool" | "warm" | "neutral";

export interface ThemePreference {
  mode: ThemeMode;
  resolved: ThemeVariant;
}

export const THEME_STORAGE_KEY = "theme";
export const THEME_PREFERENCE_COOKIE = "theme-preference";

const THEME_MODES: ReadonlySet<ThemeMode> = new Set([
  "system",
  "light",
  "dark",
  "cool",
  "warm",
  "neutral",
]);

const THEME_VARIANTS: ReadonlySet<ThemeVariant> = new Set([
  "light",
  "dark",
  "cool",
  "warm",
  "neutral",
]);

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && THEME_MODES.has(value as ThemeMode);
}

function isThemeVariant(value: unknown): value is ThemeVariant {
  return typeof value === "string" && THEME_VARIANTS.has(value as ThemeVariant);
}

export function parseThemeCookie(value?: string | null): ThemePreference | null {
  if (!value) return null;

  try {
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed === "object") {
      const mode = (parsed as Record<string, unknown>).mode;
      const resolved = (parsed as Record<string, unknown>).resolved;
      if (isThemeMode(mode) && isThemeVariant(resolved)) {
        return { mode, resolved };
      }
    }
  } catch {
    // fall through to legacy string handling
  }

  if (isThemeMode(value)) {
    const fallback: ThemeVariant =
      value === "system" ? "light" : (value as ThemeVariant);
    return { mode: value, resolved: fallback };
  }

  return null;
}

export function serializeThemeCookie(preference: ThemePreference): string {
  return encodeURIComponent(JSON.stringify(preference));
}

export function readThemeCookieFromDocument(): ThemePreference | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split(";").map((part) => part.trim());
  const themeCookie = raw.find((chunk) =>
    chunk.startsWith(`${THEME_PREFERENCE_COOKIE}=`),
  );
  if (!themeCookie) return null;
  const value = themeCookie.slice(THEME_PREFERENCE_COOKIE.length + 1);
  return parseThemeCookie(value);
}

export function persistThemePreference(preference: ThemePreference) {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  const serialized = serializeThemeCookie(preference);
  const segments = [
    `${THEME_PREFERENCE_COOKIE}=${serialized}`,
    "Path=/",
    `Max-Age=${oneYear}`,
    "SameSite=Lax",
  ];

  try {
    document.cookie = segments.join("; ");
  } catch {
    // Ignore persistence errors, e.g. blocked cookies
  }
}
