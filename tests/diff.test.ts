import { describe, expect, it } from 'vitest';
import { diffTokens, formatDriftReport } from '../src/diff.js';
import { makeTokens } from './fixtures.js';

describe('diffTokens', () => {
  it('reports no drift when two documents are identical', () => {
    const tokens = makeTokens();
    const report = diffTokens(tokens, structuredClone(tokens));
    expect(report.hasDrift).toBe(false);
    expect(report.entries).toEqual([]);
  });

  it('detects an added color token', () => {
    const before = makeTokens();
    const after = makeTokens({
      colors: { ...before.colors, brandNew: { light: '#abcdef' } },
    });
    const report = diffTokens(before, after);
    expect(report.hasDrift).toBe(true);
    expect(report.entries).toContainEqual({ kind: 'added', path: 'colors.brandNew', after: '#abcdef' });
  });

  it('detects a removed color token', () => {
    const before = makeTokens();
    const after = makeTokens();
    delete (after.colors as Record<string, unknown>).accent;
    const report = diffTokens(before, after);
    expect(report.entries).toContainEqual({ kind: 'removed', path: 'colors.accent', before: '#ff8800' });
  });

  it('detects a changed color mode value', () => {
    const before = makeTokens();
    const after = makeTokens();
    after.colors.primary = { ...after.colors.primary, light: '#000000' };
    const report = diffTokens(before, after);
    expect(report.entries).toContainEqual({
      kind: 'changed',
      path: 'colors.primary.light',
      before: '#2563eb',
      after: '#000000',
    });
  });

  it('detects a mode being added to an existing color (e.g. dark mode ships later)', () => {
    const before = makeTokens();
    const after = makeTokens();
    after.colors.accent = { ...after.colors.accent, dark: '#ffaa00' };
    const report = diffTokens(before, after);
    expect(report.entries).toContainEqual({ kind: 'added', path: 'colors.accent.dark', after: '#ffaa00' });
  });

  it('detects a mode being removed from an existing color', () => {
    const before = makeTokens();
    const after = makeTokens();
    delete after.colors.primary.dark;
    const report = diffTokens(before, after);
    expect(report.entries).toContainEqual({ kind: 'removed', path: 'colors.primary.dark', before: '#60a5fa' });
  });

  it('detects an added spacing token', () => {
    const before = makeTokens();
    const after = makeTokens({ spacing: { ...before.spacing, lg: '24px' } });
    const report = diffTokens(before, after);
    expect(report.entries).toContainEqual({ kind: 'added', path: 'spacing.lg', after: '24px' });
  });

  it('detects a removed spacing token', () => {
    const before = makeTokens();
    const after = makeTokens();
    delete (after.spacing as Record<string, unknown>).sm;
    const report = diffTokens(before, after);
    expect(report.entries).toContainEqual({ kind: 'removed', path: 'spacing.sm', before: '8px' });
  });

  it('detects a changed spacing value', () => {
    const before = makeTokens();
    const after = makeTokens();
    after.spacing.md = '20px';
    const report = diffTokens(before, after);
    expect(report.entries).toContainEqual({ kind: 'changed', path: 'spacing.md', before: '16px', after: '20px' });
  });

  it('detects a changed font family', () => {
    const before = makeTokens();
    const after = makeTokens();
    after.typography.fontFamilies.sans = 'Roboto, sans-serif';
    const report = diffTokens(before, after);
    expect(report.entries).toContainEqual({
      kind: 'changed',
      path: 'typography.fontFamilies.sans',
      before: 'Inter, sans-serif',
      after: 'Roboto, sans-serif',
    });
  });

  it('detects a changed font weight', () => {
    const before = makeTokens();
    const after = makeTokens();
    after.typography.fontWeights.bold = 800;
    const report = diffTokens(before, after);
    expect(report.entries).toContainEqual({
      kind: 'changed',
      path: 'typography.fontWeights.bold',
      before: '700',
      after: '800',
    });
  });

  it('detects a changed line height', () => {
    const before = makeTokens();
    const after = makeTokens();
    after.typography.lineHeights.normal = 1.6;
    const report = diffTokens(before, after);
    expect(report.entries).toContainEqual({
      kind: 'changed',
      path: 'typography.lineHeights.normal',
      before: '1.5',
      after: '1.6',
    });
  });

  it('accumulates multiple simultaneous drift entries', () => {
    const before = makeTokens();
    const after = makeTokens();
    after.spacing.md = '99px';
    after.colors.primary.light = '#111111';
    const report = diffTokens(before, after);
    expect(report.entries.length).toBeGreaterThanOrEqual(2);
  });
});

describe('formatDriftReport', () => {
  it('renders a clean-sync message when there is no drift', () => {
    const report = { hasDrift: false, entries: [] };
    expect(formatDriftReport(report)).toBe('No drift detected -- token sources are in sync.');
  });

  it('renders added/removed/changed entries with distinct markers', () => {
    const report = {
      hasDrift: true,
      entries: [
        { kind: 'added' as const, path: 'colors.new', after: '#fff' },
        { kind: 'removed' as const, path: 'colors.old', before: '#000' },
        { kind: 'changed' as const, path: 'spacing.md', before: '16px', after: '20px' },
      ],
    };
    const output = formatDriftReport(report);
    expect(output).toContain('+ colors.new = #fff');
    expect(output).toContain('- colors.old (was #000)');
    expect(output).toContain('~ spacing.md: 16px -> 20px');
  });
});
