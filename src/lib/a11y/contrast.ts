const HEX_PATTERN = /^#?([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/;

function normalizeHex(input: string) {
  const match = HEX_PATTERN.exec(input.trim());
  if (!match) {
    throw new Error(
      `Unsupported color format for contrast calculation: ${input}`,
    );
  }
  const hex = match[1]!;
  return hex.length === 3
    ? `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase()
    : `#${hex.toLowerCase()}`;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex).slice(1);
  return {
    r: parseInt(normalized.substring(0, 2), 16) / 255,
    g: parseInt(normalized.substring(2, 4), 16) / 255,
    b: parseInt(normalized.substring(4, 6), 16) / 255,
  };
}

function linearize(value: number) {
  return value <= 0.03928
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(color: string): number {
  const { r, g, b } = hexToRgb(color);
  const linear = {
    r: linearize(r),
    g: linearize(g),
    b: linearize(b),
  };
  return 0.2126 * linear.r + 0.7152 * linear.g + 0.0722 * linear.b;
}

export function contrastRatio(colorA: string, colorB: string): number {
  const lumA = relativeLuminance(colorA);
  const lumB = relativeLuminance(colorB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWcagAA(
  colorA: string,
  colorB: string,
  minimum = 4.5,
): boolean {
  return contrastRatio(colorA, colorB) >= minimum;
}
