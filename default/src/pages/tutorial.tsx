import { Helmet } from '@dr.pogodin/react-helmet';
import { Link } from "react-router";
import { motion } from 'motion/react';
import { useState } from 'react';
import { KeyRound, UploadCloud, Braces, BarChart3, CheckCircle2, Copy, Check, ChevronRight, Zap, ArrowRight, Users, Code2, Play } from 'lucide-react';

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({
  text
}: {
  text: string;
}) {
  const [copied, setCopied] = useState(false);
  return <button onClick={() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
      {copied ? <><Check size={10} className="text-emerald-400" />Copied</> : <><Copy size={10} />Copy</>}
    </button>;
}

// ─── Code block ───────────────────────────────────────────────────────────────
function CodeBlock({
  code,
  label
}: {
  code: string;
  label?: string;
}) {
  return <div className="rounded-xl border border-white/[0.08] overflow-hidden text-xs font-mono" style={{
    background: '#0d1117'
  }}>
      {label && <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]" style={{
      background: '#161b22'
    }}>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</span>
          <CopyBtn text={code} />
        </div>}
      <pre className="p-4 overflow-x-auto leading-relaxed text-slate-300 whitespace-pre">{code}</pre>
    </div>;
}
function CodeTabs({
  tabs
}: {
  tabs: {
    label: string;
    code: string;
  }[];
}) {
  const [active, setActive] = useState(0);
  return <div className="rounded-xl border border-white/[0.08] overflow-hidden" style={{
    background: '#0d1117'
  }}>
      <div className="flex items-center border-b border-white/[0.06]" style={{
      background: '#161b22'
    }}>
        {tabs.map((t, i) => <button key={t.label} onClick={() => setActive(i)} className={`px-4 py-2.5 text-[11px] font-mono transition-all ${i === active ? 'text-primary border-b border-primary' : 'text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>)}
        <div className="ml-auto pr-3"><CopyBtn text={tabs[active].code} /></div>
      </div>
      <pre className="p-4 overflow-x-auto leading-relaxed text-slate-300 text-xs font-mono whitespace-pre">{tabs[active].code}</pre>
    </div>;
}

// ─── Step ─────────────────────────────────────────────────────────────────────
function Step({
  number,
  icon: Icon,
  title,
  children
}: {
  number: number;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return <motion.div initial={{
    opacity: 0,
    y: 16
  }} whileInView={{
    opacity: 1,
    y: 0
  }} viewport={{
    once: true
  }} transition={{
    duration: 0.35,
    delay: number * 0.04,
    ease: 'easeOut' as const
  }} className="flex gap-5">
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
        background: 'rgba(79,110,247,0.15)',
        border: '1px solid rgba(79,110,247,0.3)'
      }}>
          <Icon size={16} className="text-primary" />
        </div>
        <div className="w-px flex-1 bg-border min-h-[24px]" />
      </div>
      <div className="flex flex-col gap-3 pb-8 flex-1">
        <div className="flex items-center gap-2 pt-2">
          <span className="text-[10px] font-mono text-primary/50">Step {number}</span>
          <h3 className="font-bold text-foreground text-base">{title}</h3>
        </div>
        {children}
      </div>
    </motion.div>;
}

// ─── Code examples ────────────────────────────────────────────────────────────
const CURL = `curl -X POST https://syntract.io/v1/extract \\
  -H "Authorization: Bearer dk_live_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "document": "Invoice #1042\\nFrom: Acme Corp\\nTo: Jane Smith\\nDate: May 23, 2026\\nAmount: $1,250.00",
    "filename": "invoice-1042.txt"
  }'`;
const JS = `const response = await fetch('https://syntract.io/v1/extract', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer dk_live_YOUR_KEY_HERE',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    document: invoiceText,
    filename: 'invoice-1042.txt',
  }),
});

const { extracted } = await response.json();
console.log(extracted.amounts); // ["$1,250.00"]`;
const PYTHON = `import requests

response = requests.post(
    'https://syntract.io/v1/extract',
    headers={'Authorization': 'Bearer dk_live_YOUR_KEY_HERE'},
    json={'document': invoice_text, 'filename': 'invoice-1042.txt'}
)

data = response.json()
print(data['extracted']['amounts'])  # ['$1,250.00']`;
const SAMPLE_RESPONSE = `{
  "id": "a3f8c2d1-...",
  "extracted": {
    "title": "Invoice #1042",
    "documentNumber": "1042",
    "from": "Acme Corp",
    "to": "Jane Smith",
    "dates": ["May 23, 2026"],
    "amounts": ["$1,250.00"]
  },
  "metadata": {
    "durationMs": 14,
    "model": "syntract-extract-v1"
  }
}`;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TutorialPage() {
  const [track, setTrack] = useState<'nocode' | 'developer'>('nocode');
  return <>
      <Helmet>
        <title>Getting Started — SynTract Labs</title>
        <meta name="description" content="Step-by-step guide to extracting structured data from documents with SynTract Labs. No coding required to get started." />
        <link rel="canonical" href="https://syntract.io/tutorial" />
      </Helmet>

      <div className="min-h-screen" style={{
      background: '#0A0D12'
    }}>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="border-b border-border" style={{
        background: 'linear-gradient(180deg, rgba(79,110,247,0.06) 0%, transparent 100%)'
      }}>
          <div className="container mx-auto px-6 py-14 max-w-3xl">
            <motion.div initial={{
            opacity: 0,
            y: 14
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.35,
            ease: 'easeOut' as const
          }} className="flex flex-col gap-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border self-start" style={{
              background: 'rgba(79,110,247,0.1)',
              borderColor: 'rgba(79,110,247,0.3)',
              color: '#4F6EF7'
            }}>
                <Zap size={10} />Getting Started · ~5 min
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                From zero to your first extraction
              </h1>
              <p className="text-base text-muted-foreground max-w-xl leading-relaxed">
                Choose your path below. You don't need to write any code to start — the dashboard has everything built in.
              </p>

              {/* Track selector */}
              <div className="flex gap-3 mt-2">
                <button onClick={() => setTrack('nocode')} className={`flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold transition-all ${track === 'nocode' ? 'border-primary/40 text-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'}`} style={track === 'nocode' ? {
                background: 'rgba(79,110,247,0.1)'
              } : {
                background: 'transparent'
              }}>
                  <Users size={15} className={track === 'nocode' ? 'text-primary' : 'text-muted-foreground'} />
                  No-code path
                  {track === 'nocode' && <span className="ml-1 text-[10px] font-mono text-primary/60">← you're here</span>}
                </button>
                <button onClick={() => setTrack('developer')} className={`flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold transition-all ${track === 'developer' ? 'border-primary/40 text-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'}`} style={track === 'developer' ? {
                background: 'rgba(79,110,247,0.1)'
              } : {
                background: 'transparent'
              }}>
                  <Code2 size={15} className={track === 'developer' ? 'text-primary' : 'text-muted-foreground'} />
                  Developer path
                  {track === 'developer' && <span className="ml-1 text-[10px] font-mono text-primary/60">← you're here</span>}
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-12 max-w-3xl">

          {/* ── NO-CODE TRACK ─────────────────────────────────────────── */}
          {track === 'nocode' && <motion.div key="nocode" initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.25,
          ease: 'easeOut' as const
        }} className="flex flex-col">

              {/* Callout */}
              <div className="mb-8 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-5 py-4 flex items-start gap-3">
                <CheckCircle2 size={15} className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-400/90">
                  <strong>No coding required.</strong> Everything in this path happens inside your browser — no terminal, no code editor, no setup.
                </p>
              </div>

              <Step number={1} icon={KeyRound} title="Create your free account">
                <p className="text-sm text-muted-foreground">Sign up with your email and a password. It takes about 30 seconds and no credit card is needed.</p>
                <div className="flex gap-3">
                  <Link to="/signup" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{
                background: 'linear-gradient(135deg, #4F6EF7, #844ff7)'
              }}>
                    Create free account <ArrowRight size={13} />
                  </Link>
                  <Link to="/login" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all">
                    Already have one? Sign in
                  </Link>
                </div>
              </Step>

              <Step number={2} icon={KeyRound} title="Create an API key">
                <p className="text-sm text-muted-foreground">Once you're logged in, go to your Dashboard and click the <strong className="text-foreground">API Keys</strong> tab. Click <strong className="text-foreground">New key</strong>, give it a name like "My first key", and save it.</p>
                <div className="rounded-xl border border-border overflow-hidden" style={{
              background: '#0d1117'
            }}>
                  <div className="px-4 py-2.5 border-b border-border" style={{
                background: '#161b22'
              }}>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Dashboard → API Keys tab</span>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    {['Click the "API Keys" tab at the top of the dashboard.', 'Click the "New key" button.', 'Type a name for your key (e.g. "Testing").', 'Copy the key that appears — it\'s only shown once!'].map((s, i) => <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5" style={{
                    background: 'rgba(79,110,247,0.15)',
                    color: '#4F6EF7',
                    border: '1px solid rgba(79,110,247,0.3)'
                  }}>{i + 1}</span>
                        {s}
                      </div>)}
                  </div>
                </div>
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.04]">
                  <Zap size={12} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-400/80">The key is only shown once when you create it. Copy it and keep it somewhere safe.</p>
                </div>
              </Step>

              <Step number={3} icon={UploadCloud} title="Drop a document in the Try It panel">
                <p className="text-sm text-muted-foreground">Go to the <strong className="text-foreground">Try It</strong> tab in your dashboard. You'll see a drop zone — drag any document file onto it, or click to browse your files.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[{
                emoji: '🧾',
                label: 'Invoice (.pdf, .txt)'
              }, {
                emoji: '📄',
                label: 'Contract (.docx, .txt)'
              }, {
                emoji: '📊',
                label: 'Report (.csv, .txt)'
              }, {
                emoji: '📧',
                label: 'Email (paste the text)'
              }].map(f => <div key={f.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border text-sm text-muted-foreground" style={{
                background: '#0d1117'
              }}>
                      <span className="text-base">{f.emoji}</span>{f.label}
                    </div>)}
                </div>
                <p className="text-xs text-muted-foreground">Don't have a document handy? Use the <strong className="text-foreground">Invoice</strong>, <strong className="text-foreground">Contract</strong>, or <strong className="text-foreground">Receipt</strong> sample buttons to load example text instantly.</p>
              </Step>

              <Step number={4} icon={Play} title="Click Run Extraction">
                <p className="text-sm text-muted-foreground">Hit the <strong className="text-foreground">Run Extraction</strong> button. In a second or two, the right side of the panel fills with structured data pulled from your document.</p>
                <div className="rounded-xl border border-border overflow-hidden" style={{
              background: '#0d1117'
            }}>
                  <div className="px-4 py-2.5 border-b border-border" style={{
                background: '#161b22'
              }}>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">What you'll see</span>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2">
                    {[{
                  label: 'Dates',
                  example: '"May 23, 2026"'
                }, {
                  label: 'Amounts',
                  example: '"$1,250.00"'
                }, {
                  label: 'Names',
                  example: '"Acme Corp"'
                }, {
                  label: 'Invoice #',
                  example: '"INV-1042"'
                }, {
                  label: 'Emails',
                  example: '"billing@acme.com"'
                }, {
                  label: 'Line items',
                  example: 'description + amount'
                }].map(item => <div key={item.label} className="flex items-center gap-2">
                        <ChevronRight size={11} className="text-primary/50 shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-foreground">{item.label}</span>
                          <span className="text-[10px] font-mono text-muted-foreground ml-1.5">{item.example}</span>
                        </div>
                      </div>)}
                  </div>
                </div>
              </Step>

              <Step number={5} icon={BarChart3} title="Check your logs">
                <p className="text-sm text-muted-foreground">Every extraction is automatically saved. Click the <strong className="text-foreground">Logs</strong> tab to see a history of everything you've run — including how long it took and whether it succeeded.</p>
                <Link to="/dashboard" className="self-start inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{
              background: 'linear-gradient(135deg, #4F6EF7, #844ff7)'
            }}>
                  Open Dashboard <ArrowRight size={13} />
                </Link>
              </Step>

              {/* Switch track prompt */}
              <div className="mt-4 pt-6 border-t border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Want to use the API in your own app?</p>
                <button onClick={() => setTrack('developer')} className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium">
                  Switch to developer path <ChevronRight size={13} />
                </button>
              </div>
            </motion.div>}

          {/* ── DEVELOPER TRACK ───────────────────────────────────────── */}
          {track === 'developer' && <motion.div key="developer" initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.25,
          ease: 'easeOut' as const
        }} className="flex flex-col">

              <div className="mb-8 rounded-xl border border-primary/20 bg-primary/[0.04] px-5 py-4 flex items-start gap-3">
                <Code2 size={15} className="text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-primary/90">
                  <strong>One endpoint, any document.</strong> Authenticate with a Bearer token, POST your document text, get structured JSON back. That's it.
                </p>
              </div>

              <Step number={1} icon={KeyRound} title="Sign up and get an API key">
                <p className="text-sm text-muted-foreground">Create a free account, then go to Dashboard → API Keys → New key. Copy the key — it's only shown once.</p>
                <div className="flex gap-3">
                  <Link to="/signup" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{
                background: 'linear-gradient(135deg, #4F6EF7, #844ff7)'
              }}>
                    Create account <ArrowRight size={13} />
                  </Link>
                  <Link to="/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all">
                    Go to Dashboard
                  </Link>
                </div>
              </Step>

              <Step number={2} icon={UploadCloud} title="Make your first API call">
                <p className="text-sm text-muted-foreground">Replace <code className="font-mono text-primary/70 text-xs bg-white/[0.04] px-1.5 py-0.5 rounded">dk_live_YOUR_KEY_HERE</code> with your actual key.</p>
                <CodeTabs tabs={[{
              label: 'cURL',
              code: CURL
            }, {
              label: 'JavaScript',
              code: JS
            }, {
              label: 'Python',
              code: PYTHON
            }]} />
              </Step>

              <Step number={3} icon={Braces} title="Read the response">
                <p className="text-sm text-muted-foreground">You'll get back a JSON object with all extracted fields, plus metadata about the request.</p>
                <CodeBlock code={SAMPLE_RESPONSE} label="Example response" />

                {/* Fields reference */}
                <div className="rounded-xl border border-border overflow-hidden" style={{
              background: '#0d1117'
            }}>
                  <div className="px-4 py-2.5 border-b border-border" style={{
                background: '#161b22'
              }}>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Fields extracted automatically</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[{
                  f: 'dates',
                  d: 'All date strings in the document'
                }, {
                  f: 'amounts',
                  d: 'Monetary values ($, USD, EUR, GBP)'
                }, {
                  f: 'documentNumber',
                  d: 'Invoice / order / reference number'
                }, {
                  f: 'from / to',
                  d: 'Sender and recipient parties'
                }, {
                  f: 'emails',
                  d: 'All email addresses found'
                }, {
                  f: 'phones',
                  d: 'Phone numbers in common formats'
                }, {
                  f: 'lineItems',
                  d: 'Table rows: description, qty, amount'
                }, {
                  f: 'fields',
                  d: 'Any "Label: Value" key-value pairs'
                }].map(item => <div key={item.f} className="flex items-start gap-2">
                        <ChevronRight size={11} className="text-primary/50 mt-0.5 shrink-0" />
                        <div>
                          <code className="font-mono text-[11px] text-primary/80">{item.f}</code>
                          <p className="text-[11px] text-muted-foreground">{item.d}</p>
                        </div>
                      </div>)}
                  </div>
                </div>
              </Step>

              <Step number={4} icon={BarChart3} title="Monitor usage in the dashboard">
                <p className="text-sm text-muted-foreground">Every API call is logged automatically. The Logs tab shows status codes, latency, token counts, and filenames for every request.</p>

                {/* HTTP status codes */}
                <div className="rounded-xl border border-border overflow-hidden" style={{
              background: '#0d1117'
            }}>
                  <div className="px-4 py-2.5 border-b border-border" style={{
                background: '#161b22'
              }}>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">HTTP status codes</span>
                  </div>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-border">
                      {[{
                    code: '200',
                    color: 'text-emerald-400',
                    label: 'OK',
                    desc: 'Extraction successful'
                  }, {
                    code: '400',
                    color: 'text-amber-400',
                    label: 'Bad Request',
                    desc: 'Missing or invalid "document" field'
                  }, {
                    code: '401',
                    color: 'text-red-400',
                    label: 'Unauthorized',
                    desc: 'Missing or invalid API key'
                  }, {
                    code: '413',
                    color: 'text-amber-400',
                    label: 'Payload Too Large',
                    desc: 'Document exceeds 500,000 characters'
                  }, {
                    code: '500',
                    color: 'text-red-400',
                    label: 'Server Error',
                    desc: 'Extraction failed internally'
                  }].map(row => <tr key={row.code} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 w-14"><span className={`font-mono font-bold ${row.color}`}>{row.code}</span></td>
                          <td className="px-4 py-2.5 font-mono text-slate-400 w-36">{row.label}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{row.desc}</td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3">
                  <Link to="/docs" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{
                background: 'linear-gradient(135deg, #4F6EF7, #844ff7)'
              }}>
                    Full API reference <ArrowRight size={13} />
                  </Link>
                  <Link to="/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all">
                    Open Dashboard
                  </Link>
                </div>
              </Step>

              {/* Switch track prompt */}
              <div className="mt-4 pt-6 border-t border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Not a developer? No problem.</p>
                <button onClick={() => setTrack('nocode')} className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium">
                  Switch to no-code path <ChevronRight size={13} />
                </button>
              </div>
            </motion.div>}

          {/* ── Bottom CTA ────────────────────────────────────────────── */}
          <motion.div initial={{
          opacity: 0,
          y: 16
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.35,
          ease: 'easeOut' as const
        }} className="mt-12 rounded-2xl border border-primary/20 p-8 flex flex-col items-center text-center gap-4" style={{
          background: 'linear-gradient(135deg, rgba(79,110,247,0.08), rgba(132,79,247,0.08))'
        }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
            background: 'rgba(79,110,247,0.15)',
            border: '1px solid rgba(79,110,247,0.3)'
          }}>
              <CheckCircle2 size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">You're ready to go</h2>
              <p className="text-sm text-muted-foreground max-w-sm">Create your free account and extract your first document in under 5 minutes.</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/signup" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90" style={{
              background: 'linear-gradient(135deg, #4F6EF7, #844ff7)'
            }}>
                Create free account <ArrowRight size={13} />
              </Link>
              <Link to="/docs" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all">
                Full API docs <ChevronRight size={13} />
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </>;
}
