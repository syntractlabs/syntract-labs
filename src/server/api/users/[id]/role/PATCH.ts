/**
 * PATCH /api/users/:id/role
 * Admin-only: update a user's role.
 * Body: { role: 'admin' | 'developer' | 'viewer' }
 */
import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db/client';
import { user } from '../../../../db/schema';
import { getSessionUser } from '../../../../lib/session';
import { isValidRole } from '@/lib/roles';

export default async function handler(req: Request, res: Response) {
  try {
    const me = await getSessionUser(req);
    if (!me) return res.status(401).json({ error: 'Unauthorized' });
    if (me.role !== 'admin') return res.status(403).json({ error: 'Forbidden: admin only' });

    const { id } = req.params;
    const { role } = req.body;

    if (!isValidRole(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, developer, or viewer.' });
    }

    // Prevent admin from demoting themselves
    if (id === me.id && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    const result = await db
      .update(user)
      .set({ role: role as 'admin' | 'developer' | 'viewer' })
      .where(eq(user.id, String(id)))
      .execute();

    const affectedRows = (result as unknown as { affectedRows?: number }).affectedRows ?? 1;
    if (affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ ok: true, id, role });
  } catch (err) {
    console.error('api.users.role.patch.error', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
}
