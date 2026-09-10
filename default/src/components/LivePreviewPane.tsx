/**
 * LivePreviewPane
 *
 * Triggers a server-side preview build for a completed job, polls for status,
 * then renders the built app in a sandboxed iframe served from /preview/:jobId.
 *
 * States:
 *   idle      — "Launch preview" button shown
 *   building  — spinner + build log polling
 *   ready     — iframe loaded from /preview/:jobId/
 *   error     — error message with retry
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Monitor, Tablet, Smartphone, RefreshCw, ExternalLink,
  Play, Loader2, AlertTriangle, XCircle, RotateCcw,
} from 'lucide-react';

interface Props {
  jobId: string;
}

type Status = 'idle' | 'building' | 'ready' | 'error';
type Device = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTHS: Record<Device, string> = {
  desktop: '100%',
  tablet:  '768px',
  mobile:  '390px',
};

const DEVICE_HEIGHTS: Record<Device, string> = {
  desktop: '580px',
  tablet:  '1024px',
  mobile:  '844px',
};

export default function LivePreviewPane({ jobId }: Props) {
  const [status, setStatus]       = useState<Status>('idle');
  const [error, setError]         = useState<string>('');
  const [device, setDevice]       = useState<Device>('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    const deadline = Date.now() + 90_000; // 90-second hard timeout
    // Poll at 800 ms — the server-side Babel transform finishes in < 1 s
    pollRef.current = setInterval(async () => {
      if (Date.now() > deadline) {
        stopPolling();
        setError('Preview build timed out after 90 seconds. Click "Try again" to retry.');
        setStatus('error');
        return;
      }
      try {
        const res = await fetch(`/api/preview/${jobId}/status`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json() as { status: Status; error?: string };
        if (data.status === 'ready') {
          stopPolling();
          setStatus('ready');
        } else if (data.status === 'error') {
          stopPolling();
          setError(data.error ?? 'Build failed');
          setStatus('error');
        }
        // 'building' → keep polling
      } catch { /* network hiccup — keep polling */ }
    }, 800);
  }, [jobId, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // On mount: check if already ready so we skip the idle screen entirely
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/preview/${jobId}/status`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json() as { status: Status };
          if (data.status === 'ready') setStatus('ready');
        }
      } catch { /* ignore */ }
    })();
  }, [jobId]);

  const launchPreview = useCallback(async () => {
    setStatus('building');
    setError('');
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json() as { status?: Status; error?: string };
      if (!res.ok) {
        // Server returned 4xx/5xx with an error message — surface it immediately
        setError(data.error ?? `Server error ${res.status}`);
        setStatus('error');
        return;
      }
      if (data.status === 'ready') {
        // Build completed synchronously (common — Babel transform is fast)
        setStatus('ready');
      } else if (data.status === 'error') {
        setError(data.error ?? 'Build failed');
        setStatus('error');
      } else {
        // Still building — poll until done
        startPolling();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setStatus('error');
    }
  }, [jobId, startPolling]);

  const retry = useCallback(() => {
    setStatus('idle');
    setError('');
  }, []);

  const refresh = useCallback(() => setIframeKey(k => k + 1), []);

  const previewUrl = `/preview/${jobId}/`;

  const openInTab = useCallback(() => {
    window.open(previewUrl, '_blank');
  }, [previewUrl]);

  // ── Idle state ──────────────────────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col items-center justify-center gap-5 py-16 px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Play size={28} className="text-primary ml-1" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Launch live preview</h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              SynTract will compile the generated files and render your app in a sandboxed browser environment.
            </p>
          </div>
          <button
            onClick={launchPreview}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Play size={14} />
            Build &amp; preview
          </button>
          <p className="text-[10px] text-muted-foreground/40">
            Compiles in seconds · cached for subsequent opens
          </p>
        </div>
      </div>
    );
  }

  // ── Building state ──────────────────────────────────────────────────────────
  if (status === 'building') {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col items-center justify-center gap-5 py-16 px-8 text-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-primary/10 border border-primary/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={28} className="text-primary animate-spin" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Compiling preview…</h3>
            <p className="text-xs text-muted-foreground/60 font-mono">Transforming your app for the browser</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col items-center justify-center gap-5 py-12 px-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <XCircle size={24} className="text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Preview build failed</h3>
            <pre className="text-[11px] text-destructive/80 font-mono whitespace-pre-wrap bg-destructive/[0.05] rounded-lg border border-destructive/20 p-3 max-h-40 overflow-y-auto text-left max-w-lg">
              {error}
            </pre>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={retry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-white/[0.04] text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw size={13} /> Try again
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/40 max-w-xs">
            Tip: make sure the build prompt asked for a React/TypeScript frontend app.
            Backend-only or CLI builds can't be previewed in the browser.
          </p>
        </div>
      </div>
    );
  }

  // ── Ready state ─────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-foreground">Live preview</span>
          <span className="text-[10px] text-emerald-400/70 font-mono">running</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Device toggles */}
          {(['desktop', 'tablet', 'mobile'] as Device[]).map(d => {
            const Icon = d === 'desktop' ? Monitor : d === 'tablet' ? Tablet : Smartphone;
            return (
              <button
                key={d}
                onClick={() => setDevice(d)}
                title={d.charAt(0).toUpperCase() + d.slice(1)}
                className={`p-1.5 rounded transition-colors ${
                  device === d
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/[0.05]'
                }`}
              >
                <Icon size={13} />
              </button>
            );
          })}
          <div className="w-px h-4 bg-border mx-1" />
          <button onClick={refresh} title="Refresh"
            className="p-1.5 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/[0.05] transition-colors">
            <RefreshCw size={13} />
          </button>
          <button onClick={openInTab} title="Open in new tab"
            className="p-1.5 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/[0.05] transition-colors">
            <ExternalLink size={13} />
          </button>
          <button onClick={retry} title="Rebuild preview"
            className="p-1.5 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/[0.05] transition-colors">
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex justify-center bg-muted/20 p-4">
        <div
          style={{ width: DEVICE_WIDTHS[device], maxWidth: '100%', transition: 'width 0.3s ease' }}
          className="rounded-lg overflow-hidden border border-border shadow-xl"
        >
          <iframe
            key={iframeKey}
            src={previewUrl}
            title="Live preview"
            className="w-full border-0 bg-white block"
            style={{ height: DEVICE_HEIGHTS[device], transition: 'height 0.3s ease' }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
          />
        </div>
      </div>

      {/* Footer note */}
      <div className="flex items-start gap-2 px-4 py-2.5 border-t border-border bg-amber-500/[0.03]">
        <AlertTriangle size={11} className="text-amber-400/60 mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
          Preview runs the generated frontend in a sandboxed environment. API calls and database
          operations are mocked. Use <strong className="text-muted-foreground/70">Open in new tab</strong> for full-screen.
        </p>
      </div>
    </div>
  );
}
