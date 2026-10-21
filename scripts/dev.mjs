import { context } from 'esbuild';
import http from 'node:http';
import { readFile, copyFile, mkdir } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const root = 'dist';

await mkdir(root, { recursive: true });
const ctx = await context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  outfile: path.join(root, 'game.js'),
  minify: false,
  sourcemap: false,
  logLevel: 'info',
  plugins: [
    {
      name: 'copy-static',
      setup(build) {
        build.onEnd(async (result) => {
          if (result.errors.length) return;
          await copyFile('index.html', path.join(root, 'index.html'));
          await copyFile('style.css', path.join(root, 'style.css'));
          console.log(`[dev] rebuilt ${new Date().toLocaleTimeString()}`);
        });
      },
    },
  ],
});
await ctx.watch();

const copyStatic = async () => {
  await copyFile('index.html', path.join(root, 'index.html'));
  await copyFile('style.css', path.join(root, 'style.css'));
};
await copyStatic();
for (const file of ['index.html', 'style.css']) {
  watch(file, { persistent: true }, async () => {
    try {
      await copyStatic();
      console.log(`[dev] copied ${file}`);
    } catch (err) {
      console.error(`[dev] copy failed: ${err.message}`);
    }
  });
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let file = decodeURIComponent(url.pathname);
    if (file === '/' || file === '') file = '/index.html';
    const full = path.join(root, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
    const data = await readFile(full);
    res.writeHead(200, { 'Content-Type': types[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[dev] serving ${root} on http://${HOST}:${PORT}`);
});

process.on('SIGINT', async () => {
  await ctx.dispose();
  server.close(() => process.exit(0));
});
