/**
 * POST /api/dashboard/extract
 *
 * Dashboard "Try It" proxy. Authenticated via session (not API key).
 * Looks up the user's API key by ID, then calls the extraction logic
 * directly so the raw key never has to leave the server.
 */

import type { RequestHandler } from 'express';
import { requireSession } from '@/server/lib/require-session';
import { db } from '@/server/db/client';
import { apiKey, apiLog } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

function estimateTokens(text: string) { return Math.ceil(text.length / 4); }

function extractStructuredData(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Truncate to 50k chars max for safety before any regex work
  const safeText = text.length > 50_000 ? text.slice(0, 50_000) : text;

  // ── Dates ─────────────────────────────────────────────────────────────────
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

  const moneyPattern = /\$[\d,]+(?:\.\d{2})?|\b[\d,]+(?:\.\d{2})? (?:USD|EUR|GBP)\b/g;
  const amounts = [...safeText.matchAll(moneyPattern)].map(m => m[0].trim());
  if (amounts.length > 0) result.amounts = [...new Set(amounts)];

  const invoiceMatch = safeText.match(/(?:invoice|order|reference|document)\s*(?:#|no\.|number):\s*([A-Z0-9\-]{1,30})/i);
  if (invoiceMatch) result.documentNumber = invoiceMatch[1].trim();

  const fromMatch = safeText.match(/(?:from|vendor|seller|billed by):\s*([^\n,]{3,60})/i);
  const toMatch   = safeText.match(/(?:to|client|buyer|billed to|customer):\s*([^\n,]{3,60})/i);
  if (fromMatch) result.from = fromMatch[1].trim();
  if (toMatch)   result.to   = toMatch[1].trim();

  const emails = [...safeText.matchAll(/[a-zA-Z0-9._%+\-]{1,64}@[a-zA-Z0-9.\-]{1,253}\.[a-zA-Z]{2,6}/g)].map(m => m[0]);
  if (emails.length > 0) result.emails = [...new Set(emails)];

  const phones = [...safeText.matchAll(/(?:\+?1[.\-\s]?)?\(?\d{3}\)?[.\-\s]\d{3}[.\-\s]\d{4}/g)].map(m => m[0].trim());
  if (phones.length > 0) result.phones = [...new Set(phones)];

  // Line items: split each line first, then test with a simple pattern to avoid ReDoS
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

  // Key-value pairs: split on newlines first to avoid multiline ReDoS
  const kv: Record<string, string> = {};
  const skipKeys = new Set(['date', 'from', 'to', 'invoice', 'order', 'reference', 'document']);
  const kvLinePattern = /^([A-Za-z][A-Za-z ]{1,29}):\s*(.{1,120})$/;
  for (const line of safeText.split('\n')) {
    if (line.length > 160) continue;
    const m = kvLinePattern.exec(line.trim());
    if (!m) continue;
    const k = m[1].trim().toLowerCase().replace(/\s+/g, '_');
    const v = m[2].trim();
    if (!skipKeys.has(k) && v.length > 0 && v.length < 120 && !result[k]) kv[k] = v;
  }
  if (Object.keys(kv).length > 0) result.fields = kv;

  const firstLine = safeText.split('\n').find(l => l.trim().length > 10)?.trim();
  if (firstLine) result.title = firstLine.slice(0, 100);
  result._wordCount = safeText.split(/\s+/).filter(Boolean).length;

  return result;
}

const handler: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const { document: docInput, filename, apiKeyId } = req.body as {
    document?: string; filename?: string; apiKeyId?: string;
  };

  if (!docInput || typeof docInput !== 'string') {
    res.status(400).json({ error: 'Bad Request', message: 'document field is required.' });
    return;
  }

  // Verify the key belongs to this user
  const whereClause = apiKeyId
    ? and(eq(apiKey.id, apiKeyId), eq(apiKey.userId, userId))
    : eq(apiKey.userId, userId);
  const [key] = await db.select().from(apiKey).where(whereClause).limit(1);
  if (!key) {
    res.status(400).json({ error: 'Bad Request', message: 'API key not found.' });
    return;
  }

  const start = Date.now();
  const extracted = extractStructuredData(docInput);
  const durationMs   = Date.now() - start;
  const inputTokens  = estimateTokens(docInput);
  const outputTokens = estimateTokens(JSON.stringify(extracted));
  const logId        = randomUUID();

  // Log the call
  Promise.all([
    db.insert(apiLog).values({
      id: logId, userId, apiKeyId: key.id, apiKeyPrefix: key.keyPrefix,
      endpoint: '/v1/extract', method: 'POST', statusCode: 200,
      durationMs, inputTokens, outputTokens,
      documentName: filename ?? 'dashboard-try-it',
      errorMessage: null, responseBody: extracted, createdAt: new Date(),
    }),
    db.update(apiKey).set({ requestCount: key.requestCount + 1, lastUsedAt: new Date() }).where(eq(apiKey.id, key.id)),
  ]).catch(err => console.error('dashboard.extract.log.error', err));

  res.json({
    id: logId,
    extracted,
    metadata: { inputTokens, outputTokens, durationMs, model: 'syntract-extract-v1' },
  });
};

export default [requireSession, handler] as RequestHandler[];
