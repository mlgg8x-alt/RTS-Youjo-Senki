import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const outFile = 'scripts/.tmp/sim.test.mjs';
await mkdir('scripts/.tmp', { recursive: true });
await build({
  entryPoints: ['test/sim.test.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  outfile: outFile,
  logLevel: 'warning',
});

const mod = await import(pathToFileURL(path.resolve(outFile)).href + `?t=${Date.now()}`);
const summary = await mod.run();
await rm('scripts/.tmp', { recursive: true, force: true });
if (summary?.failed) process.exit(1);
