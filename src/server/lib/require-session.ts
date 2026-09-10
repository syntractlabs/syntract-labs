/**
 * Express middleware that validates a BetterAuth session cookie.
 * Attaches `req.userId` on success; returns 401 on failure.
 */
import type { Request, Response, NextFunction } from 'express';
import { getAuth } from '@/lib/auth/auth';
import { toWebRequest } from '@/lib/auth/express-adapter';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function deriveBaseURL(_req: Request): string {
  return 'https://syntract.net';
}

export async function requireSession(req: Request, res: Response, next: NextFunction) {
  try {
    const baseURL = deriveBaseURL(req);
    const auth = getAuth(baseURL);
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session?.user?.id) {
      res.status(401).json({ error: 'Unauthorized', message: 'Session not found — please sign in.' });
      return;
    }
    req.userId = session.user.id;
    next();
  } catch (err) {
    console.error('[require-session] error:', err);
    res.status(401).json({ error: 'Unauthorized', message: 'Session check failed — please sign in.' });
  }
}
