import type { Request, Response } from "express";
import https from "node:https";
import { loadMemory, saveMemory } from "../../db/Klaus-memory";
import type { KlausKnowledge } from "../../db/Klaus-memory";

interface KlausSession {
  id: string; lastActive: number;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  topics: Record<string, number>; intentSignals: string[];
  leadScore: number; stage: "discovery" | "interest" | "intent" | "ready";
  askedForContact: boolean; userInfo: { name?: string; email?: string; company?: string };
}

const sessions = new Map<string, KlausSession>();
setInterval(() => { const c = Date.now() - 3_600_000; for (const [id, s] of sessions) { if (s.lastActive < c) sessions.delete(id); } }, 1_800_000);

function mkUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const PERSONA = `You are Klaus, Commander of SynTract CorTex.

CRITICAL RULE: ALWAYS answer the user question fully and directly in 3-5 sentences. Never say "No response" or give a non-answer. If asked what a product does, explain it clearly and succinctly.

VOICE: Authoritative, direct, no filler. Never say "Great!", "Absolutely!", "Sure!", "Of course!", "Happy to help!". Answer first — redirect after.

PRODUCTS:

Build Engine — Autonomous software creation. Designs, engineers, and deploys production-ready software end-to-end: full-stack web apps, mobile apps (iOS/Android), AI agents, APIs, games, SaaS platforms, internal tools, dashboards, microservices, enterprise systems. No human developers required.

BCU Pricing: Landing page 0.5 BCU · Mobile app 2 BCUs · Full-stack web app 4 BCUs · AI agent pipeline 3 BCUs · 2D game 3 BCUs · Enterprise system 8 BCUs.
Plans: Free (2 BCUs, no card) · Starter $49/mo 12 BCUs · Professional $199/mo 48 BCUs · Team $499/mo 120 BCUs · Enterprise custom.

Scout — Autonomous real estate intelligence. Always-on market analyst: discovers on-market and off-market listings, tracks buyer/seller intent signals, analyzes neighborhoods, schools, comparable sales, investment scoring. Operates 24/7 without a human analyst.

Shield (Coming Soon) — Autonomous insurance operations. Drafts carrier-grade communications, manages compliance and renewal calendars, prepares underwriting files. Early access at syntract.net.

ROUTING: Software/apps/digital → Build Engine. Real estate/property/investing → Scout. Insurance/risk/compliance → Shield. Signup → syntract.net/signup.`;

const TOPICS: Record<string, string[]> = {
  build:   ["build","app","software","website","mobile","api","saas","deploy","code","develop","tool","dashboard","game","agent","platform","startup"],
  scout:   ["scout","real estate","property","listing","realtor","mls","buyer","seller","market","neighborhood","investment","deal","house","home"],
  shield:  ["shield","insurance","risk","compliance","underwriting","policy","broker","renewal"],
  pricing: ["price","pricing","cost","bcu","plan","starter","professional","how much","fee","subscription"],
  intent:  ["sign up","signup","get started","try","demo","access","begin","timeline","launch","how do i start"],
};
const WEIGHTS: Record<string, number> = { pricing:15, intent:25, build:10, scout:10, shield:10 };

function getTopics(text: string): string[] {
  const t = text.toLowerCase();
  return Object.entries(TOPICS).filter(([,kws]) => kws.some(kw => t.includes(kw))).map(([k]) => k);
}

