import { Helmet } from '@dr.pogodin/react-helmet';
import { Link } from 'react-router';

export default function HomeInspectAISupportPage() {
  return (
    <>
      <Helmet>
        <title>HomeInspect AI Support | SynTract Labs</title>
        <meta
          name="description"
          content="Support and contact information for HomeInspect AI."
        />
        <link
          rel="canonical"
          href="https://syntract.net/support/homeinspect-ai"
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <section className="container mx-auto px-6 py-20">
          <div className="max-w-2xl mx-auto">
            <p className="font-mono text-xs text-primary/70 uppercase tracking-widest mb-3">
              SynTract Labs Support
            </p>

            <h1 className="text-4xl font-bold text-foreground mb-4">
              HomeInspect AI Support
            </h1>

            <p className="text-muted-foreground leading-relaxed mb-8">
              Need help with HomeInspect AI? Contact SynTract Labs and include
              a brief description of the issue you are experiencing.
            </p>

            <div className="rounded-xl border border-border bg-card p-6 mb-6">
              <h2 className="font-semibold text-foreground mb-2">
                Contact Support
              </h2>
              <a
                href="mailto:contact@syntract.net?subject=HomeInspect%20AI%20Support"
                className="text-primary hover:underline"
              >
                contact@syntract.net
              </a>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>
              <Link
                to="/apps/homeinspect-ai"
                className="text-primary hover:underline"
              >
                HomeInspect AI
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
