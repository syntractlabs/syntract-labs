import { pricing } from 'virtual:content';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, useInView } from 'motion/react';
import { useRef, useState } from 'react';
import { Link } from "react-router";
import { ArrowRight, Check, Minus, Zap, Cpu, Layers, Plus, Users, Building2, ChevronDown, Info, GitBranch, Code2, Boxes } from 'lucide-react';
import { useSession } from '@/lib/auth/auth-client';

// ─── Scroll reveal ─────────────────────────────────────────────────────────────
function FadeUp({
  children,
  delay = 0,
  className = ''
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, {
    once: true,
    margin: '-60px'
  });
  return <motion.div ref={ref} initial={{
    opacity: 0,
    y: 20
  }} animate={inView ? {
    opacity: 1,
    y: 0
  } : {}} transition={{
    duration: 0.25,
    delay,
    ease: 'easeOut' as const
  }} className={className}>
      {children}
    </motion.div>;
}

// ─── BCU Tooltip ───────────────────────────────────────────────────────────────
function BcuTooltip() {
  const [show, setShow] = useState(false);
  return <span className="relative inline-flex items-center">
      <button onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onFocus={() => setShow(true)} onBlur={() => setShow(false)} aria-label="What are BCUs?" className="ml-1 text-muted-foreground hover:text-primary transition-colors">
        <Info size={12} />
      </button>
      {show && <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-3 py-2 rounded-lg bg-popover border border-border text-xs text-foreground shadow-lg z-50 pointer-events-none">
          BCUs = AI processing power used to generate your builds.
        </span>}
    </span>;
}

// ─── Subscription tiers ────────────────────────────────────────────────────────
const tiers = [{
  name: 'Free Test',
  tagline: 'Kick the tires with a real build',
  icon: Zap,
  priceLabel: 'Free',
  priceNote: 'No credit card',
  priceSub: '2 BCUs included',
  highlight: false,
  badge: null as string | null,
  cta: 'Start free build',
  ctaHref: '/signup',
  bcus: 2,
  concurrency: '1 concurrent build',
  topUps: false,
  features: [{
    text: '2 BCUs of build compute',
    included: true
  }, {
    text: '1 concurrent build',
    included: true
  }, {
    text: 'Unlimited projects within BCUs',
    included: true
  }, {
    text: 'Source code download',
    included: true
  }, {
    text: 'Basic documentation',
    included: true
  }, {
    text: 'BCU top-up packs',
    included: false
  }, {
    text: 'Deployment scripts',
    included: false
  }, {
    text: 'Priority queue',
    included: false
  }]
}, {
  name: 'Starter',
  tagline: 'For MVPs and growing projects',
  icon: Layers,
  priceLabel: '$49',
  priceNote: '/month',
  priceSub: '12 BCUs included',
  highlight: false,
  badge: null as string | null,
  cta: 'Get started',
  ctaHref: '/signup?plan=starter',
  bcus: 12,
  concurrency: '3 concurrent builds',
  topUps: true,
  features: [{
    text: '12 BCUs / month',
    included: true
  }, {
    text: '3 concurrent builds',
    included: true
  }, {
    text: 'Unlimited projects within BCUs',
    included: true
  }, {
    text: 'Full repo access',
    included: true
  }, {
    text: 'Deployment scripts & CI/CD',
    included: true
  }, {
    text: 'Technical documentation',
    included: true
  }, {
    text: 'BCU top-up packs available',
    included: true
  }, {
    text: 'Priority queue',
    included: false
  }]
}, {
  name: 'Professional',
  tagline: 'For production-grade software',
  icon: Cpu,
  priceLabel: '$199',
  priceNote: '/month',
  priceSub: '48 BCUs included',
  highlight: true,
  badge: 'Most popular' as string | null,
  cta: 'Get started',
  ctaHref: '/signup?plan=professional',
  bcus: 48,
  concurrency: '10 concurrent builds',
  topUps: true,
  features: [{
    text: '48 BCUs / month',
    included: true
  }, {
    text: '10 concurrent builds',
    included: true
  }, {
    text: 'Unlimited projects within BCUs',
    included: true
  }, {
    text: 'Full repo + advanced documentation',
    included: true
  }, {
    text: 'CI/CD + environment templates',
    included: true
  }, {
    text: 'BCU top-up packs available',
    included: true
  }, {
    text: 'Priority queue',
    included: true
  }, {
    text: 'Dedicated agent session',
    included: true
  }]
}, {
  name: 'Team',
  tagline: 'Shared compute for your whole team',
  icon: Users,
  priceLabel: '$499',
  priceNote: '/month',
  priceSub: '120 BCUs included',
  highlight: false,
  badge: 'New' as string | null,
  cta: 'Get started',
  ctaHref: '/signup?plan=team',
  bcus: 120,
  concurrency: 'Shared build queue',
  topUps: true,
  features: [{
    text: '120 BCUs / month',
    included: true
  }, {
    text: '5 seats included',
    included: true
  }, {
    text: 'Shared repo & build queue',
    included: true
  }, {
    text: 'Team dashboards',
    included: true
  }, {
    text: 'Priority compute',
    included: true
  }, {
    text: 'Advanced debugging tools',
    included: true
  }, {
    text: 'BCU top-up packs available',
    included: true
  }, {
    text: 'Architecture review',
    included: false
  }]
}, {
  name: 'Enterprise',
  tagline: 'Unlimited builds, full team access',
  icon: Building2,
  priceLabel: 'From $4,999',
  priceNote: '/year',
  priceSub: 'Unlimited BCUs',
  highlight: false,
  badge: null as string | null,
  cta: 'Talk to Sales',
  ctaHref: '/contact',
  bcus: null,
  concurrency: 'Unlimited concurrent builds',
  topUps: false,
  features: [{
    text: 'Unlimited BCUs',
    included: true
  }, {
    text: 'Unlimited concurrent builds',
    included: true
  }, {
    text: 'Unlimited projects',
    included: true
  }, {
    text: 'Full IP transfer',
    included: true
  }, {
    text: 'Custom DevOps + deployment pipelines',
    included: true
  }, {
    text: 'Full documentation + runbooks',
    included: true
  }, {
    text: 'Multi-user team access',
    included: true
  }, {
    text: 'Architecture review + SLA',
    included: true
  }]
}];

