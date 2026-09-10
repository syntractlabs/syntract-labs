/**
 * Expo EAS Build Provider
 *
 * Submits builds to Expo's EAS Build service via the EAS REST API.
 * Supports iOS (IPA) and Android (APK/AAB) for React Native / Expo projects.
 *
 * Required credentials (stored as app secrets):
 *   EAS_ACCESS_TOKEN  — Expo account access token
 *   EAS_PROJECT_ID    — Expo project ID (from app.json / expo.dev)
 *
 * Docs: https://docs.expo.dev/eas/build/
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

const EAS_API = 'https://api.expo.dev/v2';

type EasBuildStatus =
  | 'NEW'
  | 'IN_QUEUE'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'ERRORED'
  | 'CANCELED';

interface EasBuildResponse {
  id: string;
  status: EasBuildStatus;
  platform: string;
  artifacts?: { buildUrl?: string };
  error?: { message: string };
  updatedAt: string;
  logs?: Array<{ message: string; level: string; timestamp: string }>;
}

function mapStatus(eas: EasBuildStatus): BuildStatusResult['status'] {
  switch (eas) {
    case 'NEW':
    case 'IN_QUEUE':
      return 'queued';
    case 'IN_PROGRESS':
      return 'running';
    case 'FINISHED':
      return 'success';
    case 'ERRORED':
      return 'failed';
    case 'CANCELED':
      return 'cancelled';
    default:
      return 'queued';
  }
}

function mapPlatform(p: string): Platform {
  if (p === 'IOS') return 'ios';
  if (p === 'ANDROID') return 'android';
  return 'web';
}

async function easFetch<T>(
  path: string,
  options: RequestInit = {},
  token: string,
): Promise<T> {
  const res = await fetch(`${EAS_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`EAS API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export class ExpoEasProvider implements BuildProvider {
  readonly name = 'expo-eas';
  readonly displayName = 'Expo EAS Build';
  readonly supportedPlatforms: ReadonlyArray<Platform> = ['ios', 'android'];
  readonly requiresCredentials = true;
  readonly description =
    'Builds iOS (IPA) and Android (APK/AAB) via Expo EAS Build. Requires an EAS_ACCESS_TOKEN and EAS_PROJECT_ID secret.';

  private getToken(): string {
    const token = getSecret('EAS_ACCESS_TOKEN');
    if (!token || typeof token !== 'string') throw new Error('EAS_ACCESS_TOKEN secret is not configured');
    return token;
  }

  private getProjectId(): string {
    const id = getSecret('EAS_PROJECT_ID');
    if (!id || typeof id !== 'string') throw new Error('EAS_PROJECT_ID secret is not configured');
    return id;
  }

  async submitBuild(manifest: FileManifest, config: BuildConfig): Promise<BuildJob> {
    const token = this.getToken();
    const projectId = this.getProjectId();
    const { jobId, platforms } = config;

    // EAS requires one build per platform — submit all requested platforms
    const easPlatforms = platforms
      .filter((p) => (this.supportedPlatforms as ReadonlyArray<string>).includes(p))
      .map((p) => (p === 'ios' ? 'IOS' : 'ANDROID'));

    if (easPlatforms.length === 0) {
      throw new Error('ExpoEasProvider: no supported platforms requested (ios, android)');
    }

    // Submit the first platform; multi-platform is handled by the pipeline
    // submitting separate jobs per platform.
    const platform = easPlatforms[0];

    const body = {
      projectId,
      platform,
      buildProfile: (config.providerOptions?.buildProfile as string) ?? 'preview',
      metadata: {
        syntractJobId: jobId,
        fileCount: Object.keys(manifest.files).length,
        framework: manifest.framework ?? 'expo',
      },
    };

    const result = await easFetch<{ build: EasBuildResponse }>(
      '/builds',
      { method: 'POST', body: JSON.stringify(body) },
      token,
    );

    return {
      externalId: result.build.id,
      jobId,
      provider: this.name,
      platforms: [mapPlatform(platform)],
      status: mapStatus(result.build.status),
      submittedAt: new Date().toISOString(),
      meta: { easProjectId: projectId, easBuildId: result.build.id },
    };
  }

  async getStatus(externalId: string, jobId: string): Promise<BuildStatusResult> {
    const token = this.getToken();
    const result = await easFetch<{ build: EasBuildResponse }>(
      `/builds/${externalId}`,
      {},
      token,
    );
    const b = result.build;
    return {
      jobId,
      externalId,
      status: mapStatus(b.status),
      message: b.error?.message,
      updatedAt: b.updatedAt,
    };
  }

  async getArtifacts(externalId: string, jobId: string): Promise<Artifact[]> {
    const token = this.getToken();
    const result = await easFetch<{ build: EasBuildResponse }>(
      `/builds/${externalId}`,
      {},
      token,
    );
    const b = result.build;
    if (b.status !== 'FINISHED' || !b.artifacts?.buildUrl) return [];

    const platform = mapPlatform(b.platform);
    const isIos = platform === 'ios';

    return [
      {
        platform,
        label: isIos ? 'iOS IPA' : 'Android APK',
        url: b.artifacts.buildUrl,
        mimeType: isIos ? 'application/octet-stream' : 'application/vnd.android.package-archive',
        createdAt: b.updatedAt,
      },
    ];
  }

  async *getLogs(externalId: string, jobId: string): AsyncGenerator<LogChunk> {
    const token = this.getToken();
    try {
      const result = await easFetch<{ build: EasBuildResponse }>(
        `/builds/${externalId}`,
        {},
        token,
      );
      const logs = result.build.logs ?? [];
      for (const entry of logs) {
        yield {
          timestamp: entry.timestamp ?? new Date().toISOString(),
          level: (entry.level as LogChunk['level']) ?? 'info',
          message: entry.message,
        };
      }
    } catch (err) {
      yield {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Failed to fetch EAS logs: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
