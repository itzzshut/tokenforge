import { describe, expect, it } from 'vitest';
import { toTypeScriptModule } from '../src/transforms/typescript.js';
import { makeTokens } from './fixtures.js';

describe('toTypeScriptModule', () => {
  const tokens = makeTokens();
  const output = toTypeScriptModule(tokens);

  it('emits a generated-file header with the source name/version', () => {
    expect(output).toContain('GENERATED FILE');
    expect(output).toContain('test-system@1.0.0');
  });

  it('emits Colors as a const object with all three modes present when defined', () => {
    expect(output).toContain('export const Colors');
    expect(output).toContain(`light: '#2563eb'`);
    expect(output).toContain(`dark: '#60a5fa'`);
  });

  it('omits a mode key entirely for colors without that override', () => {
    // `accent` in the fixture only has a light value
    const accentBlockMatch = output.match(/accent: \{([\s\S]*?)\},/);
    expect(accentBlockMatch).not.toBeNull();
    expect(accentBlockMatch![1]).not.toContain('dark:');
    expect(accentBlockMatch![1]).not.toContain('highContrast:');
  });

  it('emits derived union types for tokens', () => {
    expect(output).toContain('export type ColorToken = keyof typeof Colors');
    expect(output).toContain('export type SpacingToken = keyof typeof Spacing');
  });

  it('emits a resolveColor helper that falls back to light', () => {
    expect(output).toContain('export function resolveColor');
    expect(output).toContain("mode: ColorMode = 'light'");
  });

  it('emits Spacing, FontFamilies, FontSizes, FontWeights, LineHeights as const objects', () => {
    expect(output).toContain('export const Spacing');
    expect(output).toContain('export const FontFamilies');
    expect(output).toContain('export const FontSizes');
    expect(output).toContain('export const FontWeights');
    expect(output).toContain('export const LineHeights');
  });

  it('emits numeric font weights without quotes', () => {
    expect(output).toContain('regular: 400,');
    expect(output).toContain('bold: 700,');
  });

  it('escapes single quotes in string values safely', () => {
    const weirdTokens = makeTokens({
      typography: {
        ...tokens.typography,
        fontFamilies: { weird: "Comic 'Sans', cursive" },
      },
    });
    const weirdOutput = toTypeScriptModule(weirdTokens);
    expect(weirdOutput).toContain(`Comic \\'Sans\\'`);
  });

  it('includes a description as a JSDoc comment when present', () => {
    const documented = makeTokens({
      colors: { brand: { light: '#123456', description: 'Primary brand color' } },
      contrastPairs: [],
    });
    const documentedOutput = toTypeScriptModule(documented);
    expect(documentedOutput).toContain('/** Primary brand color */');
  });

  it('produces syntactically balanced braces', () => {
    const opens = (output.match(/{/g) ?? []).length;
    const closes = (output.match(/}/g) ?? []).length;
    expect(opens).toBe(closes);
  });

  it('default-exports a combined tokens object', () => {
    expect(output).toContain('export default tokens');
  });
});
