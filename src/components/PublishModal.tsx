/**
 * PublishModal
 *
 * Deployment target selector shown when the user clicks "Publish".
 * Targets: Web, iOS, Android, Other (API / CLI / Desktop)
 */
import { useState } from 'react';
import { X, Globe, Smartphone, Download, Terminal, Check, ExternalLink } from 'lucide-react';
import { buildDownloadBundle } from '@/lib/extractPreview';

interface Props {
  result: string;
  prompt: string;
  onClose: () => void;
}

type Target = 'web' | 'ios' | 'android' | 'other';

interface TargetDef {
  id: Target;
  icon: React.ReactNode;
  label: string;
  tagline: string;
  badge?: string;
  steps: string[];
  cta: string;
  ctaHref?: string;
  downloadBundle?: boolean;
}

const TARGETS: TargetDef[] = [
  {
    id: 'web',
    icon: <Globe size={20} />,
    label: 'Web App',
    tagline: 'Deploy as a website or web application',
    badge: 'Recommended',
    steps: [
      'Download the generated project bundle below',
      'Open a terminal and run: npm install',
      'Run npm run dev to test locally',
      'Deploy to Vercel, Netlify, or any Node host with npm run build',
      'Point your domain to the deployment',
    ],
    cta: 'Download project bundle',
    downloadBundle: true,
  },
  {
    id: 'ios',
    icon: <Smartphone size={20} />,
    label: 'iOS App',
    tagline: 'Package as a native iOS application',
    steps: [
      'Download the project bundle and open in VS Code',
      'Install Capacitor: npm install @capacitor/core @capacitor/ios',
      'Run: npx cap init, then npx cap add ios',
      'Build the web assets: npm run build',
      'Sync to iOS: npx cap sync ios',
      'Open in Xcode: npx cap open ios',
      'Archive and submit to the App Store via Xcode',
    ],
    cta: 'Download + view Capacitor docs',
    ctaHref: 'https://capacitorjs.com/docs/ios',
    downloadBundle: true,
  },
  {
    id: 'android',
    icon: <Smartphone size={20} />,
    label: 'Android App',
    tagline: 'Package as a native Android application',
    steps: [
      'Download the project bundle and open in VS Code',
      'Install Capacitor: npm install @capacitor/core @capacitor/android',
      'Run: npx cap init, then npx cap add android',
      'Build the web assets: npm run build',
      'Sync to Android: npx cap sync android',
      'Open in Android Studio: npx cap open android',
      'Generate a signed APK/AAB and publish to Google Play',
    ],
    cta: 'Download + view Capacitor docs',
    ctaHref: 'https://capacitorjs.com/docs/android',
    downloadBundle: true,
  },
  {
    id: 'other',
    icon: <Terminal size={20} />,
    label: 'API / CLI / Desktop',
    tagline: 'Backend service, CLI tool, or desktop app',
    steps: [
      'Download the project bundle',
      'For a REST API: run npm install && npm run dev, deploy to Railway, Render, or AWS',
      'For a CLI tool: add a bin entry in package.json and run npm link to test locally',
      'For a desktop app: add Electron (npm install electron) and wrap your entry point',
      'For a Docker container: add a Dockerfile and run docker build -t myapp .',
    ],
    cta: 'Download project bundle',
    downloadBundle: true,
  },
];

export default function PublishModal({ result, prompt, onClose }: Props) {
  const [selected, setSelected] = useState<Target | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const selectedDef = TARGETS.find(t => t.id === selected);

  function handleDownload() {
    const bundle = buildDownloadBundle(result, prompt);
    const blob = new Blob([bundle], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `syntract-${prompt.slice(0, 30).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">Publish your build</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Choose a deployment target to get started</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/[0.06] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Target grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TARGETS.map(t => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id === selected ? null : t.id)}
                className={`relative text-left p-4 rounded-xl border transition-all ${
                  selected === t.id
                    ? 'border-primary/60 bg-primary/[0.08] shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]'
                    : 'border-border hover:border-border/80 hover:bg-white/[0.03]'
                }`}
              >
                {t.badge && (
                  <span className="absolute top-3 right-3 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                    {t.badge}
                  </span>
                )}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                  selected === t.id ? 'bg-primary/20 text-primary' : 'bg-white/[0.06] text-muted-foreground'
                }`}>
                  {t.icon}
                </div>
                <p className="text-sm font-semibold text-foreground mb-0.5">{t.label}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{t.tagline}</p>
                {selected === t.id && (
                  <div className="absolute top-3 left-3 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check size={9} className="text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Expanded steps for selected target */}
          {selectedDef && (
            <div className="rounded-xl border border-border bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Deploying to {selectedDef.label}
                </span>
                <span className="text-[10px] text-muted-foreground/50">— step by step</span>
              </div>
              <ol className="px-5 py-4 flex flex-col gap-3">
                {selectedDef.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="font-mono text-[9px] text-primary/80">{i + 1}</span>
                    </span>
                    <span className="text-xs text-muted-foreground leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>

              {/* CTA row */}
              <div className="px-5 py-4 border-t border-border flex flex-wrap items-center gap-3">
                {selectedDef.downloadBundle && (
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {downloaded
                      ? <><Check size={14} />Downloaded!</>
                      : <><Download size={14} />Download project bundle</>}
                  </button>
                )}
                {selectedDef.ctaHref && (
                  <a
                    href={selectedDef.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-white/[0.04] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink size={13} />
                    {selectedDef.id === 'ios' ? 'Capacitor iOS docs' : 'Capacitor Android docs'}
                  </a>
                )}
              </div>
            </div>
          )}

          {!selected && (
            <p className="text-xs text-muted-foreground/50 text-center">
              Select a target above to see deployment steps
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
