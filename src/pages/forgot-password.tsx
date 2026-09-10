import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { Link } from "react-router";
import { motion } from 'motion/react';
import { Terminal, ArrowRight, AlertCircle, CheckCircle, Mail } from 'lucide-react';
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forget-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          redirectTo: '/reset-password'
        })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((result as {
          message?: string;
        }).message || 'Could not send reset email.');
      } else {
        setSent(true);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  return <>
      <Helmet>
        <title>Reset Password — SynTract Labs</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16" style={{
      background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(79,110,247,0.08) 0%, transparent 70%), #0A0D12'
    }}>
        <motion.div initial={{
        opacity: 0,
        y: 16
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.3
      }} className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/[0.06] mb-5">
              <Terminal size={11} className="text-primary/70" />
              <span className="font-mono text-[10px] text-primary/70 tracking-widest">ACCOUNT RECOVERY</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Forgot your password?</h1>
            <p className="text-sm text-muted-foreground">Enter your email and we'll send a reset link.</p>
          </div>

          <div className="rounded-xl border border-white/[0.08] overflow-hidden" style={{
          background: '#0d1117'
        }}>
            {sent ? <div className="p-8 flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle size={22} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Check your inbox</p>
                  <p className="text-sm text-muted-foreground">
                    If <span className="text-foreground font-medium">{email}</span> has an account, a reset link is on its way. Check your spam folder if it doesn't arrive within a few minutes.
                  </p>
                </div>
                <Link to="/login" className="mt-2 text-xs text-primary hover:underline flex items-center gap-1">
                  Back to sign in <ArrowRight size={11} />
                </Link>
              </div> : <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                {error && <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-red-500/[0.08] border border-red-500/20">
                    <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-400">{error}</p>
                  </div>}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Email address</label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                    <input type="email" autoComplete="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="w-full pl-8 pr-3 py-2.5 rounded-md text-sm bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                  </div>
                </div>

                <button type="submit" disabled={loading || !email} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(79,110,247,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1">
                  {loading ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Sending…</> : <>Send reset link <ArrowRight size={14} /></>}
                </button>
              </form>}

            <div className="px-6 py-4 border-t border-white/[0.05] text-center" style={{
            background: '#161b22'
          }}>
              <p className="text-xs text-muted-foreground">
                Remember it?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>;
}
