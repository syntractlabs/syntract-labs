import { Helmet } from '@dr.pogodin/react-helmet';
import { motion } from 'motion/react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-0.5 h-5 rounded-full bg-primary shrink-0" />
        <h2 className="text-base font-bold text-foreground">{title}</h2>
      </div>
      <div className="pl-3.5 flex flex-col gap-2 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — SynTract</title>
        <meta name="description" content="SynTract Privacy Policy. How we collect, use, and protect your data." />
        <link rel="canonical" href="https://syntract.io/privacy" />
      </Helmet>

      <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0A0D12 0%, #0f1420 100%)' }}>
        <div className="container mx-auto px-6 py-16 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: 'easeOut' }}>
            <div className="mb-10">
              <p className="font-mono text-[10px] text-primary/60 tracking-widest uppercase mb-3">Legal</p>
              <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Privacy Policy</h1>
              <p className="text-xs text-muted-foreground font-mono">Last updated: May 23, 2026</p>
            </div>

            <div className="rounded-xl border border-white/[0.07] p-8 flex flex-col gap-8" style={{ background: '#0d1117' }}>
              <p className="text-sm text-muted-foreground leading-relaxed">
                SynTract, Inc. ("SynTract", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use our API, website, and related services (the "Service").
              </p>

              <Section title="1. Information We Collect">
                <p><span className="text-foreground font-medium">Account information:</span> When you register, we collect your name, email address, company name, and password (hashed).</p>
                <p><span className="text-foreground font-medium">API usage data:</span> We log API requests including timestamps, endpoints called, document types, response latencies, and error codes. We do not log document content in our access logs.</p>
                <p><span className="text-foreground font-medium">Documents submitted:</span> Documents you submit for extraction are processed transiently. By default, documents are deleted within 24 hours. Extracted structured data is retained for 90 days to support retrieval via the API.</p>
                <p><span className="text-foreground font-medium">Payment information:</span> Billing is handled by our payment processor. We store only the last 4 digits of your card, expiry, and billing address. We never store full card numbers.</p>
              </Section>

              <Section title="2. How We Use Your Information">
                <p>We use the information we collect to: provide and improve the Service; authenticate your API requests; send transactional emails (account creation, billing, security alerts); respond to support requests; detect and prevent abuse; and comply with legal obligations.</p>
                <p>We do not sell your personal information to third parties. We do not use your documents to train our models without your explicit written consent.</p>
              </Section>

              <Section title="3. Data Retention">
                <p>Account data is retained for the duration of your account and deleted within 30 days of account closure. API logs are retained for 12 months. Extracted data is retained for 90 days. Documents are deleted within 24 hours of processing (or immediately in zero-retention mode).</p>
              </Section>

              <Section title="4. Data Security">
                <p>We implement industry-standard security measures including AES-256 encryption at rest, TLS 1.3 in transit, network isolation, and access controls. We are SOC 2 Type II certified. Despite these measures, no system is perfectly secure — please use strong passwords and protect your API keys.</p>
              </Section>

              <Section title="5. Data Residency">
                <p>By default, data is processed in the United States. Enterprise customers may elect EU or APAC data residency. If you are located in the EU, we process your data under Standard Contractual Clauses (SCCs) as a lawful transfer mechanism.</p>
              </Section>

              <Section title="6. GDPR Rights">
                <p>If you are in the European Economic Area, you have the right to: access your personal data; correct inaccurate data; request deletion; object to processing; and data portability. To exercise these rights, contact us at <a href="mailto:privacy@syntract.io" className="text-primary hover:underline">privacy@syntract.io</a>. We will respond within 30 days.</p>
              </Section>

              <Section title="7. Cookies">
                <p>We use essential cookies for authentication and session management. We use analytics cookies (with your consent) to understand how the Service is used. You can disable non-essential cookies in your browser settings or via our cookie banner.</p>
              </Section>

              <Section title="8. Third-Party Services">
                <p>We use a limited number of sub-processors to operate the Service, including cloud infrastructure providers, a payment processor, and an email delivery service. A full list of sub-processors is available to enterprise customers upon request.</p>
              </Section>

              <Section title="9. Children's Privacy">
                <p>The Service is not directed to individuals under 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, contact us immediately.</p>
              </Section>

              <Section title="10. Changes to This Policy">
                <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or a dashboard notice at least 14 days before they take effect.</p>
              </Section>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Privacy questions or requests? Contact our Data Protection Officer at{' '}
                  <a href="mailto:privacy@syntract.io" className="text-primary hover:underline">privacy@syntract.io</a>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
