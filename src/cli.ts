#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseDesignTokens, TokenValidationError } from './schema.js';
import { toTailwindThemeExtension } from './transforms/tailwind.js';
import { toCssVariables } from './transforms/css.js';
import { toTypeScriptModule } from './transforms/typescript.js';
import { checkContrastPairs } from './contrast.js';
import { diffTokens, formatDriftReport } from './diff.js';

interface ParsedArgs {
  command: string;
  flags: Record<string, string>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = 'true';
      }
    }
  }
  return { command: command ?? '', flags };
}

async function loadTokens(path: string) {
  const raw = await readFile(resolve(path), 'utf-8');
  const json = JSON.parse(raw);
  return parseDesignTokens(json);
}

async function writeGenerated(path: string, contents: string): Promise<void> {
  const full = resolve(path);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, contents, 'utf-8');
}

async function runBuild(flags: Record<string, string>): Promise<number> {
  const input = flags.input;
  const outDir = flags['out-dir'] ?? 'dist';
  if (!input) {
    console.error('Error: --input <path> is required for `build`');
    return 1;
  }

  const tokens = await loadTokens(input);

  const tailwindOut = `${outDir}/tailwind.theme.mjs`;
  const cssOut = `${outDir}/variables.css`;
  const tsOut = `${outDir}/tokens.ts`;

  await Promise.all([
    writeGenerated(tailwindOut, toTailwindThemeExtension(tokens)),
    writeGenerated(cssOut, toCssVariables(tokens)),
    writeGenerated(tsOut, toTypeScriptModule(tokens)),
  ]);

  console.log(`Built ${tokens.name}@${tokens.version} -> ${outDir}`);
  console.log(`  - ${tailwindOut}`);
  console.log(`  - ${cssOut}`);
  console.log(`  - ${tsOut}`);
  return 0;
}

async function runCheckContrast(flags: Record<string, string>): Promise<number> {
  const input = flags.input;
  if (!input) {
    console.error('Error: --input <path> is required for `check-contrast`');
    return 1;
  }

  const tokens = await loadTokens(input);
  const results = checkContrastPairs(tokens);

  if (results.length === 0) {
    console.log('No contrastPairs defined in token source -- nothing to check.');
    return 0;
  }

  let failures = 0;
  for (const result of results) {
    const status = result.passes ? 'PASS' : 'FAIL';
    const line = `[${status}] ${result.pairName} (${result.mode}, ${result.level}): ${result.foreground} on ${result.background} = ${result.ratio}:1 (needs ${result.required}:1)`;
    if (result.passes) {
      console.log(line);
    } else {
      console.error(line);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} of ${results.length} contrast pair check(s) FAILED WCAG requirements.`);
    return 1;
  }

  console.log(`\nAll ${results.length} contrast pair check(s) passed.`);
  return 0;
}

async function runDiff(flags: Record<string, string>): Promise<number> {
  const a = flags.a;
  const b = flags.b;
  if (!a || !b) {
    console.error('Error: `diff` requires --a <path> and --b <path>');
    return 1;
  }

  const [tokensA, tokensB] = await Promise.all([loadTokens(a), loadTokens(b)]);
  const report = diffTokens(tokensA, tokensB);
  console.log(formatDriftReport(report));

  if (report.hasDrift && flags['fail-on-drift'] === 'true') {
    return 1;
  }
  return 0;
}

function printHelp(): void {
  console.log(`tokenforge -- single-source design tokens -> Tailwind, CSS, TypeScript

Usage:
  tokenforge build --input <tokens.json> --out-dir <dir>
  tokenforge check-contrast --input <tokens.json>
  tokenforge diff --a <tokens-a.json> --b <tokens-b.json> [--fail-on-drift true]

Commands:
  build            Validate and transform a token source into Tailwind/CSS/TS outputs
  check-contrast   Run WCAG AA/AAA contrast checks on declared contrastPairs (CI gate)
  diff             Detect drift between two token sources
`);
}

export async function main(argv: string[]): Promise<number> {
  const { command, flags } = parseArgs(argv);

  try {
    switch (command) {
      case 'build':
        return await runBuild(flags);
      case 'check-contrast':
        return await runCheckContrast(flags);
      case 'diff':
        return await runDiff(flags);
      case 'help':
      case '':
      case undefined:
        printHelp();
        return command === '' ? 1 : 0;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        return 1;
    }
  } catch (error) {
    if (error instanceof TokenValidationError) {
      console.error(error.message);
      return 1;
    }
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      return 1;
    }
    throw error;
  }
}

// Only run when executed directly (not when imported by tests).
const isMainModule = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
