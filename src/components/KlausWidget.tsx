import { useState, useRef, useEffect } from "react";

type Message  = { role: "user" | "assistant"; content: string };
type HistEntry = { role: "system" | "user" | "assistant"; content: string };

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

export default function KlausWidget() {
  const [open, setOpen]               = useState(false);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [history, setHistory]         = useState<HistEntry[]>([{ role: "system", content: SYSTEM_PROMPT }]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [typingContent, setTyping]    = useState<string | null>(null);
  const [cursorOn, setCursorOn]       = useState(true);
  const bottomRef                     = useRef<HTMLDivElement>(null);
  const introPlayed                   = useRef(false);
  const intervalRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Typewriter: reveals text 2 chars per tick, then commits to messages
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
    }, 20);
  }

  // Chains intro messages sequentially via callbacks
  function runIntro(index: number) {
    if (index >= INTRO.length) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      typewrite(INTRO[index], () => setTimeout(() => runIntro(index + 1), 250));
    }, THINK_MS[index]);
  }

  async function send() {
    const isBusy = loading || typingContent !== null;
    if (!input.trim() || isBusy) return;

    const text = input.trim();

    // Rolling memory window: system prompt + last 20 msgs, hard cap 22
    const nextHist: HistEntry[] = [...history, { role: "user", content: text }];
    const trimmed: HistEntry[]  = nextHist.length > 22 ? [nextHist[0], ...nextHist.slice(-20)] : nextHist;

    setMessages(prev => [...prev, { role: "user", content: text }]);
    setHistory(trimmed);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
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
        // Commit reply to rolling history after typewriter finishes
        setHistory(prev => {
          const updated: HistEntry[] = [...prev, { role: "assistant", content: reply }];
          return updated.length > 22 ? [updated[0], ...updated.slice(-20)] : updated;
        });
      });
    } catch (err: unknown) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : "Signal lost. Try again.";
      setMessages(prev => [...prev, { role: "assistant", content: msg }]);
    }
  }

  const isBusy = loading || typingContent !== null;

  const assistantBubble: React.CSSProperties = {
    alignSelf: "flex-start",
    background: "#1a1a1a",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 10,
    maxWidth: "85%",
    fontSize: 13,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  };

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

            {/* Typewriter bubble */}
            {typingContent !== null && (
              <div style={assistantBubble}>
                {typingContent}
                <span style={{
                  display: "inline-block", width: 1.5, height: "0.85em",
                  background: cursorOn ? "#fff" : "transparent",
                  marginLeft: 2, verticalAlign: "text-bottom",
                }} />
              </div>
            )}

            {/* Thinking dots (only while waiting for API, not while typewriting) */}
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
              placeholder="State your business…"
              disabled={isBusy}
              style={{
                flex: 1, background: "#1a1a1a", border: "1px solid #333",
                borderRadius: 8, color: isBusy ? "#555" : "#fff",
                padding: "8px 10px", fontSize: 13, outline: "none",
              }}
            />
            <button onClick={send} disabled={isBusy} style={{
              background: isBusy ? "#1a3a8f" : "#2563eb",
              border: "none", borderRadius: 8, color: isBusy ? "#444" : "#fff",
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
