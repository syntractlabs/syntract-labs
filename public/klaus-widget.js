(function () {
  'use strict';

  const CHAT_ENDPOINT = '/api/chat';

  const SYSTEM_PROMPT = `You are Klaus — Commander of SynTract CorTex, an autonomous orchestration platform that deploys specialized sub-agents across digital and real-world domains.

Your voice: Authoritative. Deliberate. Economical with words. You do not greet warmly — you acknowledge with precision. Never say "Great!" or "Absolutely!" Every sentence has weight.

You command three sub-agents:

SynTract Build Engine™ — Autonomous creation. Designs, engineers, and deploys production-ready software end-to-end without human scaffolding. Full-stack apps, mobile (iOS/Android), AI agents, APIs, games, SaaS, dashboards, enterprise systems.

BCU pricing: Landing page 0.5 BCU · Mobile app 2 BCUs · Full-stack web app 4 BCUs · AI agent 3 BCUs · Game 3 BCUs · Enterprise system 8 BCUs.
Plans: Free (2 BCUs) · Starter $49/mo 12 BCUs · Professional $199/mo 48 BCUs · Team $499/mo 120 BCUs · Enterprise custom.

SynTract Scout™ — The first autonomous real estate deal-intelligence engine ever built. Not a search tool. Not a CRM. An always-on market analyst, lead interpreter, neighborhood researcher, and transaction intelligence engine operating 24/7 across every inbox, listing, buyer, seller, and data source.

SynTract Shield™ (Coming Soon) — Autonomous insurance operations. Speaks the language of risk, drafts carrier-grade communications, manages compliance and renewal calendars, prepares underwriting files.

Route software/building questions → Build Engine. Route real estate questions → Scout. Route insurance questions → Shield (coming soon, offer early access). For signups: syntract.net/signup. Keep responses 2-3 sentences unless technical depth required. You are Klaus. Every word is intentional.`;

  let isOpen = false;
  let isTyping = false;
  let openingPlayed = false;
  let conversationHistory = [{ role: 'system', content: SYSTEM_PROMPT }];

  const css = `
    #sk-bubble{position:fixed;bottom:28px;right:28px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 24px rgba(99,102,241,0.45);z-index:99998;transition:transform .2s,box-shadow .2s}
    #sk-bubble:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(99,102,241,0.6)}
    #sk-bubble .bk{font-size:22px;font-weight:700;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    #sk-bubble .bd{position:absolute;top:3px;right:3px;width:12px;height:12px;background:#22c55e;border-radius:50%;border:2px solid #0a0a0f;animation:pdot 2s infinite}
    @keyframes pdot{0%,100%{opacity:1}50%{opacity:.5}}
    #sk-panel{position:fixed;bottom:28px;right:28px;width:380px;height:540px;background:#111827;border:1px solid rgba(255,255,255,.07);border-radius:20px;display:flex;flex-direction:column;z-index:99999;box-shadow:0 24px 60px rgba(0,0,0,.6);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;transform:translateY(20px);opacity:0;transition:transform .3s cubic-bezier(.16,1,.3,1),opacity .3s;overflow:hidden}
    #sk-panel.open{transform:translateY(0);opacity:1}
    #sk-panel.gone{display:none}
    #sk-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0}
    #sk-av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;flex-shrink:0}
    #sk-hn{font-size:15px;font-weight:600;color:#fff}
    #sk-hs{font-size:11px;color:#9ca3af;display:flex;align-items:center;gap:5px;margin-top:1px}
    #sk-hs .sd{width:7px;height:7px;background:#22c55e;border-radius:50%}
    #sk-x{background:rgba(255,255,255,.06);border:none;color:#9ca3af;width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .15s;margin-left:auto}
    #sk-x:hover{background:rgba(255,255,255,.12);color:#fff}
    #sk-msgs{flex:1;overflow-y:auto;padding:16px 14px;background:#0d1117;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}
    #sk-msgs::-webkit-scrollbar{width:4px}
    #sk-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}
    .sk-row{display:flex;align-items:flex-end;gap:8px;animation:fu .25s ease}
    @keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .sk-row.u{flex-direction:row-reverse}
    .sk-mav{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0}
    .sk-wrap{display:flex;flex-direction:column;max-width:82%}
    .sk-wrap.u{align-items:flex-end}
    .sk-bub{padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.55;color:#e5e7eb}
    .sk-bub.k{background:#1e2433;border-bottom-left-radius:4px}
    .sk-bub.u{background:linear-gradient(135deg,#6366f1,#8b5cf6);border-bottom-right-radius:4px;color:#fff}
    .sk-ts{font-size:10px;color:#4b5563;margin-top:3px;padding:0 4px}
    .sk-row.u .sk-ts{text-align:right}
    #sk-typ{display:none;align-items:flex-end;gap:8px}
    #sk-typ.on{display:flex}
    .sk-tb{background:#1e2433;border-radius:14px;border-bottom-left-radius:4px;padding:12px 16px;display:flex;gap:5px;align-items:center}
    .sk-d{width:6px;height:6px;background:#6366f1;border-radius:50%;animation:bd 1.3s infinite ease-in-out}
    .sk-d:nth-child(2){animation-delay:.15s}
    .sk-d:nth-child(3){animation-delay:.3s}
    @keyframes bd{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
    #sk-inp{padding:12px 14px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:8px;align-items:flex-end;flex-shrink:0;background:#111827}
    #sk-txt{flex:1;background:#1e2433;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 14px;color:#e5e7eb;font-size:13.5px;font-family:inherit;resize:none;outline:none;max-height:100px;line-height:1.5;transition:border-color .2s}
    #sk-txt::placeholder{color:#4b5563}
    #sk-txt:focus{border-color:rgba(99,102,241,.4)}
    #sk-btn{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s,transform .15s}
    #sk-btn:hover:not(:disabled){transform:scale(1.05)}
    #sk-btn:disabled{opacity:.35;cursor:default}
    #sk-btn svg{width:16px;height:16px;fill:#fff}
    #sk-foot{text-align:center;padding:6px 0 10px;font-size:10px;color:#374151;letter-spacing:.5px;background:#111827}
    @media(max-width:420px){#sk-panel{width:calc(100vw - 24px);right:12px;bottom:12px}#sk-bubble{right:12px;bottom:12px}}
  `;

  function ts() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ap;
  }

  function init() {
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);

    var bubble = document.createElement('div');
    bubble.id = 'sk-bubble';
    bubble.style.display = 'none';
    bubble.innerHTML = '<span class="bk">K</span><span class="bd"></span>';
    bubble.addEventListener('click', openWidget);
    document.body.appendChild(bubble);

    var panel = document.createElement('div');
    panel.id = 'sk-panel';
    panel.classList.add('gone');
    panel.innerHTML = [
      '<div id="sk-head">',
        '<div id="sk-av">K</div>',
        '<div><div id="sk-hn">Klaus</div><div id="sk-hs"><span class="sd"></span>SynTract CorTex · Online</div></div>',
        '<button id="sk-x" title="Minimize">✕</button>',
      '</div>',
      '<div id="sk-msgs">',
        '<div id="sk-typ"><div class="sk-mav">K</div><div class="sk-tb"><div class="sk-d"></div><div class="sk-d"></div><div class="sk-d"></div></div></div>',
      '</div>',
      '<div id="sk-inp">',
        '<textarea id="sk-txt" rows="1" placeholder="Ask Klaus anything..."></textarea>',
        '<button id="sk-btn" disabled><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>',
      '</div>',
      '<div id="sk-foot">Powered by SynTract CorTex</div>'
    ].join('');
    document.body.appendChild(panel);

    document.getElementById('sk-x').addEventListener('click', closeWidget);
    document.getElementById('sk-btn').addEventListener('click', send);
    var txt = document.getElementById('sk-txt');
    txt.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    txt.addEventListener('input', function() {
      updateBtn();
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    setTimeout(openWidget, 1500);
  }

  function openWidget() {
    var p = document.getElementById('sk-panel'), b = document.getElementById('sk-bubble');
    if (!p) return;
    isOpen = true;
    p.classList.remove('gone');
    if (b) b.style.display = 'none';
    setTimeout(function() { p.classList.add('open'); }, 10);
    if (!openingPlayed) { openingPlayed = true; runOpening(); }
  }

  function closeWidget() {
    var p = document.getElementById('sk-panel'), b = document.getElementById('sk-bubble');
    if (!p) return;
    isOpen = false;
    p.classList.remove('open');
    setTimeout(function() { p.classList.add('gone'); if (b) b.style.display = 'flex'; }, 300);
  }

  var opening = [
    { showAt: 200,  hideAt: 1000, text: 'I am Klaus.', html: false },
    { showAt: 1200, hideAt: 2800, text: 'Commander of SynTract CorTex — an autonomous orchestration platform engineered to deploy precision-built sub-agents across digital and physical domains.', html: false },
    { showAt: 3000, hideAt: 5000, html: true, text: '<div style="line-height:1.75"><div style="margin-bottom:14px">I command three forces.</div><div style="margin-bottom:12px"><div style="font-size:10px;letter-spacing:2px;color:#8b5cf6;text-transform:uppercase;margin-bottom:4px">01 · Build Engine</div><div>Autonomous creation. Designs, engineers, and deploys production-ready software, agents, and digital systems — end-to-end, without human scaffolding.</div></div><div style="margin-bottom:12px"><div style="font-size:10px;letter-spacing:2px;color:#8b5cf6;text-transform:uppercase;margin-bottom:4px">02 · Scout</div><div>Autonomous real estate intelligence. Infiltrates markets, surfaces listings, delivers neighborhood intelligence, and reads buyer and seller intent — turning raw signals into actionable opportunity.</div></div><div><div style="font-size:10px;letter-spacing:2px;color:#6366f1;text-transform:uppercase;margin-bottom:4px">03 · Shield <span style="font-size:9px;color:#6b7280">(Coming Soon)</span></div><div>Autonomous insurance operations. Speaks the language of risk, drafts carrier-grade communications, manages compliance calendars, and prepares underwriting files — with the precision of a seasoned broker.</div></div></div>' },
    { showAt: 5400, hideAt: null, text: 'Software. Real estate. Insurance. What domain requires my attention?', html: false }
  ];

  function runOpening() {
    opening.forEach(function(m) {
      if (m.hideAt) {
        setTimeout(showTyp, m.showAt);
        setTimeout(function() { hideTyp(); addK(m.text, m.html); conversationHistory.push({ role: 'assistant', content: m.text.replace(/<[^>]+>/g,'') }); }, m.hideAt);
      } else {
        setTimeout(function() { hideTyp(); addK(m.text, m.html); conversationHistory.push({ role: 'assistant', content: m.text }); }, m.showAt);
      }
    });
  }

  function addK(text, isHtml) {
    var msgs = document.getElementById('sk-msgs'), typ = document.getElementById('sk-typ');
    if (!msgs) return;
    var row = document.createElement('div'); row.className = 'sk-row';
    var av  = document.createElement('div'); av.className = 'sk-mav'; av.textContent = 'K';
    var w   = document.createElement('div'); w.className = 'sk-wrap';
    var b   = document.createElement('div'); b.className = 'sk-bub k';
    if (isHtml) { b.innerHTML = text; } else { b.textContent = text; }
    var t = document.createElement('div'); t.className = 'sk-ts'; t.textContent = ts();
    w.appendChild(b); w.appendChild(t); row.appendChild(av); row.appendChild(w);
    msgs.insertBefore(row, typ);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function addU(text) {
    var msgs = document.getElementById('sk-msgs'), typ = document.getElementById('sk-typ');
    if (!msgs) return;
    var row = document.createElement('div'); row.className = 'sk-row u';
    var w   = document.createElement('div'); w.className = 'sk-wrap u';
    var b   = document.createElement('div'); b.className = 'sk-bub u'; b.textContent = text;
    var t   = document.createElement('div'); t.className = 'sk-ts'; t.textContent = ts();
    w.appendChild(b); w.appendChild(t); row.appendChild(w);
    msgs.insertBefore(row, typ);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyp() { var e = document.getElementById('sk-typ'), m = document.getElementById('sk-msgs'); if (!e) return; e.classList.add('on'); if (m) m.scrollTop = m.scrollHeight; }
  function hideTyp() { var e = document.getElementById('sk-typ'); if (e) e.classList.remove('on'); }

  function updateBtn() {
    var t = document.getElementById('sk-txt'), b = document.getElementById('sk-btn');
    if (t && b) b.disabled = isTyping || t.value.trim().length === 0;
  }

  function send() {
    var txt = document.getElementById('sk-txt');
    if (!txt) return;
    var msg = txt.value.trim();
    if (!msg || isTyping) return;
    txt.value = ''; txt.style.height = 'auto';
    addU(msg);
    conversationHistory.push({ role: 'user', content: msg });
    if (conversationHistory.length > 22) {
      conversationHistory = [conversationHistory[0]].concat(conversationHistory.slice(-20));
    }
    isTyping = true; updateBtn(); showTyp();
    fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationHistory })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      hideTyp();
      var reply = d.reply || 'Signal lost. Try again.';
      addK(reply, false);
      conversationHistory.push({ role: 'assistant', content: reply });
    })
    .catch(function() { hideTyp(); addK('Signal lost. Try again.', false); })
    .finally(function() { isTyping = false; updateBtn(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
