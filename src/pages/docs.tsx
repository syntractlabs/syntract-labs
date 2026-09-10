import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { Zap, Cpu, GitBranch, Palette, Layers, Settings, Users, CreditCard, Globe, Code2, HelpCircle, Rocket } from 'lucide-react';

// ─── Fade-up reveal ────────────────────────────────────────────────────────────
function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 14 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.22, delay, ease: 'easeOut' }} className={className}>
      {children}
    </motion.div>
  );
}

// ─── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 mb-8 pb-4 border-b border-border">
      <div className="w-0.5 h-7 rounded-full bg-primary shrink-0" />
      <h2 className="text-xl font-bold text-foreground tracking-tight">{children}</h2>
    </div>
  );
}

// ─── Nav data ──────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview',        label: 'Overview',                    icon: Zap },
  { id: 'bcus',            label: 'Build Compute Units (BCUs)',  icon: Cpu },
  { id: 'how-builds-work', label: 'How Builds Work',             icon: GitBranch },
  { id: 'design-system',   label: 'SynTract Design System',      icon: Palette },
  { id: 'architecture',    label: 'SynTract Architecture Layer', icon: Layers },
  { id: 'build-pipeline',  label: 'Build Pipeline',              icon: Settings },
  { id: 'team-enterprise', label: 'Team & Enterprise Features',  icon: Users },
  { id: 'pricing',         label: 'Pricing Integration',         icon: CreditCard },
  { id: 'deployment',      label: 'Deployment',                  icon: Globe },
  { id: 'source-code',     label: 'Source Code Ownership',       icon: Code2 },
  { id: 'faq',             label: 'FAQ',                         icon: HelpCircle },
  { id: 'getting-started', label: 'Getting Started',             icon: Rocket },
];

