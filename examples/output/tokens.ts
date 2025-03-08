// GENERATED FILE -- do not edit by hand. Run `tokenforge build` to regenerate.
// Source: acme-design-system@1.0.0

export const Colors = {
  /** Page/app background */
  background: {
    light: '#ffffff',
    dark: '#0b0f19',
    highContrast: '#000000',
  },
  /** Hairline borders and dividers */
  border: {
    light: '#e2e8f0',
    dark: '#1f2937',
    highContrast: '#ffffff',
  },
  /** Destructive actions and error states */
  danger: {
    light: '#dc2626',
    dark: '#f87171',
    highContrast: '#ff1a1a',
  },
  /** Text/icon color on top of danger */
  dangerForeground: {
    light: '#ffffff',
    dark: '#0b0f19',
    highContrast: '#000000',
  },
  /** Primary text color */
  foreground: {
    light: '#0f172a',
    dark: '#f8fafc',
    highContrast: '#ffffff',
  },
  /** Secondary/low-emphasis text */
  muted: {
    light: '#64748b',
    dark: '#94a3b8',
    highContrast: '#e2e8f0',
  },
  /** Primary brand/action color */
  primary: {
    light: '#2563eb',
    dark: '#60a5fa',
    highContrast: '#1d4ed8',
  },
  /** Text/icon color on top of primary */
  primaryForeground: {
    light: '#ffffff',
    dark: '#0b0f19',
    highContrast: '#ffffff',
  },
  /** Success/confirmation states */
  success: {
    light: '#16a34a',
    dark: '#4ade80',
    highContrast: '#00d924',
  },
  /** Card/panel background */
  surface: {
    light: '#f1f5f9',
    dark: '#111827',
    highContrast: '#000000',
  },
} as const;

export type ColorToken = keyof typeof Colors;
export type ColorMode = 'light' | 'dark' | 'highContrast';

export const Spacing = {
  '2xl': '48px',
  '3xl': '64px',
  lg: '24px',
  md: '16px',
  sm: '8px',
  xl: '32px',
  xs: '4px',
} as const;

export type SpacingToken = keyof typeof Spacing;

export const FontFamilies = {
  mono: 'JetBrains Mono, ui-monospace, monospace',
  sans: 'Inter, system-ui, sans-serif',
} as const;

export const FontSizes = {
  '2xl': '24px',
  '3xl': '30px',
  base: '16px',
  lg: '18px',
  sm: '14px',
  xl: '20px',
  xs: '12px',
} as const;

export const FontWeights = {
  bold: 700,
  medium: 500,
  regular: 400,
  semibold: 600,
} as const;

export const LineHeights = {
  normal: 1.5,
  relaxed: 1.75,
  tight: 1.2,
} as const;

export type FontFamilyToken = keyof typeof FontFamilies;
export type FontSizeToken = keyof typeof FontSizes;
export type FontWeightToken = keyof typeof FontWeights;
export type LineHeightToken = keyof typeof LineHeights;

/** Resolves a color token's value for a given mode, falling back to 'light' if the mode has no override. */
export function resolveColor(token: ColorToken, mode: ColorMode = 'light'): string {
  const entry = Colors[token] as Record<string, string | undefined>;
  return entry[mode] ?? entry.light!;
}

export const tokens = {
  name: 'acme-design-system',
  version: '1.0.0',
  colors: Colors,
  spacing: Spacing,
  fontFamilies: FontFamilies,
  fontSizes: FontSizes,
  fontWeights: FontWeights,
  lineHeights: LineHeights,
} as const;

export default tokens;
