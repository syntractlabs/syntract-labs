import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from "react-router";
import { motion } from 'motion/react';
import { Copy, Check, RefreshCw, AlertTriangle, Terminal, ChevronDown, ChevronUp, LogOut, Settings, Bot, Cpu, Sparkles, Clock, CheckCircle2, XCircle, Loader2, Code2, Users, Zap, LayoutGrid, BookOpen, CreditCard, Package } from 'lucide-react';
import NativeBuildPipeline from '@/components/NativeBuildPipeline';
import { useSession, signOut } from '@/lib/auth/auth-client';
import BuildResultViewer from '@/components/BuildResultViewer';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLES, type UserRole } from '@/lib/roles';

// ─── SSE parser ───────────────────────────────────────────────────────────────
// Proper SSE line accumulator. Buffers across chunks so large data: payloads
// (e.g. the full build result on the `done` event) are never split mid-parse.
// Returns the updated buffer and a list of dispatched {event, data} pairs.
function parseSSEChunk(
  buf: string,
  chunk: string,
): { buf: string; events: { event: string; data: string }[] } {
  buf += chunk;
  const events: { event: string; data: string }[] = [];
  // SSE messages are separated by blank lines (\n\n or \r\n\r\n).
  // Split on double-newline to get complete messages.
  const parts = buf.split(/\n\n|\r\n\r\n/);
  // The last element is an incomplete message — keep it in the buffer.
  buf = parts.pop() ?? '';
  for (const part of parts) {
    const lines = part.split(/\r?\n/);
    let eventName = 'message';
    let dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (dataLines.length > 0) {
      events.push({ event: eventName, data: dataLines.join('\n') });
    }
  }
  return { buf, events };
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface BuildJob {
  id: string;
  prompt: string;
  status: 'queued' | 'planning' | 'building' | 'complete' | 'failed';
  durationMs: number | null;
  createdAt: string;
  result?: string | null;
  plan?: string | null;
  error?: string | null;
}

// ─── Change Password ──────────────────────────────────────────────────────────
function ChangePasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      setStatus('error');
      setMsg('New passwords do not match.');
      return;
    }
    if (next.length < 8) {
      setStatus('error');
      setMsg('Password must be at least 8 characters.');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next
        }),
        credentials: 'include'
      });
      if (res.ok) {
        setStatus('ok');
        setMsg('Password updated successfully.');
        setCurrent('');
        setNext('');
        setConfirm('');
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus('error');
        setMsg(data?.message ?? 'Failed to update password. Check your current password and try again.');
      }
    } catch {
      setStatus('error');
      setMsg('Network error — please try again.');
    }
  }
  return <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-sm font-semibold text-foreground">Change password</p>
        <p className="text-xs text-muted-foreground mt-0.5">Update your account password.</p>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Current password</label>
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required autoComplete="current-password" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">New password</label>
          <input type="password" value={next} onChange={e => setNext(e.target.value)} required autoComplete="new-password" minLength={8} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Confirm new password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        {msg && <p className={`text-xs ${status === 'ok' ? 'text-emerald-400' : 'text-destructive'}`}>{msg}</p>}
        <div className="flex justify-end pt-1">
          <button type="submit" disabled={status === 'loading'} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {status === 'loading' ? <><Loader2 size={11} className="animate-spin" />Updating…</> : 'Update password'}
          </button>
        </div>
      </form>
    </div>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function CopyBtn({
  text
}: {
  text: string;
}) {
  const [copied, setCopied] = useState(false);
  return <button onClick={() => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${copied ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/[0.07]'}`}>
      {copied ? <><Check size={9} />Copied</> : <><Copy size={9} />Copy</>}
    </button>;
}
function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    user,
    isPending,
    isAuthenticated
  } = useSession();
  const [activeTab, setActiveTab] = useState<'overview' | 'build' | 'projects' | 'docs' | 'pricing' | 'team' | 'settings' | 'publish'>('overview');

  // Build tab state
  const [buildPrompt, setBuildPrompt] = useState('');
  const [buildRunning, setBuildRunning] = useState(false);
  const [buildPlan, setBuildPlan] = useState<string[]>([]);
  const [buildCurrentStep, setBuildCurrentStep] = useState(-1);
  const [buildTokens, setBuildTokens] = useState('');
  const [buildStatus, setBuildStatus] = useState('');
  const [buildError, setBuildError] = useState('');
  const [buildDone, setBuildDone] = useState(false);
  const [buildDuration, setBuildDuration] = useState<number | null>(null);
  const [buildJobId, setBuildJobId] = useState<string | null>(null);
  const [buildHistory, setBuildHistory] = useState<BuildJob[]>([]);
  const [buildHistoryLoading, setBuildHistoryLoading] = useState(false);
  const [showBuildOutput, setShowBuildOutput] = useState(true);
  // Refinement state — top-level (for current-session build)
  const [refineRunning, setRefineRunning] = useState(false);
  // Per-job inline refinement state (for history jobs)
  type JobRefineState = {
    running: boolean;
    tokens: string;
    status: string;
    error: string;
    done: boolean;
    durationMs: number | null;
    newJobId: string | null;
  };
  const [jobRefineState, setJobRefineState] = useState<Record<string, JobRefineState>>({});
  function getJobRefine(id: string): JobRefineState {
    return jobRefineState[id] ?? {
      running: false,
      tokens: '',
      status: '',
      error: '',
      done: false,
      durationMs: null,
      newJobId: null
    };
  }
  function patchJobRefine(id: string, patch: Partial<JobRefineState>) {
    setJobRefineState(prev => ({
      ...prev,
      [id]: {
        ...getJobRefine(id),
        ...patch
      }
    }));
  }
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [expandedJobLoading, setExpandedJobLoading] = useState(false);
  const buildOutputRef = useRef<HTMLPreElement>(null);

  // ── Team tab state ────────────────────────────────────────────────────────
  interface TeamUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    emailVerified: boolean;
    createdAt: string;
  }
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);

  // BCU balance — fetched from /api/users/me/bcu and refreshed after each build
  const [bcuBalance, setBcuBalance] = useState<{ total: number; remaining: number; used: number } | null>(null);
  const fetchBcuBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me/bcu', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json() as { bcuTotal: number; bcuRemaining: number; bcuUsed: number };
      setBcuBalance({ total: data.bcuTotal, remaining: data.bcuRemaining, used: data.bcuUsed });
    } catch { /* silent */ }
  }, []);
  useEffect(() => {
    if (isAuthenticated) fetchBcuBalance();
  }, [isAuthenticated, fetchBcuBalance]);
  const fetchTeamUsers = useCallback(async () => {
    setTeamLoading(true);
    setTeamError('');
    try {
      const res = await fetch('/api/users', {
        credentials: 'include'
      });
      if (res.status === 403) {
        setTeamError('Admin access required.');
        return;
      }
      if (!res.ok) throw new Error('Failed to load users');
      const data = (await res.json()) as {
        users: TeamUser[];
      };
      setTeamUsers(data.users);
    } catch {
      setTeamError('Could not load users. Please refresh.');
    } finally {
      setTeamLoading(false);
    }
  }, []);
  useEffect(() => {
    if (isAuthenticated && activeTab === 'team') fetchTeamUsers();
  }, [isAuthenticated, activeTab, fetchTeamUsers]);
  async function updateUserRole(userId: string, newRole: UserRole) {
    setRoleUpdating(userId);
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: newRole
        })
      });
      if (!res.ok) {
        const data = (await res.json()) as {
          error?: string;
        };
        setTeamError(data.error || 'Failed to update role');
        return;
      }
      setTeamUsers(prev => prev.map(u => u.id === userId ? {
        ...u,
        role: newRole
      } : u));
    } catch {
      setTeamError('Network error updating role');
    } finally {
      setRoleUpdating(null);
    }
  }
  const fetchBuildHistory = useCallback(async () => {
    setBuildHistoryLoading(true);
    try {
      const res = await fetch('/api/builds', {
        credentials: 'include'
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        jobs: BuildJob[];
      };
      setBuildHistory(data.jobs);
    } catch {/* silent */} finally {
      setBuildHistoryLoading(false);
    }
  }, []);
  useEffect(() => {
    if (isAuthenticated && (activeTab === 'build' || activeTab === 'overview' || activeTab === 'projects')) fetchBuildHistory();
  }, [isAuthenticated, activeTab, fetchBuildHistory]);
  async function toggleJobExpand(job: BuildJob) {
    if (expandedJobId === job.id) {
      setExpandedJobId(null);
      return;
    }
    // If we already have the result cached on the job object, just expand
    if (job.result !== undefined) {
      setExpandedJobId(job.id);
      return;
    }
    // Fetch full job details from the API
    setExpandedJobId(job.id);
    setExpandedJobLoading(true);
    try {
      const res = await fetch(`/api/builds/${job.id}`, {
        credentials: 'include'
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        job: BuildJob;
      };
      setBuildHistory(prev => prev.map(j => j.id === job.id ? {
        ...j,
        ...data.job
      } : j));
    } catch {/* silent */} finally {
      setExpandedJobLoading(false);
    }
  }

  // Auto-scroll build output
  useEffect(() => {
    if (buildOutputRef.current && buildRunning) {
      buildOutputRef.current.scrollTop = buildOutputRef.current.scrollHeight;
    }
  }, [buildTokens, buildRunning]);
  async function runBuild() {
    if (!buildPrompt.trim() || buildRunning) return;
    setBuildRunning(true);
    setBuildPlan([]);
    setBuildCurrentStep(-1);
    setBuildTokens('');
    setBuildStatus('');
    setBuildError('');
    setBuildDone(false);
    setBuildDuration(null);
    setBuildJobId(null);
    setShowBuildOutput(true);
    try {
      const res = await fetch('/api/builds', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: buildPrompt
        })
      });
      if (!res.ok || !res.body) {
        const err = await res.text();
        setBuildError(err || `Server error ${res.status}`);
        setBuildRunning(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const { buf: newBuf, events } = parseSSEChunk(buf, decoder.decode(value, { stream: true }));
        buf = newBuf;
        for (const { event: eventName, data: payload } of events) {
          try {
            const data = JSON.parse(payload) as unknown;
            if (eventName === 'jobId') setBuildJobId(data as string);
            if (eventName === 'status') setBuildStatus(data as string);
            if (eventName === 'plan') setBuildPlan(data as string[]);
            if (eventName === 'step') setBuildCurrentStep((data as { index: number }).index);
            if (eventName === 'token') setBuildTokens(prev => prev + (data as string));
            if (eventName === 'done') {
              setBuildDone(true);
              setBuildDuration((data as { durationMs: number }).durationMs);
              fetchBuildHistory();
              fetchBcuBalance();
            }
            if (eventName === 'error') setBuildError(data as string);
          } catch {/* skip */}
        }
      }
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setBuildRunning(false);
    }
  }
  async function runRefine(refinePrompt: string, sourceJobId?: string) {
    const jobId = sourceJobId ?? buildJobId;
    if (!jobId || refineRunning) return;
    setRefineRunning(true);
    // Reset stream state for the new refinement run
    setBuildTokens('');
    setBuildStatus('');
    setBuildError('');
    setBuildDone(false);
    setBuildDuration(null);
    setShowBuildOutput(true);
    try {
      const res = await fetch('/api/builds/refine', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refinePrompt,
          sourceJobId: jobId
        })
      });
      if (!res.ok || !res.body) {
        const err = await res.text();
        setBuildError(err || `Server error ${res.status}`);
        setRefineRunning(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const { buf: newBuf, events } = parseSSEChunk(buf, decoder.decode(value, { stream: true }));
        buf = newBuf;
        for (const { event: eventName, data: payload } of events) {
          try {
            const data = JSON.parse(payload) as unknown;
            if (eventName === 'jobId') setBuildJobId(data as string);
            if (eventName === 'status') setBuildStatus(data as string);
            if (eventName === 'token') setBuildTokens(prev => prev + (data as string));
            if (eventName === 'done') {
              setBuildDone(true);
              setBuildDuration((data as { durationMs: number }).durationMs);
              fetchBuildHistory();
              fetchBcuBalance();
            }
            if (eventName === 'error') setBuildError(data as string);
          } catch {/* skip */}
        }
      }
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setRefineRunning(false);
    }
  }

  // Inline refinement for a specific history job — streams into per-job state
  async function runRefineForJob(sourceJobId: string, refinePrompt: string) {
    const cur = getJobRefine(sourceJobId);
    if (cur.running) return;
    patchJobRefine(sourceJobId, {
      running: true,
      tokens: '',
      status: '',
      error: '',
      done: false,
      durationMs: null,
      newJobId: null
    });
    try {
      const res = await fetch('/api/builds/refine', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refinePrompt,
          sourceJobId
        })
      });
      if (!res.ok || !res.body) {
        const err = await res.text();
        patchJobRefine(sourceJobId, {
          error: err || `Server error ${res.status}`,
          running: false
        });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const {
          done,
          value
        } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, {
          stream: true
        });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('event: ')) {
            const eventName = line.slice(7).trim();
            const dataLine = lines[i + 1]?.trim() ?? '';
            if (dataLine.startsWith('data: ')) {
              const payload = dataLine.slice(6);
              try {
                const data = JSON.parse(payload) as unknown;
                if (eventName === 'jobId') patchJobRefine(sourceJobId, {
                  newJobId: data as string
                });
                if (eventName === 'status') patchJobRefine(sourceJobId, {
                  status: data as string
                });
                if (eventName === 'token') setJobRefineState(prev => {
                  const existing = prev[sourceJobId] ?? {
                    running: true,
                    tokens: '',
                    status: '',
                    error: '',
                    done: false,
                    durationMs: null,
                    newJobId: null
                  };
                  return {
                    ...prev,
                    [sourceJobId]: {
                      ...existing,
                      tokens: existing.tokens + (data as string)
                    }
                  };
                });
                if (eventName === 'done') {
                  patchJobRefine(sourceJobId, {
                    done: true,
                    durationMs: (data as {
                      durationMs: number;
                    }).durationMs
                  });
                  fetchBuildHistory();
                  fetchBcuBalance();
                }
                if (eventName === 'error') patchJobRefine(sourceJobId, {
                  error: data as string
                });
              } catch {/* skip */}
            }
          }
        }
      }
    } catch (err) {
      patchJobRefine(sourceJobId, {
        error: err instanceof Error ? err.message : 'Network error'
      });
    } finally {
      patchJobRefine(sourceJobId, {
        running: false
      });
    }
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !isAuthenticated) {
      navigate('/login', {
        state: {
          from: {
            pathname: '/dashboard'
          }
        },
        replace: true
      });
    }
    // Redirect to verify-email page if authenticated but email not verified
    if (!isPending && isAuthenticated && user && !user.emailVerified) {
      navigate('/verify-email', {
        replace: true
      });
    }
  }, [isPending, isAuthenticated, user, navigate]);
  async function handleSignOut() {
    await signOut();
    navigate('/login', {
      replace: true
    });
  }
  if (isPending) {
    return <div className="min-h-screen flex items-center justify-center" style={{
      background: '#0A0D12'
    }}>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading…
        </div>
      </div>;
  }
  return <>
      <Helmet>
        <title>Dashboard — SynTract Labs</title>
        <meta name="description" content="SynTract Labs developer dashboard." />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://syntract.net/dashboard" />
      </Helmet>

      <div className="min-h-screen" style={{
      background: '#0A0D12'
    }}>
        {/* top bar */}
        <div className="border-b border-border sticky top-16 z-40 backdrop-blur-md" style={{
        background: 'rgba(10,13,18,0.92)'
      }}>
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between h-12">
              {/* Primary nav tabs */}
              <nav className="flex items-center gap-0.5" aria-label="Dashboard navigation">
                {([{
                id: 'overview',
                label: 'Overview',
                icon: LayoutGrid
              }, {
                id: 'build',
                label: 'Build',
                icon: Bot
              }, {
                id: 'projects',
                label: 'Projects',
                icon: Code2
              }, {
                id: 'docs',
                label: 'Documentation',
                icon: BookOpen
              }, {
                id: 'pricing',
                label: 'Pricing',
                icon: CreditCard
              }, {
                id: 'team',
                label: 'Team',
                icon: Users
              }, {
                id: 'publish',
                label: 'Publish',
                icon: Package
              }, {
                id: 'settings',
                label: 'Settings',
                icon: Settings
              }] as const).map(({
                id,
                label,
                icon: Icon
              }) => <button key={id} onClick={() => setActiveTab(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${activeTab === id ? 'bg-white/[0.06] text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'}`}>
                    <Icon size={11} />{label}
                  </button>)}
              </nav>

              {/* Sign out */}
              <button onClick={handleSignOut} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all shrink-0">
                <LogOut size={11} />Sign out
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8">

          {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
          {activeTab === 'overview' && <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.2
        }} className="flex flex-col gap-8">

              {/* ── ONBOARDING BANNER ──────────────────────────────────── */}
              <div className="rounded-2xl border border-primary/20 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5" style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)/0.07), hsl(var(--secondary)/0.07))'
          }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/15 border border-primary/30">
                  <Zap size={18} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground text-sm mb-1">Welcome to SynTract Labs</p>
                  <p className="text-xs text-muted-foreground">Start your first build using the Build Engine.</p>
                </div>
                <button onClick={() => setActiveTab('build')} className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-all">
                  <Bot size={11} />Open Build Engine
                </button>
              </div>

              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight mb-0.5">
                  {user?.name ? `Good to see you, ${user.name.split(' ')[0]}.` : 'Dashboard'}
                </h1>
                <p className="text-sm text-muted-foreground">SynTract Build Engine — AI-powered software development studio.</p>
              </div>

              {/* Quick-action cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button onClick={() => setActiveTab('build')} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/40 hover:bg-primary/[0.03] transition-all group">
                  <div className="w-9 h-9 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center mb-4">
                    <Cpu size={15} className="text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Build Engine</p>
                  <p className="text-xs text-muted-foreground">Describe a project and let the AI agent plan and build it end-to-end.</p>
                </button>

                <button onClick={() => setActiveTab('team')} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/40 hover:bg-primary/[0.03] transition-all group">
                  <div className="w-9 h-9 rounded-lg border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center mb-4">
                    <Users size={15} className="text-emerald-400" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Team</p>
                  <p className="text-xs text-muted-foreground">Manage user roles and access controls across your organization.</p>
                </button>

                <button onClick={() => setActiveTab('settings')} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/40 hover:bg-primary/[0.03] transition-all group">
                  <div className="w-9 h-9 rounded-lg border border-purple-500/20 bg-purple-500/10 flex items-center justify-center mb-4">
                    <Settings size={15} className="text-purple-400" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Settings</p>
                  <p className="text-xs text-muted-foreground">Configure your account, secrets, and workspace preferences.</p>
                </button>
              </div>

              {/* BCU Balance card */}
              {bcuBalance !== null && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Zap size={13} className="text-primary" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">BCU Balance</p>
                    </div>
                    <button onClick={fetchBcuBalance} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Refresh
                    </button>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${bcuBalance.total > 0 ? Math.max(2, (bcuBalance.remaining / bcuBalance.total) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{bcuBalance.remaining.toFixed(1)}</span> BCU remaining
                    </span>
                    <span className="text-muted-foreground">{bcuBalance.used.toFixed(1)} used of {bcuBalance.total.toFixed(1)} total</span>
                  </div>
                  {bcuBalance.remaining < 1 && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2">
                      <Zap size={11} className="text-amber-400 shrink-0" />
                      <p className="text-xs text-amber-400">Low balance — purchase a top-up pack to continue building.</p>
                      <button onClick={() => setActiveTab('pricing')} className="ml-auto text-xs font-semibold text-amber-400 hover:underline shrink-0">View plans</button>
                    </div>
                  )}
                </div>
              )}

              {/* Recent builds */}
              {buildHistory.length > 0 && <div className="rounded-xl border border-border overflow-hidden bg-card">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-muted-foreground/50" />
                      <p className="font-semibold text-sm text-foreground">Recent builds</p>
                    </div>
                    <button onClick={() => setActiveTab('build')} className="text-xs text-primary hover:underline flex items-center gap-1">
                      View all <ChevronDown size={11} className="-rotate-90" />
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {buildHistory.slice(0, 5).map(job => <div key={job.id} className="flex items-center gap-4 px-5 py-3.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${job.status === 'complete' ? 'bg-emerald-500/15' : job.status === 'failed' ? 'bg-destructive/15' : 'bg-primary/15'}`}>
                          {job.status === 'complete' ? <CheckCircle2 size={11} className="text-emerald-400" /> : job.status === 'failed' ? <XCircle size={11} className="text-destructive" /> : <Loader2 size={11} className="text-primary animate-spin" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{job.prompt}</p>
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                            {timeAgo(job.createdAt)}{job.durationMs ? ` · ${(job.durationMs / 1000).toFixed(1)}s` : ''}
                          </p>
                        </div>
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${job.status === 'complete' ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400/80' : job.status === 'failed' ? 'border-destructive/20 bg-destructive/[0.06] text-destructive/80' : 'border-primary/20 bg-primary/[0.06] text-primary/80'}`}>{job.status}</span>
                      </div>)}
                  </div>
                </div>}

              {/* Empty state — no builds yet */}
              {buildHistory.length === 0 && <div className="rounded-xl border border-dashed border-border p-10 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Code2 size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">No builds yet</p>
                    <p className="text-xs text-muted-foreground">Head to the Build tab to start your first project.</p>
                  </div>
                  <button onClick={() => setActiveTab('build')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Bot size={11} />Start building
                  </button>
                </div>}
            </motion.div>}

          {/* ── BUILD TAB ────────────────────────────────────────────────── */}
          {activeTab === 'build' && <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.2
        }} className="flex flex-col gap-6">

              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-bold text-foreground tracking-tight">AI Build Agent</h2>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-primary/25 bg-primary/[0.08] text-primary/80">BETA</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Describe what you want to build. The agent plans, then generates production-ready code and architecture.</p>
                </div>
                {buildHistory.length > 0 && <button onClick={fetchBuildHistory} disabled={buildHistoryLoading} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all disabled:opacity-50">
                    <RefreshCw size={11} className={buildHistoryLoading ? 'animate-spin' : ''} />History
                  </button>}
              </div>

              {/* Prompt input */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <Sparkles size={12} className="text-primary/60" />
                  <span className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest">Describe your project</span>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <textarea value={buildPrompt} onChange={e => setBuildPrompt(e.target.value)} disabled={buildRunning} rows={5} placeholder="e.g. A real-time multiplayer trivia game with rooms, scoring, and a leaderboard. Built with React, Node.js, and WebSockets." className="w-full px-3 py-2.5 rounded-md text-sm bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none leading-relaxed disabled:opacity-50" />

                  {/* Example prompts */}
                  {!buildPrompt && !buildRunning && <div className="flex flex-wrap gap-2">
                      {['A SaaS dashboard for tracking subscription metrics with charts', 'A mobile-first e-commerce app with cart and Stripe checkout', 'An AI-powered code review tool that integrates with GitHub PRs', 'A real-time collaborative whiteboard app'].map(ex => <button key={ex} onClick={() => setBuildPrompt(ex)} className="px-2.5 py-1 rounded-md border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-muted-foreground hover:text-foreground transition-all text-left">
                          {ex}
                        </button>)}
                    </div>}

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] text-muted-foreground/50">{buildPrompt.length}/4000 chars</p>
                    <button onClick={runBuild} disabled={buildRunning || !buildPrompt.trim() || buildPrompt.length > 4000} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed">
                      {buildRunning ? <><Loader2 size={14} className="animate-spin" />Building…</> : <><Cpu size={14} />Run Agent</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Live agent output */}
              {(buildRunning || buildTokens || buildError || buildDone) && <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Output header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Terminal size={12} className="text-primary/60" />
                      <span className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest">Agent output</span>
                      {buildRunning && <span className="flex items-center gap-1 font-mono text-[10px] text-primary/70">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          {buildStatus || 'Running…'}
                        </span>}
                      {buildDone && buildDuration !== null && <span className="font-mono text-[10px] text-emerald-400/80 flex items-center gap-1">
                          <CheckCircle2 size={10} />Done in {(buildDuration / 1000).toFixed(1)}s
                        </span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {buildTokens && <CopyBtn text={buildTokens} />}
                      <button onClick={() => setShowBuildOutput(v => !v)} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                        {showBuildOutput ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Plan steps */}
                  {buildPlan.length > 0 && showBuildOutput && <div className="px-4 py-3 border-b border-border flex flex-col gap-1.5">
                      <p className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-widest mb-1">Build plan</p>
                      {buildPlan.map((step, i) => {
                const isDone = buildDone || i < buildCurrentStep;
                const isActive = i === buildCurrentStep && buildRunning;
                return <div key={i} className="flex items-start gap-2.5">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${isDone ? 'bg-emerald-500/20 border border-emerald-500/30' : isActive ? 'bg-primary/20 border border-primary/40' : 'bg-white/[0.04] border border-white/[0.08]'}`}>
                              {isDone ? <CheckCircle2 size={9} className="text-emerald-400" /> : isActive ? <Loader2 size={9} className="text-primary animate-spin" /> : <span className="font-mono text-[8px] text-muted-foreground/40">{i + 1}</span>}
                            </div>
                            <span className={`text-xs leading-relaxed transition-colors ${isDone ? 'text-emerald-400/80' : isActive ? 'text-foreground' : 'text-muted-foreground/50'}`}>{step}</span>
                          </div>;
              })}
                    </div>}

                  {/* Error */}
                  {buildError && <div className="flex items-start gap-3 p-4">
                      <XCircle size={14} className="text-destructive mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-destructive mb-1">Build failed</p>
                        <p className="text-xs text-destructive/70">{buildError}</p>
                        {buildError.includes('OPENAI_API_KEY') && <p className="text-xs text-muted-foreground mt-2">
                            Add your OpenAI API key in Settings → Secrets to enable the build agent.
                          </p>}
                      </div>
                    </div>}

                  {/* While streaming: raw pre so tokens appear instantly */}
                  {showBuildOutput && buildTokens && buildRunning && <pre ref={buildOutputRef} className="p-4 text-xs font-mono text-muted-foreground overflow-auto max-h-[520px] leading-relaxed whitespace-pre-wrap">
                      {buildTokens}
                      <span className="inline-block w-1.5 h-3.5 bg-primary/70 ml-0.5 animate-pulse align-middle" />
                    </pre>}

                  {/* Waiting state */}
                  {buildRunning && !buildTokens && !buildError && <div className="flex items-center gap-3 p-6">
                      <Loader2 size={16} className="text-primary/60 animate-spin shrink-0" />
                      <p className="text-sm text-muted-foreground">{buildStatus || 'Initializing agent…'}</p>
                    </div>}
                </div>}

              {/* Rendered result — shown after stream completes */}
              {buildDone && buildTokens && !buildRunning && <BuildResultViewer result={buildTokens} prompt={buildPrompt} durationMs={buildDuration} jobId={buildJobId ?? undefined} onRefine={buildJobId ? p => runRefine(p, buildJobId) : undefined} refining={refineRunning} />}

              {/* Build history */}
              {buildHistory.length > 0 && <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
                    <Clock size={12} className="text-muted-foreground/50" />
                    <p className="font-semibold text-sm text-foreground">Recent builds</p>
                  </div>
                  <div className="divide-y divide-border">
                    {buildHistory.map(job => <div key={job.id}>
                        {/* Row — always visible */}
                        <button onClick={() => toggleJobExpand(job)} className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors text-left">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${job.status === 'complete' ? 'bg-emerald-500/15' : job.status === 'failed' ? 'bg-destructive/15' : 'bg-primary/15'}`}>
                            {job.status === 'complete' ? <CheckCircle2 size={11} className="text-emerald-400" /> : job.status === 'failed' ? <XCircle size={11} className="text-destructive" /> : <Loader2 size={11} className="text-primary animate-spin" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground truncate">{job.prompt}</p>
                            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                              {timeAgo(job.createdAt)}{job.durationMs ? ` · ${(job.durationMs / 1000).toFixed(1)}s` : ''}
                            </p>
                          </div>
                          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${job.status === 'complete' ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400/80' : job.status === 'failed' ? 'border-destructive/20 bg-destructive/[0.06] text-destructive/80' : 'border-primary/20 bg-primary/[0.06] text-primary/80'}`}>{job.status}</span>
                          {(job.status === 'complete' || job.status === 'failed') && <ChevronDown size={13} className={`text-muted-foreground/40 shrink-0 transition-transform ${expandedJobId === job.id ? 'rotate-180' : ''}`} />}
                        </button>

                        {/* Expanded result panel */}
                        {expandedJobId === job.id && (job.status === 'complete' || job.status === 'failed') && <div className="border-t border-border">
                            {expandedJobLoading && job.result === undefined ? <div className="flex items-center gap-2 px-5 py-4 text-xs text-muted-foreground">
                                <Loader2 size={12} className="animate-spin" /> Loading result…
                              </div> : job.status === 'complete' && job.result ? <>
                                <BuildResultViewer result={job.result} prompt={job.prompt} durationMs={job.durationMs} collapsible={false} jobId={job.id} onRefine={p => runRefineForJob(job.id, p)} refining={getJobRefine(job.id).running} />
                                {/* Inline refinement stream for this job */}
                                {(() => {
                      const jr = getJobRefine(job.id);
                      if (!jr.running && !jr.tokens && !jr.error) return null;
                      return <div className="border-t border-border bg-white/[0.01]">
                                      {/* Status / streaming */}
                                      {(jr.running || jr.tokens) && !jr.done && <div className="px-5 py-3 flex items-center gap-2 border-b border-border">
                                          <Loader2 size={12} className="text-primary/60 animate-spin shrink-0" />
                                          <span className="text-xs text-muted-foreground">{jr.status || 'Refining…'}</span>
                                        </div>}
                                      {jr.error && <div className="flex items-start gap-3 px-5 py-4">
                                          <XCircle size={14} className="text-destructive mt-0.5 shrink-0" />
                                          <p className="text-xs text-destructive/80">{jr.error}</p>
                                        </div>}
                                      {jr.tokens && <BuildResultViewer result={jr.tokens} prompt={job.prompt} durationMs={jr.done ? jr.durationMs : null} collapsible={false} jobId={jr.newJobId ?? undefined} onRefine={jr.done && jr.newJobId ? p => runRefineForJob(jr.newJobId!, p) : undefined} refining={false} />}
                                    </div>;
                    })()}
                              </> : job.status === 'failed' ? <div className="px-5 py-4">
                                <p className="text-[10px] font-semibold text-destructive/60 uppercase tracking-widest mb-2">Error</p>
                                <pre className="text-xs text-destructive/80 font-mono whitespace-pre-wrap bg-destructive/[0.05] rounded-lg border border-destructive/20 p-4 max-h-48 overflow-y-auto">
                                  {job.error || 'Unknown error'}
                                </pre>
                              </div> : <div className="px-5 py-4 text-xs text-muted-foreground">No result available.</div>}
                          </div>}
                      </div>)}
                  </div>
                </div>}

              {/* Empty state */}
              {!buildRunning && !buildTokens && !buildError && buildHistory.length === 0 && <div className="rounded-xl border border-dashed border-border p-10 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Code2 size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">No builds yet</p>
                    <p className="text-xs text-muted-foreground">Describe a project above and the agent will plan and build it for you.</p>
                  </div>
                </div>}
            </motion.div>}

          {/* ── PROJECTS TAB ─────────────────────────────────────────── */}
          {activeTab === 'projects' && <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.2
        }} className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight mb-1">Projects</h2>
                <p className="text-sm text-muted-foreground">All builds you've generated with the Build Engine.</p>
              </div>
              {buildHistoryLoading ? <div className="flex items-center justify-center py-16">
                  <Loader2 size={20} className="text-primary/50 animate-spin" />
                </div> : buildHistory.length === 0 ? <div className="rounded-xl border border-dashed border-border p-12 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Code2 size={20} className="text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No projects yet</p>
                  <p className="text-xs text-muted-foreground">Run your first build to see it here.</p>
                  <button onClick={() => setActiveTab('build')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Bot size={11} />Start building
                  </button>
                </div> : <div className="rounded-xl border border-border overflow-hidden bg-card">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
                    <p className="text-sm font-semibold text-foreground">{buildHistory.length} project{buildHistory.length !== 1 ? 's' : ''}</p>
                    <button onClick={fetchBuildHistory} disabled={buildHistoryLoading} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <RefreshCw size={11} className={buildHistoryLoading ? 'animate-spin' : ''} />Refresh
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {buildHistory.map(job => <div key={job.id} className="flex items-center gap-4 px-5 py-4">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${job.status === 'complete' ? 'bg-emerald-500/15' : job.status === 'failed' ? 'bg-destructive/15' : 'bg-primary/15'}`}>
                          {job.status === 'complete' ? <CheckCircle2 size={13} className="text-emerald-400" /> : job.status === 'failed' ? <XCircle size={13} className="text-destructive" /> : <Loader2 size={13} className="text-primary animate-spin" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{job.prompt}</p>
                          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                            {timeAgo(job.createdAt)}{job.durationMs ? ` · ${(job.durationMs / 1000).toFixed(1)}s` : ''}
                          </p>
                        </div>
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${job.status === 'complete' ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400/80' : job.status === 'failed' ? 'border-destructive/20 bg-destructive/[0.06] text-destructive/80' : 'border-primary/20 bg-primary/[0.06] text-primary/80'}`}>{job.status}</span>
                      </div>)}
                  </div>
                </div>}
            </motion.div>}

          {/* ── DOCUMENTATION TAB ────────────────────────────────────── */}
          {activeTab === 'docs' && <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.2
        }} className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight mb-1">Documentation</h2>
                <p className="text-sm text-muted-foreground">Guides, API reference, and integration docs for the SynTract Build Engine.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[{
              icon: BookOpen,
              title: 'Build Engine docs',
              desc: 'Full reference for the AI build pipeline, output format, and streaming API.',
              href: '/docs'
            }, {
              icon: Cpu,
              title: 'API reference',
              desc: 'Endpoint specs, request/response schemas, and authentication details.',
              href: '/docs#api'
            }, {
              icon: Sparkles,
              title: 'Prompt engineering',
              desc: 'Best practices for writing prompts that produce high-quality builds.',
              href: '/docs#prompts'
            }, {
              icon: Zap,
              title: 'Quick-start guide',
              desc: 'Get from zero to a running build in under five minutes.',
              href: '/docs#quickstart'
            }].map(({
              icon: Icon,
              title,
              desc,
              href
            }) => <Link key={title} to={href} className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-primary/[0.03] transition-all group">
                    <div className="w-8 h-8 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center mb-3">
                      <Icon size={14} className="text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </Link>)}
              </div>
              <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">Full documentation site</p>
                  <p className="text-xs text-muted-foreground">Browse all 12 sections of the Build Engine reference.</p>
                </div>
                <Link to="/docs" className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <BookOpen size={11} />Open docs
                </Link>
              </div>
            </motion.div>}

          {/* ── PRICING TAB ──────────────────────────────────────────── */}
          {activeTab === 'pricing' && <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.2
        }} className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight mb-1">Pricing</h2>
                <p className="text-sm text-muted-foreground">View plans, BCU allocations, and upgrade your workspace.</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center text-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <CreditCard size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">See all plans and BCU packs</p>
                  <p className="text-xs text-muted-foreground">Compare Free, Starter, Professional, Team, and Enterprise tiers.</p>
                </div>
                <Link to="/pricing" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <CreditCard size={13} />View pricing
                </Link>
              </div>
            </motion.div>}

          {/* ── SETTINGS TAB ─────────────────────────────────────────── */}
          {activeTab === 'settings' && <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.2
        }} className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight mb-1">Settings</h2>
                <p className="text-sm text-muted-foreground">Manage your account, workspace, and preferences.</p>
              </div>
              <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Email address</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{user?.email ?? '—'}</p>
                  </div>
                </div>
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Display name</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{user?.name ?? '—'}</p>
                  </div>
                </div>
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Role</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{(user as {
                    role?: string;
                  })?.role ?? 'developer'}</p>
                  </div>
                </div>
              </div>
              {/* ── Change password ── */}
              <ChangePasswordSection />

              <div className="rounded-xl border border-destructive/20 bg-destructive/[0.04] px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Sign out</p>
                  <p className="text-xs text-muted-foreground mt-0.5">End your current session.</p>
                </div>
                <button onClick={handleSignOut} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                  <LogOut size={11} />Sign out
                </button>
              </div>
            </motion.div>}

          {/* ── TEAM TAB ─────────────────────────────────────────────── */}
          {activeTab === 'team' && <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.2
        }} className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight mb-1">Team Management</h2>
                <p className="text-sm text-muted-foreground">View and manage user roles across your organization.</p>
              </div>

              {/* Role legend */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ROLES.map(role => <div key={role} className="rounded-lg border border-border bg-card p-4 flex flex-col gap-1">
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border w-fit ${role === 'admin' ? 'bg-primary/10 border-primary/20 text-primary' : role === 'viewer' ? 'bg-muted/40 border-border text-muted-foreground' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>{ROLE_LABELS[role]}</span>
                    <p className="text-xs text-muted-foreground mt-1">{ROLE_DESCRIPTIONS[role]}</p>
                  </div>)}
              </div>

              {/* User list */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/20">
                  <span className="text-xs font-semibold text-foreground">Users</span>
                  <button onClick={fetchTeamUsers} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <RefreshCw size={11} />Refresh
                  </button>
                </div>

                {teamLoading && <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
                    <Loader2 size={14} className="animate-spin" />Loading users…
                  </div>}

                {teamError && !teamLoading && <div className="flex items-center gap-2 px-5 py-4 text-sm text-amber-400">
                    <AlertTriangle size={13} />{teamError}
                  </div>}

                {!teamLoading && !teamError && teamUsers.length === 0 && <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
                    <Users size={20} className="opacity-30" />
                    <span>No users found or admin access required.</span>
                  </div>}

                {!teamLoading && teamUsers.map((u, i) => <div key={u.id} className={`flex items-center gap-4 px-5 py-4 ${i < teamUsers.length - 1 ? 'border-b border-border' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{u.name?.[0]?.toUpperCase() ?? u.email[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {u.emailVerified ? <span className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-400/70 font-mono">
                          <CheckCircle2 size={10} />Verified
                        </span> : <span className="hidden sm:flex items-center gap-1 text-[10px] text-amber-400/70 font-mono">
                          <AlertTriangle size={10} />Unverified
                        </span>}
                      {/* Role selector — server enforces admin-only writes */}
                      <div className="relative">
                        {roleUpdating === u.id ? <div className="flex items-center gap-1 px-2 py-1 rounded border border-border text-xs text-muted-foreground">
                            <Loader2 size={10} className="animate-spin" />Saving…
                          </div> : <select value={u.role} onChange={e => updateUserRole(u.id, e.target.value as UserRole)} className="appearance-none bg-muted/30 border border-border rounded px-2 py-1 text-xs text-foreground cursor-pointer hover:bg-muted/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40">
                            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>}
                      </div>
                    </div>
                  </div>)}
              </div>
            </motion.div>}

          {/* ── PUBLISH TAB ──────────────────────────────────────────── */}
          {activeTab === 'publish' && <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.2
        }} className="flex flex-col gap-6">
              <NativeBuildPipeline sourceJobId={buildJobId ?? undefined} />
            </motion.div>}
        </div>
      </div>

    </>;
}
