/**
 * GET /api/preview/:jobId/status
 * Returns the current preview build status for a job.
 * Checks disk first so it survives server restarts.
 *
 * NO auth required — polled by the Preview and Publish tabs.
 */
import type { RequestHandler } from 'express';
import { getPreviewStatus, checkPreviewOnDisk } from '@/server/lib/previewRunner';

const handler: RequestHandler[] = [
  async (req, res) => {
    const { jobId } = req.params as { jobId: string };

    // Check disk first — statusMap is in-memory and cleared on restart
    const onDisk = await checkPreviewOnDisk(jobId);
    if (onDisk) {
      res.json({ status: 'ready' });
      return;
    }

    const state = getPreviewStatus(jobId);

    // 'idle' means the job is unknown — not in statusMap, not on disk.
    // Return 'error' so the client stops polling and shows a retry button
    // instead of spinning forever.
    if (state.status === 'idle') {
      res.json({
        status: 'error',
        error: 'Preview build not found. The server may have restarted — click "Try again" to rebuild.',
      });
      return;
    }

    res.json(state);
  },
];

export default handler;
