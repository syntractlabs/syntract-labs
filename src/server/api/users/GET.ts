/**
 * GET /api/users
 * Admin-only: list all users with their roles.
 */
import type { Request, Response } from 'express';
import { db } from '../../db/client';
import { user } from '../../db/schema';
import { getSessionUser } from '../../lib/session';

export default async function handler(req: Request, res: Response) {
  try {
    const me = await getSessionUser(req);
    if (!me) return res.status(401).json({ error: 'Unauthorized' });
    if (me.role !== 'admin') return res.status(403).json({ error: 'Forbidden: admin only' });

    const users = await db
      .select({
        id:            user.id,
        name:          user.name,
        email:         user.email,
        role:          user.role,
        emailVerified: user.emailVerified,
        createdAt:     user.createdAt,
      })
      .from(user)
      .orderBy(user.createdAt);

    res.json({ users });
  } catch (err) {
    console.error('api.users.get.error', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}