// ─── Enterprise seat pricing ───────────────────────────────────────────────────
const enterpriseSeats = [{
  range: '1 user',
  price: '$4,999',
  period: '/year'
}, {
  range: '2–5 users',
  price: '$6,999',
  period: '/year'
}, {
  range: '6–10 users',
  price: '$8,999',
  period: '/year'
}, {
  range: '11+ users',
  price: 'Custom',
  period: 'quote'
}];

// ─── How BCUs Work steps ───────────────────────────────────────────────────────
const bcuSteps = [{
  icon: Code2,
  title: 'You describe your project',
  body: 'Type a prompt — an app, a game, a tool, an API. The engine plans the architecture before spending a single BCU.'
}, {
  icon: Cpu,
  title: 'The engine generates your build',
  body: 'BCUs are consumed as the engine architects, codes, designs, and tests your software. More complex builds use more BCUs.'
}, {
  icon: GitBranch,
  title: 'You own the output',
  body: 'Every build delivers full source code, documentation, and deployment scripts. Your IP, your codebase, forever.'
}, {
  icon: Boxes,
  title: 'Top up when you need more',
  body: 'Running low? Purchase BCU top-up packs without changing your plan. BCUs roll over — unused compute carries forward.'
}];

// ─── FAQ ───────────────────────────────────────────────────────────────────────
function FaqItem({
  q,
  a
}: {
  q: string;
  a: string;
}) {
  const [open, setOpen] = useState(false);
  return <div className="border-b border-border">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-left gap-4 group">
        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{q}</span>
        <motion.span animate={{
        rotate: open ? 180 : 0
      }} transition={{
        duration: 0.2
      }} className="shrink-0 text-muted-foreground">
          <ChevronDown size={14} />
        </motion.span>
      </button>
      <motion.div initial={false} animate={{
      height: open ? 'auto' : 0,
      opacity: open ? 1 : 0
    }} transition={{
      duration: 0.2,
      ease: 'easeOut' as const
    }} className="overflow-hidden">
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      </motion.div>
    </div>;
}

