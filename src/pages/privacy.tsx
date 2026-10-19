import { Helmet } from '@dr.pogodin/react-helmet';
import { motion } from 'motion/react';

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
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
        <title>Privacy Policy | SynTract Labs</title>
        <meta
          name="description"
          content="Privacy Policy for SynTract Labs websites, mobile applications, AI products, software, and related services."
        />
        <link rel="canonical" href="https://syntract.net/privacy" />
      </Helmet>

      <div
        className="min-h-screen"
        style={{
          background: 'linear-gradient(160deg, #0A0D12 0%, #0f1420 100%)'
        }}
      >
        <div className="container mx-auto px-6 py-16 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <div className="mb-10">
              <p className="font-mono text-[10px] text-primary/60 tracking-widest uppercase mb-3">
                Legal
              </p>
              <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
                Privacy Policy
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Last updated: August 20, 2026
              </p>
            </div>

            <div
              className="rounded-xl border border-white/[0.07] p-8 flex flex-col gap-8"
              style={{ background: '#0d1117' }}
            >
              <p className="text-sm text-muted-foreground leading-relaxed">
                SynTract Labs ("SynTract", "we", "us", or "our") respects
                your privacy. This Privacy Policy describes how we may collect,
                use, disclose, retain, and protect information when you use
                SynTract websites, mobile applications, software products,
                AI-powered services, SynTract CorTex™, the SynTract Build
                Engine™, and related products and services (collectively,
                the "Services").
              </p>

              <p className="text-sm text-muted-foreground leading-relaxed">
                The information processed by SynTract may vary according to
                the particular Service, application, features, and choices
                you make.
              </p>

              <Section title="1. Information We May Collect">
                <p>
                  <span className="text-foreground font-medium">
                    Account and contact information:
                  </span>{' '}
                  We may collect information such as your name, email address,
                  account credentials, company information, and other details
                  you provide when creating an account, contacting SynTract,
                  requesting support, or using our Services.
                </p>

                <p>
                  <span className="text-foreground font-medium">
                    Mobile application information:
                  </span>{' '}
                  SynTract mobile applications may process information
                  necessary to provide their features. The specific
                  information involved depends on the application and the
                  features you choose to use.
                </p>

                <p>
                  <span className="text-foreground font-medium">
                    User content:
                  </span>{' '}
                  We may process information you choose to submit through the
                  Services, including text, prompts, images, files, task
                  descriptions, project information, instructions, feedback,
                  and other content.
                </p>

                <p>
                  <span className="text-foreground font-medium">
                    AI and software-generation information:
                  </span>{' '}
                  AI-powered SynTract features may process prompts, project
                  requirements, technical configurations, generated output,
                  task information, and other information necessary to
                  provide the requested functionality.
                </p>

                <p>
                  <span className="text-foreground font-medium">
                    Usage and diagnostic information:
                  </span>{' '}
                  We may collect application events, feature usage, browser
                  or device information, timestamps, error reports,
                  performance information, and other diagnostic information
                  used to operate, secure, maintain, and improve the
                  Services.
                </p>

                <p>
                  <span className="text-foreground font-medium">
                    Transaction information:
                  </span>{' '}
                  When you purchase products or services, payments may be
                  processed by third-party payment providers. SynTract may
                  receive transaction information necessary for purchases,
                  subscriptions, billing, account administration, and
                  customer support.
                </p>
              </Section>

              <Section title="2. How We Use Information">
                <p>
                  We may use information to provide, operate, maintain,
                  secure, and improve the Services; authenticate accounts;
                  process transactions; provide support; communicate about
                  accounts or Services; diagnose technical issues; detect
                  or prevent misuse; and comply with applicable legal
                  obligations.
                </p>

                <p>
                  We may also use information to improve SynTract products,
                  features, software, artificial intelligence capabilities,
                  and user experiences where permitted by applicable law.
                </p>

                <p>
                  SynTract does not sell your personal information.
                </p>
              </Section>

              <Section title="3. Artificial Intelligence Services">
                <p>
                  Certain SynTract Services use artificial intelligence,
                  machine learning models, cloud infrastructure, or other
                  technologies provided by SynTract or third-party service
                  providers.
                </p>

                <p>
                  Information necessary to perform a requested AI-powered
                  function may be transmitted to service providers involved
                  in providing that functionality. The providers and types
                  of information involved may vary by Service, feature, and
                  configuration.
                </p>
              </Section>

              <Section title="4. Mobile Applications">
                <p>
                  This Privacy Policy applies to mobile applications
                  developed or published by SynTract Labs unless a particular
                  application provides a separate or supplemental privacy
                  notice.
                </p>

                <p>
                  Individual applications may request access to device
                  features or information when required to provide particular
                  functionality. Where required by the device or operating
                  system, permission will be requested before access occurs.
                </p>

                <p>
                  Privacy information displayed for a SynTract application
                  in the Apple App Store or another application marketplace
                  is intended to describe the practices applicable to that
                  specific application. Because SynTract applications may
                  provide different features, privacy practices may differ
                  between applications.
                </p>
              </Section>

              <Section title="5. Account Deletion and Data Requests">
                <p>
                  If a SynTract application or Service permits account
                  creation, users may request deletion of their account and
                  associated personal information, subject to information
                  SynTract may be required or permitted to retain for legal,
                  security, fraud-prevention, transaction, or other
                  legitimate purposes.
                </p>

                <p>
                  Where supported, account deletion may be initiated using
                  the applicable application's account or settings controls.
                  Privacy-related questions or requests may also be submitted
                  to{' '}
                  <a
                    href="mailto:contact@syntract.net"
                    className="text-primary hover:underline"
                  >
                    contact@syntract.net
                  </a>
                  .
                </p>
              </Section>

              <Section title="6. Data Retention">
                <p>
                  We retain information for as long as reasonably necessary
                  to provide and support the Services, maintain appropriate
                  business and transaction records, protect security,
                  resolve disputes, enforce agreements, and comply with
                  applicable legal obligations.
                </p>

                <p>
                  Retention periods may differ based on the type of
                  information, the Service involved, why the information was
                  collected, and applicable legal or operational
                  requirements.
                </p>
              </Section>

              <Section title="7. Information Sharing">
                <p>
                  We may share information with service providers that help
                  us operate the Services, including infrastructure and cloud
                  providers, payment providers, communication services,
                  analytics or diagnostic providers, AI technology
                  providers, and other vendors supporting SynTract
                  functionality.
                </p>

                <p>
                  We may also disclose information when required by law; when
                  reasonably necessary to protect SynTract, our users, or
                  others; or in connection with a merger, acquisition,
                  financing, sale of assets, or similar business
                  transaction.
                </p>
              </Section>

              <Section title="8. Data Security">
                <p>
                  We use administrative, technical, and organizational
                  safeguards designed to reduce the risk of unauthorized
                  access, loss, misuse, alteration, or disclosure of
                  information.
                </p>

                <p>
                  No electronic transmission, storage system, or security
                  measure can guarantee absolute security.
                </p>
              </Section>

              <Section title="9. Cookies and Similar Technologies">
                <p>
                  SynTract websites and web-based Services may use cookies,
                  local storage, and similar technologies for authentication,
                  preferences, security, functionality, performance, and
                  analytics.
                </p>

                <p>
                  Browser or device settings may allow you to control some of
                  these technologies. Disabling certain technologies may
                  affect Service functionality.
                </p>
              </Section>

              <Section title="10. Privacy Choices and Rights">
                <p>
                  Depending on your location, applicable law may provide
                  rights relating to personal information, including rights
                  to request access, correction, deletion, restriction,
                  portability, or information about how personal information
                  is processed.
                </p>

                <p>
                  To submit a privacy request, contact{' '}
                  <a
                    href="mailto:contact@syntract.net"
                    className="text-primary hover:underline"
                  >
                    contact@syntract.net
                  </a>
                  . We may need to verify a requestor's identity before
                  fulfilling certain requests.
                </p>
              </Section>

              <Section title="11. Children's Privacy">
                <p>
                  SynTract does not knowingly collect personal information
                  from children in violation of applicable law. If you
                  believe personal information relating to a child has been
                  provided to SynTract improperly, contact us so we can
                  review the matter and take appropriate action.
                </p>
              </Section>

              <Section title="12. International Users">
                <p>
                  SynTract and service providers supporting the Services may
                  process information in countries other than the country
                  where a user resides. Where required, we take steps
                  designed to provide appropriate safeguards for
                  international transfers of personal information.
                </p>
              </Section>

              <Section title="13. Third-Party Services and Links">
                <p>
                  The Services may integrate with or link to third-party
                  websites, applications, platforms, software, or services.
                  This Privacy Policy does not govern the independent privacy
                  practices of third parties. We encourage users to review
                  applicable third-party privacy policies.
                </p>
              </Section>

              <Section title="14. Changes to This Privacy Policy">
                <p>
                  We may update this Privacy Policy as SynTract products,
                  technology, business practices, or legal obligations
                  change. When this policy is updated, the "Last updated"
                  date above will be revised. Additional notice may be
                  provided where appropriate or required.
                </p>
              </Section>

              <Section title="15. Contact Us">
                <p>
                  Questions about this Privacy Policy, SynTract privacy
                  practices, or personal information requests may be
                  directed to:
                </p>

                <p>
                  <span className="text-foreground font-medium">
                    SynTract Labs
                  </span>
                  <br />
                  Email:{' '}
                  <a
                    href="mailto:contact@syntract.net"
                    className="text-primary hover:underline"
                  >
                    contact@syntract.net
                  </a>
                </p>
              </Section>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
