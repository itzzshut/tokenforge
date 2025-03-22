import type { ContrastPair, DesignTokens } from './schema.js';

/** RGB channel values in the 0-255 range. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export class ColorParseError extends Error {
  constructor(input: string) {
    super(`Unable to parse color "${input}" for contrast calculation. Supported: #rgb, #rrggbb, #rrggbbaa, rgb()/rgba().`);
    this.name = 'ColorParseError';
  }
}

/** Parses a hex or rgb()/rgba() color string into 0-255 RGB channels. Alpha is ignored (contrast math is defined for opaque colors). */
export function parseColor(input: string): RGB {
  const value = input.trim();

  const hexMatch = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(value);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split('')
        .map((ch) => ch + ch)
        .join('');
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  }

  const rgbMatch = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*[\d.]+\s*)?\)$/.exec(value);
  if (rgbMatch) {
    return {
      r: clamp255(Number(rgbMatch[1])),
      g: clamp255(Number(rgbMatch[2])),
      b: clamp255(Number(rgbMatch[3])),
    };
  }

  throw new ColorParseError(input);
}

function clamp255(n: number): number {
  return Math.min(255, Math.max(0, n));
}

/** Converts a single sRGB channel (0-255) to its linearized form per WCAG 2.x. */
function linearizeChannel(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance per WCAG 2.x, https://www.w3.org/TR/WCAG21/#dfn-relative-luminance */
export function relativeLuminance(color: RGB): number {
  const r = linearizeChannel(color.r);
  const g = linearizeChannel(color.g);
  const b = linearizeChannel(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio between two colors, in the range [1, 21].
 * Order of foreground/background does not matter -- the formula is symmetric
 * around the lighter/darker luminance, so we sort internally.
 */
export function contrastRatio(a: string | RGB, b: string | RGB): number {
  const rgbA = typeof a === 'string' ? parseColor(a) : a;
  const rgbB = typeof b === 'string' ? parseColor(b) : b;
  const lumA = relativeLuminance(rgbA);
  const lumB = relativeLuminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export type WcagLevel = 'AA' | 'AA-large' | 'AAA' | 'AAA-large';

/** Minimum contrast ratio required for each WCAG success criterion. */
export const WCAG_THRESHOLDS: Record<WcagLevel, number> = {
  AA: 4.5,
  'AA-large': 3.0,
  AAA: 7.0,
  'AAA-large': 4.5,
};

export function meetsWcag(ratio: number, level: WcagLevel = 'AA'): boolean {
  return ratio >= WCAG_THRESHOLDS[level];
}

export interface ContrastCheckResult {
  pairName: string;
  mode: 'light' | 'dark' | 'highContrast';
  level: WcagLevel;
  foreground: string;
  background: string;
  foregroundValue: string;
  backgroundValue: string;
  ratio: number;
  required: number;
  passes: boolean;
}

const ALL_MODES = ['light', 'dark', 'highContrast'] as const;

/** Resolves the color value for a token/mode, falling back to `light` when a mode override isn't defined. */
function resolveColorValue(
  tokens: DesignTokens,
  colorKey: string,
  mode: 'light' | 'dark' | 'highContrast'
): string {
  const token = tokens.colors[colorKey];
  if (!token) {
    throw new Error(`Unknown color token "${colorKey}"`);
  }
  if (mode === 'light') return token.light;
  return token[mode] ?? token.light;
}

/**
 * Runs every contrastPairs entry in the token document against every mode it
 * applies to (or all three modes if `mode` is unset on the pair), returning
 * one result per (pair, mode) combination actually evaluated.
 */
export function checkContrastPairs(tokens: DesignTokens): ContrastCheckResult[] {
  const results: ContrastCheckResult[] = [];

  for (const pair of tokens.contrastPairs) {
    const modesToCheck = pair.mode ? [pair.mode] : ALL_MODES;
    for (const mode of modesToCheck) {
      const foregroundValue = resolveColorValue(tokens, pair.foreground, mode);
      const backgroundValue = resolveColorValue(tokens, pair.background, mode);
      const ratio = contrastRatio(foregroundValue, backgroundValue);
      const level = pair.level ?? 'AA';
      const required = WCAG_THRESHOLDS[level];
      results.push({
        pairName: pair.name,
        mode,
        level,
        foreground: pair.foreground,
        background: pair.background,
        foregroundValue,
        backgroundValue,
        ratio: Math.round(ratio * 100) / 100,
        required,
        passes: ratio >= required,
      });
    }
  }

  return results;
}

/** Convenience helper for a single ad-hoc pair check, used outside the token pipeline (e.g. tests, one-off CLI checks). */
export function evaluatePair(
  pair: Pick<ContrastPair, 'foreground' | 'background'> & { level?: WcagLevel }
): { ratio: number; passes: boolean; required: number } {
  const ratio = contrastRatio(pair.foreground, pair.background);
  const level = pair.level ?? 'AA';
  const required = WCAG_THRESHOLDS[level];
  return { ratio: Math.round(ratio * 100) / 100, passes: ratio >= required, required };
}
