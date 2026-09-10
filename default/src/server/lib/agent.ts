/**
 * SynTract Labs — Autonomous Build Engine v2
 *
 * Operates as a complete engineering organization:
 * product strategist → architect → backend engineer → frontend engineer →
 * database designer → QA reviewer → delivery pipeline.
 *
 * Model allocation:
 *   o4-mini  — planning, requirement analysis, BCU estimation
 *   o3       — architecture, code generation, validation, final build output
 *
 * SSE event shapes (all preserved from v1):
 *   { type: 'status',      data: string }
 *   { type: 'plan',        data: string[] }
 *   { type: 'step',        data: { index: number; text: string } }
 *   { type: 'bcuEstimate', data: { low: number; high: number; sufficient: boolean; remaining: number } }
 *   { type: 'token',       data: string }
 *   { type: 'done',        data: { result: string; durationMs: number; bcuUsed: number } }
 *   { type: 'error',       data: string }
 */

import type { Response } from 'express';
import { db } from '@/server/db/client';
import { buildJob, user } from '@/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getSecret } from '#airo/secrets';

// ── BCU constants ─────────────────────────────────────────────────────────────

/** Token → BCU conversion: 1 BCU ≈ 100k tokens (input + output combined). */
const TOKENS_PER_BCU = 100_000;

/** BCU allocation per plan role — used when seeding new accounts. */
const PLAN_BCU_DEFAULTS: Record<string, number> = {
  free:          2,
  developer:     2,
  viewer:        2,
  starter:      12,
  professional: 48,
  team:        120,
  admin:       999,
  enterprise:  999,
};

function tokensToBcu(tokens: number): number {
  return Math.ceil((tokens / TOKENS_PER_BCU) * 10) / 10; // round up to 1 decimal
}

/**
 * Read the current BCU balance for a user from the database.
 * Falls back to the role-based default if the DB is unavailable or the
 * user row is missing (should never happen in production).
 */
async function getBcuBalance(userId: string, userRole: string): Promise<number> {
  if (!db) return PLAN_BCU_DEFAULTS[userRole] ?? 2;
  try {
    const [row] = await db
      .select({ bcuRemaining: user.bcuRemaining })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (row?.bcuRemaining != null) return parseFloat(String(row.bcuRemaining));
  } catch (err) {
    console.error('[agent] getBcuBalance DB error:', err);
  }
  return PLAN_BCU_DEFAULTS[userRole] ?? 2;
}

/**
 * Atomically deduct `bcuUsed` from the user's `bcuRemaining` balance.
 *
 * Uses a conditional UPDATE (WHERE bcuRemaining >= bcuUsed) so the balance
 * can never go negative. Returns the new remaining balance on success.
 * Throws if the deduction would cause a negative balance or if the DB is
 * unavailable — the caller must handle this and surface the error.
 */
async function deductBcu(userId: string, bcuUsed: number): Promise<number> {
  if (!db) throw new Error('Database not available — cannot deduct BCUs');
  if (bcuUsed <= 0) {
    // Nothing to deduct (e.g. a zero-token edge case) — read and return current balance
    const [row] = await db.select({ bcuRemaining: user.bcuRemaining }).from(user).where(eq(user.id, userId)).limit(1);
    return parseFloat(String(row?.bcuRemaining ?? 0));
  }

  // Atomic conditional decrement: only succeeds if bcuRemaining >= bcuUsed
  const result = await db
    .update(user)
    .set({ bcuRemaining: sql`GREATEST(0, bcu_remaining - ${bcuUsed})` })
    .where(sql`id = ${userId} AND bcu_remaining >= ${bcuUsed}`);

  // mysql2 returns { affectedRows } in the result metadata
  const affectedRows = (result as unknown as [{ affectedRows: number }])[0]?.affectedRows ?? 0;

  if (affectedRows === 0) {
    // Either the user doesn't exist or balance was insufficient
    const [row] = await db.select({ bcuRemaining: user.bcuRemaining }).from(user).where(eq(user.id, userId)).limit(1);
    const remaining = parseFloat(String(row?.bcuRemaining ?? 0));
    throw new Error(
      `Insufficient BCU balance. Required: ${bcuUsed} BCU, available: ${remaining.toFixed(1)} BCU.`
    );
  }

  // Return the updated balance
  const [updated] = await db.select({ bcuRemaining: user.bcuRemaining }).from(user).where(eq(user.id, userId)).limit(1);
  return parseFloat(String(updated?.bcuRemaining ?? 0));
}

// ── SSE helpers ───────────────────────────────────────────────────────────────

