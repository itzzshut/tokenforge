import type { DesignTokens } from '../schema.js';

/**
 * Emits a Tailwind `theme.extend` fragment. Colors are emitted as `var(--tf-color-*)`
 * references rather than literal hex values, so a single build of the CSS-variables
 * output (see transforms/css.ts) drives both Tailwind's utility classes and raw CSS --
 * switching the `data-theme`/`data-contrast` attribute at runtime re-themes Tailwind
 * utilities for free, with no rebuild.
 */
export function toTailwindThemeExtension(tokens: DesignTokens): string {
  const colorEntries = Object.keys(tokens.colors)
    .sort()
    .map((key) => `      ${jsKey(key)}: 'var(${cssVarName(key)})',`)
    .join('\n');

  const spacingEntries = Object.entries(tokens.spacing)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `      ${jsKey(key)}: '${value}',`)
    .join('\n');

  const fontFamilyEntries = Object.entries(tokens.typography.fontFamilies)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `      ${jsKey(key)}: [${value
      .split(',')
      .map((f) => `'${f.trim()}'`)
      .join(', ')}],`)
    .join('\n');

  const fontSizeEntries = Object.entries(tokens.typography.fontSizes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `      ${jsKey(key)}: '${value}',`)
    .join('\n');

  const fontWeightEntries = Object.entries(tokens.typography.fontWeights)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `      ${jsKey(key)}: '${value}',`)
    .join('\n');

  const lineHeightEntries = Object.entries(tokens.typography.lineHeights)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `      ${jsKey(key)}: '${value}',`)
    .join('\n');

  return `// GENERATED FILE -- do not edit by hand. Run \`tokenforge build\` to regenerate.
// Source: ${tokens.name}@${tokens.version}
/** @type {import('tailwindcss').Config['theme']} */
export const themeExtension = {
  extend: {
    colors: {
${colorEntries}
    },
    spacing: {
${spacingEntries}
    },
    fontFamily: {
${fontFamilyEntries}
    },
    fontSize: {
${fontSizeEntries}
    },
    fontWeight: {
${fontWeightEntries}
    },
    lineHeight: {
${lineHeightEntries}
    },
  },
};

export default themeExtension;
`;
}

function jsKey(key: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
}

export function cssVarName(colorKey: string): string {
  return `--tf-color-${kebabCase(colorKey)}`;
}

export function kebabCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}
