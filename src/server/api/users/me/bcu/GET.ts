/**
 * GET /api/users/me/bcu
 * Returns the authenticated user's current BCU balance.
 *
 * Response: { bcuTotal: number; bcuRemaining: number; bcuUsed: number }
 */
import type { Request, Response, RequestHandler } from 'express';
import { requireSession } from '@/server/lib/require-session';
import { db } from '@/server/db/client';
import { user } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

const handlers: RequestHandler[] = [
  requireSession,
  async function handler(req: Request, res: Response) {
    if (!db) { res.status(503).json({ error: 'Database not available' }); return; }

    const [row] = await db
      .select({ bcuTotal: user.bcuTotal, bcuRemaining: user.bcuRemaining })
      .from(user)
      .where(eq(user.id, req.userId!))
      .limit(1);

    if (!row) { res.status(404).json({ error: 'User not found' }); return; }

    const total     = parseFloat(String(row.bcuTotal     ?? 0));
    const remaining = parseFloat(String(row.bcuRemaining ?? 0));

    res.json({
      bcuTotal:     total,
      bcuRemaining: remaining,
      bcuUsed:      Math.max(0, parseFloat((total - remaining).toFixed(2))),
    });
  },
];

export default handlers;
