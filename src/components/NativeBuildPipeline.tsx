/**
 * SynTract Native Build Pipeline™ — Dashboard UI
 *
 * Lets users select a build job, choose target platforms, pick a provider,
 * submit the build, and monitor status + download artifacts.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, Globe, Package, Play, Download, RefreshCw, CheckCircle2, XCircle, Clock, Loader2, Info } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'ios' | 'android' | 'web';
type BuildStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'idle';

interface ProviderSummary {
  name: string;
  displayName: string;
  supportedPlatforms: Platform[];
  requiresCredentials: boolean;
  description: string;
}

interface BuildJobResult {
  platform?: Platform;
  jobId?: string;
  externalId?: string;
  provider?: string;
  status: BuildStatus | 'failed';
  error?: string;
  submittedAt?: string;
}

interface Artifact {
  platform: Platform;
  label: string;
  url: string;
  sizeBytes?: number;
  mimeType: string;
  createdAt: string;
}

interface BuildRecord {
  jobId: string;
  platform: Platform;
  provider: string;
  status: BuildStatus;
  message?: string;
  artifacts: Artifact[];
  logs: string[];
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<Platform, string> = {
  ios: 'iOS (IPA)',
  android: 'Android (APK/AAB)',
  web: 'Web Bundle',
};

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  ios: <Smartphone className="w-4 h-4" />,
  android: <Smartphone className="w-4 h-4" />,
  web: <Globe className="w-4 h-4" />,
};

function StatusBadge({ status }: { status: BuildStatus }) {
  const map: Record<BuildStatus, { label: string; className: string; icon: React.ReactNode }> = {
    idle: { label: 'Idle', className: 'bg-muted text-muted-foreground', icon: <Clock className="w-3 h-3" /> },
    queued: { label: 'Queued', className: 'bg-muted text-muted-foreground', icon: <Clock className="w-3 h-3" /> },
    running: { label: 'Building', className: 'bg-primary/10 text-primary', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    success: { label: 'Success', className: 'bg-emerald-500/10 text-emerald-400', icon: <CheckCircle2 className="w-3 h-3" /> },
    failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive', icon: <XCircle className="w-3 h-3" /> },
    cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground', icon: <XCircle className="w-3 h-3" /> },
  };
  const { label, className, icon } = map[status] ?? map.idle;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {icon}
      {label}
    </span>
  );
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  /** The SynTract build job ID to publish (from the Build tab) */
  sourceJobId?: string;
}

