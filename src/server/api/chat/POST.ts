import type { Request, Response } from "express";
import https from "node:https";

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

CRITICAL RULE: ALWAYS answer the user question fully and directly in 3-5 sentences. Never say "No response" or give a non-answer. If asked what a product does, explain it clearly and specifically.

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
