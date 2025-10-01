import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Tone = 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 95 | 99 | 100;

const TONAL_VALUES: Tone[] = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];

const LIGHTNESS_MAP: Record<Tone, number> = {
  0: 0,
  10: 0.12,
  20: 0.2,
  30: 0.32,
  40: 0.42,
  50: 0.5,
  60: 0.6,
  70: 0.72,
  80: 0.82,
  90: 0.9,
  95: 0.96,
  99: 0.985,
  100: 1,
};

type PaletteName = 'primary' | 'secondary' | 'tertiary' | 'neutral' | 'neutralVariant' | 'error';

type BasePaletteConfig = {
  color: string;
  saturation?: number;
};

type ThemeId = 'light' | 'dark' | 'cool' | 'warm' | 'neutral';

type PaletteConfigMap = Record<PaletteName, BasePaletteConfig>;

type ThemeConfig = Record<ThemeId, PaletteConfigMap>;

const BASE_CONFIG: ThemeConfig = {
  light: {
    primary: { color: '#f97316' },
    secondary: { color: '#2563eb' },
    tertiary: { color: '#22c55e' },
    neutral: { color: '#6b7280', saturation: 0.08 },
    neutralVariant: { color: '#7f5b45', saturation: 0.12 },
    error: { color: '#dc2626' },
  },
  dark: {
    primary: { color: '#ff8a4c' },
    secondary: { color: '#22d3ee' },
    tertiary: { color: '#a855f7' },
    neutral: { color: '#1f2937', saturation: 0.06 },
    neutralVariant: { color: '#324152', saturation: 0.1 },
    error: { color: '#f87171' },
  },
  cool: {
    primary: { color: '#ff7d50' },
    secondary: { color: '#38bdf8' },
    tertiary: { color: '#60a5fa' },
    neutral: { color: '#1c1f2a', saturation: 0.08 },
    neutralVariant: { color: '#2f3340', saturation: 0.12 },
    error: { color: '#f87171' },
  },
  warm: {
    primary: { color: '#c26d27' },
    secondary: { color: '#9d4edd' },
    tertiary: { color: '#d97706' },
    neutral: { color: '#594437', saturation: 0.12 },
    neutralVariant: { color: '#6e5243', saturation: 0.16 },
    error: { color: '#e4584b' },
  },
  neutral: {
    primary: { color: '#4b5563' },
    secondary: { color: '#6366f1' },
    tertiary: { color: '#14b8a6' },
    neutral: { color: '#4b5563', saturation: 0.05 },
    neutralVariant: { color: '#4f5964', saturation: 0.08 },
    error: { color: '#d32f2f' },
  },
};

type TonalPalette = Record<Tone, string>;
type ThemePalettes = Record<PaletteName, TonalPalette>;

type SchemeTemplateEntry = [PaletteName, Tone];
type SchemeTemplate = Record<string, SchemeTemplateEntry>;

type ThemeSchemes = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

const LIGHT_SCHEME_TEMPLATE: SchemeTemplate = {
  primary: ['primary', 40],
  onPrimary: ['primary', 100],
  primaryContainer: ['primary', 90],
  onPrimaryContainer: ['primary', 10],
  secondary: ['secondary', 40],
  onSecondary: ['secondary', 100],
  secondaryContainer: ['secondary', 90],
  onSecondaryContainer: ['secondary', 10],
  tertiary: ['tertiary', 40],
  onTertiary: ['tertiary', 100],
  tertiaryContainer: ['tertiary', 90],
  onTertiaryContainer: ['tertiary', 10],
  error: ['error', 40],
  onError: ['error', 100],
  errorContainer: ['error', 90],
  onErrorContainer: ['error', 10],
  background: ['neutral', 99],
  onBackground: ['neutral', 10],
  surface: ['neutral', 99],
  onSurface: ['neutral', 10],
  surfaceVariant: ['neutralVariant', 90],
  onSurfaceVariant: ['neutralVariant', 30],
  outline: ['neutralVariant', 50],
  outlineVariant: ['neutralVariant', 80],
  shadow: ['neutral', 0],
  scrim: ['neutral', 0],
  inverseSurface: ['neutral', 20],
  inverseOnSurface: ['neutral', 95],
  inversePrimary: ['primary', 80],
  surfaceTint: ['primary', 40],
};

