import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from 'motion/react';
import { Check, Copy, ArrowRight, Terminal, Zap, Building2, Rocket, Eye, EyeOff, AlertCircle, Mail, AlertTriangle } from 'lucide-react';
import { signUp, authClient } from '@/lib/auth/auth-client';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function CopyButton({
  text,
  className = ''
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return <button type="button" onClick={() => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${copied ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-white/[0.06] hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/[0.08]'} ${className}`}>
      {copied ? <><Check size={11} />Copied!</> : <><Copy size={11} />Copy key</>}
    </button>;
}
function PasswordStrength({
  password
}: {
  password: string;
}) {
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)];
  const score = checks.filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500'];
  if (!password) return null;
  return <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map(i => <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= score ? colors[score] : 'bg-white/[0.08]'}`} />)}
      </div>
      <span className={`text-[10px] font-medium ${score <= 1 ? 'text-red-400' : score === 2 ? 'text-amber-400' : score === 3 ? 'text-yellow-400' : 'text-emerald-400'}`}>
        {labels[score]}
      </span>
    </div>;
}
const PLANS = [{
  id: 'free',
  name: 'Free Test',
  price: 'Free',
  detail: '≤ 2 hrs build time',
  icon: Zap,
  color: 'primary'
}, {
  id: 'starter',
  name: 'Starter',
  price: '$49',
  detail: '12 hrs / month',
  icon: Rocket,
  color: 'purple'
}, {
  id: 'professional',
  name: 'Professional',
  price: '$199',
  detail: '48 hrs / month',
  icon: Building2,
  color: 'amber'
}];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [plan, setPlan] = useState('free');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // step 1.5 — email sent, awaiting verification
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  async function handleResend() {
    if (!email) return;
    setResendLoading(true);
    setResendSuccess(false);
    setResendError('');
    try {
      // Use the direct resend endpoint — bypasses BetterAuth's dedup logic
      // which silently skips sendVerificationEmail for already-registered emails.
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim()
        })
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        needsFreshToken?: boolean;
      };
      if (!res.ok || !data.ok) {
        setResendError(data.error || 'Could not resend. Please try again.');
      } else if (data.needsFreshToken) {
        // No valid token in DB — fall back to BetterAuth's method to issue a new one
        const result = await authClient.sendVerificationEmail({
          email: email.trim(),
          callbackURL: '/dashboard'
        });
        if (result.error) {
          setResendError(result.error.message || 'Could not resend. Please try again.');
        } else {
          setResendSuccess(true);
        }
      } else {
        setResendSuccess(true);
      }
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Could not resend. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }
  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await signUp.email({
        name: name.trim(),
        email: email.trim(),
        password
      });
      if (result.error) {
        const msg = result.error.message || result.error.statusText || String(result.error.status);
        // Map common BetterAuth error codes to friendly messages
        if (msg.toLowerCase().includes('already') || result.error.status === 422 || result.error.status === 409) {
          setError('An account with that email already exists. Try signing in instead.');
        } else if (result.error.status === 400) {
          setError(msg || 'Invalid email or password. Please check your details.');
        } else {
          // Surface the real error message so we can see what's going wrong
          setError(msg || 'Could not create account. Please try again.');
        }
      } else {
        // Account created — email verification required before session is active.
        // Show "check your inbox" screen; user will verify then be redirected to dashboard.
        setVerificationSent(true);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  async function handlePlanSubmit() {
    setLoading(true);
    setError('');
    try {
      // Create the first API key via the real endpoint
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Production'
        })
      });
      const data = (await res.json()) as {
        key?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Could not generate API key.');
      setApiKey(data.key!);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate API key.');
    } finally {
      setLoading(false);
    }
  }
  const colorMap: Record<string, string> = {
    primary: 'border-primary/40 bg-primary/[0.06]',
    purple: 'border-purple-500/40 bg-purple-500/[0.06]',
    amber: 'border-amber-500/40 bg-amber-500/[0.06]'
  };
  return <>
      <Helmet>
        <title>Create Account — SynTract Labs</title>
        <meta name="description" content="Create your SynTract Labs account." />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://syntract.net/signup" />
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
      }} className="w-full max-w-md">

          {/* header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/[0.06] mb-5">
              <Terminal size={11} className="text-primary/70" />
              <span className="font-mono text-[10px] text-primary/70 tracking-widest">SYNTRACT CONSOLE</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">
              {verificationSent ? 'Check your inbox' : step === 1 ? 'Create your account' : step === 2 ? 'Choose a plan' : 'Your API key is ready'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {verificationSent ? `We sent a verification link to ${email}` : step === 1 ? 'Start extracting documents in minutes' : step === 2 ? 'Start free, upgrade anytime' : 'Save this key — we only show it once'}
            </p>
          </div>

          {/* step indicator — hide during verification */}
          {!verificationSent && <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3].map(s => <div key={s} className={`flex-1 h-0.5 rounded-full transition-all ${s <= step ? 'bg-primary' : 'bg-white/[0.08]'}`} />)}
            </div>}

          <AnimatePresence mode="wait">

            {/* ── VERIFICATION SENT ── */}
            {verificationSent && <motion.div key="verify" initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: -20
          }} transition={{
            duration: 0.2
          }}>
                <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center text-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail size={24} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Click the link in the email to activate your account. The link expires in 24 hours.
                    </p>
                  </div>

                  {/* Spam warning — prominent */}
                  <div className="w-full rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 flex items-start gap-2.5 text-left">
                    <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-300/90 leading-relaxed">
                      <span className="font-semibold">Don't see it?</span> Check your{' '}
                      <span className="font-semibold">spam or junk folder</span>. Look for a message from{' '}
                      <span className="font-mono">SynTract Labs</span> with subject{' '}
                      <span className="font-semibold">"Verify your SynTract Labs account"</span>.
                    </div>
                  </div>

                  <div className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                    Still nothing? {' '}
                    <button type="button" onClick={handleResend} disabled={resendLoading} className="text-primary hover:underline disabled:opacity-50">
                      {resendLoading ? 'Sending…' : 'Resend the verification email'}
                    </button>.
                    {resendSuccess && <span className="ml-1 text-emerald-400">Sent! Check your inbox and spam folder.</span>}
                    {resendError && <span className="ml-1 text-red-400">{resendError}</span>}
                  </div>
                  <button type="button" onClick={() => {
                setVerificationSent(false);
                setError('');
                setResendSuccess(false);
                setResendError('');
              }} className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
                    Use a different email address
                  </button>
                  <Link to="/login" className="w-full py-2.5 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center gap-2 transition-all">
                    Back to sign in
                  </Link>
                </div>
              </motion.div>}

            {/* ── STEP 1: Account details ── */}
            {step === 1 && <motion.div key="step1" initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: -20
          }} transition={{
            duration: 0.2
          }}>
                <div className="rounded-xl border border-white/[0.08] overflow-hidden" style={{
              background: '#0d1117'
            }}>
                  <form onSubmit={handleAccountSubmit} className="p-6 flex flex-col gap-4">

                    {error && <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-red-500/[0.08] border border-red-500/20">
                        <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-400">{error}</p>
                      </div>}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Full name</label>
                      <input type="text" autoComplete="name" required value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" className="px-3 py-2.5 rounded-md text-sm bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Email</label>
                      <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="px-3 py-2.5 rounded-md text-sm bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Password</label>
                      <div className="relative">
                        <input type={showPw ? 'text' : 'password'} autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" className="w-full px-3 py-2.5 pr-10 rounded-md text-sm bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                        <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                          {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <PasswordStrength password={password} />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Confirm password</label>
                      <div className="relative">
                        <input type={showConfirmPw ? 'text' : 'password'} autoComplete="new-password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" className={`w-full px-3 py-2.5 pr-10 rounded-md text-sm bg-white/[0.04] border text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 transition-all
                            ${confirmPassword && confirmPassword !== password ? 'border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20' : confirmPassword && confirmPassword === password ? 'border-emerald-500/40 focus:border-emerald-500/50 focus:ring-emerald-500/20' : 'border-white/[0.08] focus:border-primary/50 focus:ring-primary/20'}`} />
                        <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                          {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {confirmPassword && confirmPassword !== password && <p className="text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle size={11} /> Passwords do not match
                        </p>}
                    </div>

                    <button type="submit" disabled={loading || !name || !email || !password || !confirmPassword || password !== confirmPassword} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(79,110,247,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1">
                      {loading ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Creating account…</> : <>Continue <ArrowRight size={14} /></>}
                    </button>
                  </form>

                  <div className="px-6 py-4 border-t border-white/[0.05] text-center" style={{
                background: '#161b22'
              }}>
                    <p className="text-xs text-muted-foreground">
                      Already have an account?{' '}
                      <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
                    </p>
                  </div>
                </div>
              </motion.div>}

            {/* ── STEP 2: Plan selection ── */}
            {step === 2 && <motion.div key="step2" initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: -20
          }} transition={{
            duration: 0.2
          }}>
                <div className="rounded-xl border border-white/[0.08] p-6 flex flex-col gap-4" style={{
              background: '#0d1117'
            }}>

                  {error && <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-red-500/[0.08] border border-red-500/20">
                      <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-400">{error}</p>
                    </div>}

                  <div className="flex flex-col gap-2.5">
                    {PLANS.map(p => {
                  const Icon = p.icon;
                  const selected = plan === p.id;
                  return <button key={p.id} type="button" onClick={() => setPlan(p.id)} className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-all ${selected ? colorMap[p.color] : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${selected ? 'bg-primary/15 text-primary' : 'bg-white/[0.05] text-muted-foreground'}`}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">{p.name}</span>
                              {p.id === 'free' && <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400/80">Free forever</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">{p.detail}</p>
                          </div>
                          <span className="font-bold text-sm text-foreground shrink-0">{p.price}<span className="text-muted-foreground font-normal text-xs">{p.id !== 'free' ? '/mo' : ''}</span></span>
                        </button>;
                })}
                  </div>

                  <button type="button" onClick={handlePlanSubmit} disabled={loading} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(79,110,247,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Generating key…</> : <>Generate API key <ArrowRight size={14} /></>}
                  </button>
                </div>
              </motion.div>}

            {/* ── STEP 3: API key reveal ── */}
            {step === 3 && <motion.div key="step3" initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0,
            x: -20
          }} transition={{
            duration: 0.2
          }}>
                <div className="rounded-xl border border-white/[0.08] p-6 flex flex-col gap-5" style={{
              background: '#0d1117'
            }}>

                  <div className="flex items-center gap-3 p-3.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <Check size={13} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Account created!</p>
                      <p className="text-xs text-muted-foreground">Your API key is ready to use.</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/[0.07] overflow-hidden" style={{
                background: '#161b22'
              }}>
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05]">
                      <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">Production key</span>
                      <CopyButton text={apiKey} />
                    </div>
                    <code className="block px-4 py-3.5 font-mono text-xs text-primary/80 break-all leading-relaxed">{apiKey}</code>
                  </div>

                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3 text-xs text-amber-400/80 leading-relaxed">
                    <span className="font-semibold text-amber-400">Store this now.</span> We only show it once. If you lose it, you'll need to generate a new key from your dashboard.
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <button type="button" onClick={() => navigate('/dashboard')} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(79,110,247,0.3)] transition-all">
                      Go to Dashboard <ArrowRight size={14} />
                    </button>
                    <Link to="/docs" className="w-full py-2.5 rounded-md border border-white/[0.08] text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.04] flex items-center justify-center gap-2 transition-all">
                      View API Docs
                    </Link>
                  </div>
                </div>
              </motion.div>}

          </AnimatePresence>
        </motion.div>
      </div>
    </>;
}
