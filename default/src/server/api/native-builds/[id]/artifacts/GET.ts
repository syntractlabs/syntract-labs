/**
 * GET /api/native-builds/:id/artifacts
 *
 * Returns the list of downloadable artifacts for a completed native build job.
 */

import type { Request, Response, RequestHandler } from 'express';
import { requireSession } from '@/server/lib/require-session';
import { loadJob } from '@/server/native-build/job-store';
import { getProvider } from '@/server/native-build/registry';

const handlers: RequestHandler[] = [
  requireSession,
  async function handler(req: Request, res: Response) {
    const userId = req.userId!;
    const id = String(req.params.id);

    const job = await loadJob(id);
    if (!job) {
      res.status(404).json({ error: 'Native build job not found' });
      return;
    }
    if (job.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const provider = getProvider(job.provider);
    if (!provider) {
      res.status(500).json({ error: `Provider "${job.provider}" is no longer registered` });
      return;
    }

    try {
      const artifacts = await provider.getArtifacts(job.externalId, id);
      res.json({ jobId: id, provider: job.provider, artifacts });
    } catch (err) {
      console.error('native-builds.artifacts.error', err);
      res.status(500).json({ error: 'Failed to fetch artifacts' });
    }
  },
];

export default handlers;
