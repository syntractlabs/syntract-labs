import { home } from 'virtual:content';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { Link } from "react-router";
import { ArrowRight, ChevronRight, Cpu, Bot, Smartphone, Layers, Zap, CheckCircle2, GitBranch, Terminal, Globe, Gamepad2, Sparkles, Play, Package, Braces, Database, LayoutDashboard, FileCode2, Rocket } from 'lucide-react';

// ─── Scroll reveal ────────────────────────────────────────────────────────────
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

// ─── Capability pill ──────────────────────────────────────────────────────────
function CapPill({
  icon: Icon,
  label,
  cls
}: {
  icon: React.ElementType;
  label: string;
  cls: string;
}) {
  return <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${cls}`}>
      <Icon size={11} />
      {label}
    </div>;
}

// ─── Engine step card ─────────────────────────────────────────────────────────
function EngineStep({
  number,
  icon: Icon,
  title,
  desc,
  iconCls,
  numBg,
  delay = 0
}: {
  number: number;
  icon: React.ElementType;
  title: string;
  desc: string;
  iconCls: string;
  numBg: string;
  delay?: number;
}) {
  return <FadeUp delay={delay}>
      <div className="relative flex flex-col gap-4 rounded-xl border border-border p-6 h-full bg-card">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconCls}`}>
              <Icon size={20} />
            </div>
            <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${numBg}`}>
              {number}
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        </div>
      </div>
    </FadeUp>;
}

// ─── Output type card ─────────────────────────────────────────────────────────
function OutputCard({
  icon: Icon,
  title,
  desc,
  iconCls,
  delay = 0
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  iconCls: string;
  delay?: number;
}) {
  return <FadeUp delay={delay}>
      <div className="group rounded-xl border border-border p-5 flex flex-col gap-3 h-full transition-all hover:border-primary/30 bg-card">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconCls}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors">{title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
        </div>
      </div>
    </FadeUp>;
}

// ─── Terminal line class resolver ─────────────────────────────────────────────
function termLineCls(type: string, isFirst: boolean): string {
  if (isFirst) return 'text-foreground';
  if (type === 'success') return 'text-emerald-400';
  return 'text-muted-foreground';
}
function termPrefixCls(type: string, isFirst: boolean): string {
  if (isFirst) return 'text-primary';
  if (type === 'success') return 'text-emerald-400';
  return 'text-muted-foreground';
}

// ─── BCU meter ────────────────────────────────────────────────────────────────
function BcuMeter({
  label,
  bcus,
  max,
  barCls
}: {
  label: string;
  bcus: number;
  max: number;
  barCls: string;
}) {
  const pct = bcus / max * 100;
  return <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-36 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div className={`h-full rounded-full ${barCls}`} initial={{
        width: 0
      }} whileInView={{
        width: `${pct}%`
      }} viewport={{
        once: true
      }} transition={{
        duration: 0.7,
        ease: 'easeOut' as const
      }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-16 text-right">{bcus} BCU{bcus !== 1 ? 's' : ''}</span>
    </div>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return <>
      <Helmet>
        <title>SynTract Labs — Autonomous Software Creation Platform</title>
        <meta name="description" content="The SynTract Build Engine is a proprietary autonomous developer agent that generates complete, production-ready software — mobile apps, games, AI agents, and full-stack systems — from a single prompt." />
        <link rel="canonical" href="https://syntract.net/" />
        <meta property="og:title" content="SynTract Labs — Autonomous Software Creation Platform" />
        <meta property="og:description" content="The SynTract Build Engine generates complete, production-ready software from a single prompt. Mobile apps, games, AI agents, and full-stack systems." />
        <meta property="og:url" content="https://syntract.net/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SynTract Labs" />
        <meta property="og:image" content="https://syntract.net/og-image.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SynTract Labs — Autonomous Software Creation Platform" />
        <meta name="twitter:description" content="The SynTract Build Engine generates complete, production-ready software from a single prompt." />
        <meta name="twitter:image" content="https://syntract.net/og-image.svg" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'WebSite',
            '@id': 'https://syntract.net/#website',
            name: 'SynTract Labs',
            url: 'https://syntract.net/'
          }, {
            '@type': 'SoftwareApplication',
            '@id': 'https://syntract.net/#organization',
            name: 'SynTract Labs',
            url: 'https://syntract.net/',
            applicationCategory: 'DeveloperApplication',
            description: 'Autonomous software creation platform powered by the SynTract Build Engine.'
          }, {
            '@type': 'WebPage',
            '@id': 'https://syntract.net/#webpage',
            url: 'https://syntract.net/',
            isPartOf: {
              '@id': 'https://syntract.net/#website'
            },
            about: {
              '@id': 'https://syntract.net/#organization'
            },
            datePublished: '2026-07-01',
            dateModified: '2026-08-18'
          }]
        })}</script>
      </Helmet>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{
      minHeight: '96vh',
      display: 'flex',
      alignItems: 'center'
    }}>
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.022] pointer-events-none" style={{
        backgroundImage: `linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)`,
        backgroundSize: '48px 48px'
      }} />
        {/* Glows */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] opacity-[0.09] pointer-events-none" style={{
        background: 'hsl(var(--primary))'
      }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[110px] opacity-[0.07] pointer-events-none" style={{
        background: 'hsl(var(--secondary))'
      }} />

        <div className="container mx-auto px-6 py-28 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-16">

              {/* Left: copy */}
              <div className="flex-1 flex flex-col gap-7 text-center lg:text-left items-center lg:items-start">

                <motion.div initial={{
                opacity: 0,
                y: 10
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                duration: 0.3,
                ease: 'easeOut' as const
              }}>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/[0.08] text-primary text-sm font-mono font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    SynTract Build Engine™
                  </span>
                </motion.div>

                <motion.h1 initial={{
                opacity: 0,
                y: 16
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                duration: 0.4,
                delay: 0.08,
                ease: 'easeOut' as const
              }} className="text-5xl lg:text-6xl font-bold leading-[1.07] tracking-tight text-foreground">
                  Enterprise-grade autonomous software generation.<br />
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    One idea. Realized.
                  </span>
                </motion.h1>

                <motion.p initial={{
                opacity: 0,
                y: 12
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                duration: 0.4,
                delay: 0.16,
                ease: 'easeOut' as const
              }} className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                  {home.hero.body}
                </motion.p>

                <motion.div initial={{
                opacity: 0,
                y: 10
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                duration: 0.4,
                delay: 0.24,
                ease: 'easeOut' as const
              }} className="flex flex-wrap gap-2">
                  <CapPill icon={Smartphone} label="Mobile apps" cls="border-primary/30 bg-primary/[0.08] text-primary" />
                  <CapPill icon={Gamepad2} label="Games" cls="border-secondary/30 bg-secondary/[0.08] text-secondary" />
                  <CapPill icon={Bot} label="AI agents" cls="border-accent/30 bg-accent/[0.08] text-accent" />
                  <CapPill icon={Globe} label="Full-stack systems" cls="border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400" />
                  <CapPill icon={Braces} label="APIs & backends" cls="border-primary/30 bg-primary/[0.08] text-primary" />
                </motion.div>

                <motion.div initial={{
                opacity: 0,
                y: 10
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                duration: 0.4,
                delay: 0.32,
                ease: 'easeOut' as const
              }} className="flex flex-wrap gap-3">
                  <Link to="/signup" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-sm font-bold bg-gradient-to-r from-primary to-secondary text-primary-foreground transition-all hover:opacity-90">
                    <Sparkles size={14} />
                    <span>{home.hero.cta_primary}</span>
                  </Link>
                  <Link to="/product" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all">
                    <Play size={13} />
                    <span>{home.hero.cta_secondary}</span>
                  </Link>
                </motion.div>

                <motion.div initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} transition={{
                duration: 0.5,
                delay: 0.5,
                ease: 'easeOut' as const
              }} className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-emerald-400" /><span>{home.hero.trust1}</span></span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-emerald-400" /><span>{home.hero.trust2}</span></span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-emerald-400" /><span>{home.hero.trust3}</span></span>
                </motion.div>
              </div>

              {/* Right: terminal demo */}
              <motion.div className="flex-1 w-full max-w-lg" initial={{
              opacity: 0,
              x: 20
            }} animate={{
              opacity: 1,
              x: 0
            }} transition={{
              duration: 0.5,
              delay: 0.2,
              ease: 'easeOut' as const
            }}>
                <div className="rounded-xl border border-border overflow-hidden bg-background">
                  {/* Window chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <div className="w-3 h-3 rounded-full bg-green-500/70" />
                    <span className="ml-3 text-[11px] font-mono text-muted-foreground/50">{home.terminal.title}</span>
                  </div>
                  {/* Lines */}
                  <div className="p-5 font-mono text-[12px] flex flex-col gap-2">
                    {home.terminal.lines.map((line, i) => <motion.div key={line.id} initial={{
                    opacity: 0,
                    x: -8
                  }} animate={{
                    opacity: 1,
                    x: 0
                  }} transition={{
                    delay: 0.3 + i * 0.18,
                    duration: 0.25,
                    ease: 'easeOut' as const
                  }} className="flex items-start gap-3">
                        <span className={`shrink-0 w-4 text-right ${termPrefixCls(line.type, i === 0)}`}>
                          {line.prefix}
                        </span>
                        <span className={termLineCls(line.type, i === 0)}>{line.text}</span>
                      </motion.div>)}
                    <motion.div initial={{
                    opacity: 0
                  }} animate={{
                    opacity: [0, 1, 0]
                  }} transition={{
                    delay: 1.8,
                    duration: 0.8,
                    repeat: Infinity,
                    repeatDelay: 0.4
                  }} className="w-2 h-4 rounded-sm mt-1 bg-primary" />
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT THE ENGINE BUILDS ────────────────────────────────────────── */}
      <section className="py-20 border-t border-border bg-card/30">
        <div className="container mx-auto px-6">
          <FadeUp>
            <div className="text-center mb-12">
              <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">{home.outputs_section.eyebrow}</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">{home.outputs_section.heading}</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">{home.outputs_section.body}</p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            <OutputCard icon={Smartphone} title="Mobile Applications" iconCls="bg-primary/10 border border-primary/20 text-primary" delay={0} desc="Native iOS and Android apps with full UI, navigation, state management, and backend integration — ready to submit to the App Store." />
            <OutputCard icon={Globe} title="Web Applications" iconCls="bg-secondary/10 border border-secondary/20 text-secondary" delay={0.05} desc="Full-stack web apps: React frontends, REST or GraphQL APIs, database schemas, auth systems, and deployment configs." />
            <OutputCard icon={Bot} title="AI Agents & Pipelines" iconCls="bg-accent/10 border border-accent/20 text-accent" delay={0.1} desc="Autonomous agents with tool use, memory, and multi-step reasoning. Document intelligence, workflow automation, and LLM-powered products." />
            <OutputCard icon={Gamepad2} title="Games" iconCls="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" delay={0.15} desc="2D and casual games with game loops, physics, scoring, and asset pipelines — built for web, mobile, or desktop targets." />
            <OutputCard icon={Database} title="Backend Systems & APIs" iconCls="bg-primary/10 border border-primary/20 text-primary" delay={0.2} desc="Standalone backend services: REST APIs, microservices, data pipelines, cron jobs, and webhook handlers with full test suites." />
            <OutputCard icon={LayoutDashboard} title="Dashboards & Tools" iconCls="bg-secondary/10 border border-secondary/20 text-secondary" delay={0.25} desc="Internal tools, admin panels, analytics dashboards, and SaaS control planes — wired to real data sources from day one." />
          </div>
        </div>
      </section>

      {/* ── HOW THE ENGINE WORKS ──────────────────────────────────────────── */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-6">
          <FadeUp>
            <div className="text-center mb-12">
              <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">{home.engine_section.eyebrow}</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">{home.engine_section.heading}</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">{home.engine_section.body}</p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            <EngineStep number={1} icon={Terminal} iconCls="bg-primary/10 border border-primary/20 text-primary" numBg="bg-primary" delay={0} title="Prompt intake & planning" desc="The engine parses your natural-language prompt, infers architecture requirements, and produces a structured technical blueprint before writing a single line of code." />
            <EngineStep number={2} icon={Cpu} iconCls="bg-secondary/10 border border-secondary/20 text-secondary" numBg="bg-secondary" delay={0.07} title="Autonomous code generation" desc="A specialized build agent streams production-quality source files — components, services, schemas, tests — following the blueprint with no human in the loop." />
            <EngineStep number={3} icon={GitBranch} iconCls="bg-accent/10 border border-accent/20 text-accent" numBg="bg-accent" delay={0.14} title="Validation & refinement" desc="The engine self-reviews its output, catches structural issues, and iterates. You can also submit a refine prompt to steer the result in any direction." />
            <EngineStep number={4} icon={Package} iconCls="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" numBg="bg-emerald-500" delay={0.21} title="Delivery & preview" desc="Completed builds are compiled to a live preview URL and packaged for download. Full source code, ready to run, extend, or hand off to your own team." />
          </div>

          <FadeUp delay={0.3}>
            <div className="mt-8 text-center">
              <Link to="/docs" className="inline-flex items-center gap-2 text-sm text-primary/80 hover:text-primary transition-colors font-medium">
                <span>{home.engine_section.docs_link}</span> <ArrowRight size={13} />
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── BCU MODEL ─────────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-border bg-card/30">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            <FadeUp>
              <div className="flex flex-col gap-5">
                <div>
                  <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">{home.bcu_section.eyebrow}</p>
                  <h2 className="text-3xl font-bold text-foreground mb-3">{home.bcu_section.heading}</h2>
                  <p className="text-muted-foreground leading-relaxed">{home.bcu_section.body}</p>
                </div>
                <div className="flex flex-col gap-3 pt-2">
                  {[{
                  label: 'Free tier',
                  desc: '2 BCUs included — no card required'
                }, {
                  label: 'Starter plan',
                  desc: '$49/mo — 12 BCUs per month'
                }, {
                  label: 'Professional',
                  desc: '$199/mo — 48 BCUs per month'
                }, {
                  label: 'Team plan',
                  desc: '$499/mo — 120 BCUs per month'
                }].map(tier => <div key={tier.label} className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground w-28 shrink-0">{tier.label}</span>
                      <span className="text-foreground/60">{tier.desc}</span>
                    </div>)}
                </div>
                <div className="flex gap-3 pt-2">
                  <Link to="/pricing" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    View pricing <ArrowRight size={13} />
                  </Link>
                  <Link to="/docs#bcus" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
                    How BCUs work <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.1}>
              <div className="rounded-xl border border-border p-6 flex flex-col gap-5 bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu size={14} className="text-primary" />
                  <span className="text-sm font-semibold text-foreground">Typical BCU costs</span>
                </div>
                <div className="flex flex-col gap-3.5">
                  <BcuMeter label="Simple landing page" bcus={0.5} max={10} barCls="bg-primary" />
                  <BcuMeter label="Mobile app (basic)" bcus={2} max={10} barCls="bg-primary" />
                  <BcuMeter label="Full-stack web app" bcus={4} max={10} barCls="bg-secondary" />
                  <BcuMeter label="AI agent pipeline" bcus={3} max={10} barCls="bg-accent" />
                  <BcuMeter label="Game (2D, casual)" bcus={3} max={10} barCls="bg-emerald-500" />
                  <BcuMeter label="Enterprise system" bcus={8} max={10} barCls="bg-secondary" />
                </div>
                <p className="text-[11px] text-muted-foreground/50 pt-1">{home.bcu_section.meter_note}</p>
              </div>
            </FadeUp>

          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ──────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-6">
          <FadeUp>
            <div className="text-center mb-12">
              <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">{home.audience_section.eyebrow}</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">{home.audience_section.heading}</h2>
              <p className="text-muted-foreground max-w-md mx-auto">{home.audience_section.body}</p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[{
            icon: Rocket,
            iconCls: 'bg-primary/10 border border-primary/20 text-primary',
            title: 'Individuals & founders',
            points: ['Validate ideas in hours, not weeks', 'No dev team required', 'Own your source code outright', 'Free tier to start — no card needed']
          }, {
            icon: Layers,
            iconCls: 'bg-secondary/10 border border-secondary/20 text-secondary',
            title: 'Small & mid-size businesses',
            points: ['Cut custom software costs dramatically', 'Prototype before committing to a build', 'Extend and refine with your own team', 'Starter and Professional plans']
          }, {
            icon: Zap,
            iconCls: 'bg-accent/10 border border-accent/20 text-accent',
            title: 'Enterprise teams',
            points: ['Team plan with shared BCU pools', 'Role-based access control', 'Priority build queue', 'Custom volume pricing available']
          }].map((card, i) => <FadeUp key={card.title} delay={i * 0.08}>
                <div className="rounded-xl border border-border p-6 flex flex-col gap-4 h-full bg-card">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.iconCls}`}>
                    <card.icon size={20} />
                  </div>
                  <p className="font-semibold text-foreground text-sm">{card.title}</p>
                  <ul className="flex flex-col gap-2">
                    {card.points.map(pt => <li key={pt} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 size={11} className="text-emerald-400 mt-0.5 shrink-0" />
                        <span>{pt}</span>
                      </li>)}
                  </ul>
                </div>
              </FadeUp>)}
          </div>
        </div>
      </section>

      {/* ── SOURCE CODE OWNERSHIP ─────────────────────────────────────────── */}
      <section className="py-16 border-t border-border bg-primary/[0.03]">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <FadeUp className="flex-1">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <FileCode2 size={16} className="text-primary" />
                  <span className="text-xs font-mono text-primary/70 tracking-widest uppercase">{home.ownership_section.eyebrow}</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground">{home.ownership_section.heading}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">{home.ownership_section.body}</p>
              </div>
            </FadeUp>
            <FadeUp delay={0.1} className="flex-shrink-0">
              <div className="flex flex-col gap-3">
                {['Full source code download on every build', 'No SynTract attribution required', 'Commercial use included in all plans', 'Extend, modify, and redistribute freely'].map(pt => <div key={pt} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <span>{pt}</span>
                  </div>)}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ───────────────────────────────────────────────────── */}
      <section className="border-y border-border py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[{
            value: '50+',
            label: 'Software products built'
          }, {
            value: '<2min',
            label: 'Median build time'
          }, {
            value: '10+',
            label: 'Output categories'
          }, {
            value: '100%',
            label: 'Source code ownership'
          }].map((m, i) => <FadeUp key={m.label} delay={i * 0.06}>
                <div>
                  <div className="text-3xl font-bold mb-1 font-mono bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {m.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{m.label}</div>
                </div>
              </FadeUp>)}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <FadeUp>
            <div className="max-w-2xl mx-auto rounded-2xl border border-primary/20 p-10 text-center flex flex-col items-center gap-6" style={{
            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.07), hsl(var(--secondary) / 0.07))'
          }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary/10 border border-primary/25">
                <Sparkles size={24} className="text-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold text-foreground tracking-tight">{home.cta_section.heading}</h2>
                <p className="text-muted-foreground">{home.cta_section.body}</p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/signup" className="inline-flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-bold bg-gradient-to-r from-primary to-secondary text-primary-foreground transition-all hover:opacity-90">
                  <Sparkles size={14} />
                  <span>{home.cta_section.cta_primary}</span>
                </Link>
                <Link to="/pricing" className="inline-flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all">
                  <span>{home.cta_section.cta_secondary}</span> <ChevronRight size={14} />
                </Link>
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-400" /><span>{home.hero.trust1}</span></span>
                <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-400" /><span>{home.hero.trust2}</span></span>
                <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-400" />Enterprise plans available</span>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </>;
}
