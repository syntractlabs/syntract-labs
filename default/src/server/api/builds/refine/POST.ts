/**
 * POST /api/builds/refine
 * Takes an existing build job result + a refinement prompt, creates a new job,
 * and streams SSE progress events for the refined build via o3.
 */
import type { Request, Response, RequestHandler } from 'express';
import { requireSession } from '@/server/lib/require-session';
import { randomUUID } from 'crypto';
import { db } from '@/server/db/client';
import { buildJob } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { runRefineAgent } from '@/server/lib/agent';

const handlers: RequestHandler[] = [
  requireSession,
  async function handler(req: Request, res: Response) {
    const { refinePrompt, sourceJobId } = req.body as {
      refinePrompt?: string;
      sourceJobId?: string;
    };

    if (!refinePrompt || typeof refinePrompt !== 'string' || !refinePrompt.trim()) {
      res.status(400).json({ error: 'refinePrompt is required' });
      return;
    }
    if (!sourceJobId || typeof sourceJobId !== 'string') {
      res.status(400).json({ error: 'sourceJobId is required' });
      return;
    }
    if (!db) { res.status(503).json({ error: 'Database not available' }); return; }

    // Load the source job to get its result
    const [source] = await db
      .select()
      .from(buildJob)
      .where(eq(buildJob.id, sourceJobId))
      .limit(1);

    if (!source) {
      res.status(404).json({ error: 'Source job not found' });
      return;
    }
    if (source.userId !== req.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (!source.result) {
      res.status(400).json({ error: 'Source job has no result to refine' });
      return;
    }

    const jobId = randomUUID();
    await db.insert(buildJob).values({
      id:     jobId,
      userId: req.userId!,
      prompt: `[Refinement] ${refinePrompt.trim()}`,
      status: 'queued',
    });

    // Emit jobId as the very first SSE event
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write(`event: jobId\ndata: ${JSON.stringify(jobId)}\n\n`);

    await runRefineAgent(jobId, req.userId!, refinePrompt.trim(), source.result, res, true);
  },
];

export default handlers;
