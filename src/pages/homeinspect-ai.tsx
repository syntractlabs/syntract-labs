import { Helmet } from '@dr.pogodin/react-helmet';
import { Link } from 'react-router';
import {
  Camera,
  Search,
  ClipboardCheck,
  ArrowRight,
  ShieldCheck,
  LifeBuoy,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function HomeInspectAIPage() {
  return (
    <>
      <Helmet>
        <title>HomeInspect AI | AI-Powered Property Damage Insights</title>
        <meta
          name="description"
          content="Scan it. Detect it. Fix it. HomeInspect AI uses AI-powered image analysis to identify potential property damage and turn what you see into clear, actionable next steps."
        />
        <link
          rel="canonical"
          href="https://syntract.net/apps/homeinspect-ai"
        />
        <meta property="og:title" content="HomeInspect AI" />
        <meta
          property="og:description"
          content="AI-powered image analysis for potential property damage and clearer next steps."
        />
        <meta
          property="og:url"
          content="https://syntract.net/apps/homeinspect-ai"
        />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            className="absolute inset-0 opacity-[0.025] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
              backgroundSize: '48px 48px'
            }}
          />

          <div
            className="absolute top-20 left-1/3 w-96 h-96 rounded-full blur-[130px] opacity-[0.08] pointer-events-none"
            style={{ background: 'hsl(var(--primary))' }}
          />

          <div className="container mx-auto px-6 py-24 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/[0.08] text-primary text-xs font-mono font-semibold mb-7">
                <Sparkles size={12} />
                A SynTract Labs Mobile App
              </div>
<img
  src="/homeinspect-ai-icon.png"
  alt="HomeInspect AI app icon"
  className="w-28 h-28 mx-auto mb-7 rounded-[26px] shadow-2xl object-cover"
/>
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5">
                HomeInspect AI
              </h1>

              <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">
                Scan it. Detect it. Fix it.
              </h2>

              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-9">
                HomeInspect AI uses AI-powered image analysis to identify
                potential property damage and turn what you see into clear,
                actionable next steps.
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-sm font-bold bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 transition-all"
                >
                  See How It Works
                  <ArrowRight size={14} />
                </a>

                <Link
                  to="/support/homeinspect-ai"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all"
                >
                  <LifeBuoy size={14} />
                  Support
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* What it does */}
        <section className="py-20 border-b border-border bg-card/30">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">
                  Property insight in your pocket
                </p>

                <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                  See something concerning?
                </h2>

                <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Take or upload a photo of a potential issue around your
                  property. HomeInspect AI analyzes the image to help you
                  better understand what may be wrong and what to do next.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-5">
                    <Camera size={20} />
                  </div>

                  <h3 className="font-semibold text-foreground mb-2">
                    Scan
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Capture or upload an image of the area or condition you
                    want to better understand.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="w-11 h-11 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center mb-5">
                    <Search size={20} />
                  </div>

                  <h3 className="font-semibold text-foreground mb-2">
                    Detect
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    AI-powered image analysis evaluates the image for signs
                    of potential property damage or conditions that may
                    deserve attention.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5">
                    <ClipboardCheck size={20} />
                  </div>

                  <h3 className="font-semibold text-foreground mb-2">
                    Fix
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Review clear information designed to help you understand
                    the potential issue and consider appropriate next steps.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="py-20 border-b border-border"
        >
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">
                  How HomeInspect AI works
                </p>

                <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                  From photo to clearer next steps.
                </h2>
              </div>

              <div className="flex flex-col gap-4">
                {[
                  {
                    number: '01',
                    title: 'Capture the issue',
                    text: 'Take a photo or select an existing image of the property condition you want to examine.'
                  },
                  {
                    number: '02',
                    title: 'AI analyzes the image',
                    text: 'HomeInspect AI evaluates the visual information to identify potential signs of damage or other conditions that may warrant attention.'
                  },
                  {
                    number: '03',
                    title: 'Review the insight',
                    text: 'See clear information about what the image may indicate.'
                  },
                  {
                    number: '04',
                    title: 'Decide what comes next',
                    text: 'Use the information as a starting point for maintenance, further investigation, or professional assessment when appropriate.'
                  }
                ].map((step) => (
                  <div
                    key={step.number}
                    className="rounded-xl border border-border bg-card p-6 flex gap-5"
                  >
                    <div className="font-mono text-sm text-primary font-bold">
                      {step.number}
                    </div>

                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {step.title}
                      </h3>

                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Responsible AI */}
        <section className="py-20 border-b border-border bg-card/30">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="rounded-2xl border border-primary/20 p-8 md:p-10 bg-primary/[0.04]">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                    <ShieldCheck size={24} />
                  </div>

                  <div>
                    <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-2">
                      AI-powered guidance
                    </p>

                    <h2 className="text-2xl font-bold text-foreground mb-3">
                      Helpful insight, with the right expectations.
                    </h2>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      HomeInspect AI is designed to help users better
                      understand visible property conditions. AI-generated
                      results may not identify every issue and should not be
                      treated as a guaranteed diagnosis of a property's
                      condition.
                    </p>

                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2
                        size={15}
                        className="text-emerald-400 mt-0.5 shrink-0"
                      />
                      <span>
                        When a condition may involve safety, structural
                        integrity, electrical systems, plumbing, HVAC, or
                        other specialized work, consider evaluation by an
                        appropriately qualified professional.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SynTract Labs */}
        <section className="py-16 border-b border-border">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-3">
                Built by SynTract Labs
              </p>

              <h2 className="text-2xl font-bold text-foreground mb-3">
                Intelligent software for real-world problems.
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                HomeInspect AI is developed and published by SynTract Labs,
                an AI-native software company building mobile applications,
                AI-powered products, autonomous agents, and intelligent
                operating systems.
              </p>
            </div>
          </div>
        </section>

        {/* Support + Legal */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  to="/support/homeinspect-ai"
                  className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors"
                >
                  <LifeBuoy size={18} className="text-primary mb-3" />
                  <p className="font-semibold text-foreground text-sm">
                    App Support
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Get help with HomeInspect AI.
                  </p>
                </Link>

                <Link
                  to="/privacy"
                  className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors"
                >
                  <ShieldCheck size={18} className="text-primary mb-3" />
                  <p className="font-semibold text-foreground text-sm">
                    Privacy Policy
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Learn how SynTract handles information.
                  </p>
                </Link>

                <Link
                  to="/terms"
                  className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors"
                >
                  <ClipboardCheck size={18} className="text-primary mb-3" />
                  <p className="font-semibold text-foreground text-sm">
                    Terms of Service
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Review the terms governing use.
                  </p>
                </Link>
              </div>

              <div className="text-center mt-8 text-sm text-muted-foreground">
                Questions?{' '}
                <a
                  href="mailto:contact@syntract.net?subject=HomeInspect%20AI"
                  className="text-primary hover:underline"
                >
                  contact@syntract.net
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
