/**
 * SynTract Native Build Pipeline™ — In-process Job Store
 *
 * Persists native build job metadata to /private/native-builds/<jobId>/job.json.
 * This is intentionally lightweight — no DB dependency — so the pipeline can
 * run without a schema migration. Each job is a single JSON file.
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { BuildJob } from './types';

const STORE_DIR = '/private/native-builds';

export interface StoredJob extends BuildJob {
  userId: string;
  manifestFramework?: string;
  fileCount: number;
  providerOptions?: Record<string, unknown>;
  updatedAt: string;
}

export async function saveJob(job: StoredJob): Promise<void> {
  const dir = join(STORE_DIR, job.jobId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'job.json'), JSON.stringify(job, null, 2), 'utf-8');
}

export async function loadJob(jobId: string): Promise<StoredJob | null> {
  const path = join(STORE_DIR, jobId, 'job.json');
  if (!existsSync(path)) return null;
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as StoredJob;
  } catch {
    return null;
  }
}

export async function updateJob(
  jobId: string,
  patch: Partial<StoredJob>,
): Promise<StoredJob | null> {
  const existing = await loadJob(jobId);
  if (!existing) return null;
  const updated: StoredJob = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  await saveJob(updated);
  return updated;
}
