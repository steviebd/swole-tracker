export function getThemePreference(): string {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // localStorage might not be available
  }

  return "system";
}