import { describe, expect, it } from "vitest";

import {
  getSemanticTokens,
  materialSchemes,
  materialThemes,
  surfaceTokens,
  type ThemeId,
} from "~/lib/design-tokens";

const REQUIRED_SCHEME_KEYS = [
  "primary",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "secondary",
  "onSecondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "tertiary",
  "onTertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
  "error",
  "onError",
  "errorContainer",
  "onErrorContainer",
  "background",
  "onBackground",
  "surface",
  "onSurface",
  "surfaceVariant",
  "onSurfaceVariant",
  "outline",
  "outlineVariant",
  "inverseSurface",
  "inverseOnSurface",
  "inversePrimary",
  "surfaceTint",
] as const;

const REQUIRED_SURFACE_KEYS = [
  "surface",
  "surfaceDim",
  "surfaceBright",
  "surfaceContainerLowest",
  "surfaceContainerLow",
  "surfaceContainer",
  "surfaceContainerHigh",
  "surfaceContainerHighest",
  "surfaceVariant",
  "surfaceInverse",
  "outline",
  "outlineVariant",
  "surfaceTint",
] as const;

describe("material design tokens", () => {
  const themeIds: ThemeId[] = ["light", "dark", "cool", "warm", "neutral"];

  it("exposes schemes for each theme and appearance", () => {
    themeIds.forEach((themeId) => {
      const schemes = materialSchemes[themeId];
      expect(schemes.light, `${themeId} light scheme missing`).toBeDefined();
      expect(schemes.dark, `${themeId} dark scheme missing`).toBeDefined();
    });
  });

  it("provides required Material 3 roles", () => {
    themeIds.forEach((themeId) => {
      const tokens = getSemanticTokens(themeId);
      REQUIRED_SCHEME_KEYS.forEach((key) => {
        expect(tokens.scheme[key], `${themeId} missing ${key}`).toBeTruthy();
      });
      REQUIRED_SURFACE_KEYS.forEach((key) => {
        expect(tokens.surfaces[key], `${themeId} missing surface token ${key}`).toBeTruthy();
      });
    });
  });

  it("keeps tonal palettes aligned with generated payload", () => {
    themeIds.forEach((themeId) => {
      const theme = materialThemes[themeId];
      expect(theme.palettes.primary, `${themeId} primary palette missing`).toBeDefined();
      expect(Object.keys(theme.palettes.primary).length).toBeGreaterThan(0);
    });
  });

  it("precomputes surface sets for snapshot previews", () => {
    themeIds.forEach((themeId) => {
      expect(surfaceTokens[themeId].light, `${themeId} surface light missing`).toBeDefined();
      expect(surfaceTokens[themeId].dark, `${themeId} surface dark missing`).toBeDefined();
    });
  });
});