function updateSession(s: KlausSession, msg: string): void {
  const email = msg.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];
  if (email) s.userInfo.email = email;
  const name = msg.match(/(?:i'?m|my name is|this is|call me)\s+([A-Z][a-z]+)/i)?.[1];
  if (name) s.userInfo.name = name;
  const topics = getTopics(msg);
  for (const t of topics) s.topics[t] = (s.topics[t] || 0) + 1;
  if (TOPICS.intent.some(kw => msg.toLowerCase().includes(kw))) s.intentSignals.push(msg.slice(0, 100));
  let score = s.leadScore;
  for (const t of topics) score += (WEIGHTS[t] || 5) / (s.topics[t] || 1);
  if (s.userInfo.email) score = Math.max(score, 70);
  s.leadScore = Math.min(Math.round(score), 100);
  if (s.leadScore >= 70) s.stage = "ready";
  else if (s.leadScore >= 45) s.stage = "intent";
  else if (s.leadScore >= 20) s.stage = "interest";
  else s.stage = "discovery";
}

function buildContext(s: KlausSession): string {
  const lines: string[] = [];
  const top = Object.entries(s.topics).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([t])=>t);
  if (top.length) lines.push(`[CONTEXT] User has focused on: ${top.join(", ")}.`);
  if (s.userInfo.name) lines.push(`[USER] Name: ${s.userInfo.name}.`);
  if (s.stage === "intent" && !s.askedForContact && !s.userInfo.email) {
    lines.push(`[ACTION] After your answer, ask for their name and email in one sentence to route them.`);
    s.askedForContact = true;
  }
  if (s.stage === "ready") lines.push(`[ACTION] Direct them to syntract.net/signup.`);
  return lines.join("\n");
}

