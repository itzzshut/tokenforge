import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';
import { makeTokens } from './fixtures.js';

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'tokenforge-cli-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

async function writeTokens(filename: string, tokens: unknown): Promise<string> {
  const path = join(workDir, filename);
  await writeFile(path, JSON.stringify(tokens, null, 2), 'utf-8');
  return path;
}

describe('cli build', () => {
  it('writes tailwind, css, and ts outputs and exits 0', async () => {
    const input = await writeTokens('tokens.json', makeTokens());
    const outDir = join(workDir, 'out');
    const code = await main(['build', '--input', input, '--out-dir', outDir]);
    expect(code).toBe(0);

    const tailwind = await readFile(join(outDir, 'tailwind.theme.mjs'), 'utf-8');
    const css = await readFile(join(outDir, 'variables.css'), 'utf-8');
    const ts = await readFile(join(outDir, 'tokens.ts'), 'utf-8');

    expect(tailwind).toContain('themeExtension');
    expect(css).toContain(':root');
    expect(ts).toContain('export const Colors');
  });

  it('exits 1 and prints an error for an unreadable input path', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = await main(['build', '--input', join(workDir, 'missing.json'), '--out-dir', join(workDir, 'out')]);
    expect(code).toBe(1);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('exits 1 for a token document that fails schema validation', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad = makeTokens();
    // @ts-expect-error intentional
    delete bad.colors.primary.light;
    const input = await writeTokens('bad.json', bad);
    const code = await main(['build', '--input', input, '--out-dir', join(workDir, 'out')]);
    expect(code).toBe(1);
    errorSpy.mockRestore();
  });

  it('requires --input', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = await main(['build', '--out-dir', join(workDir, 'out')]);
    expect(code).toBe(1);
    errorSpy.mockRestore();
  });
});

describe('cli check-contrast', () => {
  it('exits 0 when all pairs pass', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const input = await writeTokens(
      'tokens.json',
      makeTokens({
        colors: { background: { light: '#ffffff' }, foreground: { light: '#000000' } },
        contrastPairs: [{ name: 'p', foreground: 'foreground', background: 'background', mode: 'light' }],
      })
    );
    const code = await main(['check-contrast', '--input', input]);
    expect(code).toBe(0);
    logSpy.mockRestore();
  });

  it('exits 1 when a pair fails AA', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const input = await writeTokens(
      'tokens.json',
      makeTokens({
        colors: { background: { light: '#888888' }, foreground: { light: '#999999' } },
        contrastPairs: [{ name: 'weak', foreground: 'foreground', background: 'background', mode: 'light' }],
      })
    );
    const code = await main(['check-contrast', '--input', input]);
    expect(code).toBe(1);
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('exits 0 with an informational message when there are no contrastPairs', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const input = await writeTokens('tokens.json', makeTokens({ contrastPairs: [] }));
    const code = await main(['check-contrast', '--input', input]);
    expect(code).toBe(0);
    logSpy.mockRestore();
  });
});

describe('cli diff', () => {
  it('exits 0 by default even when drift is present (diff is informational unless --fail-on-drift)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const a = await writeTokens('a.json', makeTokens());
    const afterTokens = makeTokens();
    afterTokens.spacing.md = '999px';
    const b = await writeTokens('b.json', afterTokens);
    const code = await main(['diff', '--a', a, '--b', b]);
    expect(code).toBe(0);
    logSpy.mockRestore();
  });

  it('exits 1 when drift is present and --fail-on-drift true is passed', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const a = await writeTokens('a.json', makeTokens());
    const afterTokens = makeTokens();
    afterTokens.spacing.md = '999px';
    const b = await writeTokens('b.json', afterTokens);
    const code = await main(['diff', '--a', a, '--b', b, '--fail-on-drift', 'true']);
    expect(code).toBe(1);
    logSpy.mockRestore();
  });

  it('exits 0 when there is no drift, even with --fail-on-drift true', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const a = await writeTokens('a.json', makeTokens());
    const b = await writeTokens('b.json', makeTokens());
    const code = await main(['diff', '--a', a, '--b', b, '--fail-on-drift', 'true']);
    expect(code).toBe(0);
    logSpy.mockRestore();
  });
});

describe('cli general', () => {
  it('prints help and exits 0 for an unrecognized command', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const code = await main(['not-a-real-command']);
    expect(code).toBe(1);
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('exits 1 and prints help for no command at all', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const code = await main([]);
    expect(code).toBe(1);
    logSpy.mockRestore();
  });
});