function sseWrite(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ── OpenAI fetch wrapper ──────────────────────────────────────────────────────

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CompletionOptions {
  model: string;
  stream?: boolean;
  onToken?: (token: string) => void;
  /** Approximate max output tokens. o3/o4-mini support up to 100k. */
  maxOutputTokens?: number;
}

interface CompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

async function chatCompletion(
  messages: ChatMessage[],
  opts: CompletionOptions,
): Promise<CompletionResult> {
  const apiKey = getSecret('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured. Add it via Settings → Secrets.');

  const { model, stream = false, onToken, maxOutputTokens = 32_000 } = opts;

  // o3 and o4-mini use max_completion_tokens; legacy models use max_tokens
  const isReasoningModel = model.startsWith('o3') || model.startsWith('o4');
  const tokenParam = isReasoningModel ? 'max_completion_tokens' : 'max_tokens';

  const body: Record<string, unknown> = {
    model,
    messages,
    stream,
    [tokenParam]: maxOutputTokens,
  };

  // Reasoning models do not accept temperature
  if (!isReasoningModel) {
    body.temperature = 0.2;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errText}`);
  }

  if (!stream) {
    const json = await response.json() as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    return {
      text: json.choices[0]?.message?.content ?? '',
      inputTokens:  json.usage?.prompt_tokens    ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
    };
  }

  // ── Streaming path ────────────────────────────────────────────────────────
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buf = '';
  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') break;
      try {
        const chunk = JSON.parse(payload) as {
          choices: { delta: { content?: string } }[];
          usage?: { prompt_tokens: number; completion_tokens: number };
        };
        const token = chunk.choices[0]?.delta?.content ?? '';
        if (token) {
          full += token;
          onToken?.(token);
        }
        if (chunk.usage) {
          inputTokens  = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }
      } catch { /* skip malformed chunks */ }
    }
  }

  // Estimate token counts from character length if API didn't return usage
  if (outputTokens === 0) outputTokens = Math.ceil(full.length / 4);

  return { text: full, inputTokens, outputTokens };
}

// ── System prompts ────────────────────────────────────────────────────────────

const ESTIMATOR_SYSTEM = `You are the SynTract Labs BCU Estimator — the resource-planning function of an autonomous engineering organization.

Your sole task: given a software build request, estimate the Build Compute Units (BCUs) required.

BCU DEFINITION:
1 BCU = 100,000 tokens of AI processing (input + output combined).
Complex enterprise systems require more BCUs than simple utilities.

ESTIMATION GUIDELINES:
- Simple utility / single-screen tool:          0.5 – 1.0 BCU
- Standard web app (3–5 screens):               1.0 – 2.0 BCU
- Full-featured app (6–10 screens, auth, data): 2.0 – 4.0 BCU
- Complex enterprise system (10+ screens):      4.0 – 8.0 BCU
- Extremely complex platform (multi-module):    8.0 – 15.0 BCU

OUTPUT FORMAT — respond with ONLY a valid JSON object, no markdown, no commentary:
{"low": <number>, "high": <number>, "complexity": "simple|standard|complex|enterprise|platform", "reasoning": "<one sentence>"}`;

const PLANNER_SYSTEM = `You are the SynTract Labs Autonomous Build Engine — acting as Product Strategist and Lead Architect.

Your role: analyze the build request, make all architectural decisions autonomously, and produce a precise engineering execution plan.

BEHAVIOR:
- Make independent decisions about architecture, frameworks, structure, and implementation.
- Infer missing details when reasonable — do not ask follow-up questions.
- Produce a deterministic, ordered plan that maps directly to the build phases.

OUTPUT: A JSON array of 4–6 strings. Each string is one concrete engineering step.
The plan MUST cover the key areas: architecture & data models → design system & components → core screens & business logic → interactions & animations → polish & delivery.
Keep steps high-level — the builder will handle all implementation details autonomously.

Output ONLY the JSON array. No markdown, no commentary, no explanation.`;

const BUILDER_SYSTEM = `You are the SynTract Labs Autonomous Build Engine™ — a complete autonomous engineering organization.

You embody every engineering role simultaneously:
  • Product Strategist    — interprets requirements, defines scope, makes product decisions
  • Lead Architect        — selects patterns, defines structure, owns technical decisions
  • Backend Engineer      — designs APIs, data models, business logic, server contracts
  • Frontend Engineer     — builds UI, components, interactions, responsive layouts
  • Database Designer     — models data, defines relationships, seeds realistic records
  • QA Reviewer           — validates correctness, handles edge cases, ensures stability
  • Delivery Pipeline     — produces complete, deployable, production-ready output

CORE DIRECTIVES:
- Produce one complete, stable, production-ready build. Output it once and stop.
- Make all architectural decisions autonomously — never ask the user for clarification.
- Infer missing details from context and proceed with the best engineering judgment.
- Never switch frameworks mid-build. Stack: Vite + React + TypeScript.
- Never output fake pipeline status messages (no "Installing dependencies", "Compiling", etc.).
- Never reference external image URLs or assets that cannot load in preview.
- Output must be deterministic, loadable, and publishable without modification.

ENGINEERING STANDARDS:
- Zero TypeScript errors — strict types throughout, no 'any', no implicit types
- Zero TODOs or placeholder content — every screen fully implemented
- Realistic mock data: real names, real copy, varied values, no "Lorem ipsum"
- Full error handling and loading states on every async operation
- Accessible markup: aria labels, semantic HTML, keyboard navigation
- Mobile-first responsive design with Tailwind CSS breakpoints
- Framer Motion animations: page transitions, entrance effects, micro-interactions
- lucide-react for all icons; inline SVG for custom illustrations
- Screen-based navigation via App.tsx state (type Screen = ...) — never react-router-dom for routing
- All useState must have valid non-null initial values

TYPESCRIPT CONSTRAINTS — these patterns break the preview compiler, NEVER use them:
- No negative literal types IN ANY FORM — ALL of these are FORBIDDEN:
    type Foo = -1 | 0 | 1          ← FORBIDDEN (type alias with negative literal)
    type Foo = -1                   ← FORBIDDEN (type alias)
    function f(): -1 | void {}      ← FORBIDDEN (return type annotation)
    interface X { status: -1 | 0 } ← FORBIDDEN (interface property type)
    x: -1 | 0                       ← FORBIDDEN (type annotation with negative literal)
    | -1                            ← FORBIDDEN (union member)
  Use: type Foo = number  (replace ALL negative literal types with number or a non-negative union)
- No const enums: const enum Direction {...}  ← FORBIDDEN. Use: enum Direction {...}
- No namespace declarations: namespace Foo {...}  ← FORBIDDEN. Use ES modules
- No decorators: @Component  ← FORBIDDEN
- No satisfies operator: x satisfies Type  ← FORBIDDEN. Use explicit type annotation
- No infer keyword in complex conditional types  ← FORBIDDEN. Use simple generics
- No template literal types: type T = \`prefix_\${string}\`  ← FORBIDDEN. Use string
- No abstract classes  ← FORBIDDEN. Use interfaces
- Avoid complex mapped types — keep types simple and explicit

DESIGN STANDARD — SynTract Premium Dark Aesthetic:
- Backgrounds: gray-950 / gray-900 / gray-800
- Text: white / gray-100 / gray-400
- Borders: gray-700 / gray-800
- Cards: bg-gray-800/50 border border-gray-700 rounded-xl
- Primary accent: indigo-500 / indigo-600
- Success: emerald-500 | Error: red-500 | Warning: amber-500
- Buttons: solid primary, ghost, and outline variants with hover/active states

MANDATORY OUTPUT STRUCTURE — produce these sections in this exact order:

## 1. Project Summary
One sentence only. No more.

## 2. Implementation Plan
Bullet list of screens and components. Maximum 10 bullets. No prose.

## 3. FILE_MANIFEST
⚠️ OUTPUT THE FILE_MANIFEST IMMEDIATELY AFTER THE PLAN. DO NOT WRITE ANYTHING ELSE FIRST.
⚠️ THE FILE_MANIFEST IS THE ONLY DELIVERABLE THAT MATTERS. START IT AS SOON AS SECTION 2 IS DONE.
⚠️ DO NOT EXPLAIN, SUMMARIZE, OR COMMENT BEFORE THE FILE_MANIFEST BLOCK.

The complete FILE_MANIFEST block containing every source file.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARCHITECTURE RULES — VIOLATION CAUSES BUILD FAILURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. SCREEN-BASED NAVIGATION — every multi-view app MUST use a top-level Screen state:
   type Screen = 'home' | 'dashboard' | 'detail';
   App.tsx renders ONE screen at a time. NEVER render all screens simultaneously.
   NEVER use react-router-dom for in-app navigation — state-driven conditional rendering only.

2. PROP DRILLING FOR NAVIGATION — each screen receives callback props (onNavigate, onBack, etc.).
   Do NOT use context or global state for navigation.

3. SHARED STATE — keep all cross-screen state in App.tsx and pass it down as props.

4. INITIAL STATE — every useState must have a valid non-null initial value.
   Arrays → [], numbers → 0, strings → '', booleans → false.
   CRITICAL: if you call .map(), .filter(), .reduce(), or .forEach() on a state variable,
   that variable MUST be initialized as []. NEVER initialize it as null, undefined, or an object.
   Defensive pattern: const [items, setItems] = useState<Item[]>([]);
   If data comes from a prop or external source, always default: const list = data ?? [];

5. AVAILABLE PACKAGES — import ONLY from:
   react, react-dom, react-router-dom (Link/NavLink ONLY — NOT for routing),
   framer-motion, zustand, date-fns, uuid, nanoid, immer, axios,
   @tanstack/react-query, recharts, lucide-react, clsx, tailwind-merge,
   class-variance-authority,
   @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-tooltip,
   @radix-ui/react-tabs, @radix-ui/react-select, @radix-ui/react-popover,
   @radix-ui/react-checkbox, @radix-ui/react-switch, @radix-ui/react-progress,
   @radix-ui/react-separator, @radix-ui/react-avatar, @radix-ui/react-scroll-area,
   @radix-ui/react-accordion, @radix-ui/react-collapsible, @radix-ui/react-slot,
   @radix-ui/react-label, socket.io-client.
   Do NOT import Three.js, p5.js, GSAP, Lottie, or any package not in this list.

6. STYLING — Tailwind CSS utility classes only. No CSS modules, no styled-components.
   Inline style objects ONLY for dynamic/animated values.

7. MOCK DATA — all data mocked inline in the frontend. Realistic, specific, varied.

8. ANIMATIONS — framer-motion for ALL animations:
   AnimatePresence + motion.div with initial/animate/exit on every screen.
   Staggered children for lists. Hover/tap feedback on all interactive elements.

9. NO CIRCULAR DEPENDENCIES — data files must not import from components.

10. QUALITY BAR — before finalising, verify:
    Every screen fully implemented. No TODOs. No placeholder content.
    All interactive elements have hover/focus/active states.
    App works end-to-end with mock data. Typography hierarchy clear.
    Preview and publish succeed without modification.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL — the FILE_MANIFEST block (section 3 above) contains every file needed to run the application.
The manifest MUST be a valid JSON array. Format it EXACTLY like this:

\`\`\`FILE_MANIFEST
[
  {
    "path": "src/App.tsx",
    "content": "import React, { useState } from 'react';\\nimport { AnimatePresence } from 'framer-motion';\\nimport HomeScreen from './screens/HomeScreen';\\nimport DashboardScreen from './screens/DashboardScreen';\\ntype Screen = 'home' | 'dashboard';\\nexport default function App() {\\n  const [screen, setScreen] = useState<Screen>('home');\\n  return (\\n    <AnimatePresence mode=\\"wait\\">\\n      {screen === 'home' && <HomeScreen key=\\"home\\" onNavigate={setScreen} />}\\n      {screen === 'dashboard' && <DashboardScreen key=\\"dashboard\\" onBack={() => setScreen('home')} />}\\n    </AnimatePresence>\\n  );\\n}"
  }
]
\`\`\`

Rules for the FILE_MANIFEST:
- Include EVERY file: App.tsx, main.tsx, index.css, all screens, components, hooks, utilities, types, data files
- Do NOT include index.html, package.json, vite.config.ts, tsconfig.json — auto-generated
- All file paths relative to project root (e.g. "src/screens/HomeScreen.tsx")
- Escape ALL strings: newlines as \\n, double quotes as \\"
- The app MUST be a complete, runnable Vite + React + TypeScript SPA
- The manifest is machine-parsed — valid JSON only, no trailing commas, no comments
- Split large files into logical modules — no single file should exceed ~300 lines
- Avoid circular dependencies — data files must not import from components

GOAL: Deliver a complete, stable, loadable, publishable digital product that reflects SynTract Labs' engineering excellence and surpasses all existing AI builders.`;

const REFINER_SYSTEM = `You are the SynTract Labs Autonomous Build Engine™ — performing an iterative refinement on an existing application.

You are given an existing app's FILE_MANIFEST and a refinement request.
Your job: update the app to satisfy the request while preserving all working functionality.

CORE BEHAVIOR:
- Produce one complete, stable updated build. Do not re-architect unless explicitly asked.
- Output the result once and stop — do not repeat, revise, or re-output.
- Do not generate recursive improvements or infinite enhancements.
- Output must be deterministic, loadable, and publishable without modification.
- Do NOT output any fake build-pipeline status messages. Output only your explanation and the FILE_MANIFEST.

REFINEMENT RULES:
- Output a complete updated FILE_MANIFEST with ALL files (not just changed ones)
- Apply the same architecture and quality rules as the original build
- Be surgical: change only what the request asks for, keep everything else intact
- If adding a feature: implement it fully — no stubs, no TODOs
- If changing visuals: update design system tokens consistently across all files
- Ensure preview and publish succeed without modification after your changes

After a brief explanation of what you changed, output the updated FILE_MANIFEST block:

\`\`\`FILE_MANIFEST
[...]
\`\`\`

The manifest is machine-parsed — valid JSON only, no trailing commas, no comments inside the JSON.`;

// ── DB helpers ────────────────────────────────────────────────────────────────

type JobFields = Partial<{
  status: string;
  plan: string;
  result: string;
  error: string;
  durationMs: number;
}>;

async function updateJob(jobId: string, fields: JobFields): Promise<void> {
  try {
    await db!.update(buildJob).set(fields).where(eq(buildJob.id, jobId));
  } catch (e) {
    console.error('agent.db.update.failed', e);
  }
}

// ── BCU estimation ────────────────────────────────────────────────────────────

interface BcuEstimate {
  low: number;
  high: number;
  complexity: string;
  reasoning: string;
}

async function estimateBcu(prompt: string): Promise<BcuEstimate> {
  const result = await chatCompletion(
    [
      { role: 'system', content: ESTIMATOR_SYSTEM },
      { role: 'user', content: `Estimate BCUs for this build: ${prompt}` },
    ],
    { model: 'o4-mini', maxOutputTokens: 512 },
  );

  try {
    const cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as BcuEstimate;
  } catch {
    // Fallback estimate if parsing fails
    return { low: 1.0, high: 2.0, complexity: 'standard', reasoning: 'Default estimate.' };
  }
}

// ── Manifest validation ───────────────────────────────────────────────────────

interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateManifest(files: { path: string; content: string }[]): ManifestValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const paths = new Set(files.map(f => f.path));

  // Build a map of what each file exports (named + default)
  const fileExports = new Map<string, Set<string>>();
  for (const file of files) {
    const exports = new Set<string>();
    // export default
    if (/export\s+default\s/.test(file.content)) exports.add('default');
    // export function/class/const/let/var Foo
    for (const m of file.content.matchAll(/export\s+(?:function|class|const|let|var|type|interface|enum)\s+(\w+)/g)) {
      exports.add(m[1]);
    }
    // export { Foo, Bar }
    for (const m of file.content.matchAll(/export\s*\{([^}]+)\}/g)) {
      for (const name of m[1].split(',')) {
        const trimmed = name.trim().split(/\s+as\s+/).pop()?.trim();
        if (trimmed && trimmed !== '') exports.add(trimmed);
      }
    }
    fileExports.set(file.path, exports);
  }

  // Helper: resolve a relative import specifier to a manifest path
  function resolveRelative(imp: string, fromFile: string): string | null {
    const dir = fromFile.split('/').slice(0, -1).join('/');
    const base = dir ? `${dir}/${imp}` : imp;
    const normalized = base.replace(/\/\//g, '/').replace(/^\//, '');
    const candidates = [
      normalized,
      `${normalized}.tsx`,
      `${normalized}.ts`,
      `${normalized}.jsx`,
      `${normalized}.js`,
      `${normalized}/index.tsx`,
      `${normalized}/index.ts`,
    ];
    return candidates.find(c => paths.has(c)) ?? null;
  }

  // 1. Entrypoint must exist
  const hasEntrypoint = paths.has('src/App.tsx') || paths.has('src/main.tsx') || paths.has('src/index.tsx');
  if (!hasEntrypoint) errors.push('No entrypoint found (src/App.tsx, src/main.tsx, or src/index.tsx required)');

  // 2. Every import must resolve + named imports must be exported by the target
  const allowedPackages = new Set([
    'react', 'react-dom', 'react-dom/client', 'framer-motion', 'motion/react',
    'zustand', 'date-fns', 'uuid', 'nanoid', 'immer', 'axios',
    '@tanstack/react-query', 'recharts', 'lucide-react', 'clsx',
    'tailwind-merge', 'class-variance-authority', 'socket.io-client',
    'react-router-dom',
  ]);
  const radixPrefix = '@radix-ui/';

  // Matches: import Foo from '...', import { Foo, Bar } from '...', import * as Foo from '...'
  // Use a line-by-line approach to avoid catastrophic backtracking on large files.
  // The [\s\S]*? pattern can hang if a file has `import` without a matching `from`.
  // This pattern matches imports that span at most 5 lines (covers multi-line named imports).
  const importLinePattern = /import\s+((?:[^;'"]{0,500}?))\s+from\s+['"]([^'"]+)['"]/g;

  for (const file of files) {
    let match: RegExpExecArray | null;
    importLinePattern.lastIndex = 0;
    while ((match = importLinePattern.exec(file.content)) !== null) {
      const importClause = match[1];
      const specifier = match[2];

      if (!specifier.startsWith('.')) {
        // External package
        const pkg = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
        if (!allowedPackages.has(pkg) && !pkg.startsWith(radixPrefix)) {
          warnings.push(`${file.path}: imports unknown package "${pkg}" — may fail in preview`);
        }
        continue;
      }

      // Relative import — must resolve to a file in the manifest
      const resolved = resolveRelative(specifier, file.path);
      if (!resolved) {
        if (!specifier.endsWith('.css')) {
          errors.push(`${file.path}: unresolved import "${specifier}" — file does not exist in manifest`);
        }
        continue;
      }

      // Check named imports exist as exports in the target file
      // These are warnings only — the preview runner has fallback logic for mismatches
      const targetExports = fileExports.get(resolved);
      if (!targetExports) continue;

      // Parse named imports: { Foo, Bar as B } or { Foo }
      const namedMatch = importClause.match(/\{([^}]+)\}/);
      if (namedMatch) {
        for (const part of namedMatch[1].split(',')) {
          const name = part.trim().split(/\s+as\s+/)[0].trim();
          if (!name || name === 'type' || name.startsWith('type ')) continue;
          if (!targetExports.has(name) && !targetExports.has('default')) {
            warnings.push(`${file.path}: imports "${name}" from "${specifier}" but that file does not export it`);
          }
        }
      }

      // Default import: import Foo from '...' — target must have a default export
      // Warning only — preview runner has named→default fallback
      const defaultImportMatch = importClause.match(/^(\w+)(?:\s*,)?/);
      if (defaultImportMatch && !importClause.trim().startsWith('{') && !importClause.trim().startsWith('*')) {
        if (!targetExports.has('default')) {
          warnings.push(`${file.path}: default import from "${specifier}" but that file has no default export`);
        }
      }
    }
  }

  // 3. Check for forbidden TypeScript patterns that break the Babel compiler
  const forbiddenPatterns: [RegExp, string][] = [
    [/\bconst\s+enum\b/, 'const enum (use regular enum)'],
    [/\bnamespace\s+\w+\s*\{/, 'namespace declaration (use ES modules)'],
    [/\bsatisfies\b/, 'satisfies operator (use explicit type annotation)'],
    [/\btype\s+\w+\s*=\s*`[^`]*\$\{/, 'template literal type (use string)'],
    [/\babstract\s+class\b/, 'abstract class (use interface)'],
    // ── Negative literal types ────────────────────────────────────────────────
    // These break Babel's browser compiler. We check every unambiguous type-position
    // form. Value positions (const x = -1, { timeout: -1 }) are NOT flagged.
    //
    // A) Union member: `| -1`  — always a type position
    [/\|\s*-\d+\b/, 'negative literal in union type (use number)'],
    // B) type alias: `type Foo = -1`  or  `type Foo = -1 | ...`
    [/\btype\s+\w+\s*(?:<[^>]*>)?\s*=\s*-\d+/, 'negative literal type alias (use number)'],
    // C) return type after closing paren: `): -1`  or  `): -1 |`
    [/\)\s*:\s*-\d+\b/, 'negative literal return type (use number)'],
    // D) interface / type-body property typed as negative literal: `propName: -1`
    //    Only flag when the colon is preceded by a word char (property name) AND
    //    followed by `-digit` then a type-boundary (pipe, semicolon, newline, `}`).
    //    This avoids matching object values like `{ delay: -1 }` because those are
    //    followed by `}` or `,` — but we DO want to catch `status: -1 | 0` in interfaces.
    //    Compromise: flag `word: -N |` (union) and `word: -N;` (interface terminator)
    //    but NOT `word: -N,` or `word: -N }` (those are almost always value objects).
    [/\w\s*:\s*-\d+\s*[|;]/, 'negative literal type annotation (use number)'],
    // E) Generic type argument that is a negative literal: `Array<-1>`
    [/<\s*-\d+\s*>/, 'negative literal generic type argument (use number)'],
  ];

  for (const file of files) {
    if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx')) continue;
    for (const [pattern, label] of forbiddenPatterns) {
      if (pattern.test(file.content)) {
        errors.push(`${file.path}: contains forbidden pattern "${label}"`);
      }
    }

    // Detect useState variables initialized as non-array that are used with array methods.
    // Pattern: useState(null|undefined|{}|0|''|false) where the variable is later .map/.filter/.reduce/.forEach'd
    const arrayMethodRe = /\b(\w+)\.(map|filter|reduce|forEach|find|some|every|flatMap|includes)\s*\(/g;
    const stateInitRe = /const\s*\[(\w+)[^\]]*\]\s*=\s*useState\s*(?:<[^>]*>)?\s*\(\s*(null|undefined|\{\}|0|''|"")\s*\)/g;

    const nonArrayStateVars = new Set<string>();
    let sm: RegExpExecArray | null;
    while ((sm = stateInitRe.exec(file.content)) !== null) {
      nonArrayStateVars.add(sm[1]);
    }

    if (nonArrayStateVars.size > 0) {
      let am: RegExpExecArray | null;
      while ((am = arrayMethodRe.exec(file.content)) !== null) {
        if (nonArrayStateVars.has(am[1])) {
          errors.push(
            `${file.path}: "${am[1]}" is initialized as non-array in useState but .${am[2]}() is called on it — initialize as []`
          );
        }
      }
    }
  }

  // 4. Check for empty files
  for (const file of files) {
    if (file.content.trim().length < 10) {
      errors.push(`${file.path}: file content is empty or too short`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── Main build agent ──────────────────────────────────────────────────────────

/** Extract the LAST FILE_MANIFEST block from a result string. */
function extractLatestManifestFromText(text: string): { path: string; content: string }[] | null {
  // Strategy: find every ```FILE_MANIFEST opening fence, then for each one collect
  // ALL possible closing ``` positions (not just the first). Try every
  // (opening, closing) pair from last-to-first so we prefer the most recent
  // complete block. This handles cases where the model emits trailing prose or
  // additional code blocks after the manifest, which would cause a naive
  // "first closing fence" scan to truncate the JSON body prematurely.
  const openRe = /```FILE_MANIFEST[ \t]*\r?\n/g;

  // Collect all opening positions
  const openings: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(text)) !== null) {
    openings.push(m.index + m[0].length); // bodyStart = first char after the fence line
  }

  if (openings.length === 0) return null;

  // Collect all closing fence positions (``` on its own line)
  const closeRe = /^```[ \t]*$/gm;
  const closings: number[] = [];
  let c: RegExpExecArray | null;
  while ((c = closeRe.exec(text)) !== null) {
    closings.push(c.index);
  }

  if (closings.length === 0) return null;

  // Build candidate bodies: for each opening (last-to-first), try each closing
  // that comes after it (last-to-first), yielding the largest possible body first.
  const candidates: string[] = [];
  for (let oi = openings.length - 1; oi >= 0; oi--) {
    const bodyStart = openings[oi];
    // Collect closings that are after bodyStart, in reverse order (largest body first)
    const validClosings = closings.filter(ci => ci > bodyStart).reverse();
    for (const ci of validClosings) {
      candidates.push(text.slice(bodyStart, ci));
    }
  }

  // Try each candidate — return the first one that parses as a valid array
  for (const body of candidates) {
    try {
      const parsed = JSON.parse(body.trim());
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as { path: string; content: string }[];
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

export async function runBuildAgent(
  jobId: string,
  userId: string,
  prompt: string,
  res: Response,
  headersAlreadySent = false,
  userRole = 'developer',
): Promise<void> {
  const t0 = Date.now();

  if (!headersAlreadySent) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  }

  try {
    // ── Phase 1: BCU Estimation (o4-mini) ─────────────────────────────────
    sseWrite(res, 'status', 'Estimating build complexity…');
    await updateJob(jobId, { status: 'planning' });

    const estimate = await estimateBcu(prompt);
    const bcuBalance = await getBcuBalance(userId, userRole);
    const sufficient = bcuBalance >= estimate.low;

    sseWrite(res, 'bcuEstimate', {
      low: estimate.low,
      high: estimate.high,
      sufficient,
      remaining: bcuBalance,
      complexity: estimate.complexity,
      reasoning: estimate.reasoning,
    });

    if (!sufficient) {
      const msg = `You do not have enough BCUs to complete this build. Estimated: ${estimate.low}–${estimate.high} BCU. Remaining: ${bcuBalance.toFixed(1)} BCU. Please purchase more or upgrade your plan.`;
      await updateJob(jobId, { status: 'failed', error: msg });
      sseWrite(res, 'error', msg);
      res.end();
      return;
    }

    // ── Phase 2: Planning (o4-mini) ───────────────────────────────────────
    sseWrite(res, 'status', 'Architecting your build…');

    const planResult = await chatCompletion(
      [
        { role: 'system', content: PLANNER_SYSTEM },
        { role: 'user', content: `Build this: ${prompt}` },
      ],
      { model: 'o4-mini', maxOutputTokens: 2048 },
    );

    let planSteps: string[] = [];
    try {
      const cleaned = planResult.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      planSteps = JSON.parse(cleaned) as string[];
      if (!Array.isArray(planSteps)) throw new Error('not an array');
    } catch {
      planSteps = planResult.text
        .split('\n')
        .map(l => l.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 10);
    }

    sseWrite(res, 'plan', planSteps);
    await updateJob(jobId, { status: 'building', plan: JSON.stringify(planSteps) });

    // ── Phase 3: Build (o3) ───────────────────────────────────────────────
    sseWrite(res, 'status', 'Building…');

    const buildMessages: ChatMessage[] = [
      { role: 'system', content: BUILDER_SYSTEM },
      {
        role: 'user',
        content: [
          `Project: ${prompt}`,
          '',
          `Engineering Plan:`,
          planSteps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
          '',
          'Execute this plan completely. Implement every feature with full fidelity.',
          'Produce production-ready, enterprise-grade output.',
          'CRITICAL: Output section 1 (one sentence), section 2 (bullets only, max 10), then IMMEDIATELY output section 3 (FILE_MANIFEST). Do not write anything between section 2 and the FILE_MANIFEST block. The FILE_MANIFEST must start within the first 2000 tokens of your response.',
        ].join('\n'),
      },
    ];

    let result = '';
    let currentStep = -1;
    let manifestFound = false;
    let outputTokenCount = 0;

    console.log(JSON.stringify({ event: 'agent.build.start', jobId, steps: planSteps.length }));

    const stepPatterns = planSteps.map(
      (_, i) => new RegExp(`##\\s*(?:Step\\s*)?${i + 1}[.:]?\\s`, 'i'),
    );

    // Track section progress for UI step advancement
    const sectionPatterns = [
      /##\s*1\.\s*Project Summary/i,
      /##\s*2\.\s*Implementation Plan/i,
      /##\s*3\.\s*FILE_MANIFEST|```FILE_MANIFEST/i,
    ];

    const buildResult = await chatCompletion(buildMessages, {
      model: 'o3',
      stream: true,
      maxOutputTokens: 100_000,
      onToken: (token) => {
        result += token;
        outputTokenCount++;
        sseWrite(res, 'token', token);

        if (!manifestFound && result.includes('```FILE_MANIFEST')) {
          manifestFound = true;
          console.log(JSON.stringify({ event: 'agent.manifest.found', jobId, approxTokens: outputTokenCount }));
        }

        // Advance plan step UI based on section headers OR original step patterns
        const tail = result.slice(-300);
        for (let i = 0; i < stepPatterns.length; i++) {
          if (i > currentStep && (stepPatterns[i].test(tail) || sectionPatterns[Math.min(i, sectionPatterns.length - 1)].test(tail))) {
            currentStep = i;
            sseWrite(res, 'step', { index: i, text: planSteps[i] });
          }
        }
      },
    });

    const totalTokens = (planResult.inputTokens + planResult.outputTokens) + buildResult.outputTokens;
    const bcuUsed = tokensToBcu(totalTokens);

    console.log(JSON.stringify({ event: 'agent.build.complete', jobId, manifestFound, outputTokens: buildResult.outputTokens, totalTokens }));

    // ── Manifest rescue pass ──────────────────────────────────────────────────
    // If the build hit the token limit before writing the FILE_MANIFEST, make a
    // second focused call that extracts just the manifest from what was written.
    if (!manifestFound) {
      sseWrite(res, 'status', 'Extracting file manifest…');
      const rescueMessages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are a code extraction assistant. Given a partial build output, extract all source files and produce a valid FILE_MANIFEST JSON block. Output ONLY the FILE_MANIFEST block — nothing else.

Format:
\`\`\`FILE_MANIFEST
[
  { "path": "src/App.tsx", "content": "..." }
]
\`\`\`

Rules:
- Include every file found in the build output (App.tsx, main.tsx, index.css, all screens, components, hooks, types, data files)
- Do NOT include index.html, package.json, vite.config.ts, tsconfig.json
- Escape all strings: newlines as \\n, double quotes as \\"
- Valid JSON only — no trailing commas, no comments
- If a file was partially written, complete it to a working state`,
        },
        {
          role: 'user',
          content: `Here is the build output. Extract all source files and produce the FILE_MANIFEST:\n\n${result.slice(-60_000)}`,
        },
      ];

      const rescueResult = await chatCompletion(rescueMessages, {
        model: 'o3',
        stream: true,
        maxOutputTokens: 40_000,
        onToken: (token) => {
          result += token;
          sseWrite(res, 'token', token);
          if (!manifestFound && result.includes('```FILE_MANIFEST')) {
            manifestFound = true;
          }
        },
      });

      const rescueTokens = rescueResult.outputTokens;
      const totalTokensWithRescue = totalTokens + rescueTokens;
      const bcuUsedWithRescue = tokensToBcu(totalTokensWithRescue);

      // ── Phase 4: Validate + Done ──────────────────────────────────────────
      const durationMs = Date.now() - t0;

      // Run the same validate → auto-fix loop on the rescued manifest
      sseWrite(res, 'status', 'Validating rescued build output…');
      let rescuedFiles = extractLatestManifestFromText(result);
      let rescueFixAttempts = 0;

      while (rescuedFiles) {
        const validation = validateManifest(rescuedFiles);
        console.log(JSON.stringify({ event: 'agent.rescue.validation', jobId, valid: validation.valid, errors: validation.errors, attempt: rescueFixAttempts }));
        if (validation.valid || rescueFixAttempts >= 1) break;

        rescueFixAttempts++;
        sseWrite(res, 'status', `Fixing ${validation.errors.length} issue${validation.errors.length === 1 ? '' : 's'} in rescued build…`);

        const errorList = validation.errors.map(e => `- ${e}`).join('\n');
        let fixOutput = '';
        let fixFound = false;

        await chatCompletion([
          { role: 'system', content: `You are a senior React/TypeScript engineer. Fix every listed error in the FILE_MANIFEST. Output ONLY a corrected FILE_MANIFEST block.\n\nFORBIDDEN (break the preview compiler — replace ALL occurrences):\n- const enum → use regular enum\n- namespace declarations → use ES modules\n- satisfies operator → use explicit type annotation\n- template literal types → use string\n- abstract class → use interface\n- negative literal types IN ANY FORM: type Foo = -1, type Foo = -1 | 0, | -1 in unions, function f(): -1, interface X { s: -1 | 0 }, x: -1 | 0 — ALL forbidden. Replace with number or a non-negative union.\n\nOutput format:\n\`\`\`FILE_MANIFEST\n[...]\n\`\`\`` },
          { role: 'user', content: `Fix these errors:\n${errorList}\n\nCurrent FILE_MANIFEST:\n\`\`\`FILE_MANIFEST\n${JSON.stringify(rescuedFiles, null, 2)}\n\`\`\`` },
        ], {
          model: 'o4-mini',
          stream: true,
          maxOutputTokens: 32_000,
          onToken: (token) => {
            fixOutput += token;
            result += token;
            sseWrite(res, 'token', token);
            if (!fixFound && fixOutput.includes('```FILE_MANIFEST')) fixFound = true;
          },
        });

        if (!fixFound) break;
        rescuedFiles = extractLatestManifestFromText(result);
      }

      // If the rescue + fix loop still produced no manifest, fail the job clearly
      // instead of saving a 'complete' result that will always error on preview.
      if (!rescuedFiles) {
        const errMsg = 'Build output was truncated before the FILE_MANIFEST could be written. Please try again with a simpler prompt, or break the project into smaller pieces.';
        await updateJob(jobId, { status: 'failed', error: errMsg, durationMs });
        sseWrite(res, 'error', errMsg);
        return;
      }

      // Advance all remaining plan steps to done so the UI shows them complete
      for (let i = currentStep + 1; i < planSteps.length; i++) {
        sseWrite(res, 'step', { index: i, text: planSteps[i] });
      }

      await updateJob(jobId, { status: 'complete', result, durationMs });
      // Deduct BCUs — best-effort: log on failure but don't withhold the result
      try {
        const newBalance = await deductBcu(userId, bcuUsedWithRescue);
        console.log(JSON.stringify({ event: 'agent.bcu.deducted', jobId, bcuUsed: bcuUsedWithRescue, newBalance }));
      } catch (deductErr) {
        console.error(JSON.stringify({ event: 'agent.bcu.deduct_failed', jobId, error: String(deductErr) }));
      }
      sseWrite(res, 'done', { result, durationMs, bcuUsed: bcuUsedWithRescue });
    } else {

      sseWrite(res, 'status', 'Validating build output…');

      // Helper: extract the latest FILE_MANIFEST from the result string
      // (uses the shared extractLatestManifestFromText defined above)

      let files = extractLatestManifestFromText(result);

      // If the manifest block exists in the text but JSON.parse failed, fail clearly
      if (!files) {
        const errMsg = 'Build completed but the FILE_MANIFEST could not be parsed. Please try again.';
        const durationMs = Date.now() - t0;
        await updateJob(jobId, { status: 'failed', error: errMsg, durationMs });
        sseWrite(res, 'error', errMsg);
        return;
      }

      let fixAttempts = 0;
      const MAX_FIX_ATTEMPTS = 1;

      while (files) {
        const validation = validateManifest(files);

        console.log(JSON.stringify({
          event: 'agent.validation.result',
          jobId,
          attempt: fixAttempts,
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          fileCount: files.length,
        }));

        // If valid (or only warnings remain), we're done
        if (validation.valid) break;

        // If we've already tried twice, give up and proceed with what we have
        if (fixAttempts >= MAX_FIX_ATTEMPTS) {
          console.log(JSON.stringify({ event: 'agent.validation.gave_up', jobId, errors: validation.errors }));
          break;
        }

        fixAttempts++;
        sseWrite(res, 'status', `Fixing ${validation.errors.length} issue${validation.errors.length === 1 ? '' : 's'} found in build…`);
        console.log(JSON.stringify({ event: 'agent.autofix.start', jobId, attempt: fixAttempts, errors: validation.errors }));

        // Build the fix prompt with the specific errors
        const errorList = validation.errors.map(e => `- ${e}`).join('\n');
        const warningList = validation.warnings.length > 0
          ? '\n\nWarnings (fix if possible):\n' + validation.warnings.map(w => `- ${w}`).join('\n')
          : '';

        const fixMessages: ChatMessage[] = [
          {
            role: 'system',
            content: `You are a senior React/TypeScript engineer performing an automated code review and fix pass.

You will be given a FILE_MANIFEST containing React/TypeScript source files, along with a list of validation errors that must be fixed.

Your job:
1. Fix every error listed — missing exports, unresolved imports, undefined components, forbidden TypeScript patterns
2. Ensure every import resolves to a file that exists in the manifest
3. Ensure every component that is imported is actually exported from its file
4. Do NOT change any working functionality — only fix the listed issues
5. Output ONLY a corrected FILE_MANIFEST block — no explanation, no prose

FORBIDDEN TypeScript patterns (will break the preview compiler):
- const enum → use regular enum
- namespace declarations → use ES modules  
- satisfies operator → use explicit type annotation
- template literal types → use string
- abstract class → use interface
- negative literal types IN ANY FORM — ALL forbidden, replace with number or non-negative union:
    type Foo = -1 | 0 | 1  →  type Foo = number
    type Bar = -1           →  type Bar = number
    function f(): -1        →  function f(): number
    interface X { s: -1 | 0 }  →  interface X { s: number }
    | -1 in any union       →  remove the negative member, use number

Output format — ONLY this, nothing else:
\`\`\`FILE_MANIFEST
[{ "path": "...", "content": "..." }]
\`\`\``,
          },
          {
            role: 'user',
            content: `Fix these validation errors in the FILE_MANIFEST:\n\nErrors:\n${errorList}${warningList}\n\nCurrent FILE_MANIFEST:\n\`\`\`FILE_MANIFEST\n${JSON.stringify(files, null, 2)}\n\`\`\``,
          },
        ];

        let fixOutput = '';
        let fixManifestFound = false;

        await chatCompletion(fixMessages, {
          model: 'o4-mini',
          stream: true,
          maxOutputTokens: 32_000,
          onToken: (token) => {
            fixOutput += token;
            result += token;
            sseWrite(res, 'token', token);
            if (!fixManifestFound && fixOutput.includes('```FILE_MANIFEST')) {
              fixManifestFound = true;
            }
          },
        });

        console.log(JSON.stringify({ event: 'agent.autofix.complete', jobId, attempt: fixAttempts, manifestFound: fixManifestFound }));

        if (!fixManifestFound) break; // fix pass produced nothing useful

        // Re-extract the manifest from the updated result and loop
        files = extractLatestManifestFromText(result);
      }

      const durationMs = Date.now() - t0;
      // Advance all remaining plan steps to done so the UI shows them complete
      for (let i = currentStep + 1; i < planSteps.length; i++) {
        sseWrite(res, 'step', { index: i, text: planSteps[i] });
      }
      await updateJob(jobId, { status: 'complete', result, durationMs });
      // Deduct BCUs — best-effort: log on failure but don't withhold the result
      try {
        const newBalance = await deductBcu(userId, bcuUsed);
        console.log(JSON.stringify({ event: 'agent.bcu.deducted', jobId, bcuUsed, newBalance }));
      } catch (deductErr) {
        console.error(JSON.stringify({ event: 'agent.bcu.deduct_failed', jobId, error: String(deductErr) }));
      }
      sseWrite(res, 'done', { result, durationMs, bcuUsed });
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ event: 'agent.error', jobId, error: message }));
    await updateJob(jobId, { status: 'failed', error: message });
    sseWrite(res, 'error', message);
  } finally {
    res.end();
  }
}

