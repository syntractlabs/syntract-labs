import type { Request, Response, RequestHandler } from 'express';
import { requireSession } from '@/server/lib/require-session';
import { db } from '@/server/db/client';
import { apiKey } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

const handlers: RequestHandler[] = [
  requireSession,
  async function handler(req: Request, res: Response) {
    const keys = await db
      .select({
        id:           apiKey.id,
        name:         apiKey.name,
        keyPrefix:    apiKey.keyPrefix,
        requestCount: apiKey.requestCount,
        lastUsedAt:   apiKey.lastUsedAt,
        createdAt:    apiKey.createdAt,
      })
      .from(apiKey)
      .where(eq(apiKey.userId, req.userId!))
      .orderBy(apiKey.createdAt);

    res.json(keys);
  },
];

export default handlers;
