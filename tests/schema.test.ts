import { describe, expect, it } from 'vitest';
import { parseDesignTokens, TokenValidationError } from '../src/schema.js';
import { makeTokens } from './fixtures.js';

describe('parseDesignTokens', () => {
  it('accepts a well-formed token document', () => {
    const tokens = makeTokens();
    expect(() => parseDesignTokens(tokens)).not.toThrow();
  });

  it('returns a deep-equal object for valid input', () => {
    const tokens = makeTokens();
    const parsed = parseDesignTokens(tokens);
    expect(parsed.name).toBe('test-system');
    expect(parsed.colors.primary.light).toBe('#2563eb');
  });

  it('defaults contrastPairs to an empty array when omitted', () => {
    const tokens = makeTokens();
    // @ts-expect-error -- intentionally testing omission at runtime
    delete tokens.contrastPairs;
    const parsed = parseDesignTokens(tokens);
    expect(parsed.contrastPairs).toEqual([]);
  });

  it('rejects a document missing a required `light` color value', () => {
    const tokens = makeTokens();
    // @ts-expect-error -- intentionally malformed for the test
    delete tokens.colors.primary.light;
    expect(() => parseDesignTokens(tokens)).toThrow(TokenValidationError);
  });

  it('rejects a color value that is not hex/rgb/hsl/var/keyword', () => {
    const tokens = makeTokens({
      colors: { ...makeTokens().colors, primary: { light: 'not-a-color' } },
    });
    expect(() => parseDesignTokens(tokens)).toThrow(TokenValidationError);
  });

  it('accepts rgb(), rgba(), hsl(), transparent, currentColor, and var() as color values', () => {
    const tokens = makeTokens({
      colors: {
        a: { light: 'rgb(1,2,3)' },
        b: { light: 'rgba(1,2,3,0.5)' },
        c: { light: 'hsl(200, 50%, 50%)' },
        d: { light: 'transparent' },
        e: { light: 'currentColor' },
        f: { light: 'var(--some-token)' },
      },
      contrastPairs: [],
    });
    expect(() => parseDesignTokens(tokens)).not.toThrow();
  });

  it('rejects a spacing value without a recognized CSS unit', () => {
    const tokens = makeTokens({ spacing: { sm: '8' } });
    expect(() => parseDesignTokens(tokens)).toThrow(TokenValidationError);
  });

  it('accepts spacing values in px, rem, em, and %', () => {
    const tokens = makeTokens({ spacing: { a: '8px', b: '1.5rem', c: '2em', d: '100%' } });
    expect(() => parseDesignTokens(tokens)).not.toThrow();
  });

  it('rejects a font weight outside the 100-950 range', () => {
    const tokens = makeTokens();
    tokens.typography.fontWeights.regular = 50;
    expect(() => parseDesignTokens(tokens)).toThrow(TokenValidationError);
  });

  it('rejects a contrastPairs entry referencing an unknown foreground color', () => {
    const tokens = makeTokens({
      contrastPairs: [{ name: 'bad', foreground: 'doesNotExist', background: 'background' }],
    });
    expect(() => parseDesignTokens(tokens)).toThrow(TokenValidationError);
  });

  it('rejects a contrastPairs entry referencing an unknown background color', () => {
    const tokens = makeTokens({
      contrastPairs: [{ name: 'bad', foreground: 'foreground', background: 'doesNotExist' }],
    });
    expect(() => parseDesignTokens(tokens)).toThrow(TokenValidationError);
  });

  it('rejects a document missing the top-level name field', () => {
    const tokens = makeTokens();
    // @ts-expect-error -- intentionally malformed
    delete tokens.name;
    expect(() => parseDesignTokens(tokens)).toThrow(TokenValidationError);
  });

  it('includes readable, path-qualified messages in the thrown error', () => {
    const tokens = makeTokens();
    // @ts-expect-error -- intentionally malformed
    delete tokens.colors.primary.light;
    try {
      parseDesignTokens(tokens);
      expect.fail('expected parseDesignTokens to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(TokenValidationError);
      expect((error as TokenValidationError).message).toContain('colors.primary.light');
    }
  });

  it('accepts optional dark/highContrast overrides being absent', () => {
    const tokens = makeTokens({
      colors: { solo: { light: '#123456' } },
      contrastPairs: [],
    });
    const parsed = parseDesignTokens(tokens);
    expect(parsed.colors.solo.dark).toBeUndefined();
    expect(parsed.colors.solo.highContrast).toBeUndefined();
  });
});
