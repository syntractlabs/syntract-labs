/**
 * POST /api/preview
 * Body: { jobId: string }
 *
 * Kicks off a background preview build for the given build job.
 * Returns immediately with { status: 'building' }.
 * Poll GET /api/preview/:jobId for status updates.
 */
import type { RequestHandler } from 'express';
import { db } from '@/server/db/client';
import { buildJob } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { buildPreview, getPreviewStatus, extractFileManifest } from '@/server/lib/previewRunner';
import { requireSession } from '@/server/lib/require-session';

const handler: RequestHandler[] = [
  requireSession,
  async (req, res) => {
    const { jobId } = req.body as { jobId?: string };
    if (!jobId) {
      res.status(400).json({ error: 'jobId is required' });
      return;
    }

    // Verify the job belongs to this user and is complete
    const job = await db!.select().from(buildJob).where(eq(buildJob.id, jobId)).limit(1);
    if (!job.length) {
      res.status(404).json({ error: 'Build job not found' });
      return;
    }
    if (job[0].userId !== req.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (job[0].status !== 'complete') {
      res.status(400).json({ error: 'Build job is not complete yet' });
      return;
    }
    if (!job[0].result) {
      res.status(400).json({ error: 'Build job has no result' });
      return;
    }

    // Fast-fail: check for FILE_MANIFEST before kicking off the background build.
    // This gives the client an immediate 400 with a clear message instead of making
    // it poll until the background job sets status:'error' in statusMap.
    const files = extractFileManifest(job[0].result);
    if (!files || files.length === 0) {
      res.status(400).json({
        error: 'No FILE_MANIFEST found in this build result. The agent output may have been truncated — run a new build to generate a previewable project.',
      });
      return;
    }

    // If already building in this process, return current status
    const current = getPreviewStatus(jobId);
    if (current.status === 'building') {
      res.json({ status: 'building' });
      return;
    }

    // Always rebuild — never serve stale cached previews
    buildPreview(jobId, job[0].result).catch(e =>
      console.error('preview.background.error', e)
    );

    res.json({ status: 'building' });
  },
];

export default handler;
