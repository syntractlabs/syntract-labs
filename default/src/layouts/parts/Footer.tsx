import { Link } from "react-router";
const COLUMNS = [{
  heading: 'Product',
  links: [{
    label: 'Build Engine',
    href: '/product'
  }, {
    label: 'Pricing',
    href: '/pricing'
  }, {
    label: 'Enterprise',
    href: '/enterprise'
  }, {
    label: 'Status',
    href: '/status'
  }]
}, {
  heading: 'Developers',
  links: [{
    label: 'Documentation',
    href: '/docs'
  }, {
    label: 'Build Compute Units (BCUs)',
    href: '/docs#bcus'
  }, {
    label: 'Architecture Layer',
    href: '/docs#architecture'
  }, {
    label: 'Design System',
    href: '/docs#design-system'
  }, {
    label: 'Deployment Guides',
    href: '/docs#deployment'
  }]
}, {
  heading: 'Company',
  links: [{
    label: 'Contact',
    href: '/contact'
  }, {
    label: 'Security',
    href: '/security'
  }, {
    label: 'Privacy Policy',
    href: '/privacy'
  }, {
    label: 'Terms of Service',
    href: '/terms'
  }]
}];
export default function Footer() {
  const year = new Date().getFullYear();
  return <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-6 pt-14 pb-8">

        {/* main grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">

          {/* brand col — spans 2 */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <Link to="/" className="inline-flex items-center">
              <span className="text-base font-semibold text-foreground tracking-tight">SynTract Labs</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Autonomous software creation for individuals, teams, and enterprises.
            </p>

            {/* SOC 2 badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/[0.05] w-fit mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="font-mono text-[10px] text-emerald-400/80 tracking-wide">SOC 2 Type II Certified</span>
            </div>
          </div>

          {/* link cols */}
          {COLUMNS.map(col => <div key={col.heading}>
              <h4 className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-widest mb-4">{col.heading}</h4>
              <ul className="flex flex-col gap-2.5">
                {col.links.map(link => <li key={link.label}>
                    <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>)}
              </ul>
            </div>)}
        </div>

        {/* bottom bar */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/50 font-mono">
            © {year} SynTract Labs, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-1 flex-wrap justify-center">
            {[{
            label: 'Privacy',
            href: '/privacy'
          }, {
            label: 'Terms',
            href: '/terms'
          }, {
            label: 'Security',
            href: '/security'
          }].map((link, i, arr) => <span key={link.label} className="flex items-center gap-1">
                <Link to={link.href} className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                  {link.label}
                </Link>
                {i < arr.length - 1 && <span className="text-muted-foreground/20 text-xs">·</span>}
              </span>)}
          </div>
        </div>

      </div>
    </footer>;
}
