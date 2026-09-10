/**
 * BuildResultViewer
 *
 * Three-tab viewer for a completed SynTract build:
 *   Code    — rendered markdown with syntax-highlighted code blocks
 *   Preview — sandboxed iframe running the extracted frontend code
 *   Publish — deployment target selector (Web / iOS / Android / Other)
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Download, ChevronDown, ChevronUp, Code2, Eye, Rocket, Wand2, Loader2, ExternalLink, Link2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import type { Components } from 'react-markdown';
import LivePreviewPane from '@/components/LivePreviewPane';

interface Props {
  result: string;
  prompt?: string;
  durationMs?: number | null;
  collapsible?: boolean;
  jobId?: string;
  onRefine?: (refinePrompt: string, sourceJobId?: string) => void;
  refining?: boolean;
}

type Tab = 'code' | 'preview' | 'publish';
type PublishStatus = 'idle' | 'building' | 'ready' | 'error';

// ── Inline publish panel ──────────────────────────────────────────────────────

function PublishPanel({ jobId }: { jobId: string }) {
  const [status, setStatus]   = useState<PublishStatus>('idle');
  const [error, setError]     = useState('');
  const [copied, setCopied]   = useState(false);
  const pollRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  const liveUrl = `${window.location.origin}/preview/${jobId}`;

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPublish = useCallback(async () => {
    setStatus('building');
    setError('');

    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json() as { status?: string; error?: string };
      if (!res.ok) {
        // Server returned 4xx/5xx — surface the error immediately, no polling needed
        setStatus('error');
        setError(data.error ?? `Server error ${res.status}`);
        return;
      }
      if (data.status === 'ready') {
        setStatus('ready');
        return;
      }
      if (data.status === 'error') {
        setStatus('error');
        setError(data.error ?? 'Compilation failed');
        return;
      }
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Network error');
      return;
    }

    // Still building — poll with a hard timeout
    const deadline = Date.now() + 90_000;
    pollRef.current = setInterval(async () => {
      if (Date.now() > deadline) {
        stopPoll();
        setStatus('error');
        setError('Publish timed out after 90 seconds. Click "Try again" to retry.');
        return;
      }
      try {
        const r = await fetch(`/api/preview/${jobId}/status`, { credentials: 'include' });
        if (!r.ok) return;
        const data = await r.json() as { status: string; error?: string };
        if (data.status === 'ready') {
          stopPoll();
          setStatus('ready');
        } else if (data.status === 'error') {
          stopPoll();
          setStatus('error');
          setError(data.error ?? 'Compilation failed');
        }
      } catch { /* keep polling */ }
    }, 1200);
  }, [jobId, stopPoll]);

  // Check if already published on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/preview/${jobId}/status`, { credentials: 'include' });
        if (r.ok) {
          const data = await r.json() as { status: string };
          if (data.status === 'ready') setStatus('ready');
        }
      } catch { /* ignore */ }
    })();
    return stopPoll;
  }, [jobId, stopPoll]);

  function copyUrl() {
    const doCopy = navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(liveUrl)
      : Promise.reject(new Error('Clipboard API unavailable'));

    doCopy.then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard API blocked (e.g. inside an iframe with restrictive permissions policy).
      // Silently ignore — the URL is still visible in the input field for manual copy.
    });
  }

  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Rocket size={22} className="text-primary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground mb-1">Publish this app</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Compile and deploy to a live URL in seconds. Anyone with the link can open it instantly.
          </p>
        </div>
        <button
          onClick={startPublish}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <Rocket size={14} />
          Publish now
        </button>
      </div>
    );
  }

  if (status === 'building') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Loader2 size={22} className="text-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground mb-1">Compiling your app…</p>
          <p className="text-xs text-muted-foreground">Bundling modules and generating the live preview</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-6">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <XCircle size={22} className="text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground mb-1">Publish failed</p>
          <p className="text-xs text-destructive/70 max-w-xs font-mono">{error}</p>
        </div>
        <button
          onClick={startPublish}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-border hover:bg-white/[0.04] text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={12} />
          Try again
        </button>
      </div>
    );
  }

  // ready
  return (
    <div className="flex flex-col items-center gap-4 py-8 px-6">
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
        <CheckCircle2 size={22} className="text-emerald-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground mb-1">Your app is live</p>
        <p className="text-xs text-muted-foreground mb-3">Share this link — anyone can open it right now</p>
        <div className="flex items-center gap-2 bg-white/[0.04] border border-border rounded-lg px-3 py-2 max-w-sm mx-auto">
          <Link2 size={11} className="text-muted-foreground/50 shrink-0" />
          <span className="text-xs font-mono text-foreground/80 truncate flex-1">{liveUrl}</span>
          <button
            onClick={copyUrl}
            className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors bg-white/[0.06] hover:bg-white/[0.12] text-muted-foreground hover:text-foreground border border-white/[0.08]"
          >
            {copied ? <><Check size={9} className="text-emerald-400" />Copied</> : <><Copy size={9} />Copy</>}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ExternalLink size={13} />
          Open app
        </a>
        <button
          onClick={startPublish}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-border hover:bg-white/[0.04] text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={11} />
          Republish
        </button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-medium transition-colors bg-white/[0.06] hover:bg-white/[0.12] text-muted-foreground hover:text-foreground border border-white/[0.08]"
    >
      {copied ? <><Check size={10} className="text-emerald-400" />Copied</> : <><Copy size={10} />{label}</>}
    </button>
  );
}

