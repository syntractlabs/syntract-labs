/**
 * Codemagic Provider
 *
 * Submits builds to Codemagic CI/CD via their REST API.
 * Supports iOS (IPA) and Android (APK/AAB) for React Native, Flutter, and native apps.
 *
 * Required credentials (stored as app secrets):
 *   CODEMAGIC_API_TOKEN  — Codemagic API token (from Team settings → Integrations)
 *   CODEMAGIC_APP_ID     — Codemagic application ID
 *   CODEMAGIC_WORKFLOW_ID — Workflow ID to trigger (e.g. "ios-workflow", "android-workflow")
 *
 * Docs: https://docs.codemagic.io/rest-api/builds/
 */

import type {
  BuildProvider,
  BuildJob,
  BuildConfig,
  BuildStatusResult,
  Artifact,
  FileManifest,
  LogChunk,
  Platform,
} from '../types';
import { getSecret } from '#airo/secrets';

const CM_API = 'https://api.codemagic.io';

type CmBuildStatus =
  | 'queued'
  | 'preparing'
  | 'building'
  | 'testing'
  | 'publishing'
  | 'finished'
  | 'failed'
  | 'canceled'
  | 'timeout';

interface CmBuildResponse {
  _id: string;
  status: CmBuildStatus;
  artefacts?: Array<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }>;
  updatedAt?: string;
  finishedAt?: string;
  message?: string;
}

function mapStatus(cm: CmBuildStatus): BuildStatusResult['status'] {
  switch (cm) {
    case 'queued':
    case 'preparing':
      return 'queued';
    case 'building':
    case 'testing':
    case 'publishing':
      return 'running';
    case 'finished':
      return 'success';
    case 'failed':
    case 'timeout':
      return 'failed';
    case 'canceled':
      return 'cancelled';
    default:
      return 'queued';
  }
}

function detectPlatformFromArtifact(name: string): Platform {
  const lower = name.toLowerCase();
  if (lower.endsWith('.ipa')) return 'ios';
  if (lower.endsWith('.apk') || lower.endsWith('.aab')) return 'android';
  return 'web';
}

async function cmFetch<T>(
  path: string,
  options: RequestInit = {},
  token: string,
): Promise<T> {
  const res = await fetch(`${CM_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Codemagic API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export class CodemagicProvider implements BuildProvider {
  readonly name = 'codemagic';
  readonly displayName = 'Codemagic CI/CD';
  readonly supportedPlatforms: ReadonlyArray<Platform> = ['ios', 'android'];
  readonly requiresCredentials = true;
  readonly description =
    'Builds iOS (IPA) and Android (APK/AAB) via Codemagic. Requires CODEMAGIC_API_TOKEN, CODEMAGIC_APP_ID, and CODEMAGIC_WORKFLOW_ID secrets.';

  private getToken(): string {
    const t = getSecret('CODEMAGIC_API_TOKEN');
    if (!t || typeof t !== 'string') throw new Error('CODEMAGIC_API_TOKEN secret is not configured');
    return t;
  }

  private getAppId(): string {
    const id = getSecret('CODEMAGIC_APP_ID');
    if (!id || typeof id !== 'string') throw new Error('CODEMAGIC_APP_ID secret is not configured');
    return id;
  }

  private getWorkflowId(_platform: Platform): string {
    const id = getSecret('CODEMAGIC_WORKFLOW_ID');
    if (!id || typeof id !== 'string') throw new Error('CODEMAGIC_WORKFLOW_ID secret is not configured');
    return id;
  }

  async submitBuild(manifest: FileManifest, config: BuildConfig): Promise<BuildJob> {
    const token = this.getToken();
    const appId = this.getAppId();
    const { jobId, platforms } = config;

    const supportedPlatforms = platforms.filter((p) =>
      (this.supportedPlatforms as ReadonlyArray<string>).includes(p),
    );
    if (supportedPlatforms.length === 0) {
      throw new Error('CodemagicProvider: no supported platforms requested (ios, android)');
    }

    const platform = supportedPlatforms[0];
    const workflowId = this.getWorkflowId(platform);

    const body = {
      appId,
      workflowId,
      branch: (config.providerOptions?.branch as string) ?? 'main',
      environment: {
        variables: {
          SYNTRACT_JOB_ID: jobId,
          SYNTRACT_FRAMEWORK: manifest.framework ?? 'unknown',
          SYNTRACT_FILE_COUNT: String(Object.keys(manifest.files).length),
          ...(config.providerOptions?.envVars as Record<string, string> ?? {}),
        },
      },
    };

    const result = await cmFetch<{ buildId: string }>(
      '/builds',
      { method: 'POST', body: JSON.stringify(body) },
      token,
    );

    return {
      externalId: result.buildId,
      jobId,
      provider: this.name,
      platforms: [platform],
      status: 'queued',
      submittedAt: new Date().toISOString(),
      meta: { codemagicAppId: appId, codemagicBuildId: result.buildId, workflowId },
    };
  }

  async getStatus(externalId: string, jobId: string): Promise<BuildStatusResult> {
    const token = this.getToken();
    const result = await cmFetch<{ build: CmBuildResponse }>(
      `/builds/${externalId}`,
      {},
      token,
    );
    const b = result.build;
    return {
      jobId,
      externalId,
      status: mapStatus(b.status),
      message: b.message,
      updatedAt: b.updatedAt ?? b.finishedAt ?? new Date().toISOString(),
    };
  }

  async getArtifacts(externalId: string, jobId: string): Promise<Artifact[]> {
    const token = this.getToken();
    const result = await cmFetch<{ build: CmBuildResponse }>(
      `/builds/${externalId}`,
      {},
      token,
    );
    const b = result.build;
    if (b.status !== 'finished' || !b.artefacts?.length) return [];

    return b.artefacts.map((a) => {
      const platform = detectPlatformFromArtifact(a.name);
      const isIos = platform === 'ios';
      return {
        platform,
        label: a.name,
        url: a.url,
        sizeBytes: a.size,
        mimeType: isIos
          ? 'application/octet-stream'
          : 'application/vnd.android.package-archive',
        createdAt: b.finishedAt ?? new Date().toISOString(),
      };
    });
  }

  async *getLogs(externalId: string, jobId: string): AsyncGenerator<LogChunk> {
    const token = this.getToken();
    try {
      // Codemagic exposes a log URL — fetch it as plain text
      const res = await fetch(`${CM_API}/builds/${externalId}/logs`, {
        headers: { 'x-auth-token': token },
      });
      if (!res.ok) {
        yield {
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: `Log fetch returned ${res.status}`,
        };
        return;
      }
      const text = await res.text();
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        yield {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: line,
        };
      }
    } catch (err) {
      yield {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Failed to fetch Codemagic logs: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
