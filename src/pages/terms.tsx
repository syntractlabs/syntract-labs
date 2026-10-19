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

export default function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Terms of Service | SynTract Labs</title>
        <meta
          name="description"
          content="Terms governing the use of SynTract Labs websites, mobile applications, AI products, software, Build Engine, CorTex, and related services."
        />
        <link rel="canonical" href="https://syntract.net/terms" />
      </Helmet>

      <div
        className="min-h-screen"
        style={{
          background:
            'linear-gradient(160deg, #0A0D12 0%, #0f1420 100%)'
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
                Terms of Service
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
                These Terms of Service ("Terms") govern access to and use of
                websites, mobile applications, software products, artificial
                intelligence services, SynTract CorTex™, the SynTract Build
                Engine™, and other products and services provided by SynTract
                Labs ("SynTract", "we", "us", or "our"), collectively referred
                to as the "Services."
              </p>

              <p className="text-sm text-muted-foreground leading-relaxed">
                By accessing or using the Services, you agree to these Terms.
                If you do not agree, do not use the Services.
              </p>

              <Section title="1. Eligibility and Acceptance">
                <p>
                  You must have the legal capacity to enter into these Terms
                  and must use the Services in compliance with applicable law.
                  If you use the Services on behalf of a company or other
                  organization, you represent that you have authority to bind
                  that organization to these Terms.
                </p>
              </Section>

              <Section title="2. SynTract Services">
                <p>
                  SynTract Labs develops and provides software, mobile
                  applications, AI-powered products, custom software,
                  autonomous agents, software-generation technology,
                  enterprise integrations, and autonomous operations
                  technology.
                </p>

                <p>
                  Certain Services may be experimental, in beta, under active
                  development, or subject to modification. Features,
                  availability, technical requirements, and functionality may
                  vary between products and may change over time.
                </p>
              </Section>

              <Section title="3. Mobile Applications">
                <p>
                  These Terms apply to mobile applications developed or
                  published by SynTract Labs unless a particular application
                  includes supplemental terms.
                </p>

                <p>
                  Mobile applications may also be subject to rules, terms, and
                  policies imposed by the application marketplace or platform
                  through which the application is distributed.
                </p>

                <p>
                  SynTract may release updates, modifications, bug fixes,
                  feature changes, or other revisions to mobile applications
                  from time to time.
                </p>
              </Section>

              <Section title="4. Accounts and Account Security">
                <p>
                  Some Services may require creation of an account. You are
                  responsible for maintaining the confidentiality of account
                  credentials and for activity performed through your account.
                </p>

                <p>
                  You agree to provide accurate information and to promptly
                  update information when necessary. If you believe your
                  account has been compromised, contact SynTract promptly.
                </p>
              </Section>

              <Section title="5. Acceptable Use">
                <p>
                  You may not use the Services to violate applicable law,
                  infringe the rights of another person, gain unauthorized
                  access to systems or information, interfere with the
                  operation or security of the Services, distribute malicious
                  software, engage in fraud or deception, or intentionally use
                  the Services to cause unlawful harm.
                </p>

                <p>
                  You may not attempt to circumvent security, access controls,
                  usage restrictions, governance controls, or technical
                  safeguards implemented by SynTract.
                </p>
              </Section>

              <Section title="6. User Content and Instructions">
                <p>
                  Certain Services allow users to submit prompts, files,
                  images, text, project requirements, task descriptions,
                  instructions, code, data, or other information ("User
                  Content").
                </p>

                <p>
                  You retain rights you hold in User Content. You grant
                  SynTract permission to process User Content as reasonably
                  necessary to provide, operate, secure, and support the
                  Services you request.
                </p>

                <p>
                  You are responsible for ensuring that you have the rights
                  and permissions necessary to submit User Content and to
                  instruct SynTract Services to process that content.
                </p>
              </Section>

              <Section title="7. AI-Generated and Automated Output">
                <p>
                  Some Services use artificial intelligence, automated
                  reasoning, autonomous agents, or software-generation
                  technology. These systems can produce incomplete,
                  inaccurate, unexpected, or unsuitable results.
                </p>

                <p>
                  You are responsible for reviewing outputs before relying on
                  them in production, commercial, operational, financial,
                  safety-sensitive, legal, or other consequential contexts.
                </p>

                <p>
                  SynTract does not guarantee that AI-generated or automated
                  output will be accurate, error-free, secure, complete, or
                  suitable for a particular purpose.
                </p>
              </Section>

              <Section title="8. SynTract CorTex™">
                <p>
                  SynTract CorTex™ is designed to coordinate objectives,
                  tasks, policies, agents, software systems, telemetry,
                  operator instructions, and autonomous execution.
                </p>

                <p>
                  CorTex may include governance controls, task prioritization,
                  agent coordination, execution monitoring, human override
                  capabilities, Digital Twin functionality, and other
                  autonomous or semi-autonomous features.
                </p>

                <p>
                  Customers and operators remain responsible for determining
                  whether particular autonomous activities are appropriate
                  for their environment and for configuring appropriate
                  permissions, policies, oversight, and human controls.
                </p>
              </Section>

              <Section title="9. Human Overrides and Operator Actions">
                <p>
                  Certain Services may permit authorized users to prioritize,
                  modify, pause, cancel, approve, or otherwise intervene in
                  automated tasks or workflows.
                </p>

                <p>
                  Users are responsible for operator instructions and override
                  decisions made through their accounts. Governance and
                  logging features do not eliminate the need for appropriate
                  human judgment and organizational controls.
                </p>
              </Section>

              <Section title="10. SynTract Build Engine™">
                <p>
                  The SynTract Build Engine™ may generate software, code,
                  project structures, technical configurations, documentation,
                  and other development artifacts based on user instructions.
                </p>

                <p>
                  Generated software should be reviewed and tested before
                  production deployment. Users are responsible for confirming
                  that generated software meets applicable security,
                  regulatory, technical, licensing, and business
                  requirements.
                </p>
              </Section>

              <Section title="11. Generated Software and Ownership">
                <p>
                  Except for SynTract technology, third-party materials, and
                  other components that are separately licensed, customers
                  may use, modify, deploy, and commercialize software and
                  deliverables generated specifically for them through
                  applicable SynTract Services, subject to these Terms and
                  any applicable service-specific agreement.
                </p>

                <p>
                  SynTract retains all rights in its underlying technology,
                  software, infrastructure, models, systems, methods,
                  trademarks, branding, documentation, Build Engine™,
                  CorTex™, and other SynTract intellectual property.
                </p>
              </Section>

              <Section title="12. Third-Party Software and Services">
                <p>
                  SynTract Services may use or integrate with third-party
                  software, APIs, AI providers, cloud infrastructure, payment
                  processors, libraries, application marketplaces, or other
                  technology.
                </p>

                <p>
                  Third-party products and services may be subject to their
                  own terms, licenses, privacy policies, fees, and
                  restrictions. SynTract is not responsible for independent
                  third-party services.
                </p>
              </Section>

              <Section title="13. Payments, Subscriptions, and Build Compute Units">
                <p>
                  Certain SynTract Services may require payment, subscription
                  fees, usage-based charges, Build Compute Units ("BCUs"), or
                  other paid credits or usage allocations.
                </p>

                <p>
                  Current prices, included usage, renewal terms, and other
                  commercial terms are presented at the time of purchase or
                  in an applicable order or service agreement.
                </p>

                <p>
                  Except where required by law or expressly stated otherwise,
                  payments and consumed usage credits are non-refundable.
                </p>

                <p>
                  SynTract may modify pricing or commercial offerings
                  prospectively. Applicable changes will be communicated as
                  appropriate before they apply to future purchases or
                  renewals.
                </p>
              </Section>

              <Section title="14. Application Marketplace Purchases">
                <p>
                  Purchases or subscriptions processed through an application
                  marketplace may be subject to the marketplace provider's
                  billing, cancellation, refund, and subscription-management
                  policies.
                </p>

                <p>
                  Certain billing or subscription actions may therefore need
                  to be managed through the marketplace associated with your
                  purchase.
                </p>
              </Section>

              <Section title="15. Privacy">
                <p>
                  Our collection and use of personal information is described
                  in the SynTract Privacy Policy available at
                  https://syntract.net/privacy.
                </p>
              </Section>

              <Section title="16. Intellectual Property">
                <p>
                  The Services, including SynTract names, trademarks,
                  interfaces, designs, technology, software, systems,
                  documentation, and other proprietary materials, are owned
                  by SynTract or its licensors and are protected by
                  applicable intellectual property laws.
                </p>

                <p>
                  Except for rights expressly provided under these Terms, no
                  license or ownership interest in SynTract intellectual
                  property is granted.
                </p>
              </Section>

              <Section title="17. Feedback">
                <p>
                  If you voluntarily provide feedback, ideas, suggestions, or
                  recommendations concerning SynTract products or Services,
                  SynTract may use that feedback without restriction or
                  obligation to you, provided that such use does not grant
                  SynTract ownership of your underlying User Content.
                </p>
              </Section>

              <Section title="18. Suspension and Termination">
                <p>
                  SynTract may suspend or terminate access to a Service when
                  reasonably necessary to address violations of these Terms,
                  security concerns, suspected fraud or abuse, legal
                  requirements, nonpayment, or risks to SynTract, users, or
                  third parties.
                </p>

                <p>
                  Users may stop using the Services at any time. Account
                  deletion options may be available within applicable
                  Services.
                </p>
              </Section>

              <Section title="19. Disclaimer of Warranties">
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICES ARE
                  PROVIDED "AS IS" AND "AS AVAILABLE." SYNTRACT DISCLAIMS
                  WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                  PURPOSE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING FROM
                  COURSE OF DEALING OR USAGE OF TRADE.
                </p>

                <p>
                  SYNTRACT DOES NOT WARRANT THAT THE SERVICES WILL BE
                  UNINTERRUPTED, ERROR-FREE, COMPLETELY SECURE, OR THAT
                  AUTOMATED, AI-GENERATED, OR SOFTWARE-GENERATED OUTPUT WILL
                  ALWAYS BE ACCURATE OR SUITABLE FOR YOUR PURPOSES.
                </p>
              </Section>

              <Section title="20. Limitation of Liability">
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, SYNTRACT WILL NOT
                  BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
                  EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS,
                  REVENUE, DATA, BUSINESS OPPORTUNITIES, OR GOODWILL ARISING
                  FROM OR RELATED TO THE SERVICES.
                </p>

                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, SYNTRACT'S TOTAL
                  LIABILITY ARISING FROM OR RELATING TO THE SERVICES OR THESE
                  TERMS WILL NOT EXCEED THE AMOUNT YOU PAID TO SYNTRACT FOR
                  THE SERVICE GIVING RISE TO THE CLAIM DURING THE THREE
                  MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE
                  CLAIM.
                </p>

                <p>
                  Some jurisdictions do not allow certain exclusions or
                  limitations of liability, so portions of this section may
                  not apply to you.
                </p>
              </Section>

              <Section title="21. Changes to the Services">
                <p>
                  SynTract may modify, add, remove, discontinue, or replace
                  features or Services as our technology and products evolve.
                  Where appropriate, we may provide notice of material
                  changes.
                </p>
              </Section>

              <Section title="22. Changes to These Terms">
                <p>
                  We may update these Terms from time to time. When we do, we
                  will update the "Last updated" date above. Additional notice
                  may be provided when appropriate or required by law.
                </p>

                <p>
                  Continued use of the Services after revised Terms become
                  effective constitutes acceptance of the revised Terms,
                  except where additional consent is required by law.
                </p>
              </Section>

              <Section title="23. Governing Law">
                <p>
                  These Terms are governed by applicable law, without regard
                  to conflict-of-law principles. Any mandatory rights or
                  remedies available under applicable consumer protection
                  laws remain unaffected.
                </p>
              </Section>

              <Section title="24. Contact">
                <p>
                  Questions concerning these Terms may be directed to:
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
