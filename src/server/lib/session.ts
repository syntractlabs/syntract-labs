/**
 * Resolves the current session user (including role) from a request.
 * Returns null if no valid session exists.
 */
import type { Request } from 'express';
import { eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth/auth';
import { toWebRequest } from '@/lib/auth/express-adapter';
import { db } from '../db/client';
import { user } from '../db/schema';
import type { UserRole } from '@/lib/roles';

function deriveBaseURL(_req: Request): string {
  return 'https://syntract.net';
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isAdmin: boolean;
}

export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  try {
    const baseURL = deriveBaseURL(req);
    const auth = getAuth(baseURL);
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session?.user?.id) return null;

    const [row] = await db
      .select({ id: user.id, name: user.name, email: user.email, role: user.role, isAdmin: user.isAdmin })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!row) return null;

    return {
      id:      row.id,
      name:    row.name,
      email:   row.email,
      role:    (row.role as UserRole) || 'developer',
      isAdmin: row.isAdmin,
    };
  } catch {
    return null;
  }
}
