import { describe, expect, it } from 'vitest';
import { toCssVariables } from '../src/transforms/css.js';
import { makeTokens } from './fixtures.js';

describe('toCssVariables', () => {
  it('emits a :root / [data-theme="light"] block with every color at its light value', () => {
    const tokens = makeTokens();
    const output = toCssVariables(tokens);
    expect(output).toContain(`:root,\n[data-theme='light'] {`);
    expect(output).toContain('--tf-color-primary: #2563eb;');
    expect(output).toContain('--tf-color-background: #ffffff;');
  });

  it('emits a dark media query and [data-theme="dark"] block only for colors with dark overrides', () => {
    const tokens = makeTokens();
    const output = toCssVariables(tokens);
    expect(output).toContain('@media (prefers-color-scheme: dark)');
    expect(output).toContain(`[data-theme='dark'] {`);
    expect(output).toContain('--tf-color-primary: #60a5fa;');
  });

  it('omits colors without a dark override from the dark block', () => {
    const tokens = makeTokens();
    const output = toCssVariables(tokens);
    const darkBlockMatch = output.match(/\[data-theme='dark'\] \{([\s\S]*?)\}/);
    expect(darkBlockMatch).not.toBeNull();
    // `accent` has no dark override in the fixture
    expect(darkBlockMatch![1]).not.toContain('--tf-color-accent');
  });

  it('emits a [data-contrast="high"] block only for colors with a highContrast override', () => {
    const tokens = makeTokens();
    const output = toCssVariables(tokens);
    expect(output).toContain(`[data-contrast='high'] {`);
    expect(output).toContain('--tf-color-background: #000000;');
  });

  it('omits the high-contrast block entirely when no color defines one', () => {
    const tokens = makeTokens({
      colors: { solo: { light: '#123456' } },
      contrastPairs: [],
    });
    const output = toCssVariables(tokens);
    expect(output).not.toContain('data-contrast');
  });

  it('omits the dark block entirely when no color defines one', () => {
    const tokens = makeTokens({
      colors: { solo: { light: '#123456' } },
      contrastPairs: [],
    });
    const output = toCssVariables(tokens);
    expect(output).not.toContain('prefers-color-scheme');
    expect(output).not.toContain(`[data-theme='dark']`);
  });

  it('emits spacing tokens as --tf-space-* on :root', () => {
    const tokens = makeTokens();
    const output = toCssVariables(tokens);
    expect(output).toContain('--tf-space-sm: 8px;');
    expect(output).toContain('--tf-space-md: 16px;');
  });

  it('emits typography tokens with correct prefixes', () => {
    const tokens = makeTokens();
    const output = toCssVariables(tokens);
    expect(output).toContain('--tf-font-family-sans: Inter, sans-serif;');
    expect(output).toContain('--tf-font-size-base: 16px;');
    expect(output).toContain('--tf-font-weight-regular: 400;');
    expect(output).toContain('--tf-line-height-normal: 1.5;');
    expect(output).toContain('--tf-letter-spacing-normal: 0em;');
  });

  it('produces syntactically balanced braces', () => {
    const tokens = makeTokens();
    const output = toCssVariables(tokens);
    const opens = (output.match(/{/g) ?? []).length;
    const closes = (output.match(/}/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});
