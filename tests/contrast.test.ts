import { describe, expect, it } from 'vitest';
import {
  ColorParseError,
  checkContrastPairs,
  contrastRatio,
  evaluatePair,
  meetsWcag,
  parseColor,
  relativeLuminance,
  WCAG_THRESHOLDS,
} from '../src/contrast.js';
import { makeTokens } from './fixtures.js';

describe('parseColor', () => {
  it('parses 6-digit hex', () => {
    expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('parses 3-digit hex by doubling each channel', () => {
    expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('parses 8-digit hex (with alpha), ignoring alpha', () => {
    expect(parseColor('#ff0000ff')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('parses 4-digit hex (with alpha), ignoring alpha', () => {
    expect(parseColor('#f00f')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('parses rgb()', () => {
    expect(parseColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 });
  });

  it('parses rgba(), ignoring alpha', () => {
    expect(parseColor('rgba(10, 20, 30, 0.4)')).toEqual({ r: 10, g: 20, b: 30 });
  });

  it('is tolerant of extra whitespace', () => {
    expect(parseColor('  #ffffff  ')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('throws ColorParseError for unsupported formats like hsl()', () => {
    expect(() => parseColor('hsl(200, 50%, 50%)')).toThrow(ColorParseError);
  });

  it('throws ColorParseError for garbage input', () => {
    expect(() => parseColor('not-a-color')).toThrow(ColorParseError);
  });
});

describe('relativeLuminance', () => {
  it('is 0 for pure black', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
  });

  it('is 1 for pure white', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
  });

  it('weights green highest, per WCAG coefficients', () => {
    const green = relativeLuminance({ r: 0, g: 255, b: 0 });
    const red = relativeLuminance({ r: 255, g: 0, b: 0 });
    const blue = relativeLuminance({ r: 0, g: 0, b: 255 });
    expect(green).toBeGreaterThan(red);
    expect(red).toBeGreaterThan(blue);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('is 1:1 for identical colors', () => {
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5);
  });

  it('is symmetric regardless of argument order', () => {
    const a = contrastRatio('#123456', '#fedcba');
    const b = contrastRatio('#fedcba', '#123456');
    expect(a).toBeCloseTo(b, 10);
  });

  it('accepts pre-parsed RGB objects as well as strings', () => {
    const viaString = contrastRatio('#000000', '#ffffff');
    const viaRgb = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    expect(viaString).toBeCloseTo(viaRgb, 10);
  });

  it('returns a mid-range ratio for two mid-gray tones', () => {
    const ratio = contrastRatio('#777777', '#999999');
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(3);
  });
});

describe('meetsWcag / WCAG_THRESHOLDS', () => {
  it('AA requires 4.5:1', () => {
    expect(WCAG_THRESHOLDS.AA).toBe(4.5);
    expect(meetsWcag(4.5, 'AA')).toBe(true);
    expect(meetsWcag(4.49, 'AA')).toBe(false);
  });

  it('AA-large requires 3.0:1', () => {
    expect(meetsWcag(3.0, 'AA-large')).toBe(true);
    expect(meetsWcag(2.99, 'AA-large')).toBe(false);
  });

  it('AAA requires 7.0:1', () => {
    expect(meetsWcag(7.0, 'AAA')).toBe(true);
    expect(meetsWcag(6.99, 'AAA')).toBe(false);
  });

  it('AAA-large requires 4.5:1', () => {
    expect(meetsWcag(4.5, 'AAA-large')).toBe(true);
  });

  it('defaults to AA when no level given', () => {
    expect(meetsWcag(4.5)).toBe(true);
    expect(meetsWcag(4.0)).toBe(false);
  });
});

describe('evaluatePair', () => {
  it('reports a passing ratio for strong contrast', () => {
    const result = evaluatePair({ foreground: '#000000', background: '#ffffff' });
    expect(result.passes).toBe(true);
    expect(result.required).toBe(4.5);
  });

  it('reports a failing ratio for weak contrast at AA', () => {
    const result = evaluatePair({ foreground: '#777777', background: '#888888' });
    expect(result.passes).toBe(false);
  });

  it('honors a custom WCAG level', () => {
    const result = evaluatePair({ foreground: '#000000', background: '#ffffff', level: 'AAA' });
    expect(result.required).toBe(7.0);
    expect(result.passes).toBe(true);
  });
});

describe('checkContrastPairs', () => {
  it('evaluates all three modes when a pair does not pin one down', () => {
    const tokens = makeTokens();
    const results = checkContrastPairs(tokens);
    const modes = new Set(results.map((r) => r.mode));
    expect(modes.has('light')).toBe(true);
    expect(modes.has('dark')).toBe(true);
    expect(modes.has('highContrast')).toBe(true);
  });

  it('falls back to the light value when a color has no dark override', () => {
    const tokens = makeTokens({
      colors: {
        background: { light: '#ffffff' },
        foreground: { light: '#000000' },
      },
      contrastPairs: [{ name: 'p', foreground: 'foreground', background: 'background', mode: 'dark' }],
    });
    const [result] = checkContrastPairs(tokens);
    expect(result.foregroundValue).toBe('#000000');
    expect(result.backgroundValue).toBe('#ffffff');
  });

  it('restricts to a single mode when the pair specifies one', () => {
    const tokens = makeTokens({
      contrastPairs: [{ name: 'p', foreground: 'foreground', background: 'background', mode: 'light' }],
    });
    const results = checkContrastPairs(tokens);
    expect(results).toHaveLength(1);
    expect(results[0].mode).toBe('light');
  });

  it('marks a pair as failing when its ratio is below the required threshold', () => {
    const tokens = makeTokens({
      colors: {
        background: { light: '#888888' },
        foreground: { light: '#999999' },
      },
      contrastPairs: [{ name: 'weak', foreground: 'foreground', background: 'background', mode: 'light' }],
    });
    const [result] = checkContrastPairs(tokens);
    expect(result.passes).toBe(false);
  });

  it('marks a pair as passing when its ratio clears the threshold', () => {
    const tokens = makeTokens({
      colors: {
        background: { light: '#ffffff' },
        foreground: { light: '#000000' },
      },
      contrastPairs: [{ name: 'strong', foreground: 'foreground', background: 'background', mode: 'light' }],
    });
    const [result] = checkContrastPairs(tokens);
    expect(result.passes).toBe(true);
  });

  it('returns an empty array when there are no contrastPairs', () => {
    const tokens = makeTokens({ contrastPairs: [] });
    expect(checkContrastPairs(tokens)).toEqual([]);
  });

  it('rounds ratios to 2 decimal places', () => {
    const tokens = makeTokens({
      colors: { background: { light: '#ffffff' }, foreground: { light: '#123456' } },
      contrastPairs: [{ name: 'p', foreground: 'foreground', background: 'background', mode: 'light' }],
    });
    const [result] = checkContrastPairs(tokens);
    expect(Number.isInteger(result.ratio * 100)).toBe(true);
  });
});
