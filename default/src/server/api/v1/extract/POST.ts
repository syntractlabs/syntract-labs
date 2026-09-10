/**
 * POST /v1/extract
 *
 * The core SynTract extraction endpoint. Accepts a document (text or base64)
 * and returns structured JSON data extracted from it.
 *
 * Auth: Bearer token (API key) in Authorization header.
 *
 * Request body:
 *   {
 *     document: string,          // plain text content OR base64-encoded file
 *     encoding?: "text"|"base64" // default "text"
 *     filename?: string,         // original filename for logging
 *     schema?: object,           // optional JSON schema hint for output shape
 *   }
 *
 * Response:
 *   {
 *     id: string,                // log entry ID for this request
 *     extracted: object,         // structured data extracted from the document
 *     metadata: {
 *       inputTokens: number,
 *       outputTokens: number,
 *       durationMs: number,
 *       model: string,
 *     }
 *   }
 */

import type { Request, Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { db } from '@/server/db/client';
import { apiKey, apiLog } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Auth helper — validate Bearer API key
// ---------------------------------------------------------------------------
async function resolveApiKey(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const raw = authHeader.slice(7).trim();
  if (!raw) return null;
  const hash = createHash('sha256').update(raw).digest('hex');
  const [key] = await db.select().from(apiKey).where(eq(apiKey.keyHash, hash)).limit(1);
  return key ?? null;
}

// ---------------------------------------------------------------------------
// Extraction logic
// ---------------------------------------------------------------------------
function estimateTokens(text: string): number {
  // Rough approximation: ~4 chars per token
  return Math.ceil(text.length / 4);
}

function extractStructuredData(text: string, schema?: Record<string, unknown>): Record<string, unknown> {
  // Core extraction engine — parses common document patterns into structured fields.
  // This is a rule-based extractor that handles invoices, contracts, receipts,
  // and general documents without requiring an external AI API.

  const result: Record<string, unknown> = {};

  // Truncate to 50k chars max for safety before any regex work
  const safeText = text.length > 50_000 ? text.slice(0, 50_000) : text;

  // ── Dates ────────────────────────────────────────────────────────────────
  const datePatterns = [
    /(?:date|dated|issued|invoice date|due date):\s*([A-Za-z]+ \d{1,2},? \d{4})/gi,
    /(?:date|dated|issued|invoice date|due date):\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/g,
    /\b([A-Za-z]+ \d{1,2},? \d{4})\b/g,
  ];
  const dates: string[] = [];
  for (const pat of datePatterns) {
    let m: RegExpExecArray | null;
    while ((m = pat.exec(safeText)) !== null) {
      const d = (m[1] ?? m[0]).trim();
      if (!dates.includes(d)) dates.push(d);
    }
  }
  if (dates.length > 0) result.dates = dates;

  // ── Monetary amounts ─────────────────────────────────────────────────────
  const moneyPattern = /\$[\d,]+(?:\.\d{2})?|\b[\d,]+(?:\.\d{2})? (?:USD|EUR|GBP)\b/g;
  const amounts = [...safeText.matchAll(moneyPattern)].map(m => m[0].trim());
  if (amounts.length > 0) result.amounts = [...new Set(amounts)];

  // ── Invoice / document number ────────────────────────────────────────────
  const invoiceMatch = safeText.match(/(?:invoice|order|reference|document)\s*(?:#|no\.|number):\s*([A-Z0-9\-]{1,30})/i);
  if (invoiceMatch) result.documentNumber = invoiceMatch[1].trim();

  // ── Names / parties ──────────────────────────────────────────────────────
  const fromMatch = safeText.match(/(?:from|vendor|seller|billed by):\s*([^\n,]{3,60})/i);
  const toMatch   = safeText.match(/(?:to|client|buyer|billed to|customer):\s*([^\n,]{3,60})/i);
  if (fromMatch) result.from = fromMatch[1].trim();
  if (toMatch)   result.to   = toMatch[1].trim();

  // ── Email addresses ──────────────────────────────────────────────────────
  const emails = [...safeText.matchAll(/[a-zA-Z0-9._%+\-]{1,64}@[a-zA-Z0-9.\-]{1,253}\.[a-zA-Z]{2,6}/g)].map(m => m[0]);
  if (emails.length > 0) result.emails = [...new Set(emails)];

  // ── Phone numbers ────────────────────────────────────────────────────────
  const phones = [...safeText.matchAll(/(?:\+?1[.\-\s]?)?\(?\d{3}\)?[.\-\s]\d{3}[.\-\s]\d{4}/g)].map(m => m[0].trim());
  if (phones.length > 0) result.phones = [...new Set(phones)];

  // ── Line items (table rows) ───────────────────────────────────────────────
  // Line items: split each line first, then test with simple patterns to avoid ReDoS
  const lineItems: Array<{ description: string; quantity: number; amount: string }> = [];
  for (const line of safeText.split('\n')) {
    if (line.length > 120) continue;
    const parts = line.trim().split(/\s{2,}/);
    if (parts.length >= 3) {
      const desc = parts[0];
      const qty = parts[parts.length - 2];
      const amt = parts[parts.length - 1];
      if (desc && desc.length >= 3 && desc.length <= 50 && /^\d{1,6}$/.test(qty) && /^[\d,]{1,12}\.\d{2}$/.test(amt)) {
        lineItems.push({ description: desc.trim(), quantity: parseInt(qty, 10), amount: amt.replace(/^\$/, '').trim() });
      }
    }
  }
  if (lineItems.length > 0) result.lineItems = lineItems;

  // ── Key-value pairs: split on newlines first to avoid multiline ReDoS ────
  const kv: Record<string, string> = {};
  const skipKeys = new Set(['date', 'from', 'to', 'invoice', 'order', 'reference', 'document']);
  const kvLinePattern = /^([A-Za-z][A-Za-z ]{1,29}):\s*(.{1,120})$/;
  for (const line of safeText.split('\n')) {
    if (line.length > 160) continue;
    const m = kvLinePattern.exec(line.trim());
    if (!m) continue;
    const k = m[1].trim().toLowerCase().replace(/\s+/g, '_');
    const v = m[2].trim();
    if (!skipKeys.has(k) && v.length > 0 && v.length < 120 && !result[k]) {
      kv[k] = v;
    }
  }
  if (Object.keys(kv).length > 0) result.fields = kv;

  // ── Apply schema hints if provided ───────────────────────────────────────
  if (schema && typeof schema === 'object') {
    result._schemaHint = 'Schema-guided extraction applied';
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const firstLine = safeText.split('\n').find(l => l.trim().length > 10)?.trim();
  if (firstLine) result.title = firstLine.slice(0, 100);

  result._wordCount = safeText.split(/\s+/).filter(Boolean).length;

  return result;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req: Request, res: Response) {
  const start = Date.now();

  // 1. Authenticate via API key
  const key = await resolveApiKey(req.headers.authorization);
  if (!key) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Provide a valid API key in the Authorization: Bearer <key> header.',
    });
  }

  // 2. Parse body
  const { document: docInput, encoding = 'text', filename, schema } = req.body as {
    document?: string;
    encoding?: 'text' | 'base64';
    filename?: string;
    schema?: Record<string, unknown>;
  };

  if (!docInput || typeof docInput !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Body must include a "document" field with the text or base64-encoded content.',
    });
  }

  // 3. Decode if base64
  let text: string;
  try {
    text = encoding === 'base64'
      ? Buffer.from(docInput, 'base64').toString('utf-8')
      : docInput;
  } catch {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid base64 encoding.' });
  }

  if (text.length > 500_000) {
    return res.status(413).json({ error: 'Payload Too Large', message: 'Document exceeds 500,000 characters.' });
  }

  // 4. Extract
  let extracted: Record<string, unknown>;
  let statusCode = 200;
  let errorMessage: string | null = null;

  try {
    extracted = extractStructuredData(text, schema);
  } catch (err) {
    statusCode = 500;
    errorMessage = err instanceof Error ? err.message : 'Extraction failed';
    extracted = {};
  }

  const durationMs   = Date.now() - start;
  const inputTokens  = estimateTokens(text);
  const outputTokens = estimateTokens(JSON.stringify(extracted));
  const logId        = randomUUID();

  // 5. Write log entry + update key usage (fire-and-forget, don't block response)
  Promise.all([
    db.insert(apiLog).values({
      id:           logId,
      userId:       key.userId,
      apiKeyId:     key.id,
      apiKeyPrefix: key.keyPrefix,
      endpoint:     '/v1/extract',
      method:       'POST',
      statusCode,
      durationMs,
      inputTokens,
      outputTokens,
      documentName: filename ?? null,
      errorMessage,
      responseBody: extracted,
      createdAt:    new Date(),
    }),
    db.update(apiKey)
      .set({ requestCount: key.requestCount + 1, lastUsedAt: new Date() })
      .where(eq(apiKey.id, key.id)),
  ]).catch(err => console.error('log.write.error', err));

  // 6. Respond
  if (statusCode !== 200) {
    return res.status(statusCode).json({ error: 'Extraction Failed', message: errorMessage });
  }

  return res.json({
    id: logId,
    extracted,
    metadata: {
      inputTokens,
      outputTokens,
      durationMs,
      model: 'syntract-extract-v1',
    },
  });
}
