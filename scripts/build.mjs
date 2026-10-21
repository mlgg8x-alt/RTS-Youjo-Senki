import { build } from 'esbuild';
import { copyFile, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const dev = process.argv.includes('--dev');
const outDir = 'dist';

await mkdir(outDir, { recursive: true });

const result = await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  target: ['es2020', 'chrome80', 'safari14'],
  outfile: path.join(outDir, 'game.js'),
  minify: !dev,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'warning',
  metafile: true,
});

await copyFile('index.html', path.join(outDir, 'index.html'));
await copyFile('style.css', path.join(outDir, 'style.css'));

const bytes = (await stat(path.join(outDir, 'game.js'))).size;
const html = await readFile(path.join(outDir, 'index.html'), 'utf8');
if (!html.includes('game.js')) throw new Error('index.html does not reference game.js');

const out = (result.metafile?.outputs ?? {})['dist/game.js'];
console.log(`built dist/game.js — ${(bytes / 1024).toFixed(1)} KiB${out ? ` (${Object.keys(out.inputs).length} modules)` : ''}`);
await writeFile(path.join(outDir, 'build-info.json'), JSON.stringify({ bytes, at: new Date().toISOString() }, null, 2));
