import type { DesignTokens } from './schema.js';

export type DriftKind = 'added' | 'removed' | 'changed';

export interface DriftEntry {
  kind: DriftKind;
  /** Dotted path identifying the token, e.g. "colors.primary.dark" or "spacing.sm". */
  path: string;
  before?: string | number;
  after?: string | number;
}

export interface DiffReport {
  hasDrift: boolean;
  entries: DriftEntry[];
}

/**
 * Detects drift between two design token documents: colors added/removed/changed
 * (per mode), spacing scale changes, and typography changes. This is what a
 * "rebrand touched three surfaces but missed a fourth" catch looks like -- run
 * it between the token source and a snapshot of what's actually deployed on a
 * given surface (e.g. re-export mobile's tokens to JSON and diff against source).
 */
export function diffTokens(before: DesignTokens, after: DesignTokens): DiffReport {
  const entries: DriftEntry[] = [];

  diffColorGroup(before, after, entries);
  diffRecord('spacing', before.spacing, after.spacing, entries);
  diffRecord('typography.fontFamilies', before.typography.fontFamilies, after.typography.fontFamilies, entries);
  diffRecord('typography.fontSizes', before.typography.fontSizes, after.typography.fontSizes, entries);
  diffNumericRecord('typography.fontWeights', before.typography.fontWeights, after.typography.fontWeights, entries);
  diffRecord(
    'typography.lineHeights',
    stringifyRecord(before.typography.lineHeights),
    stringifyRecord(after.typography.lineHeights),
    entries
  );

  return { hasDrift: entries.length > 0, entries };
}

function diffColorGroup(before: DesignTokens, after: DesignTokens, entries: DriftEntry[]): void {
  const beforeKeys = new Set(Object.keys(before.colors));
  const afterKeys = new Set(Object.keys(after.colors));
  const allKeys = new Set([...beforeKeys, ...afterKeys]);

  for (const key of Array.from(allKeys).sort()) {
    const inBefore = beforeKeys.has(key);
    const inAfter = afterKeys.has(key);

    if (inBefore && !inAfter) {
      entries.push({ kind: 'removed', path: `colors.${key}`, before: before.colors[key].light });
      continue;
    }
    if (!inBefore && inAfter) {
      entries.push({ kind: 'added', path: `colors.${key}`, after: after.colors[key].light });
      continue;
    }

    const beforeToken = before.colors[key];
    const afterToken = after.colors[key];
    const modes: Array<'light' | 'dark' | 'highContrast'> = ['light', 'dark', 'highContrast'];
    for (const mode of modes) {
      const beforeVal = beforeToken[mode];
      const afterVal = afterToken[mode];
      if (beforeVal === afterVal) continue;
      if (beforeVal === undefined && afterVal !== undefined) {
        entries.push({ kind: 'added', path: `colors.${key}.${mode}`, after: afterVal });
      } else if (beforeVal !== undefined && afterVal === undefined) {
        entries.push({ kind: 'removed', path: `colors.${key}.${mode}`, before: beforeVal });
      } else {
        entries.push({ kind: 'changed', path: `colors.${key}.${mode}`, before: beforeVal, after: afterVal });
      }
    }
  }
}

function diffRecord(
  prefix: string,
  before: Record<string, string>,
  after: Record<string, string>,
  entries: DriftEntry[]
): void {
  const beforeKeys = new Set(Object.keys(before));
  const afterKeys = new Set(Object.keys(after));
  const allKeys = new Set([...beforeKeys, ...afterKeys]);

  for (const key of Array.from(allKeys).sort()) {
    const inBefore = beforeKeys.has(key);
    const inAfter = afterKeys.has(key);
    const path = `${prefix}.${key}`;

    if (inBefore && !inAfter) {
      entries.push({ kind: 'removed', path, before: before[key] });
    } else if (!inBefore && inAfter) {
      entries.push({ kind: 'added', path, after: after[key] });
    } else if (before[key] !== after[key]) {
      entries.push({ kind: 'changed', path, before: before[key], after: after[key] });
    }
  }
}

function diffNumericRecord(
  prefix: string,
  before: Record<string, number>,
  after: Record<string, number>,
  entries: DriftEntry[]
): void {
  diffRecord(prefix, stringifyRecord(before), stringifyRecord(after), entries);
}

function stringifyRecord(record: Record<string, number | string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    out[key] = String(value);
  }
  return out;
}

export function formatDriftReport(report: DiffReport): string {
  if (!report.hasDrift) {
    return 'No drift detected -- token sources are in sync.';
  }

  const lines: string[] = [`${report.entries.length} drift entr${report.entries.length === 1 ? 'y' : 'ies'} detected:`];
  for (const entry of report.entries) {
    switch (entry.kind) {
      case 'added':
        lines.push(`  + ${entry.path} = ${entry.after}`);
        break;
      case 'removed':
        lines.push(`  - ${entry.path} (was ${entry.before})`);
        break;
      case 'changed':
        lines.push(`  ~ ${entry.path}: ${entry.before} -> ${entry.after}`);
        break;
    }
  }
  return lines.join('\n');
}
