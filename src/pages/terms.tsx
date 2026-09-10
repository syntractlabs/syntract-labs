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

export default function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Terms of Service — SynTract</title>
        <meta name="description" content="SynTract Terms of Service. Read the terms governing your use of the SynTract document intelligence API." />
        <link rel="canonical" href="https://syntract.io/terms" />
      </Helmet>

      <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0A0D12 0%, #0f1420 100%)' }}>
        <div className="container mx-auto px-6 py-16 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: 'easeOut' }}>
            <div className="mb-10">
              <p className="font-mono text-[10px] text-primary/60 tracking-widest uppercase mb-3">Legal</p>
              <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Terms of Service</h1>
              <p className="text-xs text-muted-foreground font-mono">Last updated: May 23, 2026</p>
            </div>

            <div className="rounded-xl border border-white/[0.07] p-8 flex flex-col gap-8" style={{ background: '#0d1117' }}>
              <p className="text-sm text-muted-foreground leading-relaxed">
                These Terms of Service ("Terms") govern your access to and use of the SynTract API, website, and related services (collectively, the "Service") operated by SynTract, Inc. ("SynTract", "we", "us", or "our"). By accessing or using the Service, you agree to be bound by these Terms.
              </p>

              <Section title="1. Acceptance of Terms">
                <p>By creating an account or using the Service, you confirm that you are at least 18 years old, have the legal authority to enter into these Terms, and agree to comply with them. If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization.</p>
              </Section>

              <Section title="2. API Access and API Keys">
                <p>Upon registration, we grant you a limited, non-exclusive, non-transferable license to access and use the API in accordance with these Terms. Your API key is confidential — you are responsible for all activity that occurs under your key. Do not share your key publicly or embed it in client-side code.</p>
                <p>We reserve the right to revoke or suspend API keys at any time for violations of these Terms, suspected abuse, or security concerns.</p>
              </Section>

              <Section title="3. Acceptable Use">
                <p>You agree not to use the Service to: (a) process documents you do not have the right to process; (b) violate any applicable law or regulation; (c) attempt to reverse-engineer, probe, or circumvent our systems; (d) resell or sublicense API access without written permission; or (e) use the Service in any manner that could damage, disable, or impair our infrastructure.</p>
              </Section>

              <Section title="4. Data and Privacy">
                <p>Documents submitted to the API are processed to perform the extraction you request. By default, documents are deleted from our systems within 24 hours of processing. Enterprise customers may configure zero-retention mode for immediate deletion post-extraction.</p>
                <p>We do not use your documents to train our models without your explicit written consent. Please review our Privacy Policy for full details on data handling.</p>
              </Section>

              <Section title="5. Billing and Payment">
                <p>Paid plans are billed monthly or annually in advance. All fees are non-refundable except as required by law or as explicitly stated in your plan. If your payment fails, we will notify you and may suspend access after a grace period of 7 days.</p>
                <p>We reserve the right to change pricing with 30 days' written notice. Continued use after the notice period constitutes acceptance of the new pricing.</p>
              </Section>

              <Section title="6. Rate Limits and Fair Use">
                <p>Each plan includes defined rate limits. Exceeding these limits may result in throttled requests (HTTP 429). Sustained abuse of rate limits or attempts to circumvent them may result in account suspension.</p>
              </Section>

              <Section title="7. Intellectual Property">
                <p>SynTract retains all rights to the Service, including our models, infrastructure, and software. You retain all rights to your documents and the extracted data produced from them. Nothing in these Terms transfers ownership of either party's intellectual property.</p>
              </Section>

              <Section title="8. Disclaimer of Warranties">
                <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE, UNINTERRUPTED, OR THAT EXTRACTION RESULTS WILL BE ACCURATE FOR ANY PARTICULAR PURPOSE. USE OF EXTRACTED DATA IN AUTOMATED WORKFLOWS IS AT YOUR OWN RISK.</p>
              </Section>

              <Section title="9. Limitation of Liability">
                <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, SYNTRACT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THESE TERMS SHALL NOT EXCEED THE FEES PAID BY YOU IN THE 3 MONTHS PRECEDING THE CLAIM.</p>
              </Section>

              <Section title="10. Termination">
                <p>Either party may terminate these Terms at any time. You may close your account from the dashboard. We may suspend or terminate your access immediately for material violations of these Terms. Upon termination, your API keys will be revoked and your data will be deleted within 30 days.</p>
              </Section>

              <Section title="11. Governing Law">
                <p>These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles. Any disputes shall be resolved in the state or federal courts located in Delaware.</p>
              </Section>

              <Section title="12. Changes to Terms">
                <p>We may update these Terms from time to time. We will notify you of material changes via email or a notice in the dashboard. Continued use of the Service after the effective date of changes constitutes acceptance.</p>
              </Section>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Questions about these Terms? Contact us at{' '}
                  <a href="mailto:legal@syntract.io" className="text-primary hover:underline">legal@syntract.io</a>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
