import type { DesignTokens } from '../src/schema.js';

/** A small, valid token document reused across test files. */
export function makeTokens(overrides: Partial<DesignTokens> = {}): DesignTokens {
  return {
    name: 'test-system',
    version: '1.0.0',
    colors: {
      background: { light: '#ffffff', dark: '#000000', highContrast: '#000000' },
      foreground: { light: '#111111', dark: '#eeeeee', highContrast: '#ffffff' },
      primary: { light: '#2563eb', dark: '#60a5fa' },
      accent: { light: '#ff8800' },
      ...(overrides.colors ?? {}),
    },
    spacing: {
      sm: '8px',
      md: '16px',
      ...(overrides.spacing ?? {}),
    },
    typography: {
      fontFamilies: { sans: 'Inter, sans-serif' },
      fontSizes: { base: '16px', lg: '18px' },
      fontWeights: { regular: 400, bold: 700 },
      lineHeights: { normal: 1.5 },
      letterSpacings: { normal: '0em' },
      ...(overrides.typography ?? {}),
    },
    contrastPairs: overrides.contrastPairs ?? [
      { name: 'text-on-bg', foreground: 'foreground', background: 'background', level: 'AA' },
    ],
    ...overrides,
  };
}
