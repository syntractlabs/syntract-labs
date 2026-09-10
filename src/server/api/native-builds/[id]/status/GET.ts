/**
 * GET /api/native-builds/:id/status
 *
 * Returns the current status of a native build job.
 * Also supports SSE streaming of log chunks when the client sends
 * Accept: text/event-stream.
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

    // SSE mode
    if (req.headers.accept?.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const sendEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      try {
        const status = await provider.getStatus(job.externalId, id);
        sendEvent('status', status);
        for await (const chunk of provider.getLogs(job.externalId, id)) {
          sendEvent('log', chunk);
        }
        const finalStatus = await provider.getStatus(job.externalId, id);
        sendEvent('status', finalStatus);
        sendEvent('done', { jobId: id, status: finalStatus.status });
      } catch (err) {
        sendEvent('error', { message: err instanceof Error ? err.message : String(err) });
      } finally {
        res.end();
      }
      return;
    }

    // JSON mode
    try {
      const status = await provider.getStatus(job.externalId, id);
      res.json({ jobId: id, provider: job.provider, platforms: job.platforms, status: status.status, message: status.message, updatedAt: status.updatedAt, progress: status.progress, externalId: status.externalId });
    } catch (err) {
      console.error('native-builds.status.error', err);
      res.status(500).json({ error: 'Failed to fetch build status' });
    }
  },
];

export default handlers;