const ALL_IDS = NAV.map(n => n.id);

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const handler = () => {
      for (const id of [...ALL_IDS].reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveSection(id);
          return;
        }
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <Helmet>
        <title>Build Engine Documentation — SynTract Labs</title>
        <meta name="description" content="SynTract Labs Autonomous Build Engine™ documentation. BCUs, build pipeline, architecture, design system, team features, and more." />
        <link rel="canonical" href="https://syntract.net/docs" />
        <meta property="og:title" content="Build Engine Documentation — SynTract Labs" />
        <meta property="og:description" content="SynTract Labs Autonomous Build Engine™ documentation." />
        <meta property="og:url" content="https://syntract.net/docs" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://syntract.net/og-image.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Build Engine Documentation — SynTract Labs" />
        <meta name="twitter:description" content="SynTract Labs Autonomous Build Engine™ documentation. BCUs, build pipeline, architecture, design system, team features, and more." />
        <meta name="twitter:image" content="https://syntract.net/og-image.svg" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          '@id': 'https://syntract.net/docs#webpage',
          name: 'Build Engine Documentation — SynTract Labs',
          url: 'https://syntract.net/docs',
          description: 'SynTract Labs Autonomous Build Engine™ documentation covering BCUs, build pipeline, architecture, design system, and team features.',
          isPartOf: { '@id': 'https://syntract.net/#website' },
          about: { '@id': 'https://syntract.net/#organization' },
        })}</script>
      </Helmet>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-border relative overflow-hidden bg-background">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(hsl(var(--border)) 1px,transparent 1px),linear-gradient(90deg,hsl(var(--border)) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="container mx-auto px-6 py-16 relative z-10">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="font-mono text-[10px] text-primary/60 tracking-widest uppercase">Documentation</span>
              <span className="font-mono text-[10px] text-muted-foreground/40">·</span>
              <span className="font-mono text-[10px] text-muted-foreground/50">Build Engine</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
              SynTract Build Engine
            </h1>
            <p className="text-muted-foreground leading-relaxed max-w-xl">
              Complete documentation for the SynTract Labs Autonomous Build Engine™ — BCUs, pipeline, architecture, design system, and enterprise features.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── LAYOUT ───────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-6">
        <div className="flex gap-8 py-10">

          {/* ── SIDEBAR ──────────────────────────────────────────────── */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 flex flex-col gap-0.5">
              <p className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-widest px-2 mb-2">Sections</p>
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-all duration-150 flex items-center gap-2 ${
                      active
                        ? 'text-primary font-medium bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <Icon size={11} className={active ? 'text-primary' : 'text-muted-foreground/50'} />
                    {active && <span className="w-1 h-3 rounded-full bg-primary shrink-0" />}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── CONTENT ──────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0 flex flex-col gap-16">

            <section id="overview" className="scroll-mt-24">
              <FadeUp><SectionHeading>Overview</SectionHeading></FadeUp>
              <FadeUp delay={0.05}>
                <div className="flex flex-col gap-4 text-muted-foreground leading-relaxed text-sm max-w-2xl">
                  <p>
                    SynTract Labs is an autonomous AI build engine that generates complete, production‑ready digital products. You describe what you want to build, and the Build Engine designs it, architects it, writes the code, generates assets, and delivers a full project you can deploy anywhere.
                  </p>
                  <p>
                    The Build Engine is deterministic, stable, and engineered for professional‑grade output. Every build follows a strict structure to ensure reliability, clarity, and successful preview/publish.
                  </p>
                </div>
              </FadeUp>
            </section>

            <section id="bcus" className="scroll-mt-24">
              <FadeUp><SectionHeading>Build Compute Units (BCUs)</SectionHeading></FadeUp>
              <FadeUp delay={0.05}>
                <div className="flex flex-col gap-4 text-muted-foreground leading-relaxed text-sm max-w-2xl">
                  <p>
                    Build Compute Units (BCUs) represent the AI processing power required to generate your builds. BCUs are consumed when the Build Engine performs tasks such as code generation, architecture planning, UI/UX design, graphics creation, debugging, refactoring, and deployment preparation.
                  </p>
                  <p>
                    BCUs reset monthly, unused BCUs roll over, and top‑up packs allow you to add more BCUs without changing plans. Concurrency limits determine how many builds can run at once.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-muted border border-border w-fit mt-1">
                    <span className="text-primary text-xs font-mono">ℹ</span>
                    <span className="text-xs text-muted-foreground">BCUs = AI processing power used to generate your builds.</span>
                  </div>
                </div>
              </FadeUp>
            </section>

            <section id="how-builds-work" className="scroll-mt-24">
              <FadeUp><SectionHeading>How Builds Work</SectionHeading></FadeUp>
              <FadeUp delay={0.05}>
                <div className="flex flex-col gap-6 text-sm max-w-2xl">
                  <p className="text-muted-foreground leading-relaxed">
                    Every SynTract build follows a predictable lifecycle:
                  </p>
                  <ol className="flex flex-col gap-3">
                    {[
                      'You describe the product you want.',
                      'The Build Engine generates the architecture, including backend, frontend, APIs, and database models.',
                      'A complete design system is created, including colors, typography, spacing, and components.',
                      'The engine writes all code for the project.',
                      'Graphics and assets are generated and integrated.',
                      'You receive full source code, a complete file structure, and deployment instructions.',
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-mono text-[10px] text-primary font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-muted-foreground leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-muted border border-border w-fit">
                    <span className="text-primary text-xs font-mono">ℹ</span>
                    <span className="text-xs text-muted-foreground">All builds are deterministic and designed to load correctly in preview and publish.</span>
                  </div>
                </div>
              </FadeUp>
            </section>

            <section id="design-system" className="scroll-mt-24">
              <FadeUp><SectionHeading>SynTract Design System</SectionHeading></FadeUp>
              <FadeUp delay={0.05}>
                <div className="flex flex-col gap-4 text-muted-foreground leading-relaxed text-sm max-w-2xl">
                  <p>
                    Every build includes a complete design system that defines the visual language of the product. This includes color palettes, typography scales, spacing rules, layout patterns, UI components, and animation guidelines.
                  </p>
                  <p>
                    The design system ensures consistency, accessibility, and a modern, polished user experience across all screens and interactions.
                  </p>
                </div>
              </FadeUp>
            </section>

            <section id="architecture" className="scroll-mt-24">
              <FadeUp><SectionHeading>SynTract Architecture Layer</SectionHeading></FadeUp>
              <FadeUp delay={0.05}>
                <div className="flex flex-col gap-4 text-muted-foreground leading-relaxed text-sm max-w-2xl">
                  <p>
                    The Build Engine produces a stable architecture for each project. This includes backend services, API endpoints, database models, frontend components, routing, state management, and a clean file structure.
                  </p>
                  <p>
                    Framework selection is deterministic and based on the requirements of the product. All imports resolve correctly, and all assets are referenced properly.
                  </p>
                </div>
              </FadeUp>
            </section>

            <section id="build-pipeline" className="scroll-mt-24">
              <FadeUp><SectionHeading>Build Pipeline</SectionHeading></FadeUp>
              <FadeUp delay={0.05}>
                <div className="flex flex-col gap-4 text-muted-foreground leading-relaxed text-sm max-w-2xl">
                  <p>
                    The Build Engine enforces determinism, stability, and predictable output. Concurrency limits determine how many builds can run at once, and higher‑tier plans receive priority compute.
                  </p>
                  <p>
                    All builds undergo asset validation, import resolution, and structural checks to ensure successful preview and publish.
                  </p>
                </div>
              </FadeUp>
            </section>

            <section id="team-enterprise" className="scroll-mt-24">
              <FadeUp><SectionHeading>Team & Enterprise Features</SectionHeading></FadeUp>
              <FadeUp delay={0.05}>
                <div className="flex flex-col gap-4 text-muted-foreground leading-relaxed text-sm max-w-2xl">
                  <p>
                    Team plans include shared repos, shared build queues, multi‑seat access, dashboards, and priority compute.
                  </p>
                  <p>
                    Enterprise plans include unlimited BCUs, unlimited concurrency, custom DevOps pipelines, architecture review, SLAs, IP transfer, and dedicated priority queues.
                  </p>
                </div>
              </FadeUp>
            </section>

            <section id="pricing" className="scroll-mt-24">
              <FadeUp><SectionHeading>Pricing Integration</SectionHeading></FadeUp>
              <FadeUp delay={0.05}>
                <div className="flex flex-col gap-6 text-sm max-w-2xl">
                  <p className="text-muted-foreground leading-relaxed">
                    Documentation reflects the current pricing tiers:
                  </p>
                  <div className="flex flex-col gap-2">
                    {[
                      { tier: 'Free Test',     detail: '2 BCUs, 1 concurrent build' },
                      { tier: 'Starter',       detail: '12 BCUs, 3 concurrent builds' },
                      { tier: 'Professional',  detail: '48 BCUs, 10 concurrent builds' },
                      { tier: 'Team',          detail: '120 BCUs, 5 seats, shared compute' },
                      { tier: 'Enterprise',    detail: 'Unlimited BCUs, unlimited concurrency, SLA' },
                    ].map((row) => (
                      <div key={row.tier} className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/40 border border-border">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-foreground font-medium w-28 shrink-0">{row.tier}</span>
                        <span className="text-muted-foreground">{row.detail}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    All references use BCUs instead of hours. Top‑up packs are available for Starter, Professional, and Team.
                  </p>
                </div>
              </FadeUp>
            </section>

            <section id="deployment" className="scroll-mt-24">
              <FadeUp><SectionHeading>Deployment</SectionHeading></FadeUp>
              <FadeUp delay={0.05}>
                <div className="flex flex-col gap-4 text-muted-foreground leading-relaxed text-sm max-w-2xl">
                  <p>
                    Every build includes deployment scripts and environment templates. Projects can be deployed to platforms such as Vercel, Netlify, AWS, Azure, GCP, Render, and DigitalOcean.
                  </p>
                  <p>
                    The Build Engine generates portable, framework‑standard code that can be hosted anywhere.
                  </p>
                </div>
              </FadeUp>
            </section>

            <section id="source-code" className="scroll-mt-24">
              <FadeUp><SectionHeading>Source Code Ownership</SectionHeading></FadeUp>
              <FadeUp delay={0.05}>
                <div className="flex flex-col gap-4 text-muted-foreground leading-relaxed text-sm max-w-2xl">
                  <p>
                    You own 100% of the source code generated by SynTract Labs. Enterprise plans include full IP transfer.
                  </p>
                </div>
              </FadeUp>
            </section>

            <section id="faq" className="scroll-mt-24">
              <FadeUp><SectionHeading>FAQ</SectionHeading></FadeUp>
              <FadeUp delay={0.05}>
                <div className="flex flex-col gap-3 max-w-2xl">
                  {[
                    { q: 'Do I need an API key?', a: 'Only for programmatic access. Most users build through the dashboard.' },
                    { q: 'Can I edit the code?', a: 'Yes. Every build includes full source code.' },
                    { q: 'Do BCUs roll over?', a: 'Yes.' },
                    { q: 'Can I buy more BCUs?', a: 'Yes. Top‑up packs are available.' },
                    { q: 'Can I deploy anywhere?', a: 'Yes. The Build Engine generates portable code.' },
                  ].map((item) => (
                    <div key={item.q} className="rounded-md border border-border bg-muted/30 px-4 py-3 flex flex-col gap-1">
                      <span className="text-sm font-medium text-foreground">{item.q}</span>
                      <span className="text-sm text-muted-foreground">{item.a}</span>
                    </div>
                  ))}
                </div>
              </FadeUp>
            </section>

            <section id="getting-started" className="scroll-mt-24 pb-16">
              <FadeUp><SectionHeading>Getting Started</SectionHeading></FadeUp>
              <FadeUp delay={0.05}>
                <div className="flex flex-col gap-3 max-w-2xl">
                  {[
                    'Create an account',
                    'Choose a plan',
                    'Describe your product',
                    'Run your first build',
                    'Download your code',
                    'Deploy anywhere',
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-md border border-border bg-muted/30">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-mono text-[10px] text-primary font-bold">
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground">{step}</span>
                    </div>
                  ))}
                </div>
              </FadeUp>
            </section>

          </main>
        </div>
      </div>
    </>
  );
}
