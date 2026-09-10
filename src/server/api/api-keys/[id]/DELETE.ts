import type { Request, Response, RequestHandler } from 'express';
import { requireSession } from '@/server/lib/require-session';
import { db } from '@/server/db/client';
import { sql } from 'drizzle-orm';

const handlers: RequestHandler[] = [
  requireSession,
  async function handler(req: Request, res: Response) {
    const { id } = req.params;
    await db.execute(
      sql`DELETE FROM api_key WHERE id = ${id} AND user_id = ${req.userId!}`
    );
    res.json({ ok: true });
  },
];

export default handlers;
