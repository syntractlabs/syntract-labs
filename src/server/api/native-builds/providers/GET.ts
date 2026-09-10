/**
 * GET /api/native-builds/providers
 *
 * Returns the list of all registered build providers with their capabilities.
 * No auth required — this is used to populate the provider selector in the UI.
 */

import type { Request, Response } from 'express';
import { summariseProviders } from '@/server/native-build/registry';

export default function handler(_req: Request, res: Response): void {
  res.json({ providers: summariseProviders() });
}
