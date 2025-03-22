import type { DesignTokens } from '../schema.js';
import { cssVarName, kebabCase } from './tailwind.js';

/**
 * Emits CSS custom properties for all three modes:
 *   - `:root` / `[data-theme="light"]` -- the default/light values
 *   - `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` (scoped so an
 *     explicit `data-theme="light"` attribute can still override the OS preference)
 *   - `[data-contrast="high"]` -- opt-in high-contrast overrides, independent of theme
 *
 * Non-color tokens (spacing, typography) don't vary by mode, so they're emitted once
 * on `:root`.
 */
export function toCssVariables(tokens: DesignTokens): string {
  const colorKeys = Object.keys(tokens.colors).sort();

  const lightBlock = colorKeys
    .map((key) => `  ${cssVarName(key)}: ${tokens.colors[key].light};`)
    .join('\n');

  const darkEntries = colorKeys.filter((key) => tokens.colors[key].dark !== undefined);
  const darkBlock = darkEntries
    .map((key) => `  ${cssVarName(key)}: ${tokens.colors[key].dark};`)
    .join('\n');

  const highContrastEntries = colorKeys.filter((key) => tokens.colors[key].highContrast !== undefined);
  const highContrastBlock = highContrastEntries
    .map((key) => `  ${cssVarName(key)}: ${tokens.colors[key].highContrast};`)
    .join('\n');

  const spacingBlock = Object.entries(tokens.spacing)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  --tf-space-${kebabCase(key)}: ${value};`)
    .join('\n');

  const fontFamilyBlock = Object.entries(tokens.typography.fontFamilies)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  --tf-font-family-${kebabCase(key)}: ${value};`)
    .join('\n');

  const fontSizeBlock = Object.entries(tokens.typography.fontSizes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  --tf-font-size-${kebabCase(key)}: ${value};`)
    .join('\n');

  const fontWeightBlock = Object.entries(tokens.typography.fontWeights)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  --tf-font-weight-${kebabCase(key)}: ${value};`)
    .join('\n');

  const lineHeightBlock = Object.entries(tokens.typography.lineHeights)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  --tf-line-height-${kebabCase(key)}: ${value};`)
    .join('\n');

  const letterSpacingBlock = tokens.typography.letterSpacings
    ? Object.entries(tokens.typography.letterSpacings)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `  --tf-letter-spacing-${kebabCase(key)}: ${value};`)
        .join('\n')
    : '';

  const staticBlock = [
    spacingBlock,
    fontFamilyBlock,
    fontSizeBlock,
    fontWeightBlock,
    lineHeightBlock,
    letterSpacingBlock,
  ]
    .filter((block) => block.length > 0)
    .join('\n');

  const sections: string[] = [];

  sections.push(`/* GENERATED FILE -- do not edit by hand. Run \`tokenforge build\` to regenerate. */
/* Source: ${tokens.name}@${tokens.version} */

:root,
[data-theme='light'] {
${lightBlock}
${staticBlock}
}`);

  if (darkEntries.length > 0) {
    sections.push(`@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${indent(darkBlock, 2)}
  }
}`);
    sections.push(`[data-theme='dark'] {
${darkBlock}
}`);
  }

  if (highContrastEntries.length > 0) {
    sections.push(`[data-contrast='high'] {
${highContrastBlock}
}`);
  }

  return sections.join('\n\n') + '\n';
}

function indent(block: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return block
    .split('\n')
    .map((line) => (line.length > 0 ? pad + line : line))
    .join('\n');
}
