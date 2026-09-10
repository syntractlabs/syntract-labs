import { Helmet } from '@dr.pogodin/react-helmet';
import { useState } from 'react';
import { useNavigate } from "react-router";
import { motion } from 'motion/react';
import { User, Lock, AlertCircle, CheckCircle, Eye, EyeOff, LogOut, Trash2 } from 'lucide-react';
import { useSession, signOut, authClient } from '@/lib/auth/auth-client';

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return <div className="rounded-xl border border-border overflow-hidden" style={{
    background: '#0d1117'
  }}>
      <div className="px-6 py-4 border-b border-white/[0.05]" style={{
      background: '#161b22'
    }}>
        <p className="font-semibold text-sm text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>;
}

// ─── Inline alert ─────────────────────────────────────────────────────────────
function Alert({
  type,
  message
}: {
  type: 'error' | 'success';
  message: string;
}) {
  return <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-xs ${type === 'error' ? 'bg-red-500/[0.08] border-red-500/20 text-red-400' : 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400'}`}>
      {type === 'error' ? <AlertCircle size={13} className="mt-0.5 shrink-0" /> : <CheckCircle size={13} className="mt-0.5 shrink-0" />}
      {message}
    </div>;
}
export default function SettingsPage() {
  const navigate = useNavigate();
  const {
    user,
    isPending,
    isAuthenticated
  } = useSession();

  // Profile
  const [name, setName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // Password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // Redirect if not authed
  if (!isPending && !isAuthenticated) {
    navigate('/login', {
      replace: true
    });
    return null;
  }
  if (isPending) {
    return <div className="min-h-screen flex items-center justify-center" style={{
      background: '#0A0D12'
    }}>
        <svg className="animate-spin h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>;
  }
  async function updateName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setNameLoading(true);
    setNameMsg(null);
    try {
      const result = await authClient.updateUser({
        name: name.trim()
      });
      if (result.error) throw new Error(result.error.message);
      setNameMsg({
        type: 'success',
        text: 'Name updated successfully.'
      });
      setName('');
    } catch (err) {
      setNameMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not update name.'
      });
    } finally {
      setNameLoading(false);
    }
  }
  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwMsg({
        type: 'error',
        text: 'Passwords do not match.'
      });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({
        type: 'error',
        text: 'Password must be at least 8 characters.'
      });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      const result = await authClient.changePassword({
        currentPassword: currentPw,
        newPassword: newPw,
        revokeOtherSessions: true
      });
      if (result.error) throw new Error(result.error.message);
      setPwMsg({
        type: 'success',
        text: 'Password changed. Other sessions have been signed out.'
      });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not update password.'
      });
    } finally {
      setPwLoading(false);
    }
  }
  async function handleSignOut() {
    await signOut();
    navigate('/login', {
      replace: true
    });
  }
  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (deleteConfirm !== 'delete my account') return;
    setDeleteLoading(true);
    setDeleteMsg(null);
    try {
      const result = await authClient.deleteUser({
        password: currentPw
      });
      if (result.error) throw new Error(result.error.message);
      await signOut();
      navigate('/', {
        replace: true
      });
    } catch (err) {
      setDeleteMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not delete account.'
      });
    } finally {
      setDeleteLoading(false);
    }
  }
  return <>
      <Helmet>
        <title>Account Settings — SynTract Labs</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen" style={{
      background: '#0A0D12'
    }}>
        {/* sub-nav */}
        <div className="border-b border-border sticky top-16 z-40 backdrop-blur-md" style={{
        background: 'rgba(10,13,18,0.92)'
      }}>
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between h-12">
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/dashboard')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </button>
                <span className="text-muted-foreground/30 text-xs">/</span>
                <span className="text-xs text-foreground font-medium">Settings</span>
              </div>
              <button onClick={handleSignOut} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all">
                <LogOut size={11} />Sign out
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8 max-w-2xl">
          <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.2
        }} className="flex flex-col gap-6">

            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight mb-0.5">Account Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your profile, password, and account preferences.</p>
            </div>

            {/* ── Profile ── */}
            <Section title="Profile" description="Update your display name.">
              <form onSubmit={updateName} className="flex flex-col gap-4">
                {nameMsg && <Alert type={nameMsg.type} message={nameMsg.text} />}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <User size={16} className="text-primary/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{user?.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">New display name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={user?.name || 'Your name'} className="px-3 py-2.5 rounded-md text-sm bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={nameLoading || !name.trim()} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {nameLoading ? 'Saving…' : 'Save name'}
                  </button>
                </div>
              </form>
            </Section>

            {/* ── Password ── */}
            <Section title="Password" description="Change your password. All other sessions will be signed out.">
              <form onSubmit={updatePassword} className="flex flex-col gap-4">
                {pwMsg && <Alert type={pwMsg.type} message={pwMsg.text} />}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Current password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} autoComplete="current-password" required value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 pr-10 rounded-md text-sm bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">New password</label>
                  <input type={showPw ? 'text' : 'password'} autoComplete="new-password" required value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 8 characters" className="px-3 py-2.5 rounded-md text-sm bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Confirm new password</label>
                  <input type={showPw ? 'text' : 'password'} autoComplete="new-password" required value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" className="px-3 py-2.5 rounded-md text-sm bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={pwLoading || !currentPw || !newPw || !confirmPw} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
                    <Lock size={11} />
                    {pwLoading ? 'Updating…' : 'Update password'}
                  </button>
                </div>
              </form>
            </Section>

            {/* ── Danger zone ── */}
            <Section title="Danger zone" description="Permanently delete your account and all associated data.">
              <form onSubmit={handleDeleteAccount} className="flex flex-col gap-4">
                {deleteMsg && <Alert type={deleteMsg.type} message={deleteMsg.text} />}
                <div className="rounded-lg border border-red-500/15 bg-red-500/[0.04] px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                  This will permanently delete your account, all API keys, and usage history. <span className="text-red-400 font-medium">This cannot be undone.</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Type <span className="font-mono text-red-400/80">delete my account</span> to confirm
                  </label>
                  <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="delete my account" className="px-3 py-2.5 rounded-md text-sm bg-white/[0.04] border border-red-500/20 text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/10 transition-all" />
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={deleteLoading || deleteConfirm !== 'delete my account'} className="px-4 py-2 rounded-md bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                    <Trash2 size={11} />
                    {deleteLoading ? 'Deleting…' : 'Delete account'}
                  </button>
                </div>
              </form>
            </Section>

          </motion.div>
        </div>
      </div>
    </>;
}
