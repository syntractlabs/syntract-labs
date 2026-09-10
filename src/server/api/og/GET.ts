/**
 * GET /api/og?title=...&description=...
 * Returns a simple SVG-based og:image (1200×630) as PNG-compatible SVG.
 * No canvas / sharp needed — pure SVG rendered inline.
 */
import type { Request, Response } from 'express';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 3);
}

export default function handler(req: Request, res: Response) {
  const rawTitle = String(req.query.title || 'SynTract');
  const rawDesc  = String(req.query.description || 'Document Intelligence API — turn any document into structured data instantly.');

  const title = escapeXml(rawTitle.slice(0, 80));
  const descLines = wrapText(rawDesc.slice(0, 200), 60);

  const descSvg = descLines
    .map((line, i) => `<text x="60" y="${370 + i * 38}" font-family="system-ui,sans-serif" font-size="26" fill="#94a3b8">${escapeXml(line)}</text>`)
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0A0D12"/>
      <stop offset="100%" stop-color="#0d1117"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4F6EF7" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#844ff7" stop-opacity="0.05"/>
    </linearGradient>
    <radialGradient id="radial" cx="50%" cy="0%" r="70%">
      <stop offset="0%" stop-color="#4F6EF7" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#0A0D12" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#radial)"/>

  <!-- Grid lines -->
  <g stroke="#ffffff" stroke-opacity="0.03" stroke-width="1">
    <line x1="0" y1="105" x2="1200" y2="105"/>
    <line x1="0" y1="210" x2="1200" y2="210"/>
    <line x1="0" y1="315" x2="1200" y2="315"/>
    <line x1="0" y1="420" x2="1200" y2="420"/>
    <line x1="0" y1="525" x2="1200" y2="525"/>
    <line x1="200" y1="0" x2="200" y2="630"/>
    <line x1="400" y1="0" x2="400" y2="630"/>
    <line x1="600" y1="0" x2="600" y2="630"/>
    <line x1="800" y1="0" x2="800" y2="630"/>
    <line x1="1000" y1="0" x2="1000" y2="630"/>
  </g>

  <!-- Border -->
  <rect x="1" y="1" width="1198" height="628" rx="0" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="2"/>

  <!-- Accent bar -->
  <rect x="60" y="200" width="4" height="80" rx="2" fill="#4F6EF7"/>

  <!-- Logo badge -->
  <rect x="60" y="60" width="130" height="32" rx="6" fill="#4F6EF7" fill-opacity="0.12"/>
  <rect x="60" y="60" width="130" height="32" rx="6" fill="none" stroke="#4F6EF7" stroke-opacity="0.3" stroke-width="1"/>
  <text x="75" y="81" font-family="monospace" font-size="13" fill="#4F6EF7" font-weight="600" letter-spacing="2">SYNTRACT</text>

  <!-- Title -->
  <text x="76" y="290" font-family="system-ui,sans-serif" font-size="56" font-weight="700" fill="#f1f5f9" letter-spacing="-1">${title}</text>

  <!-- Description -->
  ${descSvg}

  <!-- Bottom domain -->
  <text x="60" y="580" font-family="monospace" font-size="20" fill="#4F6EF7" fill-opacity="0.6">syntract.io</text>

  <!-- Decorative dots -->
  <circle cx="1100" cy="100" r="120" fill="#4F6EF7" fill-opacity="0.04"/>
  <circle cx="1100" cy="100" r="80"  fill="#844ff7" fill-opacity="0.04"/>
  <circle cx="1100" cy="100" r="40"  fill="#4F6EF7" fill-opacity="0.06"/>
</svg>`;

  res
    .set('Content-Type', 'image/svg+xml')
    .set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600')
    .send(svg);
}
