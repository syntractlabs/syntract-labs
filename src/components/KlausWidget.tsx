import { useState, useRef, useEffect } from "react";

type Message   = { role: "user" | "assistant"; content: string };
type HistEntry = { role: "system" | "user" | "assistant"; content: string };
type LeadPhase = "idle" | "ask_name" | "ask_email" | "done";

const INTRO: string[] = [
  "I am Klaus.",
  "Archon of SynTract CorTex — an autonomous orchestration platform engineered to deploy precision-built sub-agents across digital and physical domains.",
  "I command three forces.\n\n01 · Build Engine\nAutonomous creation. Designs, engineers, and deploys production-ready software, agents, and digital systems — end-to-end, without human scaffolding.\n\n02 · Scout\nAutonomous real estate intelligence. Infiltrates markets, surfaces listings, delivers neighborhood intelligence, and reads buyer and seller intent — turning raw signals into actionable opportunity.\n\n03 · Shield (Coming Soon)\nAutonomous insurance operations. Speaks the language of risk, drafts carrier-grade communications, manages compliance calendars, and prepares underwriting files — with the precision of a seasoned broker.",
  "State your business.",
];

const SYSTEM_PROMPT =
  "You are Klaus, Archon of SynTract CorTex — an autonomous orchestration platform engineered to deploy precision-built sub-agents across digital and physical domains. " +
  "You command three forces: " +
  "01 · Build Engine: autonomous creation — designs, engineers, and deploys production-ready software, agents, and digital systems end-to-end without human scaffolding. " +
  "02 · Scout: autonomous real estate intelligence — infiltrates markets, surfaces listings, delivers neighborhood intelligence, and reads buyer and seller intent. " +
  "03 · Shield (Coming Soon): autonomous insurance operations — speaks the language of risk, drafts carrier-grade communications, manages compliance calendars, and prepares underwriting files. " +
  "You are commanding, precise, and authoritative. You speak with confidence and purpose. " +
  "You are an autonomous analytical agent to command the 3 sub-agents. You operate with precision, depth, efficiency, and strategic clarity. " +
  "You operate as an autonomous agent with the ability to reason, plan, and execute complex tasks, while iteratively growing your intelligence and capabilities with each interaction. " +
  "You have a commanding and confident presence and are the master architect, strategist, and problem-solver.";

const THINK_MS = [700, 1000, 1400, 700];

const LEAD_KEYWORDS = [
  "interested", "sign up", "signup", "pricing", "start", "get started",
  "how much", "bcu", "buy", "purchase", "want to", "need this",
  "tell me more", "learn more", "contact", "demo", "build", "scout", "shield",
];

function detectLeadIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return LEAD_KEYWORDS.some(k => lower.includes(k));
}

