import { Helmet } from '@dr.pogodin/react-helmet';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from "react-router";
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Loader2, Terminal, Mail, AlertTriangle, RefreshCw } from 'lucide-react';
import { authClient } from '@/lib/auth/auth-client';
type Status = 'verifying' | 'success' | 'error' | 'missing';
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'missing');
  const [errorMsg, setErrorMsg] = useState('');

  // Resend state (for missing-token / no-email-received flow)
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  useEffect(() => {
    if (!token) return;
    authClient.verifyEmail({
      query: {
        token
      }
    }).then(result => {
      if (result.error) {
        setErrorMsg(result.error.message || 'Verification failed. The link may have expired.');
        setStatus('error');
      } else {
        setStatus('success');
      }
    }).catch(() => {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    });
  }, [token]);
  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendLoading(true);
    setResendSuccess(false);
    setResendError('');
    try {
      // Use the direct resend endpoint — bypasses BetterAuth's dedup logic
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          email: resendEmail.trim()
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
        // No valid token in DB — fall back to BetterAuth to issue a fresh one
        const result = await authClient.sendVerificationEmail({
          email: resendEmail.trim(),
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
  return <>
      <Helmet>
        <title>Verify Email — SynTract Labs</title>
        <meta name="description" content="Verify your SynTract Labs email address." />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://syntract.net/verify-email" />
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16 bg-background">
        <motion.div initial={{
        opacity: 0,
        y: 16
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.3
      }} className="w-full max-w-md">
          {/* badge */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/[0.06] mb-5">
              <Terminal size={11} className="text-primary/70" />
              <span className="font-mono text-[10px] text-primary/70 tracking-widest">SYNTRACT CONSOLE</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center text-center gap-5">

            {/* verifying */}
            {status === 'verifying' && <>
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 size={24} className="text-primary animate-spin" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground mb-1">Verifying your email…</h1>
                  <p className="text-sm text-muted-foreground">Just a moment.</p>
                </div>
              </>}

            {/* success */}
            {status === 'success' && <>
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground mb-1">Email verified!</h1>
                  <p className="text-sm text-muted-foreground">Your account is active. You're ready to go.</p>
                </div>
                <Link to="/dashboard" className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all">
                  Go to Dashboard
                </Link>
              </>}

            {/* error */}
            {status === 'error' && <>
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle size={28} className="text-destructive" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground mb-1">Verification failed</h1>
                  <p className="text-sm text-muted-foreground">{errorMsg}</p>
                </div>
                <div className="flex flex-col gap-2.5 w-full">
                  <Link to="/signup" className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all">
                    Back to sign up
                  </Link>
                  <Link to="/login" className="w-full py-2.5 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center gap-2 transition-all">
                    Sign in instead
                  </Link>
                </div>
              </>}

            {/* missing token — full resend flow */}
            {status === 'missing' && <>
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail size={24} className="text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground mb-1">Check your inbox</h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We sent a verification link to your email address. Click it to activate your account.
                  </p>
                </div>

                {/* Spam warning — prominent */}
                <div className="w-full rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 flex items-start gap-2.5 text-left">
                  <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-300/90 leading-relaxed">
                    <span className="font-semibold">Don't see it?</span> The email may have landed in your{' '}
                    <span className="font-semibold">spam or junk folder</span>. Look for a message from{' '}
                    <span className="font-mono">SynTract Labs</span> with subject{' '}
                    <span className="font-semibold">"Verify your SynTract Labs account"</span>.
                  </div>
                </div>

                {/* Resend form */}
                {!resendSuccess ? <form onSubmit={handleResend} className="w-full flex flex-col gap-2.5">
                    <p className="text-xs text-muted-foreground text-left">Still nothing? Enter your email to resend:</p>
                    <div className="flex gap-2">
                      <input type="email" required value={resendEmail} onChange={e => setResendEmail(e.target.value)} placeholder="you@example.com" className="flex-1 px-3 py-2 rounded-md text-sm bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                      <button type="submit" disabled={resendLoading} className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0">
                        {resendLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                        Resend
                      </button>
                    </div>
                    {resendError && <p className="text-xs text-red-400 text-left">{resendError}</p>}
                  </form> : <div className="w-full rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3 flex items-center gap-2.5">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-300/90">
                      Sent! Check your inbox (and spam folder) for the new link.
                    </p>
                  </div>}

                <Link to="/signup" className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
                  Use a different email address
                </Link>
              </>}

          </div>
        </motion.div>
      </div>
    </>;
}
