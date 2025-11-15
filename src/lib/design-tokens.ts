import material3Payload from "~/design-tokens/material3-palettes.generated.json" assert { type: "json" };

export type ThemeId = "light" | "dark" | "cool" | "warm" | "neutral";
export type SchemeKind = "light" | "dark";

type TonalPalette = Record<string, string>;
type MaterialTheme = {
  palettes: Record<string, TonalPalette>;
  schemes: Record<SchemeKind, Record<string, string>>;
};

type MaterialPayload = {
  tones: number[];
  themes: Record<ThemeId, MaterialTheme>;
};

const MATERIAL3 = material3Payload as MaterialPayload;

const DEFAULT_SCHEME: Record<ThemeId, SchemeKind> = {
  light: "light",
  dark: "dark",
  cool: "dark",
  warm: "light",
  neutral: "light",
};

const TAILWIND_TONE_MAP = {
  50: "99",
  100: "95",
  200: "90",
  300: "80",
  400: "70",
  500: "60",
  600: "50",
  700: "40",
  800: "30",
  900: "20",
  950: "10",
} as const;

type TailwindStep = keyof typeof TAILWIND_TONE_MAP;

type TailwindScale = Record<TailwindStep, string>;

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const toHex = (component: number) =>
    Math.round(component).toString(16).padStart(2, "0");
  return `#${toHex(Math.min(Math.max(r, 0), 255))}${toHex(Math.min(Math.max(g, 0), 255))}${toHex(Math.min(Math.max(b, 0), 255))}`;
}

function mixColors(colorA: string, colorB: string, amount: number) {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  const mixChannel = (channelA: number, channelB: number) =>
    channelA + (channelB - channelA) * amount;
  return rgbToHex({
    r: mixChannel(rgbA.r, rgbB.r),
    g: mixChannel(rgbA.g, rgbB.g),
    b: mixChannel(rgbA.b, rgbB.b),
  });
}

function buildTailwindScale(palette: TonalPalette): TailwindScale {
  return Object.fromEntries(
    Object.entries(TAILWIND_TONE_MAP).map(([step, tone]) => [
      Number(step) as TailwindStep,
      palette[tone] ?? palette["60"],
    ]),
  ) as TailwindScale;
}

function buildSurfaceSet(theme: MaterialTheme, schemeKind: SchemeKind) {
  const neutral = theme.palettes["neutral"]!;
  const scheme = theme.schemes[schemeKind]!;

  const tone = (value: number) => neutral[String(value)] ?? scheme["surface"]!;

  if (schemeKind === "light") {
    const surface99 = tone(99);
    const surface95 = tone(95) ?? mixColors(surface99!, tone(90)!, 0.35);
    const surface90 = tone(90) ?? mixColors(surface95!, tone(80)!, 0.35);

    return {
      surface: surface99,
      surfaceDim: mixColors(surface90, surface99, 0.2),
      surfaceBright: mixColors(surface99, neutral["100"]!, 0.25),
      surfaceContainerLowest: tone(100) ?? neutral["100"]!,
      surfaceContainerLow: mixColors(surface95, tone(100), 0.35),
      surfaceContainer: mixColors(surface95, surface90, 0.5),
      surfaceContainerHigh: mixColors(surface90, surface95, 0.25),
      surfaceContainerHighest: mixColors(surface90, surface95, 0.1),
      surfaceVariant: scheme["surfaceVariant"],
      surfaceInverse: scheme["inverseSurface"],
      outline: scheme["outline"],
      outlineVariant:
        scheme["outlineVariant"] ??
        mixColors(scheme["surfaceVariant"]!, surface99!, 0.35),
      surfaceTint: scheme["surfaceTint"],
    } as const;
  }

  const surface10 = tone(10) ?? scheme["surface"];
  const surface20 = tone(20) ?? mixColors(surface10, tone(30), 0.35);
  const surface4 = mixColors(surface10, neutral["0"]!, 0.65);

  return {
    surface: surface10,
    surfaceDim: mixColors(surface10, surface20, 0.3),
    surfaceBright: mixColors(surface10, neutral["100"]!, 0.12),
    surfaceContainerLowest: surface4,
    surfaceContainerLow: mixColors(surface10, surface20, 0.55),
    surfaceContainer: mixColors(surface10, surface20, 0.7),
    surfaceContainerHigh: mixColors(surface10, surface20, 0.85),
    surfaceContainerHighest: mixColors(surface20!, scheme["surface"]!, 0.4),
    surfaceVariant: scheme["surfaceVariant"],
    surfaceInverse: scheme["inverseSurface"],
    outline: scheme["outline"],
    outlineVariant:
      scheme["outlineVariant"] ??
      mixColors(scheme["surfaceVariant"]!, surface10!, 0.4),
    surfaceTint: scheme["surfaceTint"],
  } as const;
}

export const materialThemes = MATERIAL3.themes;

export const materialSchemes: Record<
  ThemeId,
  Record<SchemeKind, Record<string, string>>
> = Object.fromEntries(
  (Object.entries(materialThemes) as Array<[ThemeId, MaterialTheme]>).map(
    ([themeId, theme]) => [themeId, theme.schemes],
  ),
) as Record<ThemeId, Record<SchemeKind, Record<string, string>>>;

export const surfaceTokens: Record<
  ThemeId,
  Record<SchemeKind, ReturnType<typeof buildSurfaceSet>>
> = Object.fromEntries(
  (Object.entries(materialThemes) as Array<[ThemeId, MaterialTheme]>).map(
    ([themeId, theme]) => [
      themeId,
      {
        light: buildSurfaceSet(theme, "light"),
        dark: buildSurfaceSet(theme, "dark"),
      },
    ],
  ),
) as Record<ThemeId, Record<SchemeKind, ReturnType<typeof buildSurfaceSet>>>;