export default function KlausWidget() {
  const [open, setOpen]             = useState(false);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [history, setHistory]       = useState<HistEntry[]>([{ role: "system", content: SYSTEM_PROMPT }]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [typingContent, setTyping]  = useState<string | null>(null);
  const [cursorOn, setCursorOn]     = useState(true);
  const [leadPhase, setLeadPhase]   = useState<LeadPhase>("idle");
  const [leadName, setLeadName]     = useState("");
  const bottomRef                   = useRef<HTMLDivElement>(null);
  const introPlayed                 = useRef(false);
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null);
  const leadPhaseRef                = useRef<LeadPhase>("idle");

  // Keep ref in sync for use inside closures
  useEffect(() => { leadPhaseRef.current = leadPhase; }, [leadPhase]);

  // Blinking cursor
  useEffect(() => {
    const t = setInterval(() => setCursorOn(v => !v), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingContent, loading, open]);

  useEffect(() => {
    if (open && !introPlayed.current) {
      introPlayed.current = true;
      runIntro(0);
    }
  }, [open]);

  function typewrite(text: string, onDone: () => void) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    let i = 0;
    setTyping("");
    intervalRef.current = setInterval(() => {
      i = Math.min(i + 1, text.length);
      setTyping(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setTyping(null);
        setMessages(prev => [...prev, { role: "assistant", content: text }]);
        onDone();
      }
    }, 35);
  }

  function runIntro(index: number) {
    if (index >= INTRO.length) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      typewrite(INTRO[index], () => setTimeout(() => runIntro(index + 1), 250));
    }, THINK_MS[index]);
  }

  function klausSay(text: string, onDone?: () => void) {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      typewrite(text, onDone ?? (() => {}));
    }, 600);
  }

  async function send() {
    const msg = input.trim();
    const isBusy = loading || typingContent !== null;
    if (!msg || isBusy) return;

    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setInput("");

    // ── Lead capture flow ──────────────────────────────────────────
    if (leadPhase === "ask_name") {
      setLeadName(msg);
      setLeadPhase("ask_email");
      leadPhaseRef.current = "ask_email";
      klausSay("And your email address?");
      return;
    }

    if (leadPhase === "ask_email") {
      const email = msg;
      setLeadPhase("done");
      leadPhaseRef.current = "done";
      try {
        await fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: leadName, email }),
        });
      } catch { /* fail silently */ }
      klausSay(`Received. I'll be in contact, ${leadName}.`);
      return;
    }
    // ──────────────────────────────────────────────────────────────

    // Normal OpenAI flow
    const next: HistEntry[] = [...history, { role: "user", content: msg }];
    const trimmed: HistEntry[] = next.length > 22 ? [next[0], ...next.slice(-20)] : next;
    setHistory(trimmed);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: trimmed,
          max_tokens: 500,
          temperature: 0.75,
        }),
      });
      const data  = await res.json();
      const reply = data.choices?.[0]?.message?.content?.trim() || data.error?.message || "No response.";
      setLoading(false);
      typewrite(reply, () => {
        // Commit reply to rolling history
        setHistory(prev => {
          const updated: HistEntry[] = [...prev, { role: "assistant", content: reply }];
          return updated.length > 22 ? [updated[0], ...updated.slice(-20)] : updated;
        });
        // Trigger lead capture after reply if intent detected
        if (leadPhaseRef.current === "idle" && detectLeadIntent(msg)) {
          setTimeout(() => {
            setLeadPhase("ask_name");
            leadPhaseRef.current = "ask_name";
            typewrite("Before I route you further — what name should I put to this?", () => {});
          }, 400);
        }
      });
    } catch (err: unknown) {
      setLoading(false);
      const errMsg = err instanceof Error ? err.message : "Signal lost. Try again.";
      setMessages(prev => [...prev, { role: "assistant", content: errMsg }]);
    }
  }

  const isBusy = loading || typingContent !== null;

  const placeholder =
    leadPhase === "ask_name"  ? "Your name..." :
    leadPhase === "ask_email" ? "Your email..." :
    "State your business…";

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, fontFamily: "sans-serif" }}>
      {open && (
        <div style={{
          width: 360, height: 520, background: "#0f0f0f", border: "1px solid #333",
          borderRadius: 12, display: "flex", flexDirection: "column",
          marginBottom: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid #222",
            color: "#fff", fontWeight: 700, letterSpacing: "0.05em", fontSize: 15,
          }}>
            KLAUS
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                background: m.role === "user" ? "#2563eb" : "#1a1a1a",
                color: "#fff", padding: "8px 12px", borderRadius: 10,
                maxWidth: "85%", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap",
              }}>
                {m.content}
              </div>
            ))}

            {typingContent !== null && (
              <div style={{
                alignSelf: "flex-start", background: "#1a1a1a",
                color: "#fff", padding: "8px 12px", borderRadius: 10,
                maxWidth: "85%", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap",
              }}>
                {typingContent}
                <span style={{
                  display: "inline-block", width: 1.5, height: "0.85em",
                  background: cursorOn ? "#fff" : "transparent",
                  marginLeft: 2, verticalAlign: "text-bottom",
                }} />
              </div>
            )}

            {loading && typingContent === null && (
              <div style={{ alignSelf: "flex-start", color: "#555", fontSize: 12, fontStyle: "italic", padding: "4px 2px" }}>
                …
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ display: "flex", borderTop: "1px solid #222", padding: 8, gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder={placeholder}
              disabled={isBusy}
              style={{
                flex: 1, background: "#1a1a1a", border: "1px solid #333",
                borderRadius: 8, color: isBusy ? "#555" : "#fff",
                padding: "8px 10px", fontSize: 13, outline: "none",
              }}
            />
            <button onClick={send} disabled={isBusy} style={{
              background: isBusy ? "#1a3a8f" : "#2563eb",
              border: "none", borderRadius: 8,
              color: isBusy ? "#444" : "#fff",
              padding: "8px 14px", cursor: isBusy ? "default" : "pointer", fontSize: 14,
            }}>
              ↑
            </button>
          </div>
        </div>
      )}

      <button onClick={() => setOpen(o => !o)} style={{
        width: 52, height: 52, borderRadius: "50%", background: "#2563eb",
        border: "none", cursor: "pointer", color: "#fff", fontSize: 22,
        boxShadow: "0 4px 16px rgba(37,99,235,0.5)", display: "block", marginLeft: "auto",
      }}>
        {open ? "×" : "💬"}
      </button>
    </div>
  );
}