function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Markdown component map ────────────────────────────────────────────────────

function useMarkdownComponents(): Components {
  return {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className ?? '');
      const codeStr = String(children).replace(/\n$/, '');
      const isBlock = match || codeStr.includes('\n');

      if (isBlock) {
        const lang = match?.[1] ?? 'text';
        return (
          <div className="relative group my-4 rounded-lg overflow-hidden border border-white/[0.08]">
            <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-white/[0.06]">
              <span className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest">{lang}</span>
              <CopyButton text={codeStr} />
            </div>
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={lang}
              PreTag="div"
              customStyle={{
                margin: 0,
                padding: '1rem',
                background: 'hsl(var(--card))',
                fontSize: '0.75rem',
                lineHeight: '1.6',
                borderRadius: 0,
              }}
              codeTagProps={{ style: { fontFamily: 'JetBrains Mono, Fira Code, monospace' } }}
            >
              {codeStr}
            </SyntaxHighlighter>
          </div>
        );
      }

      return (
        <code
          className="font-mono text-[0.8em] px-1.5 py-0.5 rounded bg-white/[0.08] text-primary/90 border border-white/[0.06]"
          {...props}
        >
          {children}
        </code>
      );
    },
    h1: ({ children }) => (
      <h1 className="text-xl font-bold text-foreground mt-8 mb-3 pb-2 border-b border-border first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-base font-semibold text-foreground mt-6 mb-2 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-primary shrink-0" />
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-semibold text-foreground/90 mt-4 mb-1.5">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="list-none pl-0 mb-3 flex flex-col gap-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-none pl-0 mb-3 flex flex-col gap-1">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="flex items-start gap-2 text-sm text-muted-foreground">
        <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/60 shrink-0" />
        <span>{children}</span>
      </li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-primary/40 pl-4 my-3 text-sm text-muted-foreground/70 italic">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="border-border my-6" />,
    strong: ({ children }) => <strong className="font-semibold text-foreground/90">{children}</strong>,
    em: ({ children }) => <em className="italic text-muted-foreground/80">{children}</em>,
  };
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BuildResultViewer({ result, prompt, durationMs, collapsible = false, jobId, onRefine, refining = false }: Props) {
  const [collapsed, setCollapsed]       = useState(collapsible);
  const [activeTab, setActiveTab]       = useState<Tab>('code');
  const [refineText, setRefineText]     = useState('');
  const refineRef = useRef<HTMLTextAreaElement>(null);

  const components = useMarkdownComponents();

  const handleRefine = useCallback(() => {
    const t = refineText.trim();
    if (!t || refining || !onRefine) return;
    onRefine(t);
    setRefineText('');
  }, [refineText, refining, onRefine]);

  const handleRefineKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRefine();
  }, [handleRefine]);

  const filename = prompt
    ? `syntract-build-${prompt.slice(0, 40).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`
    : 'syntract-build.md';

  const tabs: { id: Tab; label: string; icon: React.ReactNode; disabled?: boolean; disabledReason?: string }[] = [
    { id: 'code',    label: 'Code',    icon: <Code2 size={11} /> },
    {
      id: 'preview',
      label: 'Preview',
      icon: <Eye size={11} />,
      disabled: !jobId,
      disabledReason: 'Job ID required for live preview',
    },
    {
      id: 'publish',
      label: 'Publish',
      icon: <Rocket size={11} />,
      disabled: !jobId,
      disabledReason: 'Job ID required to publish',
    },
  ];

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-white/[0.02]">
          <div className="flex items-center gap-3">
            {/* Status dot */}
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />

            {/* Tabs */}
            <div className="flex items-center gap-0.5">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  title={tab.disabled ? tab.disabledReason : undefined}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                    tab.disabled
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : activeTab === tab.id
                        ? 'bg-primary/15 text-primary border border-primary/25'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.05]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {durationMs != null && (
              <span className="text-[10px] text-muted-foreground/40 font-mono hidden sm:inline">
                {(durationMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <CopyButton text={result} label="Copy all" />
            <button
              onClick={() => downloadMarkdown(result, filename)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-medium transition-colors bg-white/[0.06] hover:bg-white/[0.12] text-muted-foreground hover:text-foreground border border-white/[0.08]"
            >
              <Download size={10} /> .md
            </button>
            {collapsible && (
              <button
                onClick={() => setCollapsed(v => !v)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-medium transition-colors bg-white/[0.06] hover:bg-white/[0.12] text-muted-foreground hover:text-foreground border border-white/[0.08]"
              >
                {collapsed ? <><ChevronDown size={10} />Show</> : <><ChevronUp size={10} />Hide</>}
              </button>
            )}
          </div>
        </div>

        {/* Prompt strip */}
        {prompt && !collapsed && (
          <div className="px-5 py-2.5 border-b border-border bg-primary/[0.03]">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mr-2">Prompt</span>
            <span className="text-xs text-foreground/70">{prompt}</span>
          </div>
        )}

        {/* ── Refinement prompt — prominent, above tab content ─────────── */}
        {!collapsed && onRefine && (
          <div className="border-b-2 border-primary/20 px-5 py-4"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.06), hsl(var(--secondary)/0.04))' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-primary/15 border border-primary/25">
                <Wand2 size={12} className="text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Refine or extend this app</span>
              <span className="text-xs text-muted-foreground/50 ml-1">— describe what to change or add</span>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  ref={refineRef}
                  value={refineText}
                  onChange={e => setRefineText(e.target.value)}
                  onKeyDown={handleRefineKey}
                  disabled={refining}
                  rows={3}
                  placeholder="e.g. Add a leaderboard screen, make it harder, add sound effects, change the theme to space…"
                  className="w-full resize-none rounded-xl border border-primary/25 bg-background/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 disabled:opacity-50 font-sans leading-relaxed shadow-sm"
                />
                <p className="text-[10px] text-muted-foreground/40 mt-1.5 pl-1">⌘↵ to submit</p>
              </div>
              <button
                onClick={handleRefine}
                disabled={!refineText.trim() || refining}
                className="mb-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
              >
                {refining
                  ? <><Loader2 size={14} className="animate-spin" />Refining…</>
                  : <><Wand2 size={14} />Refine</>
                }
              </button>
            </div>
          </div>
        )}

        {/* Tab content */}
        {!collapsed && (
          <>
            {activeTab === 'code' && (
              <div className="px-5 py-5 overflow-y-auto max-h-[70vh]">
                <ReactMarkdown components={components}>
                  {result}
                </ReactMarkdown>
              </div>
            )}

            {activeTab === 'preview' && jobId && (
              <div className="p-4">
                <LivePreviewPane jobId={jobId} />
              </div>
            )}

            {activeTab === 'publish' && jobId && (
              <PublishPanel jobId={jobId} />
            )}
          </>
        )}

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full px-5 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.02] transition-colors text-left flex items-center gap-2"
          >
            <ChevronDown size={12} /> Click to expand result
          </button>
        )}
      </div>
    </>
  );
}
