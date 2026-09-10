import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { Link, useNavigate, useLocation } from "react-router";
import { motion } from 'motion/react';
import { Terminal, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { signIn } from '@/lib/auth/auth-client';
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as {
    from?: {
      pathname: string;
    };
  })?.from?.pathname || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn.email({
        email: email.trim(),
        password
      });
      if (result.error) {
        setError(result.error.message || 'Invalid email or password.');
      } else {
        navigate(from, {
          replace: true
        });
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  return <>
      <Helmet>
        <title>Sign In — SynTract Labs</title>
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

          {/* header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/[0.06] mb-5">
              <Terminal size={11} className="text-primary/70" />
              <span className="font-mono text-[10px] text-primary/70 tracking-widest">SYNTRACT CONSOLE</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your SynTract Labs account</p>
          </div>

          {/* card */}
          <div className="rounded-xl border border-white/[0.08] overflow-hidden" style={{
          background: '#0d1117'
        }}>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">

              {error && <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-red-500/[0.08] border border-red-500/20">
                  <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="px-3 py-2.5 rounded-md text-sm bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Password</label>
                  <Link to="/forgot-password" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 pr-10 rounded-md text-sm bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading || !email || !password} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(79,110,247,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1">
                {loading ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Signing in…</> : <>Sign in <ArrowRight size={14} /></>}
              </button>
            </form>

            <div className="px-6 py-4 border-t border-white/[0.05] text-center" style={{
            background: '#161b22'
          }}>
              <p className="text-xs text-muted-foreground">
                No account?{' '}
                <Link to="/signup" className="text-primary hover:underline font-medium">Create one free</Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>;
}
