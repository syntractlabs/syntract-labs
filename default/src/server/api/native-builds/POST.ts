/**
 * POST /api/native-builds
 *
 * Submit a new native build job.
 *
 * Body:
 *   jobId       — SynTract build job ID (used to locate the FILE_MANIFEST)
 *   platforms   — Array of platforms to build: ["ios","android","web"]
 *   provider    — (optional) Provider name. Defaults to best available per platform.
 *   providerOptions — (optional) Provider-specific config (branch, buildProfile, etc.)
 *
 * Returns:
 *   { nativeBuildId, jobs: BuildJob[] }
 */

import type { Request, Response, RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { requireSession } from '@/server/lib/require-session';
import { resolveProvider } from '@/server/native-build/registry';
import { saveJob } from '@/server/native-build/job-store';
import type { FileManifest, Platform, BuildConfig } from '@/server/native-build/types';

// Minimal FILE_MANIFEST extraction from a build result string
function extractManifest(result: string): FileManifest | null {
  const fenceRe = /```(?:json)?\s*\n([\s\S]*?)\n```/g;
  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(result)) !== null) {
    candidates.push(m[1]);
  }
  candidates.sort((a, b) => b.length - a.length);
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (parsed && typeof parsed === 'object' && parsed.files) {
        return parsed as FileManifest;
      }
    } catch {
      // not valid JSON, skip
    }
  }
  try {
    const parsed = JSON.parse(result);
    if (parsed?.files) return parsed as FileManifest;
  } catch {
    // ignore
  }
  return null;
}

function detectFramework(files: Record<string, string>): FileManifest['framework'] {
  const names = Object.keys(files).join(' ');
  if (names.includes('app.json') || names.includes('expo')) return 'expo';
  if (names.includes('capacitor.config')) return 'capacitor';
  if (names.includes('react-native') || names.includes('android/') || names.includes('ios/')) return 'react-native';
  return 'web';
}

const handlers: RequestHandler[] = [
  requireSession,
  async function handler(req: Request, res: Response) {
    const userId = req.userId!;

    const { jobId, platforms, provider: providerName, providerOptions } = req.body as {
      jobId?: string;
      platforms?: string[];
      provider?: string;
      providerOptions?: Record<string, unknown>;
    };

    if (!jobId) {
      res.status(400).json({ error: 'jobId is required' });
      return;
    }

    const requestedPlatforms: Platform[] = (platforms ?? ['web']).filter((p): p is Platform =>
      ['ios', 'android', 'web'].includes(p),
    );

    if (requestedPlatforms.length === 0) {
      res.status(400).json({ error: 'At least one valid platform is required (ios, android, web)' });
      return;
    }

    // Load the build result to extract the FILE_MANIFEST
    let manifest: FileManifest;
    try {
      const { db } = await import('@/server/db/client');
      const { buildJob } = await import('@/server/db/schema');
      const { eq } = await import('drizzle-orm');

      if (!db) { res.status(503).json({ error: 'Database not available' }); return; }

      const rows = await db.select().from(buildJob).where(eq(buildJob.id, jobId)).limit(1);
      if (!rows.length) {
        res.status(404).json({ error: `Build job "${jobId}" not found` });
        return;
      }

      const row = rows[0];
      if (row.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const result = row.result ?? '';
      const extracted = extractManifest(result);
      if (!extracted) {
        res.status(400).json({
          error: 'No FILE_MANIFEST found in build result. Run a build first.',
        });
        return;
      }

      manifest = {
        ...extracted,
        framework: extracted.framework ?? detectFramework(extracted.files),
      };
    } catch (err) {
      console.error('native-builds.post.db-error', err);
      res.status(500).json({ error: 'Failed to load build job' });
      return;
    }

    // Submit one job per platform
    const nativeBuildId = randomUUID();
    const submittedJobs = [];

    for (const platform of requestedPlatforms) {
      try {
        const provider = resolveProvider(platform, providerName);
        const config: BuildConfig = {
          jobId: `${nativeBuildId}:${platform}`,
          platforms: [platform],
          providerOptions,
          userId,
        };

        const job = await provider.submitBuild(manifest, config);

        await saveJob({
          ...job,
          userId,
          manifestFramework: manifest.framework,
          fileCount: Object.keys(manifest.files).length,
          providerOptions,
          updatedAt: new Date().toISOString(),
        });

        submittedJobs.push(job);
      } catch (err) {
        console.error(`native-builds.post.submit-error [${platform}]`, err);
        submittedJobs.push({
          platform,
          error: err instanceof Error ? err.message : String(err),
          status: 'failed',
        });
      }
    }

    res.status(202).json({
      nativeBuildId,
      sourceJobId: jobId,
      framework: manifest.framework,
      jobs: submittedJobs,
    });
  },
];

export default handlers;
