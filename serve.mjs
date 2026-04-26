// Tiny zero-dependency static file server.
// Usage: node serve.mjs [port]
// Defaults to port 5173. Serves files from the project root.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..');
const PORT = Number(process.argv[2] || process.env.PORT || 5173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function safeJoin(rootDir, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const norm = normalize(decoded).replace(/^([./\\])+/, '');
  const full = resolve(rootDir, norm);
  if (!full.startsWith(rootDir + sep) && full !== rootDir) return null;
  return full;
}

const server = createServer(async (req, res) => {
  const reqPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = safeJoin(ROOT, reqPath);
  if (!filePath) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    let target = filePath;
    const s = await stat(target).catch(() => null);
    if (s && s.isDirectory()) {
      target = resolve(target, 'index.html');
    }
    const data = await readFile(target);
    const mime = MIME[extname(target).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-store',
      // Loosen CORP so esm.sh modules can post-process if needed.
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    res.end(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${reqPath}`);
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`500 ${err.message}`);
    }
  }
});

server.listen(PORT, () => {
  console.log(`ECG demo serving ${ROOT}`);
  console.log(`  → http://localhost:${PORT}`);
});
