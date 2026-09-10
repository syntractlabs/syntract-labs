/**
 * GET /api/preview/:jobId/status
 * Returns the current preview build status for a job.
 * Checks disk first so it survives server restarts.
 *
 * NO auth required — the status endpoint is polled by the preview tab
 * and must be accessible without a session.
 */
import type { RequestHandler } from 'express';
import { getPreviewStatus, checkPreviewOnDisk } from '@/server/lib/previewRunner';

const handler: RequestHandler[] = [
  async (req, res) => {
    const { jobId } = req.params as { jobId: string };

    // Check disk first (survives server restarts — statusMap is in-memory only)
    const onDisk = await checkPreviewOnDisk(jobId);
    if (onDisk) {
      res.json({ status: 'ready' });
      return;
    }

    const state = getPreviewStatus(jobId);

    // If the job is unknown (not in statusMap, not on disk) the client is polling
    // for a build that either never started or whose status was lost on restart.
    // Return 'error' so the UI stops spinning and shows a retry button instead of
    // looping forever on 'idle'.
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