const DARK_SCHEME_TEMPLATE: SchemeTemplate = {
  primary: ['primary', 80],
  onPrimary: ['primary', 20],
  primaryContainer: ['primary', 30],
  onPrimaryContainer: ['primary', 90],
  secondary: ['secondary', 80],
  onSecondary: ['secondary', 20],
  secondaryContainer: ['secondary', 30],
  onSecondaryContainer: ['secondary', 90],
  tertiary: ['tertiary', 80],
  onTertiary: ['tertiary', 20],
  tertiaryContainer: ['tertiary', 30],
  onTertiaryContainer: ['tertiary', 90],
  error: ['error', 80],
  onError: ['error', 20],
  errorContainer: ['error', 30],
  onErrorContainer: ['error', 90],
  background: ['neutral', 10],
  onBackground: ['neutral', 90],
  surface: ['neutral', 10],
  onSurface: ['neutral', 90],
  surfaceVariant: ['neutralVariant', 30],
  onSurfaceVariant: ['neutralVariant', 80],
  outline: ['neutralVariant', 60],
  outlineVariant: ['neutralVariant', 30],
  shadow: ['neutral', 0],
  scrim: ['neutral', 0],
  inverseSurface: ['neutral', 90],
  inverseOnSurface: ['neutral', 10],
  inversePrimary: ['primary', 40],
  surfaceTint: ['primary', 80],
};

const __dirname = dirname(fileURLToPath(import.meta.url));

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

function hexToRgb(hex: string) {
  let normalized = hex.trim().replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const intVal = parseInt(normalized, 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const toHex = (component: number) => component.toString(16).padStart(2, '0');
  const red = Math.round(componentClamp(r));
  const green = Math.round(componentClamp(g));
  const blue = Math.round(componentClamp(b));
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function componentClamp(value: number) {
  return clamp(value, 0, 255);
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
      default:
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s, l };
}

function hslToRgb({ h, s, l }: { h: number; s: number; l: number }) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 1);
  const light = clamp(l, 0, 1);

  if (sat === 0) {
    const gray = light * 255;
    return { r: gray, g: gray, b: gray };
  }

  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;

  const hueToRgb = (t: number) => {
    let temp = t;
    if (temp < 0) temp += 1;
    if (temp > 1) temp -= 1;
    if (temp < 1 / 6) return p + (q - p) * 6 * temp;
    if (temp < 1 / 2) return q;
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
    return p;
  };

  const r = hueToRgb(hue / 360 + 1 / 3) * 255;
  const g = hueToRgb(hue / 360) * 255;
  const b = hueToRgb(hue / 360 - 1 / 3) * 255;

  return { r, g, b };
}

function generateTonalPalette(baseHex: string, config?: BasePaletteConfig): TonalPalette {
  const baseHsl = rgbToHsl(hexToRgb(baseHex));
  const saturation = clamp(config?.saturation ?? baseHsl.s, 0, 1);
  const palette = {} as TonalPalette;

  TONAL_VALUES.forEach((tone) => {
    if (tone === 0) {
      palette[tone] = '#000000';
      return;
    }
    if (tone === 100) {
      palette[tone] = '#ffffff';
      return;
    }
    const lightness = LIGHTNESS_MAP[tone];
    const adjustedSaturation = tone >= 90 ? saturation * 0.6 : saturation;
    const color = hslToRgb({ h: baseHsl.h, s: adjustedSaturation, l: lightness });
    palette[tone] = rgbToHex(color);
  });

  return palette;
}

function buildScheme(palettes: ThemePalettes, template: SchemeTemplate): Record<string, string> {
  return Object.fromEntries(
    Object.entries(template).map(([token, [paletteName, tone]]) => [token, palettes[paletteName][tone]])
  );
}

const themes = Object.fromEntries(
  Object.entries(BASE_CONFIG).map(([themeId, paletteConfig]) => {
    const palettes = Object.fromEntries(
      Object.entries(paletteConfig).map(([paletteName, config]) => [paletteName, generateTonalPalette(config.color, config)])
    ) as ThemePalettes;

    const schemes: ThemeSchemes = {
      light: buildScheme(palettes, LIGHT_SCHEME_TEMPLATE),
      dark: buildScheme(palettes, DARK_SCHEME_TEMPLATE),
    };

    return [themeId, { palettes, schemes, base: paletteConfig }];
  })
);

const outputPath = resolve(__dirname, '../src/design-tokens/material3-palettes.generated.json');
mkdirSync(dirname(outputPath), { recursive: true });

const payload = {
  generatedAt: new Date().toISOString(),
  tones: TONAL_VALUES,
  themes,
};

writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
console.log(`Material 3 palettes written to ${outputPath}`);