// ─── Tier card ─────────────────────────────────────────────────────────────────
function TierCard({
  tier,
  delay,
  isAuthenticated
}: {
  tier: typeof tiers[0];
  delay: number;
  isAuthenticated: boolean;
}) {
  const Icon = tier.icon;
  return <FadeUp delay={delay} className="h-full">
      <div className={`relative rounded-xl border h-full flex flex-col overflow-hidden transition-all duration-200
        ${tier.highlight ? 'border-primary bg-primary/5 shadow-[0_0_40px_hsl(var(--primary)/0.12)]' : 'border-border bg-card'}`}>
        {tier.badge && <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-semibold font-mono tracking-widest uppercase rounded-bl-lg
            ${tier.badge === 'New' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}`}>
            {tier.badge}
          </div>}
        <div className="p-6 flex flex-col gap-4 flex-1">
          {/* Icon + name */}
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border border-primary/25 ${tier.highlight ? 'bg-primary/20' : 'bg-primary/10'}`}>
              <Icon size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">{tier.name}</h3>
              <p className="text-xs text-muted-foreground">{tier.tagline}</p>
            </div>
          </div>

          {/* Price */}
          <div className="py-3 border-y border-border/60">
            <div className="flex items-end gap-1.5">
              <span className="font-mono text-3xl font-bold text-foreground">{tier.priceLabel}</span>
              <span className="text-sm text-muted-foreground mb-1">{tier.priceNote}</span>
            </div>
            {tier.priceSub && <div className="flex items-center gap-1 mt-2">
                <Cpu size={11} className="text-primary/60" />
                <span className="font-mono text-xs text-primary/80 font-medium">{tier.priceSub}</span>
                <BcuTooltip />
              </div>}
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="font-mono text-xs text-muted-foreground/70">{tier.concurrency}</span>
            </div>
            {tier.topUps && <div className="flex items-center gap-1.5 mt-1">
                <Plus size={10} className="text-accent/70" />
                <span className="font-mono text-xs text-accent/80">Top-up packs available</span>
              </div>}
          </div>

          {/* Features */}
          <ul className="flex flex-col gap-2.5 flex-1">
            {tier.features.map(f => <li key={f.text} className="flex items-start gap-2.5">
                {f.included ? <Check size={13} className={`mt-0.5 shrink-0 ${tier.highlight ? 'text-primary' : 'text-primary/70'}`} /> : <Minus size={13} className="mt-0.5 shrink-0 text-border" />}
                <span className={`text-xs leading-relaxed ${f.included ? 'text-foreground/80' : 'text-muted-foreground/50'}`}>{f.text}</span>
              </li>)}
          </ul>

          {/* CTA */}
          <Link to={isAuthenticated && tier.ctaHref !== '/contact' ? '/dashboard' : tier.ctaHref} className={`mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors
              ${tier.highlight ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border border-border text-foreground hover:bg-muted'}`}>
            {isAuthenticated && tier.ctaHref !== '/contact' ? 'Go to Dashboard' : tier.cta}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </FadeUp>;
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const {
    isAuthenticated
  } = useSession();
  return <>
      <Helmet>
        <title>Pricing — SynTract Labs AI Software Development</title>
        <meta name="description" content="Subscription plans with included Build Compute Units (BCUs). Start free, scale with Starter (12 BCUs), Professional (48 BCUs), Team (120 BCUs), or Enterprise unlimited from $4,999/year." />
        <link rel="canonical" href="https://syntract.net/pricing" />
        <meta property="og:title" content="Pricing — SynTract Labs" />
        <meta property="og:description" content="Subscription plans with included BCUs. Top up anytime. Enterprise unlimited from $4,999/year." />
        <meta property="og:url" content="https://syntract.net/pricing" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SynTract Labs" />
        <meta property="og:image" content="https://syntract.net/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Pricing — SynTract Labs" />
        <meta name="twitter:description" content="Subscription plans with included BCUs. Top up anytime. Enterprise unlimited from $4,999/year." />
        <meta name="twitter:image" content="https://syntract.net/og-image.png" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': 'https://syntract.net/pricing#webpage',
          name: 'SynTract Labs Pricing',
          url: 'https://syntract.net/pricing',
          isPartOf: {
            '@id': 'https://syntract.net/#website'
          },
          about: {
            '@id': 'https://syntract.net/#organization'
          }
        })}</script>
      </Helmet>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)`,
        backgroundSize: '48px 48px'
      }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center top, hsl(var(--primary) / 0.10) 0%, transparent 70%)'
      }} />
        <div className="container mx-auto px-6 py-20 relative z-10 text-center">
          <motion.div initial={{
          opacity: 0,
          y: 16
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.3,
          ease: 'easeOut' as const
        }}>
            <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-4">Pricing</p>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4">
              Build as much as you want.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              Subscribe to a plan with included Build Compute Units (BCUs). Run as many projects as you like within your BCUs — and top up anytime when you need more.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-sm text-primary/80 font-medium">
                <Zap size={13} className="text-primary" />
                First 2 BCUs are always free — no credit card required
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-sm text-muted-foreground">
                <Cpu size={13} />
                BCUs = AI processing power for your builds
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TIER CARDS ───────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {tiers.map((tier, i) => <TierCard key={tier.name} tier={tier} delay={i * 0.06} isAuthenticated={isAuthenticated} />)}
          </div>

          {/* Trust strip */}
          <FadeUp delay={0.2}>
            <div className="mt-6 rounded-xl border border-border bg-muted/20 p-5 flex flex-wrap gap-6 items-center">
              <Zap size={13} className="text-primary/70 shrink-0" />
              <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
                <span><strong className="text-foreground">Unlimited projects</strong> — run as many builds as you want within your BCUs</span>
                <span><strong className="text-foreground">You own the code</strong> — 100% IP transfer on every build</span>
                <span><strong className="text-foreground">BCUs roll over</strong> — unused compute carries forward to next month</span>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── HOW BCUs WORK ────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-border bg-muted/10">
        <div className="container mx-auto px-6">
          <FadeUp>
            <div className="mb-10 text-center">
              <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">How it works</p>
              <h2 className="text-3xl font-bold text-foreground mb-3">How BCUs work</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Build Compute Units represent the AI processing power required to generate your applications. Every action — architecture planning, code generation, UI design, debugging — consumes BCUs.
              </p>
            </div>
          </FadeUp>
          <FadeUp delay={0.08}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {bcuSteps.map((step, i) => {
              const StepIcon = step.icon;
              return <div key={step.title} className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4 relative">
                    <div className="absolute top-4 right-4 font-mono text-xs text-muted-foreground/30 font-bold">0{i + 1}</div>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <StepIcon size={18} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm mb-1.5">{step.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
                    </div>
                  </div>;
            })}
            </div>
          </FadeUp>
          <FadeUp delay={0.14}>
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-start gap-4">
              <div className="w-8 h-8 rounded-md bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 mt-0.5">
                <Info size={14} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Tooltip: BCUs = AI processing power used to generate your builds.</p>
                <p className="text-xs text-muted-foreground">Simple apps (landing pages, CRUD tools) use fewer BCUs. Complex systems (multi-tenant SaaS, AI agents, real-time platforms) use more. The engine estimates BCU usage before starting every build.</p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── TOP-UP PACKS ─────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-6">
          <FadeUp>
            <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">Top-up packs</p>
                <h2 className="text-3xl font-bold text-foreground mb-2">Need more BCUs?</h2>
                <p className="text-muted-foreground max-w-lg">
                  Available on Starter, Professional, and Team plans. Purchase additional compute whenever your included BCUs run out — no plan change required.
                </p>
              </div>
              <div className="shrink-0 font-mono text-xs text-muted-foreground/60 border border-border rounded-lg px-4 py-2.5 bg-card">
                Available on Starter, Professional &amp; Team
              </div>
            </div>
          </FadeUp>
          <FadeUp delay={0.08}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pricing.topUpPacks.map(pack => <div key={pack.hours} className={`relative rounded-xl border p-6 flex flex-col gap-4 transition-all ${pack.popular ? 'border-accent/40 bg-accent/[0.04] shadow-[0_0_30px_hsl(var(--accent)/0.08)]' : 'border-border bg-card'}`}>
                  {pack.popular && <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-semibold font-mono tracking-widest uppercase rounded-bl-lg bg-accent text-accent-foreground">
                      Best value
                    </div>}
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${pack.popular ? 'border-accent/30 bg-accent/10' : 'border-primary/20 bg-primary/8'}`}>
                      <Cpu size={16} className={pack.popular ? 'text-accent' : 'text-primary'} />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-base">{pack.label} BCUs</p>
                      <p className="text-xs text-muted-foreground">{pack.note}</p>
                    </div>
                  </div>
                  <div className="border-t border-border/60 pt-4 flex items-end justify-between">
                    <div>
                      <span className="font-mono text-3xl font-bold text-foreground">${pack.price}</span>
                      <span className="text-sm text-muted-foreground ml-1">one-time</span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground/60">
                      ${(pack.price / pack.hours).toFixed(0)}/BCU
                    </span>
                  </div>
                </div>)}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── ENTERPRISE SEAT PRICING ──────────────────────────────────────── */}
      <section className="py-20 border-t border-border bg-muted/10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <FadeUp>
              <div>
                <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">Enterprise</p>
                <h2 className="text-3xl font-bold text-foreground mb-4">Unlimited builds for your team.</h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Enterprise plans include unlimited BCUs, unlimited concurrent builds, multi-user access, dedicated infrastructure, and a full SLA. Starting at $4,999/year.
                </p>
                <ul className="flex flex-col gap-3 mb-8">
                  {['Unlimited BCUs — no compute caps', 'Unlimited concurrent builds', 'Multi-user team access with role management', 'Dedicated priority queue and agent sessions', 'Architecture review calls included', 'Enterprise SLA with guaranteed response times', 'Custom deployment, DevOps, and runbooks', 'Full IP transfer on every build'].map(item => <li key={item} className="flex items-start gap-2.5">
                      <Check size={13} className="mt-0.5 shrink-0 text-primary/70" />
                      <span className="text-sm text-foreground/80">{item}</span>
                    </li>)}
                </ul>
                <Link to="/contact" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                  Talk to Sales <ArrowRight size={14} />
                </Link>
              </div>
            </FadeUp>

            <FadeUp delay={0.1}>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
                  <Users size={14} className="text-primary/60" />
                  <p className="font-semibold text-sm text-foreground">Annual seat pricing</p>
                </div>
                <div className="divide-y divide-border">
                  {enterpriseSeats.map((row, i) => <div key={row.range} className={`flex items-center justify-between px-5 py-4 transition-colors ${i === enterpriseSeats.length - 1 ? 'bg-primary/[0.03]' : 'hover:bg-white/[0.02]'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Users size={11} className="text-primary/70" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{row.range}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-foreground">{row.price}</span>
                        {row.period !== 'quote' && <span className="text-xs text-muted-foreground ml-1">{row.period}</span>}
                        {row.period === 'quote' && <span className="text-xs text-primary/70 ml-1">— contact us</span>}
                      </div>
                    </div>)}
                </div>
                <div className="px-5 py-4 border-t border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground">
                    All Enterprise plans include unlimited BCUs, full feature access, and a dedicated account manager. Annual billing only.
                  </p>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── COMPLEXITY GUIDE ─────────────────────────────────────────────── */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-6">
          <FadeUp>
            <div className="mb-10">
              <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">What can you build?</p>
              <h2 className="text-3xl font-bold text-foreground mb-3">Examples by tier</h2>
              <p className="text-muted-foreground max-w-xl">
                Not sure how many BCUs your project needs? Here are examples of what the engine builds at each tier.
              </p>
            </div>
          </FadeUp>
          <FadeUp delay={0.08}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {pricing.complexityExamples.map(tier => <div key={tier.tier} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-semibold text-sm text-foreground">{tier.tier}</span>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {tier.examples.map(ex => <li key={ex} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/50 shrink-0" />
                        {ex}
                      </li>)}
                  </ul>
                </div>)}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── TRUST SIGNALS ────────────────────────────────────────────────── */}
      <section className="py-16 border-t border-border bg-muted/10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[{
            title: '100% code ownership',
            body: 'Every build delivers full source code with complete IP transfer. Your code, your product, your business — we retain nothing.',
            mono: 'ip_transfer: true'
          }, {
            title: 'No surprise charges',
            body: 'The engine estimates BCU usage before starting. You approve the scope. If a build approaches your BCU limit, you\'re notified before any additional charges.',
            mono: 'billing: "transparent"'
          }, {
            title: 'Production-ready output',
            body: 'Every build includes tests, documentation, and deployment scripts. Not a prototype — code you can ship to real users on day one.',
            mono: 'quality: "production"'
          }].map((item, i) => <FadeUp key={item.title} delay={i * 0.07}>
                <div className="rounded-xl border border-border bg-card p-6 h-full flex flex-col gap-3">
                  <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">{item.body}</p>
                  <div className="font-mono text-xs text-primary/60 bg-primary/5 border border-primary/15 rounded px-3 py-2">{item.mono}</div>
                </div>
              </FadeUp>)}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <FadeUp>
              <div>
                <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">FAQ</p>
                <h2 className="text-3xl font-bold text-foreground mb-4">Common questions.</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Still have questions?{' '}
                  <Link to="/contact" className="text-primary hover:underline">Contact us</Link>
                  {' '}— we respond within a few hours.
                </p>
              </div>
            </FadeUp>
            <FadeUp delay={0.08}>
              <div>
                {pricing.faqs.map(faq => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-border bg-muted/10">
        <div className="container mx-auto px-6 text-center">
          <FadeUp>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Start with a free build today.
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              No credit card. No commitment. Describe your project and the engine starts building immediately.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to={isAuthenticated ? '/dashboard' : '/signup'} className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                {isAuthenticated ? 'Go to Dashboard' : 'Try it free'} <ArrowRight size={15} />
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors">
                Talk to Enterprise Sales
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>
    </>;
}
