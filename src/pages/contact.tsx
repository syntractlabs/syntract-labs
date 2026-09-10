import { contact } from 'virtual:content';
import { Helmet } from '@dr.pogodin/react-helmet';
import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { Link } from "react-router";
import { ArrowRight, Mail, MessageSquare, Zap, Building2 } from 'lucide-react';
type FormStatus = 'idle' | 'sending' | 'success' | 'error';
export default function ContactPage() {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Honeypot check
    if (formData.get('_gotcha')) return;
    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const reason = String(formData.get('reason') ?? '').trim();
    const message = String(formData.get('message') ?? '').trim();
    setStatus('sending');
    setErrorMsg('');
    try {
      // Field mapping: only the message textarea goes in messages_attributes[0].body.
      // All other fields (dropdowns, radios, checkboxes) must be added to conversation.data as { "Label": value } pairs.
      const res = await fetch('/api/contact/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversation: {
            messages_attributes: [{
              body: message || 'New contact form submission'
            }],
            data: {
              __gd_contact_form_title: 'Contact SynTract Labs',
              'Reason for contact': reason
            }
          },
          user: {
            email,
            name
          }
        })
      });
      const json = await res.json();
      if (json.success) {
        setStatus('success');
        form.reset();
      } else {
        throw new Error(json.error || 'Something went wrong.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }
  return <>
      <Helmet>
        <title>Contact — SynTract Labs</title>
        <meta name="description" content="Get in touch with the SynTract Labs team. Questions about your build, pricing, or enterprise projects — we respond within a few hours." />
        <link rel="canonical" href="https://syntract.net/contact" />
        <meta property="og:title" content="Contact — SynTract Labs" />
        <meta property="og:description" content="Get in touch with the SynTract Labs team. We respond within a few hours." />
        <meta property="og:url" content="https://syntract.net/contact" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SynTract Labs" />
        <meta property="og:image" content="https://syntract.net/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact — SynTract Labs" />
        <meta name="twitter:description" content="Get in touch with the SynTract Labs team. We respond within a few hours." />
        <meta name="twitter:image" content="https://syntract.net/og-image.png" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          '@id': 'https://syntract.net/contact#webpage',
          name: 'Contact SynTract Labs',
          url: 'https://syntract.net/contact',
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center top, hsl(var(--primary) / 0.10) 0%, transparent 70%)'
      }} />
        <div className="container mx-auto px-6 py-20 relative z-10">
          <motion.div initial={{
          opacity: 0,
          y: 16
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.35,
          ease: 'easeOut' as const
        }} className="max-w-2xl">
            <p className="font-mono text-xs text-primary/70 tracking-widest uppercase mb-4">Contact</p>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-foreground mb-4">
              Let's talk about <span className="text-primary">what you're building.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Questions about a build, pricing, or a large-scale project? Send us a message and we'll get back to you within a few hours.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">

            {/* Left — info cards */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              <motion.div initial={{
              opacity: 0,
              y: 16
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.35,
              delay: 0.05,
              ease: 'easeOut' as const
            }}>
                <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20">
                    <Mail size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">Email us directly</h3>
                    <p className="text-sm text-muted-foreground mb-3">For general inquiries and support questions.</p>
                    <a href="mailto:contact@syntract.net" className="font-mono text-sm text-primary hover:underline">contact@syntract.net</a>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{
              opacity: 0,
              y: 16
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.35,
              delay: 0.1,
              ease: 'easeOut' as const
            }}>
                <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20">
                    <Building2 size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">Enterprise projects</h3>
                    <p className="text-sm text-muted-foreground mb-3">Custom scope, dedicated infrastructure, and white-glove delivery.</p>
                    <Link to="/enterprise" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                      Talk to Enterprise Sales <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{
              opacity: 0,
              y: 16
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.35,
              delay: 0.15,
              ease: 'easeOut' as const
            }}>
                <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20">
                    <Zap size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">Just want to try it?</h3>
                    <p className="text-sm text-muted-foreground mb-3">Your first build is free — no credit card, no commitment.</p>
                    <Link to="/signup" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                      Start free build <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{
              opacity: 0,
              y: 16
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              duration: 0.35,
              delay: 0.2,
              ease: 'easeOut' as const
            }}>
                <div className="rounded-xl border border-border bg-muted/20 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="font-mono text-xs text-muted-foreground">Typical response time</span>
                  </div>
                  <p className="font-mono text-2xl font-bold text-foreground">{'< 4 hours'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Mon–Fri, 9am–6pm ET</p>
                </div>
              </motion.div>
            </div>

            {/* Right — form */}
            <motion.div className="lg:col-span-3" initial={{
            opacity: 0,
            y: 16
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.35,
            delay: 0.08,
            ease: 'easeOut' as const
          }}>
              <div className="rounded-xl border border-border bg-card p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20">
                    <MessageSquare size={16} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground text-base">Send a message</h2>
                    <p className="text-xs text-muted-foreground">We'll get back to you within a few hours</p>
                  </div>
                </div>

                {status === 'success' ? <motion.div initial={{
                opacity: 0,
                scale: 0.97
              }} animate={{
                opacity: 1,
                scale: 1
              }} transition={{
                duration: 0.25
              }} className="rounded-lg border border-primary/30 bg-primary/5 p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                      <Zap size={20} className="text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground mb-2">Message sent!</h3>
                    <p className="text-sm text-muted-foreground">We'll be in touch within a few hours. In the meantime, feel free to explore the product or start a free build.</p>
                    <div className="flex gap-3 justify-center mt-6">
                      <Link to="/product" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                        Explore the product <ArrowRight size={13} />
                      </Link>
                    </div>
                  </motion.div> : <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Honeypot */}
                    <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" style={{
                  position: 'absolute',
                  left: '-9999px'
                }} aria-hidden="true" />

                    {/* Name + Email row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="contact-name" className="text-xs font-medium text-foreground">
                          Name <span className="text-destructive">*</span>
                        </label>
                        <input id="contact-name" name="name" type="text" required placeholder="Your name" className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="contact-email" className="text-xs font-medium text-foreground">
                          Email <span className="text-destructive">*</span>
                        </label>
                        <input id="contact-email" name="email" type="email" required placeholder="you@company.com" className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors" />
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="contact-reason" className="text-xs font-medium text-foreground">
                        Reason for contact
                      </label>
                      <select id="contact-reason" name="reason" className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors">
                        <option value="">Select a topic...</option>
                        {contact.contactReasons.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>

                    {/* Message */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="contact-message" className="text-xs font-medium text-foreground">
                        Message <span className="text-destructive">*</span>
                      </label>
                      <textarea id="contact-message" name="message" required rows={5} placeholder="Tell us about your project or question..." className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-colors resize-none" />
                    </div>

                    {status === 'error' && <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                        {errorMsg}
                      </p>}

                    <button type="submit" disabled={status === 'sending'} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                      {status === 'sending' ? <>
                          <motion.span animate={{
                      rotate: 360
                    }} transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear' as const
                    }} className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                          Sending...
                        </> : <>Send message <ArrowRight size={15} /></>}
                    </button>
                  </form>}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>;
}