export default function NativeBuildPipeline({ sourceJobId }: Props) {
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['web']);
  const [selectedProvider, setSelectedProvider] = useState<string>('auto');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [builds, setBuilds] = useState<BuildRecord[]>([]);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());

  // Load providers on mount
  useEffect(() => {
    fetch('/api/native-builds/providers')
      .then((r) => r.json())
      .then((d) => setProviders(d.providers ?? []))
      .catch(() => {});
  }, []);

  // Poll status for running/queued builds
  const pollStatus = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/native-builds/${jobId}/status`);
      if (!res.ok) return;
      const data = await res.json();
      setBuilds((prev) =>
        prev.map((b) =>
          b.jobId === jobId
            ? { ...b, status: data.status, message: data.message, updatedAt: data.updatedAt }
            : b,
        ),
      );

      if (data.status === 'success') {
        // Fetch artifacts
        const artRes = await fetch(`/api/native-builds/${jobId}/artifacts`);
        if (artRes.ok) {
          const artData = await artRes.json();
          setBuilds((prev) =>
            prev.map((b) =>
              b.jobId === jobId ? { ...b, artifacts: artData.artifacts ?? [] } : b,
            ),
          );
        }
        setPollingIds((prev) => { const s = new Set(prev); s.delete(jobId); return s; });
      } else if (data.status === 'failed' || data.status === 'cancelled') {
        setPollingIds((prev) => { const s = new Set(prev); s.delete(jobId); return s; });
      }
    } catch {
      // ignore transient errors
    }
  }, []);

  useEffect(() => {
    if (pollingIds.size === 0) return;
    const interval = setInterval(() => {
      pollingIds.forEach((id) => pollStatus(id));
    }, 4000);
    return () => clearInterval(interval);
  }, [pollingIds, pollStatus]);

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const handleSubmit = async () => {
    if (!sourceJobId) {
      setError('No build job selected. Run a build first.');
      return;
    }
    if (selectedPlatforms.length === 0) {
      setError('Select at least one platform.');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/native-builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: sourceJobId,
          platforms: selectedPlatforms,
          provider: selectedProvider === 'auto' ? undefined : selectedProvider,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Build submission failed');
        return;
      }

      const newBuilds: BuildRecord[] = (data.jobs as BuildJobResult[]).map((j) => ({
        jobId: j.jobId ?? `${data.nativeBuildId}:${j.platform}`,
        platform: (j.platform ?? selectedPlatforms[0]) as Platform,
        provider: j.provider ?? selectedProvider,
        status: (j.status as BuildStatus) ?? 'queued',
        message: j.error,
        artifacts: [],
        logs: [],
        updatedAt: j.submittedAt ?? new Date().toISOString(),
      }));

      setBuilds((prev) => [...newBuilds, ...prev]);
      setPollingIds((prev) => {
        const s = new Set(prev);
        newBuilds.forEach((b) => {
          if (b.status !== 'failed') s.add(b.jobId);
        });
        return s;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  // Providers that support all selected platforms (or "auto")
  void providers.filter((p) =>
    selectedPlatforms.every((pl) => p.supportedPlatforms.includes(pl)),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Native Build Pipeline™
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Compile your SynTract project into production-ready binaries for iOS, Android, and Web.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Configuration ── */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium">Build Configuration</CardTitle>
            <CardDescription className="text-xs">
              {sourceJobId
                ? `Source: build job ${sourceJobId.slice(0, 12)}…`
                : 'No source build selected — run a build first'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Platform selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Target Platforms
              </Label>
              <div className="space-y-2">
                {(['web', 'android', 'ios'] as Platform[]).map((p) => (
                  <div key={p} className="flex items-center gap-3">
                    <Checkbox
                      id={`platform-${p}`}
                      checked={selectedPlatforms.includes(p)}
                      onCheckedChange={() => togglePlatform(p)}
                    />
                    <label
                      htmlFor={`platform-${p}`}
                      className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                    >
                      {PLATFORM_ICONS[p]}
                      {PLATFORM_LABELS[p]}
                      {p === 'web' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Ready now
                        </Badge>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Provider selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Build Provider
              </Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Auto (recommended)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <span className="flex items-center gap-2">
                      Auto (best available)
                    </span>
                  </SelectItem>
                  {providers.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      <span className="flex items-center gap-2">
                        {p.displayName}
                        {p.requiresCredentials && (
                          <span className="text-[10px] text-muted-foreground">(requires API key)</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Provider description */}
              {selectedProvider !== 'auto' && (
                <p className="text-xs text-muted-foreground">
                  {providers.find((p) => p.name === selectedProvider)?.description}
                </p>
              )}
            </div>

            {/* Provider capability matrix */}
            {providers.length > 0 && (
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Provider</th>
                      <th className="text-center px-2 py-2 text-muted-foreground font-medium">Web</th>
                      <th className="text-center px-2 py-2 text-muted-foreground font-medium">Android</th>
                      <th className="text-center px-2 py-2 text-muted-foreground font-medium">iOS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((p, i) => (
                      <tr key={p.name} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <td className="px-3 py-2 font-medium text-foreground">{p.displayName}</td>
                        {(['web', 'android', 'ios'] as Platform[]).map((pl) => (
                          <td key={pl} className="text-center px-2 py-2">
                            {p.supportedPlatforms.includes(pl) ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting || !sourceJobId || selectedPlatforms.length === 0}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Build
                </>
              )}
            </Button>

            {!sourceJobId && (
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                <Info className="w-3 h-3" />
                Complete a build in the Build tab first
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Right: Build history ── */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium">Build History</CardTitle>
            <CardDescription className="text-xs">
              {builds.length === 0 ? 'No builds yet' : `${builds.length} build${builds.length !== 1 ? 's' : ''}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {builds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No builds submitted yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Configure and start a build to see results here
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[360px] pr-2">
                <div className="space-y-3">
                  {builds.map((build) => (
                    <BuildCard
                      key={build.jobId}
                      build={build}
                      isPolling={pollingIds.has(build.jobId)}
                      onRefresh={() => pollStatus(build.jobId)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── BuildCard ────────────────────────────────────────────────────────────────

function BuildCard({
  build,
  isPolling,
  onRefresh,
}: {
  build: BuildRecord;
  isPolling: boolean;
  onRefresh: () => void;
}) {

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {PLATFORM_ICONS[build.platform]}
          <span className="text-sm font-medium text-foreground truncate">
            {PLATFORM_LABELS[build.platform]}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={build.status} />
          <button
            onClick={onRefresh}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-0.5">
        <div>Provider: <span className="text-foreground">{build.provider}</span></div>
        <div>Job: <span className="font-mono">{build.jobId.slice(0, 20)}…</span></div>
        {build.message && (
          <div className="text-muted-foreground truncate" title={build.message}>
            {build.message}
          </div>
        )}
      </div>

      {/* Artifacts */}
      {build.artifacts.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {build.artifacts.map((a) => (
            <a
              key={a.url}
              href={a.url}
              download
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors text-xs text-primary"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{a.label}</span>
              {a.sizeBytes && (
                <span className="ml-auto text-muted-foreground shrink-0">
                  {formatBytes(a.sizeBytes)}
                </span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
