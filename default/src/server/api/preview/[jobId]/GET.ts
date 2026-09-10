/**
 * GET /preview/:jobId
 * Serves the compiled preview HTML for a completed build job.
 * Files live at /private/previews/<jobId>/index.html (written by previewRunner).
 *
 * No auth required — the HTML is sandboxed generated code with no sensitive data.
 * Auth is enforced on the API endpoints that trigger and query builds.
 */
import type { RequestHandler } from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREVIEWS_DIR = '/private/previews';

const handler: RequestHandler = async (req, res) => {
  const { jobId } = req.params as { jobId: string };

  // Strict UUID validation — prevents any path traversal attempt
  if (!UUID_RE.test(jobId)) {
    res.status(400).send('<h1>Invalid job ID</h1>');
    return;
  }

  const filePath = path.join(PREVIEWS_DIR, jobId, 'index.html');

  try {
    const html = await readFile(filePath, 'utf8');
    res
      .status(200)
      .set('Content-Type', 'text/html; charset=utf-8')
      .set('Cache-Control', 'no-store')
      .set('X-Frame-Options', 'SAMEORIGIN')
      .set('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http:; frame-ancestors 'self'")
      .send(html);
  } catch {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><style>
        body { margin: 0; background: #0A0D12; color: #94a3b8; font-family: system-ui, sans-serif;
               display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .box { text-align: center; padding: 32px; }
        h2 { color: #f1f5f9; margin: 0 0 8px; font-size: 18px; }
        p  { margin: 0; font-size: 13px; }
      </style></head>
      <body>
        <div class="box">
          <h2>Preview not ready</h2>
          <p>Click <strong>Build &amp; preview</strong> in the Preview tab to compile this build.</p>
        </div>
      </body>
      </html>
    `);
  }
};

export default [handler] as RequestHandler[];
