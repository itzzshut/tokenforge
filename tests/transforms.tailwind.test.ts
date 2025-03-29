import { describe, expect, it } from 'vitest';
import { cssVarName, kebabCase, toTailwindThemeExtension } from '../src/transforms/tailwind.js';
import { makeTokens } from './fixtures.js';

describe('kebabCase', () => {
  it('converts camelCase to kebab-case', () => {
    expect(kebabCase('primaryForeground')).toBe('primary-foreground');
  });

  it('leaves already-kebab strings unchanged', () => {
    expect(kebabCase('primary-color')).toBe('primary-color');
  });

  it('lowercases and hyphenates underscores/spaces', () => {
    expect(kebabCase('Some Value_here')).toBe('some-value-here');
  });
});

describe('cssVarName', () => {
  it('prefixes with --tf-color- and kebab-cases the key', () => {
    expect(cssVarName('primaryForeground')).toBe('--tf-color-primary-foreground');
  });
});

describe('toTailwindThemeExtension', () => {
  const tokens = makeTokens();
  const output = toTailwindThemeExtension(tokens);

  it('emits a generated-file header comment with the source name/version', () => {
    expect(output).toContain('GENERATED FILE');
    expect(output).toContain('test-system@1.0.0');
  });

  it('maps every color to a var() reference rather than a literal value', () => {
    for (const key of Object.keys(tokens.colors)) {
      expect(output).toContain(`var(--tf-color-${kebabCase(key)})`);
    }
  });

  it('does not leak literal hex values into the color block', () => {
    // primary's literal light value should not appear verbatim as a theme.colors value
    expect(output).not.toMatch(/primary: '#2563eb'/);
  });

  it('includes every spacing token with its literal value', () => {
    expect(output).toContain(`sm: '8px'`);
    expect(output).toContain(`md: '16px'`);
  });

  it('splits comma-separated font families into an array literal', () => {
    expect(output).toContain(`sans: ['Inter', 'sans-serif']`);
  });

  it('is valid enough JS to be imported (no unbalanced braces)', () => {
    const opens = (output.match(/{/g) ?? []).length;
    const closes = (output.match(/}/g) ?? []).length;
    expect(opens).toBe(closes);
  });

  it('exports both a named themeExtension and a default export', () => {
    expect(output).toContain('export const themeExtension');
    expect(output).toContain('export default themeExtension');
  });
});