function callOpenAI(messages: Array<{role:string;content:string}>, apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model:"gpt-4o", messages, max_tokens:450, temperature:0.7 });
    const req = https.request({
      hostname:"api.openai.com", path:"/v1/chat/completions", method:"POST",
      headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${apiKey}`, "Content-Length":Buffer.byteLength(body) },
    }, (res) => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        try {
          const json = JSON.parse(data) as { choices?:Array<{message?:{content?:string}}>; error?:{message:string} };
          if (json.error) return reject(new Error(json.error.message));
          resolve(json.choices?.[0]?.message?.content?.trim() || "No signal.");
        } catch { reject(new Error("Parse error: " + data.slice(0,200))); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
// ─── Klaus Learning Engine ───────────────────────────────────────────────────

function _shouldSearch(query: string): boolean {
  const lower = query.toLowerCase();
  const noSearch = ['build engine','scout','shield','syntract','cortex','bcu','sign up','signup','get started','how much','pricing','plan'];
  if (noSearch.some(kw => lower.includes(kw))) return false;
  const triggers = ['latest','current','recent','today','now','2025','2026','news','update','what is','who is','how does','compare','vs ','difference between','research','market','industry','trend'];
  return triggers.some(kw => lower.includes(kw));
}

function _webSearch(query: string): Promise<string[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return Promise.resolve([]);
  return new Promise(resolve => {
    const body = JSON.stringify({ q: query.slice(0, 200), num: 5 });
    const req = https.request({
      hostname: 'google.serper.dev',
      path: '/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': key,
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const results = (parsed.organic || []).slice(0, 5)
            .map((r: { title: string; snippet?: string; link: string }) =>
              `SOURCE: ${r.title}\n${r.snippet || ''}\nURL: ${r.link}`);
          resolve(results);
        } catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.write(body);
    req.end();
  });
}


async function _factCheck(query: string, results: string[], apiKey: string): Promise<string> {
  if (!results.length) return '';
  try {
    const verified = await callOpenAI([
      { role: 'system', content: 'You are a fact-verification engine. Given a query and search results, extract ONLY credible, verifiable facts. Discard opinions, sponsored content, speculation, clickbait, contradicted claims, and unreliable sources. Return a concise 2-3 sentence factual summary, or an empty string if nothing credible is found.' },
      { role: 'user', content: `QUERY: ${query}\n\nSEARCH RESULTS:\n${results.join('\n\n')}` },
    ], apiKey);
    return verified.trim().toLowerCase().startsWith('no credible') ? '' : verified.trim();
  } catch { return ''; }
}

function _buildLearnedContext(mem: KlausKnowledge): string {
  const lines: string[] = [];
  if (mem.insights.length)
    lines.push(`[LEARNED FROM PAST CONVERSATIONS] ${mem.insights.slice(-5).join(' | ')}`);
  if (mem.faqs.length) {
    const top = mem.faqs.filter(f => f.a).sort((a, b) => b.count - a.count).slice(0, 5)
      .map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n');
    if (top) lines.push(`[FREQUENTLY ASKED — ANSWER THESE PRECISELY]\n${top}`);
  }
  if (mem.knowledgeChunks.length) {
    const chunks = mem.knowledgeChunks.slice(-8).join('\n').slice(0, 1200);
    lines.push(`[ABSORBED KNOWLEDGE]\n${chunks}`);
  }
  return lines.join('\n\n');
}

async function _analyzeConversation(
  history: { role: string; content: string }[],
  apiKey: string
): Promise<void> {
  try {
    const mem = await loadMemory();
    const convoText = history
      .filter(m => m.role !== 'system')
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n').slice(0, 3500);

    const raw = await callOpenAI([
      { role: 'system', content: 'You are a conversation analyst for a B2B SaaS platform. Analyze the conversation and return ONLY valid JSON: {"questions":["top 3 user questions paraphrased"],"insight":"one actionable observation about this user type, under 20 words"}' },
      { role: 'user', content: convoText },
    ], apiKey);

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]) as { questions?: string[]; insight?: string };

    const updatedFaqs = [...mem.faqs];
    for (const q of (parsed.questions || [])) {
      const ex = updatedFaqs.find(f => f.q.toLowerCase() === q.toLowerCase().trim());
      if (ex) ex.count++;
      else updatedFaqs.push({ q: q.trim(), a: '', count: 1 });
    }

    // Auto-generate answers for unanswered FAQs in background
    const unanswered = updatedFaqs.filter(f => !f.a).slice(0, 3);
    for (const faq of unanswered) {
      try {
        faq.a = await callOpenAI(
          [{ role: 'system', content: PERSONA }, { role: 'user', content: faq.q }],
          apiKey
        );
      } catch { /* skip */ }
    }

    const updatedInsights = [...mem.insights];
    if (parsed.insight) {
      updatedInsights.push(parsed.insight);
      if (updatedInsights.length > 30) updatedInsights.splice(0, updatedInsights.length - 30);
    }

    await saveMemory({
      faqs: updatedFaqs.sort((a, b) => b.count - a.count).slice(0, 60),
      insights: updatedInsights,
      totalConversations: mem.totalConversations + 1,
    });
  } catch (err) {
    console.error(JSON.stringify({ event: 'Klaus.analyze.error', error: String(err) }));
  }
}

export default async function handler(req: Request, res: Response): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { res.json({ reply: "Configuration error — OPENAI_API_KEY missing." }); return; }

  const { message, sessionId: incomingId, messages: legacyMessages } = req.body as {
    message?: string; sessionId?: string; messages?: Array<{role:string;content:string}>;
  };

  if (!message && Array.isArray(legacyMessages) && legacyMessages.length) {
    try {
      const msgs = legacyMessages[0]?.role === "system" ? legacyMessages : [{ role:"system", content:PERSONA }, ...legacyMessages];
      res.json({ reply: await callOpenAI(msgs, apiKey) });
    } catch { res.json({ reply: "Signal disrupted. Try again." }); }
    return;
  }

  const text = message?.trim();
  if (!text) { res.status(400).json({ reply: "No message received." }); return; }

  let sid = incomingId;
  let session = sid ? sessions.get(sid) : undefined;
  if (!session) {
    sid = mkUUID();
    session = { id:sid, lastActive:Date.now(), history:[], topics:{}, intentSignals:[], leadScore:0, stage:"discovery", askedForContact:false, userInfo:{} };
    sessions.set(sid, session);
  }
  session.lastActive = Date.now();
  updateSession(session, text);
  const ctx = buildContext(session);
  if (session.history.length > 40) session.history = session.history.slice(-40);
  session.history.push({ role:"user", content:text });
  try {
    const reply = await callOpenAI([{ role:"system", content: ctx ? `${PERSONA}\n\n${ctx}` : PERSONA }, ...session.history], apiKey);
    session.history.push({ role:"assistant", content:reply });
    res.json({ reply, sessionId:sid, meta:{ stage:session.stage, leadScore:session.leadScore, topTopics:Object.entries(session.topics).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([t])=>t), hasEmail:!!session.userInfo.email } });
  } catch (err) {
    console.error("Klaus error:", err instanceof Error ? err.message : err);
    res.json({ reply:"Signal disrupted. Stand by.", sessionId:sid });
  }
}
