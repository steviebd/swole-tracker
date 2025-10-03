import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type SchemeKind = 'light' | 'dark';
type ThemeId = 'light' | 'dark' | 'cool' | 'warm' | 'neutral';

type MaterialTheme = {
  palettes: Record<string, Record<string, string>>;
  schemes: Record<SchemeKind, Record<string, string>>;
};

type MaterialPayload = {
  tones: number[];
  themes: Record<ThemeId, MaterialTheme>;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_PATH = resolve(__dirname, '../src/design-tokens/material3-palettes.generated.json');
const OUTPUT_PATH = resolve(__dirname, '../src/styles/material3-tokens.css');

const PRESET_SELECTORS: Record<ThemeId, { selectors: string[]; scheme: SchemeKind }> = {
  light: { selectors: [':root', '[data-theme="light"]'], scheme: 'light' },
  dark: { selectors: ['.dark', '[data-theme="dark"]'], scheme: 'dark' },
  cool: { selectors: ['[data-theme="cool"]'], scheme: 'dark' },
  warm: { selectors: ['[data-theme="warm"]'], scheme: 'light' },
  neutral: { selectors: ['[data-theme="neutral"]'], scheme: 'light' },
};

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const toHex = (component: number) => Math.round(component).toString(16).padStart(2, '0');
  return `#${toHex(Math.min(Math.max(r, 0), 255))}${toHex(Math.min(Math.max(g, 0), 255))}${toHex(Math.min(Math.max(b, 0), 255))}`;
}

function mixColors(colorA: string, colorB: string, amount: number) {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  const mix = (channelA: number, channelB: number) => channelA + (channelB - channelA) * amount;
  return rgbToHex({
    r: mix(rgbA.r, rgbB.r),
    g: mix(rgbA.g, rgbB.g),
    b: mix(rgbA.b, rgbB.b),
  });
}

function buildSurfaceSet(theme: MaterialTheme, scheme: SchemeKind) {
  const neutral = theme.palettes.neutral;
  const baseSurface = theme.schemes[scheme].surface;
  const baseVariant = theme.schemes[scheme].surfaceVariant;
  const tone = (value: number) => neutral[String(value)] ?? baseSurface;

  if (scheme === 'light') {
    const surface99 = tone(99);
    const surface95 = tone(95) ?? mixColors(surface99, tone(90), 0.35);
    const surface90 = tone(90) ?? mixColors(surface95, tone(80), 0.35);

    return {
      surfaceDim: mixColors(surface90, surface99, 0.2),
      surfaceBright: mixColors(surface99, '#ffffff', 0.25),
      surfaceContainerLowest: tone(100) ?? '#ffffff',
      surfaceContainerLow: mixColors(surface95, tone(100), 0.35),
      surfaceContainer: mixColors(surface95, surface90, 0.5),
      surfaceContainerHigh: mixColors(surface90, surface95, 0.25),
      surfaceContainerHighest: mixColors(surface90, surface95, 0.1),
      surfaceVariant: theme.schemes[scheme].surfaceVariant,
      surface: surface99,
      surfaceInverse: theme.schemes[scheme].inverseSurface,
      surfaceTint: theme.schemes[scheme].surfaceTint,
      outline: theme.schemes[scheme].outline,
      outlineVariant: theme.schemes[scheme].outlineVariant ?? mixColors(baseVariant, surface99, 0.35),
    } as const;
  }

  const surface10 = tone(10) ?? baseSurface;
  const surface20 = tone(20) ?? mixColors(surface10, tone(30), 0.35);
  const surface4 = mixColors(surface10, '#000000', 0.65);

  return {
    surfaceDim: mixColors(surface10, surface20, 0.3),
    surfaceBright: mixColors(surface10, '#ffffff', 0.12),
    surfaceContainerLowest: surface4,
    surfaceContainerLow: mixColors(surface10, surface20, 0.55),
    surfaceContainer: mixColors(surface10, surface20, 0.7),
    surfaceContainerHigh: mixColors(surface10, surface20, 0.85),
    surfaceContainerHighest: mixColors(surface20, theme.schemes[scheme].surface, 0.4),
    surfaceVariant: theme.schemes[scheme].surfaceVariant,
    surface: surface10,
    surfaceInverse: theme.schemes[scheme].inverseSurface,
    surfaceTint: theme.schemes[scheme].surfaceTint,
    outline: theme.schemes[scheme].outline,
    outlineVariant: theme.schemes[scheme].outlineVariant ?? mixColors(baseVariant, surface10, 0.4),
  } as const;
}

