/**
 * GET /api/preview/debug?jobId=xxx
 * Admin-only: dumps the raw FILE_MANIFEST content from the DB so we can
 * diagnose exactly what the agent produced and why compilation fails.
 */
import type { RequestHandler } from 'express';
import { db } from '@/server/db/client';
import { buildJob } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireSession } from '@/server/lib/require-session';

const handler: RequestHandler[] = [
  requireSession,
  async (req, res) => {
    const jobId = req.query.jobId as string;
    if (!jobId) { res.status(400).json({ error: 'jobId required' }); return; }

    const jobs = await db!.select().from(buildJob).where(eq(buildJob.id, jobId)).limit(1);
    if (!jobs.length) { res.status(404).json({ error: 'not found' }); return; }
    if (jobs[0].userId !== req.userId) { res.status(403).json({ error: 'forbidden' }); return; }

    const result = jobs[0].result ?? '';

    // Find the raw FILE_MANIFEST block
    const match = result.match(/```FILE_MANIFEST\s*\n([\s\S]*?)```/);
    const rawBlock = match ? match[1].trim() : null;

    // Try to parse it
    let parseError: string | null = null;
    let fileCount = 0;
    let files: Array<{ path: string; contentLength: number; firstLine: string; hasRealNewlines: boolean; hasLiteralBackslashN: boolean }> = [];

    if (rawBlock) {
      try {
        const parsed = JSON.parse(rawBlock) as Array<{ path: string; content: string }>;
        fileCount = parsed.length;
        files = parsed.map(f => {
          const content = f.content ?? '';
          const firstLine = content.split('\n')[0].slice(0, 120);
          return {
            path: f.path,
            contentLength: content.length,
            firstLine,
            hasRealNewlines: content.includes('\n'),
            hasLiteralBackslashN: content.includes('\\n'),
          };
        });
      } catch (e) {
        parseError = e instanceof Error ? e.message : String(e);
      }
    }

    // Also try to read the compiled preview HTML from disk
    let previewHtmlSnippet: string | null = null;
    let previewHtmlLength = 0;
    try {
      const { readFile: rf } = await import('node:fs/promises');
      const html = await rf(`/private/previews/${jobId}/index.html`, 'utf8');
      previewHtmlLength = html.length;
      // Extract the compiled module map section (between __PREVIEW_MODULES__= and ;\n)
      // and the first 3000 chars of the script block for inspection
      const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
      if (scriptMatch) {
        previewHtmlSnippet = scriptMatch[1].slice(0, 4000);
      }
    } catch {
      // preview not on disk yet
    }

    res.json({
      jobId,
      resultLength: result.length,
      hasManifest: !!match,
      rawBlockLength: rawBlock?.length ?? 0,
      parseError,
      fileCount,
      files,
      // First 500 chars of raw block for inspection
      rawBlockPreview: rawBlock?.slice(0, 500) ?? null,
      // Preview HTML info
      previewHtmlLength,
      previewHtmlSnippet,
    });
  },
];

export default handler;
