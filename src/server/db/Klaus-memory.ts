/**
 * Klaus cross-session memory store.
 * Loads/saves the learning state from MySQL via Drizzle.
 * In-process cache with 5-minute TTL — near-zero latency on hot path.
 */
import { db } from './client';
import { sql } from 'drizzle-orm';

export interface KlausKnowledge {
  knowledgeChunks: string[];
  faqs: { q: string; a: string; count: number }[];
  topicWeights: Record<string, number>;
  conversionSignals: string[];
  learnedKeywords: string[];
  insights: string[];
  lastAnalyzedAt: number;
  totalConversations: number;
  totalLeads: number;
}

const DEFAULT: KlausKnowledge = {
  knowledgeChunks: [], faqs: [], topicWeights: {},
  conversionSignals: [], learnedKeywords: [], insights: [],
  lastAnalyzedAt: 0, totalConversations: 0, totalLeads: 0,
};

let _cache: KlausKnowledge | null = null;
let _cacheAt = 0;
const TTL = 5 * 60 * 1000;

export async function loadMemory(): Promise<KlausKnowledge> {
  if (_cache && Date.now() - _cacheAt < TTL) return _cache;
  try {
    const result = await db.execute(sql`SELECT mem_value FROM Klaus_memory WHERE mem_key = 'main' LIMIT 1`);
    const rows = (result as any).rows ?? (result as any)[0] ?? [];
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (row?.mem_value) {
      _cache = { ...DEFAULT, ...JSON.parse(row.mem_value) };
      _cacheAt = Date.now();
      return _cache;
    }
  } catch (err) {
    console.error(JSON.stringify({ event: 'Klaus.memory.load.error', error: String(err) }));
  }
  _cache = { ...DEFAULT };
  _cacheAt = Date.now();
  return _cache;
}

export async function saveMemory(patch: Partial<KlausKnowledge>): Promise<void> {
  const current = await loadMemory();
  const updated: KlausKnowledge = { ...current, ...patch };
  _cache = updated;
  _cacheAt = Date.now();
  const val = JSON.stringify(updated);
  try {
    await db.execute(sql`
      INSERT INTO Klaus_memory (mem_key, mem_value) VALUES ('main', ${val})
      ON DUPLICATE KEY UPDATE mem_value = ${val}, updated_at = CURRENT_TIMESTAMP(3)
    `);
  } catch (err) {
    console.error(JSON.stringify({ event: 'Klaus.memory.save.error', error: String(err) }));
  }
}