function buildCompatibilityMappings(scheme: Record<string, string>, surfaces: ReturnType<typeof buildSurfaceSet>) {
  const backgroundGradient = `linear-gradient(135deg, ${surfaces.surface} 0%, color-mix(in srgb, ${surfaces.surface} 92%, ${surfaces.surfaceContainer} 8%) 60%, ${surfaces.surface} 100%)`;
  const actionGradient = `linear-gradient(135deg, ${scheme.primary} 0%, ${scheme.secondary} 100%)`;
  const statsGradient = `linear-gradient(135deg, ${scheme.primary} 0%, ${mixColors(scheme.primary, scheme.secondary, 0.5)} 100%)`;
  const successGradient = `linear-gradient(135deg, ${scheme.tertiary} 0%, ${mixColors(scheme.tertiary, '#059669', 0.4)} 100%)`;
  return {
    '--background': surfaces.surface,
    '--foreground': scheme.onSurface,
    '--card': surfaces.surfaceContainerHigh,
    '--card-foreground': scheme.onSurface,
    '--popover': surfaces.surfaceContainerHighest,
    '--popover-foreground': scheme.onSurface,
    '--muted': surfaces.surfaceContainer,
    '--muted-foreground': scheme.onSurfaceVariant,
    '--primary': scheme.primary,
    '--primary-foreground': scheme.onPrimary,
    '--secondary': scheme.secondary,
    '--secondary-foreground': scheme.onSecondary,
    '--tertiary': scheme.tertiary,
    '--tertiary-foreground': scheme.onTertiary,
    '--accent': scheme.secondary,
    '--accent-foreground': scheme.onSecondary,
    '--destructive': scheme.error,
    '--destructive-foreground': scheme.onError,
    '--border': surfaces.outlineVariant,
    '--input': surfaces.surfaceContainerHighest,
    '--ring': scheme.primary,
    '--color-text': scheme.onSurface,
    '--color-text-secondary': mixColors(scheme.onSurface, scheme.onSurfaceVariant, 0.5),
    '--color-text-muted': scheme.onSurfaceVariant,
    '--color-bg-surface': surfaces.surfaceContainer,
    '--color-success': scheme.tertiary,
    '--color-warning': scheme.secondary,
    '--color-danger': scheme.error,
    '--color-border-default': surfaces.outlineVariant,
    '--color-primary-default': scheme.primary,
    '--color-status-success-default': scheme.tertiary,
    '--color-status-danger-default': scheme.error,
    '--color-status-warning-default': scheme.secondary,
    '--color-text-primary': scheme.onSurface,
    '--sidebar': surfaces.surfaceContainerHigh,
    '--sidebar-foreground': scheme.onSurface,
    '--sidebar-primary': scheme.primary,
    '--sidebar-primary-foreground': scheme.onPrimary,
    '--sidebar-accent': scheme.secondary,
    '--sidebar-accent-foreground': scheme.onSecondary,
    '--sidebar-border': surfaces.outlineVariant,
    '--sidebar-ring': scheme.primary,
    '--chart-1': scheme.primary,
    '--chart-2': scheme.secondary,
    '--chart-3': scheme.tertiary,
    '--chart-4': mixColors(scheme.primary, scheme.secondary, 0.5),
    '--chart-5': mixColors(scheme.tertiary, scheme.onSurface, 0.4),
    '--card-heading': mixColors(scheme.onSurface, scheme.onSurfaceVariant, 0.3),
    '--background-gradient': backgroundGradient,
    '--gradient-universal-action-primary': actionGradient,
    '--gradient-universal-stats-orange': statsGradient,
    '--gradient-universal-success': successGradient,
    '--color-glass-highlight': `color-mix(in srgb, ${scheme.primary} 12%, transparent 88%)`,
    '--color-glass-accent': `color-mix(in srgb, ${scheme.secondary} 10%, transparent 90%)`,
    '--radius': '0.75rem',
    '--component-input-borderRadius': '0.375rem',
    '--component-input-padding-y': '0.5rem',
    '--component-input-padding-x': '0.75rem',
    '--component-input-fontSize': '0.875rem',
    '--motion-duration-base': '200ms',
    '--brand-google-blue': '#4285F4',
    '--brand-google-green': '#34A853',
    '--brand-google-yellow': '#FBBC05',
    '--brand-google-red': '#EA4335',
  } as Record<string, string>;
}

