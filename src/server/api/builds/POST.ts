/**
 * POST /api/builds
 * Creates a build job and streams SSE progress events.
 *
 * SSE events (in order):
 *   jobId        — unique job identifier (emitted first)
 *   status       — phase label string
 *   bcuEstimate  — { low, high, sufficient, remaining, complexity, reasoning }
 *   plan         — string[] of engineering steps
 *   step         — { index, text } as each step begins
 *   token        — streaming build output token
 *   done         — { result, durationMs, bcuUsed }
 *   error        — error message string (terminates stream)
 */
import type { Request, Response, RequestHandler } from 'express';
import { requireSession } from '@/server/lib/require-session';
import { randomUUID } from 'crypto';
import { db } from '@/server/db/client';
import { buildJob, user } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { runBuildAgent } from '@/server/lib/agent';

const handlers: RequestHandler[] = [
  requireSession,
  async function handler(req: Request, res: Response) {
    const { prompt } = req.body as { prompt?: string };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }
    if (prompt.trim().length > 4000) {
      res.status(400).json({ error: 'Prompt must be under 4000 characters' });
      return;
    }
    if (!db) { res.status(503).json({ error: 'Database not available' }); return; }

    // Resolve user role for BCU balance lookup
    let userRole = 'developer';
    try {
      const [row] = await db
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, req.userId!))
        .limit(1);
      if (row?.role) userRole = row.role;
    } catch { /* proceed with default role */ }

    const jobId = randomUUID();
    await db.insert(buildJob).values({
      id:     jobId,
      userId: req.userId!,
      prompt: prompt.trim(),
      status: 'queued',
    });

    // Emit jobId as the very first SSE event so the client can reference it
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write(`event: jobId\ndata: ${JSON.stringify(jobId)}\n\n`);

    await runBuildAgent(jobId, req.userId!, prompt.trim(), res, true, userRole);
  },
];

export default handlers;
