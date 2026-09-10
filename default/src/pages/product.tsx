import { product } from 'virtual:content';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { Link } from "react-router";
import { ArrowRight, Bot, Smartphone, Code2, Cpu, Zap, CheckCircle2, GitBranch, Layers, MessageSquare, Play, Shield, Clock, Gamepad2 } from 'lucide-react';
import { authClient } from '@/lib/auth/auth-client';

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
    duration: 0.35,
    delay,
    ease: 'easeOut' as const
  }} className={className}>
      {children}
    </motion.div>;
}

// ─── Bento card ────────────────────────────────────────────────────────────────
function BentoCard({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <motion.div className={`relative rounded-xl border border-border bg-card overflow-hidden group ${className}`} whileHover={{
    y: -3
  }} transition={{
    duration: 0.2,
    ease: 'easeOut' as const
  }}>
      <motion.div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" style={{
      boxShadow: 'inset 0 0 0 1px hsl(var(--primary) / 0.35), 0 0 24px hsl(var(--primary) / 0.07)'
    }} />
      {children}
    </motion.div>;
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const capabilitiesMeta = [{
  icon: Smartphone
}, {
  icon: Code2
}, {
  icon: Bot
}, {
  icon: Cpu
}, {
  icon: Gamepad2
}];
const howItWorksMeta = [{
  icon: MessageSquare
}, {
  icon: Cpu
}, {
  icon: GitBranch
}, {
  icon: Play
}];
const useCasesMeta = [{
  icon: Layers
}, {
  icon: Shield
}, {
  icon: Clock
}, {
  icon: Zap
}];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ProductPage() {
  const {
    data: session
  } = authClient.useSession();
  const ctaHref = session?.user ? '/dashboard' : '/signup';
  return <>
      <Helmet>
        <title>Product — SynTract Labs Software Studio</title>
        <meta name="description" content="SynTract Labs builds mobile apps, games, custom software, and agentic AI systems — for clients and as original internal products. See what we build." />
        <link rel="canonical" href="https://syntract.net/product" />
        <meta property="og:title" content="Product — SynTract Labs Software Studio" />
        <meta property="og:description" content="Client work and original products. Mobile apps, games, custom platforms, and agentic AI systems built by SynTract Labs." />
        <meta property="og:url" content="https://syntract.net/product" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SynTract Labs" />
        <meta property="og:image" content="https://syntract.net/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Product — SynTract Labs" />
        <meta name="twitter:description" content="AI agent that builds complex software solutions and mobile apps from your prompt." />
        <meta name="twitter:image" content="https://syntract.net/og-image.png" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': 'https://syntract.net/product#webpage',
          name: 'SynTract Labs Product — AI Software Development Agent',
          url: 'https://syntract.net/product',
          description: 'AI agent that builds mobile apps, custom software, and agentic AI systems from natural language prompts.',
          isPartOf: {
            '@id': 'https://syntract.net/#website'
          },
          about: {
            '@id': 'https://syntract.net/#organization'
          }
        })}</script>
      </Helmet>
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)`,
        backgroundSize: '48px 48px'
      }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center top, hsl(var(--primary) / 0.12) 0%, transparent 70%)'
      }} />

        <div className="container mx-auto px-6 py-24 relative z-10">
          <motion.div initial={{
          opacity: 0,
          y: 16
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.35,
          ease: 'easeOut' as const
        }} className="max-w-3xl">
            <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-4">Product</p>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-foreground mb-6">
              Engineering intelligence,
              <br />
              <span className="text-primary">delivered.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
              SynTract Labs is a full-spectrum AI-powered software studio. From mobile apps and custom platforms to agentic AI systems and original products — we design, build, and deliver under a single platform.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to={ctaHref} className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                Try it free <ArrowRight size={15} />
              </Link>
              <Link to="/pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors">
                View pricing
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      {/* ── STATS STRIP ───────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-muted/20">
        <div className="container mx-auto px-6 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {product.stats.map((s, i) => <FadeUp key={s.label} delay={i * 0.05}>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-3xl font-bold text-accent">{s.value}</span>
                  <span className="text-sm font-semibold text-foreground">{s.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{s.mono}</span>
                </div>
              </FadeUp>)}
          </div>
        </div>
      </section>
      {/* ── WHAT IT BUILDS ────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <FadeUp>
            <div className="mb-12">
              <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">Capabilities</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Client work. Original products. Self-directed solutions.
              </h2>
              <p className="text-muted-foreground max-w-xl">
                We build for clients across every category of software — and we also launch our own games and products. That dual perspective makes us better engineers.
              </p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {product.capabilities.map((cap, i) => {
            const Icon = capabilitiesMeta[i]?.icon ?? Cpu;
            const isLast = i === product.capabilities.length - 1;
            const isOdd = product.capabilities.length % 2 !== 0;
            return <FadeUp key={cap.title} delay={i * 0.06} className={isLast && isOdd ? 'lg:col-span-2' : ''}>
                  <BentoCard className="h-full">
                    <div className="p-6 flex flex-col gap-5 h-full">
                      {/* Header */}
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20">
                          <Icon size={20} className="text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">{cap.title}</h3>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-primary/10 text-primary/80">{cap.tag}</span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed">{cap.desc}</p>

                      {/* Bullets */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {cap.bullets.map(b => <div key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 size={11} className="text-primary/50 shrink-0" />
                            {b}
                          </div>)}
                      </div>

                      {/* Prompt / Output example */}
                      <div className="grid grid-cols-2 gap-3 mt-auto">
                        <div className="rounded-lg bg-muted/40 border border-border p-3">
                          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Prompt</p>
                          <p className="font-mono text-[11px] text-foreground/60 leading-relaxed">{cap.example.prompt}</p>
                        </div>
                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                          <p className="font-mono text-[10px] text-primary/60 uppercase tracking-widest mb-2">Output</p>
                          <pre className="font-mono text-[11px] text-primary/80 whitespace-pre-wrap leading-relaxed">{cap.example.output}</pre>
                        </div>
                      </div>
                    </div>
                  </BentoCard>
                </FadeUp>;
          })}
          </div>
        </div>
      </section>
      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="py-24 border-t border-border bg-muted/10">
        <div className="container mx-auto px-6">
          <FadeUp>
            <div className="mb-14">
              <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">How it works</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                From prompt to production.
              </h2>
              <p className="text-muted-foreground max-w-xl">
                The agent handles every phase of the software development lifecycle — you stay in control at every step.
              </p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {product.howItWorks.map((step, i) => {
            const Icon = howItWorksMeta[i].icon;
            return <FadeUp key={step.step} delay={i * 0.07}>
                  <div className="relative rounded-xl border border-border bg-card p-6 flex flex-col gap-4 h-full">
                    <div className="font-mono text-4xl font-bold text-primary/10 absolute top-4 right-5 select-none">{step.step}</div>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                  </div>
                </FadeUp>;
          })}
          </div>
        </div>
      </section>
      {/* ── LIVE DEMO PROMPT ──────────────────────────────────────────────── */}
      <section className="py-24 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeUp>
              <div>
                <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">How we work</p>
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                  We build like we're launching our own product.
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Because sometimes we are. Running an internal studio alongside client work means we hold ourselves to the same standard we'd demand for our own products — production-ready code, real tests, and documentation that actually gets maintained.
                </p>
                <ul className="flex flex-col gap-3 mb-8">
                  {['Selects the optimal tech stack for your use case', 'Writes tests alongside implementation code', 'Flags security vulnerabilities before they deploy', 'Generates documentation and deployment guides', 'Iterates based on your natural language feedback'].map(item => <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 size={14} className="mt-0.5 text-primary/60 shrink-0" />
                      {item}
                    </li>)}
                </ul>
                <Link to={ctaHref} className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                  Start your free build <ArrowRight size={15} />
                </Link>
              </div>
            </FadeUp>

            <FadeUp delay={0.1}>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Terminal header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-accent/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/60" />
                  <span className="font-mono text-xs text-muted-foreground ml-2">syntract-agent — session</span>
                </div>
                <div className="p-5 font-mono text-xs leading-relaxed">
                  <p className="text-muted-foreground mb-3">{'>'} <span className="text-foreground/80">Build a real-time delivery tracking app with driver and customer views, live map, and push notifications</span></p>
                  <p className="text-primary/80 mb-1">✦ Analyzing requirements...</p>
                  <p className="text-muted-foreground/70 mb-1 pl-3">→ 2 user roles detected (driver, customer)</p>
                  <p className="text-muted-foreground/70 mb-1 pl-3">→ Real-time requirement → WebSocket + Redis</p>
                  <p className="text-muted-foreground/70 mb-3 pl-3">→ Maps → Google Maps SDK (iOS/Android)</p>
                  <p className="text-primary/80 mb-1">✦ Architecture selected: React Native + Node.js + PostgreSQL</p>
                  <p className="text-primary/80 mb-1">✦ Scaffolding project structure...</p>
                  <p className="text-muted-foreground/70 mb-1 pl-3">→ 34 screens · 12 API endpoints</p>
                  <p className="text-muted-foreground/70 mb-3 pl-3">→ Auth · Push · WebSocket · Maps</p>
                  <p className="text-accent/90 mb-1">✦ Milestone 1 complete — driver app (18 screens)</p>
                  <p className="text-accent/90">✦ Milestone 2 in progress — customer app...</p>
                  <motion.span animate={{
                  opacity: [1, 0, 1]
                }} transition={{
                  duration: 1,
                  repeat: Infinity
                }} className="inline-block w-2 h-3.5 bg-primary/70 ml-0.5 align-middle" />
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>
      {/* ── WHO IT'S FOR ──────────────────────────────────────────────────── */}
      <section className="py-24 border-t border-border bg-muted/10">
        <div className="container mx-auto px-6">
          <FadeUp>
            <div className="mb-12">
              <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">Who it's for</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Built for builders at every stage.
              </h2>
            </div>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {product.useCases.map((uc, i) => {
            const Icon = useCasesMeta[i].icon;
            return <FadeUp key={uc.title} delay={i * 0.06}>
                  <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4 h-full">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">{uc.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{uc.body}</p>
                  </div>
                </FadeUp>;
          })}
          </div>
        </div>
      </section>
      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-24 border-t border-border">
        <div className="container mx-auto px-6 text-center">
          <FadeUp>
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Start building for free.
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Your first build is on us. No credit card, no setup — just describe what you want to build and the agent gets to work.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to={ctaHref} className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                  Try it free <ArrowRight size={15} />
                </Link>
                <Link to="/enterprise" className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors">
                  Talk to Enterprise Sales
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </>;
}
