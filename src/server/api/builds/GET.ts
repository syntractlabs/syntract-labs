/**
 * GET /api/builds
 * Returns the authenticated user's build job history (most recent first).
 */
import type { Request, Response, RequestHandler } from 'express';
import { requireSession } from '@/server/lib/require-session';
import { db } from '@/server/db/client';
import { buildJob } from '@/server/db/schema';
import { eq, desc } from 'drizzle-orm';

const handlers: RequestHandler[] = [
  requireSession,
  async function handler(req: Request, res: Response) {
    if (!db) { res.status(503).json({ error: 'Database not available' }); return; }

    const jobs = await db
      .select({
        id:         buildJob.id,
        prompt:     buildJob.prompt,
        status:     buildJob.status,
        durationMs: buildJob.durationMs,
        createdAt:  buildJob.createdAt,
      })
      .from(buildJob)
      .where(eq(buildJob.userId, req.userId!))
      .orderBy(desc(buildJob.createdAt))
      .limit(50);

    res.json({ jobs });
  },
];

export default handlers;
