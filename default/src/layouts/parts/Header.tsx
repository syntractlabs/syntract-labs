import { Link, useLocation } from "react-router";
import { Menu, X, Terminal } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { authClient } from '@/lib/auth/auth-client';
export default function Header() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {
    data: session
  } = authClient.useSession();
  // Signed-in users go straight to the dashboard; guests go to sign-up
  const ctaHref = session?.user ? '/dashboard' : '/signup';
  const ctaLabel = session?.user ? 'Dashboard' : 'Try Free';
  const navItems = [{
    href: '/product',
    label: 'Build Engine'
  }, {
    href: '/pricing',
    label: 'Pricing'
  }, {
    href: '/docs',
    label: 'Docs'
  }, {
    href: '/enterprise',
    label: 'Enterprise'
  }, {
    href: '/contact',
    label: 'Contact'
  }];
  return <header className="sticky top-0 z-50 backdrop-blur-md" style={{
    background: 'rgba(10,13,18,0.88)'
  }}>
      {/* gradient border bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{
      background: 'linear-gradient(90deg, transparent 0%, hsl(var(--border)) 20%, hsl(var(--border)) 80%, transparent 100%)'
    }} />

      <div className="container mx-auto px-6">
        <div className="flex h-16 items-center justify-between">

          {/* Logo + version badge */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <img src="https://isteam.wsimg.com/genai-assistant/logoagent/customer/e3036223-43dd-46d8-bc93-39b1eb4e1a5e/session/e968122e-3041-410b-91d7-56834be3babe/horizontal-transparent-fff20d0b91d63b4bce482f415a13c6da/logo-edit-f0d6e64c-fff20d.png" alt="SynTract Labs" className="h-16 w-auto object-contain shrink-0" />
            <span className="font-bold text-2xl tracking-tight" style={{
            background: 'linear-gradient(90deg, #4F6EF7, #7B3FF7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Labs</span>
            <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded border border-primary/25 bg-primary/8 text-primary/70 tracking-widest">
              <Terminal size={8} />v1
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
            const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return <Link key={item.href} to={item.href} className={`relative px-3.5 py-2 text-sm font-medium tracking-wide rounded-md transition-colors ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'}`}>
                  {item.label}
                  {active && <motion.span layoutId="nav-indicator" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary" transition={{
                type: 'spring',
                stiffness: 380,
                damping: 30
              }} />}
                </Link>;
          })}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link to={ctaHref} className="relative inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md bg-primary text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_16px_rgba(79,110,247,0.35)]">
              {ctaLabel}
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 hover:bg-white/[0.06] rounded-md transition-colors text-muted-foreground" aria-label="Toggle menu">
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMobileMenuOpen && <motion.div initial={{
          opacity: 0,
          height: 0
        }} animate={{
          opacity: 1,
          height: 'auto'
        }} exit={{
          opacity: 0,
          height: 0
        }} transition={{
          duration: 0.18,
          ease: 'easeOut'
        }} className="md:hidden overflow-hidden border-t border-border">
              <nav className="flex flex-col gap-0.5 py-3">
                {navItems.map(item => {
              const active = location.pathname === item.href;
              return <Link key={item.href} to={item.href} className={`text-sm font-medium py-2.5 px-3 rounded-md transition-colors flex items-center gap-2 ${active ? 'text-foreground bg-white/[0.05]' : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'}`} onClick={() => setIsMobileMenuOpen(false)}>
                      {active && <span className="w-1 h-3.5 rounded-full bg-primary shrink-0" />}
                      <span className={active ? '' : 'pl-3'}>{item.label}</span>
                    </Link>;
            })}
                <div className="pt-3 border-t border-border mt-2 px-1">
                  <Link to={ctaHref} className="block w-full text-center px-4 py-2.5 text-sm font-semibold rounded-md bg-primary text-primary-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                    {ctaLabel}
                  </Link>
                </div>
              </nav>
            </motion.div>}
        </AnimatePresence>
      </div>
    </header>;
}
