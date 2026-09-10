import type { Request, Response, RequestHandler } from 'express';
import { requireSession } from '@/server/lib/require-session';
import { db } from '@/server/db/client';
import { apiKey } from '@/server/db/schema';
import { eq, count } from 'drizzle-orm';
import crypto from 'node:crypto';

function generateRawKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  const bytes = crypto.randomBytes(32);
  for (let i = 0; i < 32; i++) {
    suffix += chars[bytes[i] % chars.length];
  }
  return `dk_live_${suffix}`;
}

function hashKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

const handlers: RequestHandler[] = [
  requireSession,
  async function handler(req: Request, res: Response) {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const [{ value: keyCount }] = await db
      .select({ value: count() })
      .from(apiKey)
      .where(eq(apiKey.userId, req.userId!));

    if (keyCount >= 10) {
      res.status(400).json({ error: 'Maximum of 10 API keys per account' });
      return;
    }

    const rawKey = generateRawKey();
    const id = crypto.randomUUID();
    const keyPrefix = rawKey.slice(0, 14);

    await db.insert(apiKey).values({
      id,
      userId:    req.userId!,
      name:      name.trim(),
      keyHash:   hashKey(rawKey),
      keyPrefix,
    });

    res.status(201).json({
      id,
      name:      name.trim(),
      key:       rawKey,
      keyPrefix,
      createdAt: new Date().toISOString(),
    });
  },
];

export default handlers;
