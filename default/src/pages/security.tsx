import { Helmet } from '@dr.pogodin/react-helmet';
import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { ShieldCheck, Lock, Server, Users, Activity, Cpu, Code2, FileCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-0.5 h-6 rounded-full bg-primary shrink-0" />
      <h2 className="text-xl font-bold text-foreground tracking-tight">{children}</h2>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mb-2">{children}</h3>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5 mt-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
          <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 flex flex-col gap-4">
      <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-primary" />
      </div>
      {children}
    </div>
  );
}

const site = 'https://syntract.net';
const url = `${site}/security`;
const title = 'Security — SynTract Labs';
const description = 'SynTract Labs security practices: SOC 2 Type II certification, data encryption, access controls, AI build integrity, compliance, and incident response.';

export default function SecurityPage() {
  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': `${url}#webpage`,
          name: title,
          url,
          isPartOf: { '@id': `${site}/#website` },
          about: { '@id': `${site}/#organization` },
        })}</script>
      </Helmet>

      <main className="min-h-screen bg-background">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="border-b border-border">
          <div className="container mx-auto px-6 py-20 max-w-4xl">
            <FadeUp>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.05] mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="font-mono text-[10px] text-emerald-400/80 tracking-wide uppercase">SOC 2 Type II Certified</span>
              </div>
            </FadeUp>
            <FadeUp delay={0.05}>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-5">
                Security at SynTract Labs
              </h1>
            </FadeUp>
            <FadeUp delay={0.1}>
              <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mb-3">
                SynTract Labs is built for teams and enterprises that require strong guarantees around data protection, platform reliability, and secure AI‑driven software creation.
              </p>
              <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
                We combine modern cloud security practices with strict operational controls to ensure your projects, builds, and source code remain protected at every stage.
              </p>
            </FadeUp>
          </div>
        </section>

        <div className="container mx-auto px-6 py-16 max-w-4xl flex flex-col gap-16">

          {/* ── SOC 2 ──────────────────────────────────────────────────────── */}
          <FadeUp>
            <Card icon={ShieldCheck}>
              <div>
                <SubHeading>SOC 2 Type II Certified</SubHeading>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  SynTract Labs maintains SOC 2 Type II compliance, validating our commitment to security, availability, confidentiality, and operational excellence.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                  Our controls are independently audited and continuously monitored.
                </p>
              </div>
            </Card>
          </FadeUp>

          {/* ── Data Protection ────────────────────────────────────────────── */}
          <FadeUp>
            <SectionHeading>Data Protection</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card icon={Lock}>
                <div>
                  <SubHeading>Encryption</SubHeading>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    All data is encrypted in transit (TLS 1.2+) and at rest (AES‑256). This includes:
                  </p>
                  <BulletList items={[
                    'Project data',
                    'Build artifacts',
                    'Generated source code',
                    'Team information',
                    'Authentication tokens',
                  ]} />
                </div>
              </Card>
              <Card icon={Server}>
                <div>
                  <SubHeading>Secure Storage</SubHeading>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Project files and build outputs are stored in hardened, access‑controlled environments with strict separation between organizations.
                  </p>
                </div>
              </Card>
            </div>
          </FadeUp>

          {/* ── Access Control ─────────────────────────────────────────────── */}
          <FadeUp>
            <SectionHeading>Access Control</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card icon={Users}>
                <div>
                  <SubHeading>Role‑Based Access</SubHeading>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Enterprise and Team plans include role‑based access controls:
                  </p>
                  <BulletList items={['Admin', 'Developer', 'Viewer']} />
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                    Each role has clearly defined permissions for builds, projects, and deployment assets.
                  </p>
                </div>
              </Card>
              <Card icon={Activity}>
                <div>
                  <SubHeading>Multi‑User Organizations</SubHeading>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Organizations can add or remove users at any time. All access changes take effect immediately.
                  </p>
                </div>
              </Card>
            </div>
          </FadeUp>

          {/* ── Operational Security ───────────────────────────────────────── */}
          <FadeUp>
            <SectionHeading>Operational Security</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card icon={FileCheck}>
                <div>
                  <SubHeading>Audit Logging</SubHeading>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    All build actions, project changes, and administrative operations are logged for security and compliance visibility.
                  </p>
                </div>
              </Card>
              <Card icon={Server}>
                <div>
                  <SubHeading>Secure Infrastructure</SubHeading>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    SynTract Labs runs on hardened cloud environments with:
                  </p>
                  <BulletList items={[
                    'Network segmentation',
                    'Automated patching',
                    'Intrusion detection',
                    'Continuous monitoring',
                  ]} />
                </div>
              </Card>
            </div>
          </FadeUp>

          {/* ── AI Safety & Build Integrity ────────────────────────────────── */}
          <FadeUp>
            <SectionHeading>AI Safety & Build Integrity</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card icon={Cpu}>
                <div>
                  <SubHeading>Deterministic Build Engine</SubHeading>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The SynTract Build Engine is designed to produce stable, predictable output without unexpected external calls or unverified dependencies.
                  </p>
                </div>
              </Card>
              <Card icon={Code2}>
                <div>
                  <SubHeading>Source Code Ownership</SubHeading>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You own 100% of the code generated by SynTract Labs. No code is shared across organizations.
                  </p>
                </div>
              </Card>
              <Card icon={ShieldCheck}>
                <div>
                  <SubHeading>No Training on Customer Builds</SubHeading>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Customer projects and generated code are never used to train or fine‑tune AI systems.
                  </p>
                </div>
              </Card>
            </div>
          </FadeUp>

          {/* ── Compliance ─────────────────────────────────────────────────── */}
          <FadeUp>
            <SectionHeading>Compliance</SectionHeading>
            <div className="rounded-lg border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                SynTract Labs adheres to industry‑standard security and privacy frameworks:
              </p>
              <BulletList items={[
                'SOC 2 Type II',
                'GDPR‑aligned data handling',
                'CCPA‑aligned privacy controls',
                'Secure software development lifecycle (SSDLC)',
              ]} />
            </div>
          </FadeUp>

          {/* ── Enterprise Security Features ───────────────────────────────── */}
          <FadeUp>
            <SectionHeading>Enterprise Security Features</SectionHeading>
            <div className="rounded-lg border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Enterprise plans include enhanced protections:
              </p>
              <BulletList items={[
                'Dedicated priority compute',
                'Private build queues',
                'Architecture review',
                'Custom SLAs',
                'Dedicated account manager',
                'Optional private cloud deployment',
                'Optional on‑premise build pipelines',
              ]} />
            </div>
          </FadeUp>

          {/* ── Incident Response ──────────────────────────────────────────── */}
          <FadeUp>
            <Card icon={AlertTriangle}>
              <div>
                <SubHeading>Incident Response</SubHeading>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                  SynTract Labs maintains a formal incident response program with:
                </p>
                <BulletList items={[
                  '24/7 monitoring',
                  'Rapid escalation paths',
                  'Customer notification procedures',
                  'Post‑incident analysis and remediation',
                ]} />
              </div>
            </Card>
          </FadeUp>

          {/* ── Responsible Disclosure ─────────────────────────────────────── */}
          <FadeUp>
            <SectionHeading>Responsible Disclosure</SectionHeading>
            <div className="rounded-lg border border-border bg-card p-6 flex flex-col gap-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                We encourage responsible security research. If you believe you've discovered a vulnerability, contact our security team at:
              </p>
              <a
                href="mailto:security@syntract.net"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-muted/30 text-sm text-foreground hover:bg-muted/60 transition-colors font-mono w-fit"
              >
                security@syntract.net
              </a>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Questions? Our team is available to help with security reviews, compliance questionnaires, and enterprise procurement requirements.
              </p>
            </div>
          </FadeUp>

        </div>
      </main>
    </>
  );
}