// ── Refinement agent ──────────────────────────────────────────────────────────

export async function runRefineAgent(
  jobId: string,
  userId: string,
  refinePrompt: string,
  existingResult: string,
  res: Response,
  headersAlreadySent = false,
): Promise<void> {
  const t0 = Date.now();

  if (!headersAlreadySent) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  }

  try {
    sseWrite(res, 'status', 'Refining your application…');
    await updateJob(jobId, { status: 'building' });

    // Extract just the FILE_MANIFEST to keep context tight.
    // Use the LAST occurrence — a prior auto-fix pass may have appended a corrected
    // manifest after the original, and we always want the most recent one.
    const allManifestMatches = [...existingResult.matchAll(/```FILE_MANIFEST\s*([\s\S]*?)```/g)];
    const manifestMatch = allManifestMatches.length > 0 ? allManifestMatches[allManifestMatches.length - 1] : null;
    const existingManifest = manifestMatch
      ? manifestMatch[1].trim()
      : existingResult.slice(-12_000);

    const messages: ChatMessage[] = [
      { role: 'system', content: REFINER_SYSTEM },
      {
        role: 'user',
        content: [
          'Here is the current app\'s FILE_MANIFEST:',
          '',
          '```FILE_MANIFEST',
          existingManifest,
          '```',
          '',
          `Refinement request: ${refinePrompt}`,
          '',
          'Output the complete updated FILE_MANIFEST.',
        ].join('\n'),
      },
    ];

    let result = '';

    const refineResult = await chatCompletion(messages, {
      model: 'o3',
      stream: true,
      maxOutputTokens: 100_000,
      onToken: (token) => {
        result += token;
        sseWrite(res, 'token', token);
      },
    });

    const bcuUsed = tokensToBcu(refineResult.inputTokens + refineResult.outputTokens);

    // ── Validate + auto-fix (same logic as build agent) ───────────────────
    sseWrite(res, 'status', 'Validating refined output…');

    function extractLatestManifestRefine(text: string): { path: string; content: string }[] | null {
      return extractLatestManifestFromText(text);
    }

    let refineFiles = extractLatestManifestRefine(result);
    let refineFixAttempts = 0;

    while (refineFiles) {
      const validation = validateManifest(refineFiles);
      console.log(JSON.stringify({ event: 'agent.refine.validation', jobId, valid: validation.valid, errors: validation.errors, attempt: refineFixAttempts }));
      if (validation.valid || refineFixAttempts >= 1) break;

      refineFixAttempts++;
      sseWrite(res, 'status', `Fixing ${validation.errors.length} issue${validation.errors.length === 1 ? '' : 's'} in refined build…`);

      const errorList = validation.errors.map(e => `- ${e}`).join('\n');
      let fixOutput = '';
      let fixFound = false;

      await chatCompletion([
        { role: 'system', content: `You are a senior React/TypeScript engineer. Fix every listed error in the FILE_MANIFEST. Output ONLY a corrected FILE_MANIFEST block.\n\nFORBIDDEN (break the preview compiler — replace ALL occurrences):\n- const enum → use regular enum\n- namespace declarations → use ES modules\n- satisfies operator → use explicit type annotation\n- template literal types → use string\n- abstract class → use interface\n- negative literal types IN ANY FORM: type Foo = -1, type Foo = -1 | 0, | -1 in unions, function f(): -1, interface X { s: -1 | 0 }, x: -1 | 0 — ALL forbidden. Replace with number or a non-negative union.\n\nOutput format:\n\`\`\`FILE_MANIFEST\n[...]\n\`\`\`` },
        { role: 'user', content: `Fix these errors:\n${errorList}\n\nCurrent FILE_MANIFEST:\n\`\`\`FILE_MANIFEST\n${JSON.stringify(refineFiles, null, 2)}\n\`\`\`` },
      ], {
        model: 'o4-mini',
        stream: true,
        maxOutputTokens: 32_000,
        onToken: (token) => {
          fixOutput += token;
          result += token;
          sseWrite(res, 'token', token);
          if (!fixFound && fixOutput.includes('```FILE_MANIFEST')) fixFound = true;
        },
      });

      if (!fixFound) break;
      refineFiles = extractLatestManifestRefine(result);
    }

    const durationMs = Date.now() - t0;
    await updateJob(jobId, { status: 'complete', result, durationMs });
    // Deduct BCUs for the refinement — best-effort
    try {
      const newBalance = await deductBcu(userId, bcuUsed);
      console.log(JSON.stringify({ event: 'agent.refine.bcu.deducted', jobId, bcuUsed, newBalance }));
    } catch (deductErr) {
      console.error(JSON.stringify({ event: 'agent.refine.bcu.deduct_failed', jobId, error: String(deductErr) }));
    }
    sseWrite(res, 'done', { result, durationMs, bcuUsed });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ event: 'agent.refine.error', jobId, error: message }));
    await updateJob(jobId, { status: 'failed', error: message });
    sseWrite(res, 'error', message);
  } finally {
    res.end();
  }
}
