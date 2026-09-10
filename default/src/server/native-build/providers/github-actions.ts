/**
 * GitHub Actions Provider
 *
 * Triggers a GitHub Actions workflow dispatch event to run a build workflow.
 * Supports iOS, Android, and Web — the workflow definition in the target repo
 * determines what actually gets built.
 *
 * Required credentials (stored as app secrets):
 *   GITHUB_TOKEN        — Personal access token with repo + workflow scopes
 *   GITHUB_OWNER        — Repository owner (username or org)
 *   GITHUB_REPO         — Repository name
 *   GITHUB_WORKFLOW_ID  — Workflow file name or ID (e.g. "build.yml")
 *
 * Docs: https://docs.github.com/en/rest/actions/workflow-runs
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

const GH_API = 'https://api.github.com';

type GhRunStatus = 'queued' | 'in_progress' | 'completed';
type GhRunConclusion =
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | null;

interface GhWorkflowRun {
  id: number;
  status: GhRunStatus;
  conclusion: GhRunConclusion;
  updated_at: string;
  html_url: string;
  artifacts_url: string;
}

interface GhArtifact {
  id: number;
  name: string;
  size_in_bytes: number;
  archive_download_url: string;
  created_at: string;
}

function mapStatus(
  status: GhRunStatus,
  conclusion: GhRunConclusion,
): BuildStatusResult['status'] {
  if (status === 'queued') return 'queued';
  if (status === 'in_progress') return 'running';
  if (status === 'completed') {
    if (conclusion === 'success') return 'success';
    if (conclusion === 'cancelled') return 'cancelled';
    return 'failed';
  }
  return 'queued';
}

function detectPlatformFromName(name: string): Platform {
  const lower = name.toLowerCase();
  if (lower.includes('ios') || lower.includes('ipa')) return 'ios';
  if (lower.includes('android') || lower.includes('apk') || lower.includes('aab')) return 'android';
  return 'web';
}

async function ghFetch<T>(
  path: string,
  options: RequestInit = {},
  token: string,
): Promise<T> {
  const res = await fetch(`${GH_API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }
  // 204 No Content (workflow dispatch) returns no body
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

export class GitHubActionsProvider implements BuildProvider {
  readonly name = 'github-actions';
  readonly displayName = 'GitHub Actions';
  readonly supportedPlatforms: ReadonlyArray<Platform> = ['ios', 'android', 'web'];
  readonly requiresCredentials = true;
  readonly description =
    'Triggers a GitHub Actions workflow to build iOS, Android, or Web. Requires GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, and GITHUB_WORKFLOW_ID secrets.';

  private getToken(): string {
    const t = getSecret('GITHUB_TOKEN');
    if (!t || typeof t !== 'string') throw new Error('GITHUB_TOKEN secret is not configured');
    return t;
  }

  private getRepo(): { owner: string; repo: string } {
    const owner = getSecret('GITHUB_OWNER');
    const repo = getSecret('GITHUB_REPO');
    if (!owner || typeof owner !== 'string') throw new Error('GITHUB_OWNER secret is not configured');
    if (!repo || typeof repo !== 'string') throw new Error('GITHUB_REPO secret is not configured');
    return { owner, repo };
  }

  private getWorkflowId(): string {
    const id = getSecret('GITHUB_WORKFLOW_ID');
    if (!id || typeof id !== 'string') throw new Error('GITHUB_WORKFLOW_ID secret is not configured');
    return id;
  }

  async submitBuild(manifest: FileManifest, config: BuildConfig): Promise<BuildJob> {
    const token = this.getToken();
    const { owner, repo } = this.getRepo();
    const workflowId = this.getWorkflowId();
    const { jobId, platforms } = config;

    const branch = (config.providerOptions?.branch as string) ?? 'main';

    // Dispatch the workflow with SynTract metadata as inputs
    await ghFetch(
      `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      {
        method: 'POST',
        body: JSON.stringify({
          ref: branch,
          inputs: {
            syntract_job_id: jobId,
            platforms: platforms.join(','),
            framework: manifest.framework ?? 'unknown',
            file_count: String(Object.keys(manifest.files).length),
            ...(config.providerOptions?.inputs as Record<string, string> ?? {}),
          },
        }),
      },
      token,
    );

    // GitHub doesn't return the run ID from dispatch — we need to poll for it.
    // Store a sentinel externalId and resolve it on first getStatus call.
    const externalId = `pending:${owner}/${repo}:${workflowId}:${jobId}`;

    return {
      externalId,
      jobId,
      provider: this.name,
      platforms,
      status: 'queued',
      submittedAt: new Date().toISOString(),
      meta: { owner, repo, workflowId, branch },
    };
  }

  /** Resolve a pending externalId to a real GitHub run ID */
  private async resolveRunId(
    externalId: string,
    token: string,
    jobId: string,
  ): Promise<number | null> {
    if (!externalId.startsWith('pending:')) {
      return parseInt(externalId, 10);
    }

    // Parse owner/repo/workflowId from the sentinel
    const parts = externalId.replace('pending:', '').split(':');
    if (parts.length < 3) return null;
    const [owner, repo, workflowId] = parts;

    const result = await ghFetch<{ workflow_runs: GhWorkflowRun[] }>(
      `/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=10`,
      {},
      token,
    );

    // Find the run triggered for this job — match by the syntract_job_id input
    // (GitHub doesn't expose inputs in the list endpoint, so we match by recency)
    const run = result.workflow_runs.find(
      (r) => r.status === 'queued' || r.status === 'in_progress',
    );
    return run?.id ?? null;
  }

  async getStatus(externalId: string, jobId: string): Promise<BuildStatusResult> {
    const token = this.getToken();
    const { owner, repo } = this.getRepo();

    const runId = await this.resolveRunId(externalId, token, jobId);
    if (!runId) {
      return {
        jobId,
        externalId,
        status: 'queued',
        message: 'Waiting for GitHub Actions run to start…',
        updatedAt: new Date().toISOString(),
      };
    }

    const run = await ghFetch<GhWorkflowRun>(
      `/repos/${owner}/${repo}/actions/runs/${runId}`,
      {},
      token,
    );

    return {
      jobId,
      externalId: String(runId),
      status: mapStatus(run.status, run.conclusion),
      message: run.html_url,
      updatedAt: run.updated_at,
    };
  }

  async getArtifacts(externalId: string, jobId: string): Promise<Artifact[]> {
    const token = this.getToken();
    const { owner, repo } = this.getRepo();

    const runId = await this.resolveRunId(externalId, token, jobId);
    if (!runId) return [];

    const result = await ghFetch<{ artifacts: GhArtifact[] }>(
      `/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`,
      {},
      token,
    );

    return result.artifacts.map((a) => {
      const platform = detectPlatformFromName(a.name);
      return {
        platform,
        label: a.name,
        // GitHub requires auth to download — proxy through our API
        url: `/api/native-builds/${jobId}/download/${platform}?artifact_id=${a.id}`,
        sizeBytes: a.size_in_bytes,
        mimeType: 'application/zip',
        createdAt: a.created_at,
      };
    });
  }

  async *getLogs(externalId: string, jobId: string): AsyncGenerator<LogChunk> {
    const token = this.getToken();
    const { owner, repo } = this.getRepo();

    const runId = await this.resolveRunId(externalId, token, jobId);
    if (!runId) {
      yield {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Waiting for GitHub Actions run to start…',
      };
      return;
    }

    try {
      // Fetch jobs for this run to get step-level logs
      const result = await ghFetch<{
        jobs: Array<{
          name: string;
          status: string;
          steps: Array<{ name: string; status: string; conclusion: string | null }>;
        }>;
      }>(`/repos/${owner}/${repo}/actions/runs/${runId}/jobs`, {}, token);

      for (const job of result.jobs) {
        yield {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Job: ${job.name} [${job.status}]`,
        };
        for (const step of job.steps) {
          const level = step.conclusion === 'failure' ? 'error' : 'info';
          yield {
            timestamp: new Date().toISOString(),
            level,
            message: `  Step: ${step.name} — ${step.conclusion ?? step.status}`,
          };
        }
      }
    } catch (err) {
      yield {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Failed to fetch GitHub Actions logs: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
