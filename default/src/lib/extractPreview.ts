/**
 * extractPreview.ts
 *
 * Parses the agent's markdown result and assembles a self-contained HTML
 * document suitable for srcdoc injection into a sandboxed <iframe>.
 *
 * Strategy:
 *  1. Extract all fenced code blocks by language.
 *  2. If there's a standalone HTML block, use it as the base document.
 *  3. Otherwise, assemble from CSS + JS/TS/JSX/TSX blocks.
 *  4. Inject Tailwind CDN + React CDN so React/JSX snippets render.
 *  5. Return { srcdoc, hasPreview, detectedType }.
 */

export type PreviewType = 'html' | 'react' | 'vanilla-js' | 'css-only' | 'none';

export interface ExtractedPreview {
  srcdoc: string;
  hasPreview: boolean;
  detectedType: PreviewType;
}

interface CodeBlock {
  lang: string;
  code: string;
}

function extractCodeBlocks(markdown: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  // Match ```lang\n...code...\n```
  const re = /```(\w*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    blocks.push({ lang: (m[1] || 'text').toLowerCase(), code: m[2] });
  }
  return blocks;
}

function wrapReactApp(jsxCode: string, cssCode: string): string {
  // Strip import/export statements so the snippet runs standalone
  const cleaned = jsxCode
    .replace(/^import\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+/gm, '')
    .trim();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #0d1117; color: #e6edf3; }
    ${cssCode}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${cleaned}

    // Try to find and render the App component or the last defined function component
    const componentNames = ['App', 'Main', 'Page', 'Component', 'Dashboard', 'Home'];
    let RootComponent = null;
    for (const name of componentNames) {
      try {
        if (typeof eval(name) === 'function') { RootComponent = eval(name); break; }
      } catch {}
    }
    if (!RootComponent) {
      // Fallback: render the raw output as formatted text
      RootComponent = () => React.createElement('pre', {
        style: { padding: '1rem', whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: '#8b949e' }
      }, 'Component rendered — no named App/Main/Page component found. Check the code tab.');
    }
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(RootComponent));
  </script>
</body>
</html>`;
}

function wrapVanillaJS(jsCode: string, cssCode: string, htmlBody: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #0d1117; color: #e6edf3; }
    ${cssCode}
  </style>
</head>
<body>
  ${htmlBody || '<div id="app"></div>'}
  <script>
    try {
      ${jsCode}
    } catch(e) {
      document.body.innerHTML += '<pre style="color:#f85149;padding:1rem;font-size:0.75rem">Runtime error: ' + e.message + '</pre>';
    }
  </script>
</body>
</html>`;
}

export function extractPreview(markdown: string): ExtractedPreview {
  const blocks = extractCodeBlocks(markdown);

  if (blocks.length === 0) {
    return { srcdoc: '', hasPreview: false, detectedType: 'none' };
  }

  // Collect by language
  const byLang: Record<string, string[]> = {};
  for (const b of blocks) {
    if (!byLang[b.lang]) byLang[b.lang] = [];
    byLang[b.lang].push(b.code);
  }

  const htmlBlocks  = [...(byLang['html'] ?? [])];
  const cssBlocks   = [...(byLang['css'] ?? []), ...(byLang['scss'] ?? [])];
  const jsBlocks    = [...(byLang['js'] ?? []), ...(byLang['javascript'] ?? [])];
  const tsBlocks    = [...(byLang['ts'] ?? []), ...(byLang['typescript'] ?? [])];
  const jsxBlocks   = [...(byLang['jsx'] ?? [])];
  const tsxBlocks   = [...(byLang['tsx'] ?? [])];

  const cssCode  = cssBlocks.join('\n');
  const jsCode   = jsBlocks.join('\n');
  const tsCode   = tsBlocks.join('\n');
  const jsxCode  = jsxBlocks.join('\n');
  const tsxCode  = tsxBlocks.join('\n');

  // 1. Standalone HTML — use as-is, inject CSS if missing
  if (htmlBlocks.length > 0) {
    let html = htmlBlocks[htmlBlocks.length - 1]; // use last/most complete
    // Inject Tailwind if not already present
    if (!html.includes('tailwindcss') && cssCode) {
      html = html.replace('</head>', `<style>${cssCode}</style>\n</head>`);
    }
    if (!html.includes('tailwindcss')) {
      html = html.replace('</head>', `<script src="https://cdn.tailwindcss.com"></script>\n</head>`);
    }
    return { srcdoc: html, hasPreview: true, detectedType: 'html' };
  }

  // 2. React/JSX/TSX — wrap with React CDN + Babel standalone
  const reactCode = tsxBlocks.length > 0 ? tsxCode : jsxCode;
  if (reactCode) {
    return {
      srcdoc: wrapReactApp(reactCode, cssCode),
      hasPreview: true,
      detectedType: 'react',
    };
  }

  // 3. TypeScript that looks like React (has JSX syntax)
  const allTs = tsCode + jsCode;
  if (allTs.includes('React.createElement') || allTs.includes('useState') || allTs.includes('return (') || allTs.includes('return(')) {
    return {
      srcdoc: wrapReactApp(allTs, cssCode),
      hasPreview: true,
      detectedType: 'react',
    };
  }

  // 4. Vanilla JS
  if (jsCode) {
    return {
      srcdoc: wrapVanillaJS(jsCode, cssCode, ''),
      hasPreview: true,
      detectedType: 'vanilla-js',
    };
  }

  // 5. CSS only — show a demo box
  if (cssCode) {
    return {
      srcdoc: `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>body{margin:0;background:#0d1117;color:#e6edf3;font-family:system-ui,sans-serif;padding:2rem;}${cssCode}</style></head><body><div class="demo-container"><p>CSS preview — add HTML markup to see styled output.</p></div></body></html>`,
      hasPreview: true,
      detectedType: 'css-only',
    };
  }

  return { srcdoc: '', hasPreview: false, detectedType: 'none' };
}

/** Build a downloadable .zip-like text bundle (markdown + extracted files) */
export function buildDownloadBundle(markdown: string, prompt: string): string {
  const blocks = extractCodeBlocks(markdown);
  const lines: string[] = [
    `# SynTract Build: ${prompt}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    '---',
    '',
    '## Full Agent Output',
    '',
    markdown,
  ];

  if (blocks.length > 0) {
    lines.push('', '---', '', '## Extracted Files', '');
    const seen = new Map<string, number>();
    for (const b of blocks) {
      const ext = langToExt(b.lang);
      const count = (seen.get(ext) ?? 0) + 1;
      seen.set(ext, count);
      const filename = count === 1 ? `output.${ext}` : `output-${count}.${ext}`;
      lines.push(`### ${filename}`, '```' + b.lang, b.code, '```', '');
    }
  }

  return lines.join('\n');
}

function langToExt(lang: string): string {
  const map: Record<string, string> = {
    tsx: 'tsx', ts: 'ts', typescript: 'ts',
    jsx: 'jsx', js: 'js', javascript: 'js',
    html: 'html', css: 'css', scss: 'scss',
    json: 'json', yaml: 'yaml', yml: 'yml',
    sh: 'sh', bash: 'sh', python: 'py', py: 'py',
    sql: 'sql', md: 'md', markdown: 'md',
  };
  return map[lang] ?? 'txt';
}
