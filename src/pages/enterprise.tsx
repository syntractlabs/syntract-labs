import { enterprise } from 'virtual:content';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion, useInView } from 'motion/react';
import { useRef, useState } from 'react';
import { Link } from "react-router";
import { Shield, Zap, Users, Globe, Lock, BarChart3, ArrowRight, Check, Building2, ChevronRight, Headphones, Clock, Cpu, GitBranch, Infinity } from 'lucide-react';
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
    y: 16
  }} animate={inView ? {
    opacity: 1,
    y: 0
  } : {}} transition={{
    duration: 0.24,
    delay,
    ease: 'easeOut' as const
  }} className={className}>
      {children}
    </motion.div>;
}

// ─── Capabilities ──────────────────────────────────────────────────────────────
const CAPABILITIESMeta = [{
  icon: Infinity
}, {
  icon: Users
}, {
  icon: Cpu
}, {
  icon: GitBranch
}, {
  icon: Shield
}, {
  icon: Globe
}, {
  icon: Lock
}, {
  icon: Headphones
}];
export default function EnterprisePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    teamSize: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/enterprise-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formState)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as {
          error?: string;
        }).error || 'Something went wrong. Please try again.');
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }
  return <>
      <Helmet>
        <title>Enterprise — SynTract Labs AI Software Development</title>
        <meta name="description" content="SynTract Labs Enterprise: unlimited build hours, multi-user team access, dedicated agent sessions, architecture reviews, and a full SLA. From $499/year." />
        <link rel="canonical" href="https://syntract.net/enterprise" />
        <meta property="og:title" content="Enterprise — SynTract Labs" />
        <meta property="og:description" content="Unlimited AI build hours for your team. Seat-based annual pricing from $499/year." />
        <meta property="og:url" content="https://syntract.net/enterprise" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SynTract Labs" />
        <meta property="og:image" content="https://syntract.net/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Enterprise — SynTract Labs" />
        <meta name="twitter:description" content="Unlimited AI build hours for your team. Seat-based annual pricing from $499/year." />
        <meta name="twitter:image" content="https://syntract.net/og-image.png" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': 'https://syntract.net/enterprise#webpage',
          name: 'Enterprise — SynTract Labs AI Software Development',
          url: 'https://syntract.net/enterprise',
          description: 'SynTract Labs Enterprise: unlimited build hours, multi-user team access, dedicated agent sessions, architecture reviews, and a full SLA.',
          isPartOf: {
            '@id': 'https://syntract.net/#website'
          },
          about: {
            '@id': 'https://syntract.net/#organization'
          }
        })}</script>
      </Helmet>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div className="absolute inset-0 pointer-events-none opacity-[0.035]" style={{
        backgroundImage: 'linear-gradient(hsl(var(--border)) 1px,transparent 1px),linear-gradient(90deg,hsl(var(--border)) 1px,transparent 1px)',
        backgroundSize: '32px 32px'
      }} />
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, hsl(var(--primary)/0.08) 0%, transparent 70%)'
      }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, hsl(var(--secondary)/0.07) 0%, transparent 70%)'
      }} />

        <div className="container mx-auto px-6 py-24 relative z-10">
          <motion.div initial={{
          opacity: 0,
          y: 18
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.3,
          ease: 'easeOut' as const
        }} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/[0.07] mb-6">
              <Building2 size={11} className="text-primary" />
              <span className="font-mono text-[10px] text-primary/80 tracking-widest uppercase">Enterprise</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 leading-[1.08]">
              Unlimited builds<br />
              <span style={{
              background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
                for your whole team.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
              Enterprise plans give every user on your team unrestricted access to the AI build agent — no hour caps, no top-up packs, no throttling. Annual seat-based pricing from $499/year.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
                Talk to sales <ArrowRight size={15} />
              </a>
              <Link to="/pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border text-foreground font-medium hover:bg-muted transition-colors">
                Compare all plans <ChevronRight size={15} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      {/* ── SOCIAL PROOF STRIP ───────────────────────────────────────────── */}
      <section className="border-b border-border py-8 bg-card">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-widest shrink-0">Trusted by</span>
            {enterprise.LOGOS.map(name => <span key={name} className="text-sm font-semibold text-muted-foreground/40 tracking-wide">{name}</span>)}
          </div>
        </div>
      </section>
      {/* ── SEAT PRICING TABLE ───────────────────────────────────────────── */}
      <section className="py-24 border-b border-border">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-start max-w-5xl mx-auto">
            <FadeUp>
              <p className="font-mono text-[10px] text-primary/60 tracking-widest uppercase mb-3">Annual seat pricing</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-5">
                Simple pricing that scales with your team.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                One annual subscription covers your entire team with unlimited build hours. No per-build fees, no hour packs, no surprises.
              </p>
              <ul className="flex flex-col gap-3 mb-8">
                {['Unlimited active build hours for every user', 'Run as many projects as your team needs', 'All Professional features included', 'Dedicated priority queue and agent sessions', 'Architecture review calls with senior engineers', 'Enterprise SLA with guaranteed response times', 'Dedicated account manager and Slack channel'].map(item => <li key={item} className="flex items-start gap-2.5">
                    <Check size={13} className="mt-0.5 shrink-0 text-primary/70" />
                    <span className="text-sm text-foreground/80">{item}</span>
                  </li>)}
              </ul>
            </FadeUp>

            <FadeUp delay={0.1}>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
                  <Users size={14} className="text-primary/60" />
                  <p className="font-semibold text-sm text-foreground">Annual seat pricing — all plans include unlimited hours</p>
                </div>
                <div className="divide-y divide-border">
                  {enterprise.SEAT_TIERS.map(row => <div key={row.range} className={`flex items-center justify-between px-5 py-4 transition-colors ${row.highlight ? 'bg-primary/[0.04]' : 'hover:bg-white/[0.02]'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center border ${row.highlight ? 'bg-primary/15 border-primary/30' : 'bg-primary/10 border-primary/20'}`}>
                          <Users size={11} className="text-primary/70" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{row.range}</span>
                        {row.highlight && <span className="font-mono text-[9px] uppercase tracking-widest text-primary/70 border border-primary/20 bg-primary/10 rounded px-1.5 py-0.5">Popular</span>}
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-foreground">{row.price}</span>
                        {row.period !== 'quote' ? <span className="text-xs text-muted-foreground ml-1">{row.period}</span> : <span className="text-xs text-primary/70 ml-1">— contact us</span>}
                      </div>
                    </div>)}
                </div>
                <div className="px-5 py-4 border-t border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground">
                    All tiers include unlimited build hours, full feature access, and a dedicated account manager. Annual billing only. Users can be added mid-year at a prorated rate.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <a href="#contact" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                  Get a quote <ArrowRight size={13} />
                </a>
                <Link to="/pricing" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors">
                  Compare plans
                </Link>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>
      {/* ── CAPABILITIES GRID ────────────────────────────────────────────── */}
      <section className="py-24 border-b border-border bg-muted/10">
        <div className="container mx-auto px-6">
          <FadeUp className="text-center mb-14">
            <p className="font-mono text-[10px] text-primary/60 tracking-widest uppercase mb-3">What's included</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4">Everything your team needs.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Every Enterprise plan includes the full feature set below. Nothing is gated behind a higher tier — it's all included.</p>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {enterprise.CAPABILITIES.map((cap, i) => {
            const Icon = CAPABILITIESMeta[i].icon;
            return <FadeUp key={cap.title} delay={i * 0.04}>
                  <div className="rounded-xl border border-border bg-card p-5 h-full hover:border-primary/25 transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                      <Icon size={16} className="text-primary" />
                    </div>
                    <p className="font-semibold text-sm text-foreground mb-0.5">{cap.title}</p>
                    <p className="font-mono text-[10px] text-primary/60 mb-2">{cap.sub}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{cap.desc}</p>
                  </div>
                </FadeUp>;
          })}
          </div>
        </div>
      </section>
      {/* ── QUOTE ────────────────────────────────────────────────────────── */}
      <section className="py-20 border-b border-border bg-card">
        <div className="container mx-auto px-6">
          <FadeUp className="max-w-3xl mx-auto text-center">
            <div className="text-5xl text-primary/20 font-serif mb-6 leading-none">"</div>
            <blockquote className="text-xl lg:text-2xl font-medium text-foreground leading-relaxed mb-6">
              Our team shipped three production apps in the first month. The agent handles the scaffolding, boilerplate, and infrastructure — our engineers focus on the parts that actually matter.
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">MK</div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Marcus Kim</p>
                <p className="text-xs text-muted-foreground">VP Engineering, Nexus Advisory</p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="py-20 border-b border-border">
        <div className="container mx-auto px-6">
          <FadeUp className="text-center mb-12">
            <p className="font-mono text-[10px] text-primary/60 tracking-widest uppercase mb-3">Onboarding</p>
            <h2 className="text-3xl font-bold text-foreground tracking-tight mb-3">Up and running in days, not months.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">We handle setup end-to-end. Most Enterprise teams are building production software within their first week.</p>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[{
            step: '01',
            icon: Zap,
            title: 'Contact sales',
            desc: 'Tell us your team size and use case. We\'ll put together a custom proposal within one business day.'
          }, {
            step: '02',
            icon: Users,
            title: 'Team provisioning',
            desc: 'We set up your organization, provision user accounts, and configure role-based access for your team.'
          }, {
            step: '03',
            icon: Clock,
            title: 'Kickoff call',
            desc: 'A dedicated solutions engineer walks your team through the platform and aligns on your first builds.'
          }, {
            step: '04',
            icon: BarChart3,
            title: 'Start building',
            desc: 'Your team has full access to the AI build agent with unlimited hours. Build as much as you want, whenever you want.'
          }].map((item, i) => {
            const Icon = item.icon;
            return <FadeUp key={item.step} delay={i * 0.06}>
                  <div className="rounded-xl border border-border bg-card p-5 h-full flex flex-col gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[10px] text-primary/50 tracking-widest">{item.step}</span>
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Icon size={14} className="text-primary" />
                      </div>
                    </div>
                    <p className="font-semibold text-sm text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </FadeUp>;
          })}
          </div>
        </div>
      </section>
      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-20 border-b border-border bg-muted/10">
        <div className="container mx-auto px-6 max-w-3xl">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground tracking-tight mb-3">Common questions.</h2>
            <p className="text-muted-foreground">Everything else — ask us directly.</p>
          </FadeUp>
          <div className="flex flex-col gap-2">
            {enterprise.FAQS.map((faq, i) => <FadeUp key={i} delay={i * 0.04}>
                <div className="rounded-lg border border-border overflow-hidden bg-card">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors">
                    <span className="font-medium text-sm text-foreground pr-4">{faq.q}</span>
                    <ChevronRight size={14} className={`text-muted-foreground shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-90' : ''}`} />
                  </button>
                  {openFaq === i && <motion.div initial={{
                opacity: 0,
                height: 0
              }} animate={{
                opacity: 1,
                height: 'auto'
              }} transition={{
                duration: 0.18,
                ease: 'easeOut' as const
              }}>
                      <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">{faq.a}</p>
                    </motion.div>}
                </div>
              </FadeUp>)}
          </div>
        </div>
      </section>
      {/* ── CONTACT FORM ─────────────────────────────────────────────────── */}
      <section id="contact" className="py-24">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start max-w-5xl mx-auto">
            <FadeUp>
              <p className="font-mono text-[10px] text-primary/60 tracking-widest uppercase mb-3">Get in touch</p>
              <h2 className="text-3xl font-bold text-foreground tracking-tight mb-5">Talk to our sales team.</h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Tell us about your team and what you're building. We'll put together a custom proposal within one business day.
              </p>
              <div className="flex flex-col gap-4">
                {[{
                icon: Users,
                label: 'Seat-based pricing',
                desc: 'Annual plans from $499/year — scales with your team size'
              }, {
                icon: Zap,
                label: 'Fast onboarding',
                desc: 'Fully live in under one week with a dedicated solutions engineer'
              }, {
                icon: Shield,
                label: 'Enterprise SLA',
                desc: 'Custom uptime guarantees, escalation paths, and a named account manager'
              }].map(item => {
                const Icon = item.icon;
                return <div key={item.label} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={13} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>;
              })}
              </div>
            </FadeUp>

            <FadeUp delay={0.1}>
              {submitted ? <motion.div initial={{
              opacity: 0,
              scale: 0.96
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              duration: 0.2
            }} className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-10 flex flex-col items-center text-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                    <Check size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-lg mb-1">Message received.</p>
                    <p className="text-sm text-muted-foreground">We'll reach out to <span className="text-foreground">{formState.email}</span> within one business day.</p>
                  </div>
                </motion.div> : <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-8 flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Full name</label>
                      <input required type="text" placeholder="Jane Smith" value={formState.name} onChange={e => setFormState(f => ({
                    ...f,
                    name: e.target.value
                  }))} className="px-3 py-2.5 rounded-md text-sm bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Company</label>
                      <input required type="text" placeholder="Acme Corp" value={formState.company} onChange={e => setFormState(f => ({
                    ...f,
                    company: e.target.value
                  }))} className="px-3 py-2.5 rounded-md text-sm bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Work email</label>
                    <input required type="email" placeholder="jane@acme.com" value={formState.email} onChange={e => setFormState(f => ({
                  ...f,
                  email: e.target.value
                }))} className="px-3 py-2.5 rounded-md text-sm bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Team size</label>
                    <select required value={formState.teamSize} onChange={e => setFormState(f => ({
                  ...f,
                  teamSize: e.target.value
                }))} className="px-3 py-2.5 rounded-md text-sm bg-muted/30 border border-border text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all appearance-none">
                      <option value="" disabled>Select team size…</option>
                      <option value="1">1 user</option>
                      <option value="2-5">2–5 users</option>
                      <option value="6-10">6–10 users</option>
                      <option value="11+">11+ users</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Tell us what you're building <span className="text-muted-foreground/40">(optional)</span></label>
                    <textarea rows={3} placeholder="We're a team of 5 engineers building internal tools and customer-facing apps…" value={formState.message} onChange={e => setFormState(f => ({
                  ...f,
                  message: e.target.value
                }))} className="px-3 py-2.5 rounded-md text-sm bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none" />
                  </div>
                  <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                    {submitting ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Sending…</> : <>Send message <ArrowRight size={14} /></>}
                  </button>
                  {submitError && <p className="text-center text-xs text-red-400">{submitError}</p>}
                  <p className="text-center text-[10px] text-muted-foreground/50">
                    We respond within one business day. No spam, ever.
                  </p>
                </form>}
            </FadeUp>
          </div>
        </div>
      </section>
    </>;
}
