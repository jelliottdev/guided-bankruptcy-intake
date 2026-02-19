import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs';
import path from 'node:path';

const BASE_PATH = '/guided-bankruptcy-intake/';
const WALLACE_DOCS_DIR = process.env.WALLACE_DOCS_DIR ?? path.resolve(process.cwd(), 'Documents - Wallace');

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    {
      name: 'redirect-base-no-trailing-slash',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url ?? '';
          const [path, query] = url.split('?');
          if (path === BASE_PATH.slice(0, -1)) {
            res.statusCode = 302;
            res.setHeader('Location', `${BASE_PATH}${query ? `?${query}` : ''}`);
            res.end();
            return;
          }
          next();
        });
      },
    },
    {
      name: 'serve-wallace-docs-dev',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url ?? '';
          const [pathname] = url.split('?');
          const prefix = `${BASE_PATH}__wallace_docs/`;
          if (!pathname.startsWith(prefix)) return next();

          const root = path.resolve(WALLACE_DOCS_DIR);
          if (!fs.existsSync(root)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Wallace docs folder not found', root }));
            return;
          }

          const rel = pathname.slice(prefix.length);
          if (rel === 'index.json') {
            try {
              const files = fs
                .readdirSync(root)
                .filter((name) => !name.startsWith('.'))
                .sort((a, b) => a.localeCompare(b));
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, root, files }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: String(err ?? 'Failed to read directory') }));
            }
            return;
          }

          let decoded = '';
          try {
            decoded = decodeURIComponent(rel);
          } catch {
            res.statusCode = 400;
            res.end('Bad request');
            return;
          }

          // Prevent path traversal outside the Wallace docs dir.
          const candidate = path.resolve(root, decoded);
          if (!(candidate === root || candidate.startsWith(root + path.sep))) {
            res.statusCode = 403;
            res.end('Forbidden');
            return;
          }

          if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }

          const ext = path.extname(candidate).toLowerCase();
          const contentType =
            ext === '.pdf'
              ? 'application/pdf'
              : ext === '.png'
                ? 'image/png'
                : ext === '.jpg' || ext === '.jpeg'
                  ? 'image/jpeg'
                  : 'application/octet-stream';
          res.statusCode = 200;
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'no-store');
          fs.createReadStream(candidate).pipe(res);
        });
      },
    },
  ],
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