type SemanticTokenSet = {
  scheme: Record<string, string>;
  surfaces: ReturnType<typeof buildSurfaceSet>;
};

export function getSemanticTokens(
  themeId: ThemeId,
  schemeOverride?: SchemeKind,
): SemanticTokenSet {
  const theme = materialThemes[themeId];
  const schemeKind = schemeOverride ?? DEFAULT_SCHEME[themeId];
  return {
    scheme: theme.schemes[schemeKind],
    surfaces: surfaceTokens[themeId][schemeKind],
  };
}

export function getScheme(themeId: ThemeId, schemeKind: SchemeKind) {
  return materialSchemes[themeId][schemeKind];
}

const lightTheme = materialThemes.light;

export const colors = {
  primary: buildTailwindScale(lightTheme.palettes["primary"]!),
  secondary: buildTailwindScale(lightTheme.palettes["secondary"]!),
  accent: buildTailwindScale(lightTheme.palettes["tertiary"]!),
  neutral: buildTailwindScale(lightTheme.palettes["neutralVariant"]!),
  gray: buildTailwindScale(lightTheme.palettes["neutral"]!),
  success: {
    500: lightTheme.schemes.light["tertiary"]!,
    600: mixColors(
      lightTheme.schemes.light["tertiary"]!,
      lightTheme.schemes.light["surface"]!,
      0.3,
    ),
  },
  warning: {
    500: lightTheme.schemes.light["secondary"]!,
    600: mixColors(
      lightTheme.schemes.light["secondary"]!,
      lightTheme.schemes.light["primary"]!,
      0.35,
    ),
  },
  danger: {
    500: lightTheme.schemes.light["error"]!,
    600: mixColors(lightTheme.schemes.light["error"]!, "#8b1a1a", 0.35),
    dark: materialSchemes.dark.dark["error"]!,
  },
} as const;

export const typography = {
  fontFamily: {
    display: [
      "var(--font-montserrat)",
      "Montserrat",
      "ui-serif",
      "Georgia",
      "serif",
    ],
    heading: [
      "var(--font-montserrat)",
      "Montserrat",
      "ui-serif",
      "Georgia",
      "serif",
    ],
    body: [
      "var(--font-open-sans)",
      "Open Sans",
      "ui-sans-serif",
      "system-ui",
      "sans-serif",
    ],
    ui: [
      "var(--font-open-sans)",
      "Open Sans",
      "ui-sans-serif",
      "system-ui",
      "sans-serif",
    ],
  },
  fontSize: {
    "display-sm": ["2.25rem", { lineHeight: "2.5rem", fontWeight: "900" }],
    "display-md": ["3rem", { lineHeight: "3rem", fontWeight: "900" }],
    "display-lg": ["3.75rem", { lineHeight: "3.75rem", fontWeight: "900" }],
    "display-xl": ["4.5rem", { lineHeight: "4.5rem", fontWeight: "900" }],
    "heading-sm": ["1.25rem", { lineHeight: "1.75rem", fontWeight: "700" }],
    "heading-md": ["1.5rem", { lineHeight: "2rem", fontWeight: "700" }],
    "heading-lg": ["1.875rem", { lineHeight: "2.25rem", fontWeight: "700" }],
    "heading-xl": ["2.25rem", { lineHeight: "2.5rem", fontWeight: "700" }],
    "body-xs": ["0.75rem", { lineHeight: "1.125rem", fontWeight: "400" }],
    "body-sm": ["0.875rem", { lineHeight: "1.3125rem", fontWeight: "400" }],
    "body-md": ["1rem", { lineHeight: "1.5rem", fontWeight: "400" }],
    "body-lg": ["1.125rem", { lineHeight: "1.6875rem", fontWeight: "400" }],
    "ui-xs": ["0.75rem", { lineHeight: "1.125rem", fontWeight: "500" }],
    "ui-sm": ["0.875rem", { lineHeight: "1.3125rem", fontWeight: "500" }],
    "ui-md": ["1rem", { lineHeight: "1.5rem", fontWeight: "500" }],
    "ui-lg": ["1.125rem", { lineHeight: "1.6875rem", fontWeight: "500" }],
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    black: "900",
  },
  lineHeight: {
    none: "1",
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.625",
    loose: "2",
  },
  letterSpacing: {
    tight: "-0.025em",
    normal: "0",
    wide: "0.025em",
  },
} as const;

export const spacing = {
  0: "0px",
  1: "8px",
  2: "16px",
  3: "24px",
  4: "32px",
  5: "40px",
  6: "48px",
  8: "64px",
  10: "80px",
  12: "96px",
  16: "128px",
  20: "160px",
  24: "192px",
  32: "256px",
  xs: "8px",
  sm: "16px",
  md: "24px",
  lg: "32px",
  xl: "48px",
} as const;

export const motion = {
  duration: {
    fast: "150ms",
    base: "200ms",
    slow: "300ms",
  },
  easing: {
    easeOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    easeIn: "cubic-bezier(0.4, 0, 1, 1)",
    bounce: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
  },
} as const;

export const shape = {
  radius: {
    sm: "calc(var(--radius) - 4px)",
    md: "calc(var(--radius) - 2px)",
    lg: "var(--radius)",
    xl: "calc(var(--radius) + 4px)",
  },
} as const;

export const stateLayerOpacity = {
  hover: 0.08,
  focus: 0.12,
  pressed: 0.12,
  dragged: 0.16,
} as const;

export const themeMeta = {
  defaultScheme: DEFAULT_SCHEME,
  tones: MATERIAL3.tones,
} as const;
