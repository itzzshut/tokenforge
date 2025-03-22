import type { DesignTokens } from '../schema.js';

/**
 * Emits a typed TypeScript module: `as const` objects for every token group plus
 * union types derived from their keys, so component libraries get autocomplete
 * and compile-time errors on typo'd token names (e.g. `Spacing.xxl` where `xxl`
 * was renamed to `2xl`).
 */
export function toTypeScriptModule(tokens: DesignTokens): string {
  const colorEntries = Object.keys(tokens.colors)
    .sort()
    .map((key) => {
      const token = tokens.colors[key];
      const comment = token.description ? `  /** ${token.description} */\n` : '';
      return `${comment}  ${objKey(key)}: {
    light: ${quote(token.light)},
${token.dark !== undefined ? `    dark: ${quote(token.dark)},\n` : ''}${token.highContrast !== undefined ? `    highContrast: ${quote(token.highContrast)},\n` : ''}  },`;
    })
    .join('\n');

  const spacingEntries = Object.entries(tokens.spacing)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  ${objKey(key)}: ${quote(value)},`)
    .join('\n');

  const fontFamilyEntries = Object.entries(tokens.typography.fontFamilies)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  ${objKey(key)}: ${quote(value)},`)
    .join('\n');

  const fontSizeEntries = Object.entries(tokens.typography.fontSizes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  ${objKey(key)}: ${quote(value)},`)
    .join('\n');

  const fontWeightEntries = Object.entries(tokens.typography.fontWeights)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  ${objKey(key)}: ${value},`)
    .join('\n');

  const lineHeightEntries = Object.entries(tokens.typography.lineHeights)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  ${objKey(key)}: ${typeof value === 'number' ? value : quote(value)},`)
    .join('\n');

  return `// GENERATED FILE -- do not edit by hand. Run \`tokenforge build\` to regenerate.
// Source: ${tokens.name}@${tokens.version}

export const Colors = {
${colorEntries}
} as const;

export type ColorToken = keyof typeof Colors;
export type ColorMode = 'light' | 'dark' | 'highContrast';

export const Spacing = {
${spacingEntries}
} as const;

export type SpacingToken = keyof typeof Spacing;

export const FontFamilies = {
${fontFamilyEntries}
} as const;

export const FontSizes = {
${fontSizeEntries}
} as const;

export const FontWeights = {
${fontWeightEntries}
} as const;

export const LineHeights = {
${lineHeightEntries}
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
  name: ${quote(tokens.name)},
  version: ${quote(tokens.version)},
  colors: Colors,
  spacing: Spacing,
  fontFamilies: FontFamilies,
  fontSizes: FontSizes,
  fontWeights: FontWeights,
  lineHeights: LineHeights,
} as const;

export default tokens;
`;
}

function objKey(key: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
}

function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}
