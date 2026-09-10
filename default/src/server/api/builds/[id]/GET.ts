/**
 * GET /api/builds/:id
 * Returns a single build job including its full result and plan.
 */
import type { Request, Response, RequestHandler } from 'express';
import { requireSession } from '@/server/lib/require-session';
import { db } from '@/server/db/client';
import { buildJob } from '@/server/db/schema';
import { sql } from 'drizzle-orm';

const handlers: RequestHandler[] = [
  requireSession,
  async function handler(req: Request, res: Response) {
    if (!db) { res.status(503).json({ error: 'Database not available' }); return; }

    const { id } = req.params;
    const rows = await db
      .select()
      .from(buildJob)
      .where(sql`${buildJob.id} = ${id} AND ${buildJob.userId} = ${req.userId!}`)
      .limit(1);

    const job = rows[0];
    if (!job) { res.status(404).json({ error: 'Build job not found' }); return; }

    res.json({ job });
  },
];

export default handlers;
