import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from "react-router";
import { motion } from 'motion/react';
import { Terminal, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { authClient } from '@/lib/auth/auth-client';
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token
      });
      if (result.error) {
        setError(result.error.message || 'Reset link is invalid or expired.');
      } else {
        setSuccess(true);
        setTimeout(() => navigate('/login', {
          replace: true
        }), 2500);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  return <>
      <Helmet>
        <title>Set New Password — SynTract Labs</title>
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
            <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Set new password</h1>
            <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
          </div>

          <div className="rounded-xl border border-white/[0.08] overflow-hidden" style={{
          background: '#0d1117'
        }}>
            {!token ? <div className="p-8 text-center">
                <AlertCircle size={22} className="text-red-400 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">Invalid or missing reset token.</p>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Request a new link</Link>
              </div> : success ? <div className="p-8 flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle size={22} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Password updated</p>
                  <p className="text-sm text-muted-foreground">Redirecting you to sign in…</p>
                </div>
              </div> : <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                {error && <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-red-500/[0.08] border border-red-500/20">
                    <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-400">{error}</p>
                  </div>}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">New password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} autoComplete="new-password" required autoFocus value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" className="w-full px-3 py-2.5 pr-10 rounded-md text-sm bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Confirm password</label>
                  <input type={showPw ? 'text' : 'password'} autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" className="px-3 py-2.5 rounded-md text-sm bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>

                {/* strength hint */}
                {password.length > 0 && <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${password.length >= i * 4 ? i <= 2 ? 'bg-amber-400' : 'bg-emerald-400' : 'bg-white/[0.06]'}`} />)}
                  </div>}

                <button type="submit" disabled={loading || !password || !confirm} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(79,110,247,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1">
                  {loading ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Updating…</> : <>Update password <ArrowRight size={14} /></>}
                </button>
              </form>}

            <div className="px-6 py-4 border-t border-white/[0.05] text-center" style={{
            background: '#161b22'
          }}>
              <p className="text-xs text-muted-foreground">
                <Link to="/login" className="text-primary hover:underline font-medium">Back to sign in</Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>;
}