function buildStateLayerTokens(scheme: SchemeKind) {
  // Maintain Material 3 interaction recommendations
  return {
    '--md-sys-state-hover-opacity': scheme === 'light' ? '0.08' : '0.08',
    '--md-sys-state-focus-opacity': scheme === 'light' ? '0.12' : '0.12',
    '--md-sys-state-pressed-opacity': scheme === 'light' ? '0.12' : '0.12',
    '--md-sys-state-dragged-opacity': scheme === 'light' ? '0.16' : '0.16',
  } as Record<string, string>;
}

function buildThemeBlock(themeId: ThemeId, theme: MaterialTheme) {
  const preset = PRESET_SELECTORS[themeId];
  const scheme = theme.schemes[preset.scheme];
  const surfaces = buildSurfaceSet(theme, preset.scheme);
  const compatibility = buildCompatibilityMappings(scheme, surfaces);
  const stateLayers = buildStateLayerTokens(preset.scheme);

  const paletteEntries = Object.entries(theme.palettes).flatMap(([paletteName, tones]) =>
    Object.entries(tones).map(([tone, value]) => [`--md-ref-palette-${paletteName}-${tone}`, value])
  );

  const schemeEntries = Object.entries(scheme).map(([token, value]) => [`--md-sys-color-${token.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value]);

  const surfaceEntries = Object.entries(surfaces).map(([token, value]) => [`--md-sys-color-${token.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value]);

  const combined = [
    ...paletteEntries,
    ...schemeEntries,
    ...surfaceEntries,
    ...Object.entries(compatibility),
    ...Object.entries(stateLayers),
    ['--md-sys-elevation-level1', `color-mix(in srgb, ${surfaces.surface} 88%, ${scheme.primary} 12%)`],
    ['--md-sys-elevation-level2', `color-mix(in srgb, ${surfaces.surface} 80%, ${scheme.primary} 20%)`],
    ['--md-sys-elevation-level3', `color-mix(in srgb, ${surfaces.surface} 72%, ${scheme.primary} 28%)`],
    ['--md-sys-elevation-level4', `color-mix(in srgb, ${surfaces.surface} 65%, ${scheme.primary} 35%)`],
    ['--md-sys-elevation-level5', `color-mix(in srgb, ${surfaces.surface} 60%, ${scheme.primary} 40%)`],
  ];

  const properties = combined
    .map(([prop, value]) => `  ${prop}: ${value};`)
    .join('\n');

  return `${preset.selectors.join(',\n')} {\n${properties}\n}`;
}

function main() {
  const raw = readFileSync(INPUT_PATH, 'utf-8');
  const payload = JSON.parse(raw) as MaterialPayload;

  const blocks = Object.entries(payload.themes)
    .map(([themeId, theme]) => buildThemeBlock(themeId as ThemeId, theme))
    .join('\n\n');

  const header = `/*
 * Generated by scripts/build-material3-css.ts
 * Do not edit directly. Update material3-palettes.generated.json and re-run the script.
 */\n`;

  writeFileSync(OUTPUT_PATH, `${header}\n${blocks}\n`, 'utf-8');
  console.log(`Material 3 CSS tokens written to ${OUTPUT_PATH}`);
}

main();
