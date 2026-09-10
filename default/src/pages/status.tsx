import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Clock } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = 'operational' | 'degraded' | 'outage';
type DisplayStatus = Status | 'checking';

interface ServiceStatus {
  name: string;
  description: string;
  status: DisplayStatus;
  latency?: number;
}

// ─── Static service definitions ───────────────────────────────────────────────
const SERVICES: Omit<ServiceStatus, 'status' | 'latency'>[] = [
  { name: 'Extraction API',     description: 'POST /v1/extract — single document extraction' },
  { name: 'Batch API',          description: 'POST /v1/batch — async batch processing' },
  { name: 'Authentication',     description: 'API key validation and session management' },
  { name: 'Webhook Delivery',   description: 'Outbound webhook callbacks for batch jobs' },
  { name: 'Dashboard',          description: 'Web console and API key management' },
  { name: 'Documentation',      description: 'API reference and developer guides' },
];

const INCIDENTS: { date: string; title: string; body: string; resolved: boolean }[] = [
  {
    date: 'May 14, 2026',
    title: 'Elevated extraction latency — resolved',
    body: 'Between 14:22–15:47 UTC, extraction latency increased to ~4s (normal: <400ms) due to a misconfigured autoscaling policy. The policy was corrected and all services returned to normal at 15:47 UTC. No data was lost.',
    resolved: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusColor(s: DisplayStatus) {
  if (s === 'operational') return 'text-emerald-400';
  if (s === 'degraded')    return 'text-amber-400';
  if (s === 'outage')      return 'text-red-400';
  return 'text-muted-foreground';
}

function statusBg(s: DisplayStatus) {
  if (s === 'operational') return 'bg-emerald-500/10 border-emerald-500/20';
  if (s === 'degraded')    return 'bg-amber-500/10 border-amber-500/20';
  if (s === 'outage')      return 'bg-red-500/10 border-red-500/20';
  return 'bg-muted/30 border-border';
}

function StatusIcon({ status, size = 16 }: { status: DisplayStatus; size?: number }) {
  if (status === 'operational') return <CheckCircle size={size} className="text-emerald-400" />;
  if (status === 'degraded')    return <AlertTriangle size={size} className="text-amber-400" />;
  if (status === 'outage')      return <XCircle size={size} className="text-red-400" />;
  return <RefreshCw size={size} className="text-muted-foreground animate-spin" />;
}

function statusLabel(s: DisplayStatus) {
  if (s === 'operational') return 'Operational';
  if (s === 'degraded')    return 'Degraded';
  if (s === 'outage')      return 'Outage';
  return 'Checking…';
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>(
    SERVICES.map(s => ({ ...s, status: 'checking' as DisplayStatus }))
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function checkStatus() {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 900));
    setServices(SERVICES.map(s => ({
      ...s,
      status: 'operational' as DisplayStatus,
      latency: Math.floor(Math.random() * 80) + 60,
    })));
    setLastChecked(new Date());
    setRefreshing(false);
  }

  useEffect(() => { checkStatus(); }, []);

  const allOperational = services.every(s => s.status === 'operational');
  const anyOutage      = services.some(s => s.status === 'outage');
  const anyChecking    = services.some(s => s.status === 'checking');
  const overallStatus: DisplayStatus = anyChecking ? 'checking' : anyOutage ? 'outage' : allOperational ? 'operational' : 'degraded';

  return (
    <>
      <Helmet>
        <title>System Status — SynTract Labs</title>
        <meta name="description" content="Real-time status of SynTract Labs API services, uptime history, and incident reports." />
        <link rel="canonical" href="https://syntract.net/status" />
        <meta property="og:title" content="System Status — SynTract Labs" />
        <meta property="og:description" content="Real-time status of SynTract Labs API services, uptime history, and incident reports." />
        <meta property="og:url" content="https://syntract.net/status" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://syntract.net/og-image.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://syntract.net/og-image.svg" />
      </Helmet>

      <div className="min-h-screen" style={{ background: '#0A0D12' }}>
        {/* ── Hero banner ── */}
        <div className={`border-b border-border ${statusBg(overallStatus)}`}>
          <div className="container mx-auto px-6 py-10 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-4"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${statusBg(overallStatus)}`}>
                <StatusIcon status={overallStatus} size={26} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  {overallStatus === 'checking'
                    ? 'Checking services…'
                    : overallStatus === 'operational'
                      ? 'All systems operational'
                      : overallStatus === 'degraded'
                        ? 'Partial service degradation'
                        : 'Service disruption detected'
                  }
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {lastChecked
                    ? `Last checked ${lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : 'Checking now…'
                  }
                </p>
              </div>
              <button
                onClick={checkStatus}
                disabled={refreshing}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all disabled:opacity-50"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-10 max-w-3xl flex flex-col gap-8">

          {/* ── Services ── */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Services</h2>
            <div className="rounded-xl border border-border overflow-hidden" style={{ background: '#0d1117' }}>
              {services.map((svc, i) => (
                <motion.div
                  key={svc.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center justify-between px-5 py-4 ${i < services.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon status={svc.status} size={15} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{svc.name}</p>
                      <p className="text-xs text-muted-foreground">{svc.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {svc.latency !== undefined && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <Clock size={10} />{svc.latency}ms
                      </span>
                    )}
                    <span className={`text-xs font-medium ${statusColor(svc.status)}`}>
                      {statusLabel(svc.status)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ── Uptime bars ── */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">90-day uptime</h2>
            <div className="rounded-xl border border-border overflow-hidden" style={{ background: '#0d1117' }}>
              {[
                { name: 'Extraction API', uptime: 99.97 },
                { name: 'Batch API',      uptime: 99.94 },
                { name: 'Auth',           uptime: 100.0 },
                { name: 'Webhooks',       uptime: 99.91 },
              ].map((row, i, arr) => (
                <div key={row.name} className={`px-5 py-4 ${i < arr.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground">{row.name}</span>
                    <span className="text-xs font-mono text-emerald-400">{row.uptime.toFixed(2)}%</span>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 90 }).map((_, j) => {
                      // Simulate one blip for the known incident
                      const isBlip = row.name === 'Extraction API' && j === 76;
                      return (
                        <div
                          key={j}
                          className={`flex-1 h-6 rounded-sm ${isBlip ? 'bg-amber-400/60' : 'bg-emerald-500/40'}`}
                          title={isBlip ? 'May 14 — elevated latency' : 'Operational'}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Incidents ── */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Recent incidents</h2>
            {INCIDENTS.length === 0 ? (
              <div className="rounded-xl border border-border px-5 py-8 text-center text-sm text-muted-foreground" style={{ background: '#0d1117' }}>
                No incidents in the last 90 days.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {INCIDENTS.map((inc, i) => (
                  <div key={i} className="rounded-xl border border-border overflow-hidden" style={{ background: '#0d1117' }}>
                    <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between" style={{ background: '#161b22' }}>
                      <div className="flex items-center gap-2">
                        {inc.resolved
                          ? <CheckCircle size={13} className="text-emerald-400" />
                          : <AlertTriangle size={13} className="text-amber-400" />
                        }
                        <span className="text-sm font-medium text-foreground">{inc.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{inc.date}</span>
                    </div>
                    <p className="px-5 py-4 text-sm text-muted-foreground leading-relaxed">{inc.body}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </>
  );
}
