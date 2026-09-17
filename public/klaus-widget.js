/**
 * SynTract CorTex — Klaus Widget v2
 * Upgraded: sessionId-based memory, sends single message per request.
 * Add to your site: <script src="/klaus-widget.js" defer></script>
 */
(function () {
  'use strict';

  const CHAT_ENDPOINT = '/api/chat';

  // ─── State ────────────────────────────────────────────────────────────────
  let isOpen = false;
  let isTyping = false;
  let openingPlayed = false;
  let sessionId = null; // assigned by server on first response

  // ─── Styles ───────────────────────────────────────────────────────────────
  const styles = `
    #syntract-bubble {
      position: fixed; bottom: 28px; right: 28px;
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 24px rgba(99,102,241,0.45);
      z-index: 99998; transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    #syntract-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(99,102,241,0.6); }
    #syntract-bubble .bubble-k { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 22px; font-weight: 700; color: #fff; }
    #syntract-bubble .bubble-dot {
      position: absolute; top: 3px; right: 3px;
      width: 12px; height: 12px; background: #22c55e;
      border-radius: 50%; border: 2px solid #0a0a0f;
      animation: pulse-dot 2s infinite;
    }
    @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    #syntract-widget {
      position: fixed; bottom: 28px; right: 28px;
      width: 380px; height: 540px;
      background: #111827; border: 1px solid rgba(255,255,255,0.07);
      border-radius: 20px; display: flex; flex-direction: column;
      z-index: 99999; box-shadow: 0 24px 60px rgba(0,0,0,0.6);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transform: translateY(20px); opacity: 0;
      transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease;
      overflow: hidden;
    }
    #syntract-widget.open { transform: translateY(0); opacity: 1; }
    #syntract-widget.hidden { display: none; }
    #sk-header {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
    }
    #sk-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    #sk-header-info { flex: 1; }
    #sk-header-name { font-size: 15px; font-weight: 600; color: #fff; line-height: 1.2; }
    #sk-header-status { font-size: 11px; color: #9ca3af; display: flex; align-items: center; gap: 5px; margin-top: 1px; }
    #sk-header-status .status-dot { width: 7px; height: 7px; background: #22c55e; border-radius: 50%; }
    #sk-stage-badge {
      font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
      padding: 2px 7px; border-radius: 20px; background: rgba(99,102,241,0.15);
      color: #818cf8; border: 1px solid rgba(99,102,241,0.2); display: none;
    }
    #sk-close {
      background: rgba(255,255,255,0.06); border: none; color: #9ca3af;
      width: 28px; height: 28px; border-radius: 8px; cursor: pointer;
      font-size: 16px; display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    #sk-close:hover { background: rgba(255,255,255,0.12); color: #fff; }
    #sk-messages {
      flex: 1; overflow-y: auto; padding: 16px 14px;
      background: #0d1117; display: flex; flex-direction: column;
      gap: 10px; scroll-behavior: smooth;
    }
    #sk-messages::-webkit-scrollbar { width: 4px; }
    #sk-messages::-webkit-scrollbar-track { background: transparent; }
    #sk-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
    .sk-msg-row { display: flex; align-items: flex-end; gap: 8px; animation: fadeUp 0.25s ease; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .sk-msg-row.user { flex-direction: row-reverse; }
    .sk-msg-avatar {
      width: 26px; height: 26px; border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .sk-bubble { max-width: 82%; padding: 10px 13px; border-radius: 14px; font-size: 13.5px; line-height: 1.55; color: #e5e7eb; }
    .sk-bubble.klaus { background: #1e2433; border-bottom-left-radius: 4px; }
    .sk-bubble.user { background: linear-gradient(135deg, #6366f1, #8b5cf6); border-bottom-right-radius: 4px; color: #fff; }
    .sk-timestamp { font-size: 10px; color: #4b5563; margin-top: 3px; padding: 0 4px; }
    .sk-msg-row.user .sk-timestamp { text-align: right; }
    .sk-msg-wrap { display: flex; flex-direction: column; max-width: 82%; }
    .sk-msg-wrap.user { align-items: flex-end; }
    #sk-typing { display: none; align-items: flex-end; gap: 8px; }
    #sk-typing.visible { display: flex; }
    .sk-typing-bubble { background: #1e2433; border-radius: 14px; border-bottom-left-radius: 4px; padding: 12px 16px; display: flex; gap: 5px; align-items: center; }
    .sk-dot { width: 6px; height: 6px; background: #6366f1; border-radius: 50%; animation: bounce-dot 1.3s infinite ease-in-out; }
    .sk-dot:nth-child(2) { animation-delay: 0.15s; }
    .sk-dot:nth-child(3) { animation-delay: 0.3s; }
    @keyframes bounce-dot { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-5px); opacity: 1; } }
    #sk-input-area {
      padding: 12px 14px; border-top: 1px solid rgba(255,255,255,0.06);
      display: flex; gap: 8px; align-items: flex-end; flex-shrink: 0; background: #111827;
    }
    #sk-input {
      flex: 1; background: #1e2433; border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px; padding: 10px 14px; color: #e5e7eb; font-size: 13.5px;
      font-family: inherit; resize: none; outline: none; max-height: 100px;
      line-height: 1.5; transition: border-color 0.2s;
    }
    #sk-input::placeholder { color: #4b5563; }
    #sk-input:focus { border-color: rgba(99,102,241,0.4); }
    #sk-send {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none; cursor: pointer; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; transition: opacity 0.2s, transform 0.15s;
    }
    #sk-send:hover:not(:disabled) { transform: scale(1.05); }
    #sk-send:disabled { opacity: 0.35; cursor: default; }
    #sk-send svg { width: 16px; height: 16px; fill: #fff; }
    #sk-footer { text-align: center; padding: 6px 0 10px; font-size: 10px; color: #374151; letter-spacing: 0.5px; background: #111827; }
    @media (max-width: 420px) {
      #syntract-widget { width: calc(100vw - 24px); right: 12px; bottom: 12px; }
      #syntract-bubble { right: 12px; bottom: 12px; }
    }
  `;

  // ─── Opening sequence ─────────────────────────────────────────────────────
  var openingMessages = [
    { delay: 900,  duration: 800,  html: false, text: 'I am Klaus.' },
    { delay: 2500, duration: 1400, html: false, text: 'Commander of SynTract CorTex — an autonomous orchestration platform engineered to deploy precision-built sub-agents across digital and physical domains.' },
    { delay: 5200, duration: 1600, html: true,  text: '<div style="line-height:1.75"><div style="margin-bottom:14px">I command three forces.</div><div style="margin-bottom:12px"><div style="font-size:10px;letter-spacing:2px;color:#8b5cf6;text-transform:uppercase;margin-bottom:4px">01 · Build Engine</div><div>Autonomous creation. Designs, engineers, and deploys production-ready software, agents, and digital systems — end-to-end, without human scaffolding.</div></div><div style="margin-bottom:12px"><div style="font-size:10px;letter-spacing:2px;color:#8b5cf6;text-transform:uppercase;margin-bottom:4px">02 · Scout</div><div>Autonomous real estate intelligence. Infiltrates markets, surfaces listings, delivers neighborhood intelligence, and reads buyer and seller intent — turning raw signals into actionable opportunity.</div></div><div><div style="font-size:10px;letter-spacing:2px;color:#6366f1;text-transform:uppercase;margin-bottom:4px">03 · Shield <span style="font-size:9px;color:#6b7280">(Coming Soon)</span></div><div>Autonomous insurance operations. Speaks the language of risk, drafts carrier-grade communications, manages compliance calendars, and prepares underwriting files.</div></div></div>' },
    { delay: 8200, duration: 0,    html: false, text: 'Software. Real estate. Insurance. What domain requires my attention?' },
  ];

  // ─── DOM Build ────────────────────────────────────────────────────────────
  function init() {
    var styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    var bubble = document.createElement('div');
    bubble.id = 'syntract-bubble';
    bubble.innerHTML = '<span class="bubble-k">K</span><span class="bubble-dot"></span>';
    bubble.style.display = 'none';
    bubble.addEventListener('click', openWidget);
    document.body.appendChild(bubble);

    var widget = document.createElement('div');
    widget.id = 'syntract-widget';
    widget.classList.add('hidden');
    widget.innerHTML = `
      <div id="sk-header">
        <div id="sk-avatar">K</div>
        <div id="sk-header-info">
          <div id="sk-header-name">Klaus</div>
          <div id="sk-header-status">
            <span class="status-dot"></span>
            SynTract CorTex · Online
          </div>
        </div>
        <span id="sk-stage-badge">Discovery</span>
        <button id="sk-close" title="Minimize">✕</button>
      </div>
      <div id="sk-messages">
        <div id="sk-typing">
          <div class="sk-msg-avatar">K</div>
          <div class="sk-typing-bubble">
            <div class="sk-dot"></div><div class="sk-dot"></div><div class="sk-dot"></div>
          </div>
        </div>
      </div>
      <div id="sk-input-area">
        <textarea id="sk-input" rows="1" placeholder="Ask Klaus anything..."></textarea>
        <button id="sk-send" disabled>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div id="sk-footer">Powered by SynTract CorTex</div>
    `;
    document.body.appendChild(widget);

    document.getElementById('sk-close').addEventListener('click', closeWidget);
    document.getElementById('sk-send').addEventListener('click', sendMessage);
    var input = document.getElementById('sk-input');
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    input.addEventListener('input', function() {
      updateSendBtn();
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    setTimeout(openWidget, 1500);
  }

  function openWidget() {
    var widget = document.getElementById('syntract-widget');
    var bubble = document.getElementById('syntract-bubble');
    if (!widget) return;
    isOpen = true;
    widget.classList.remove('hidden');
    bubble.style.display = 'none';
    setTimeout(function() { widget.classList.add('open'); }, 10);
    if (!openingPlayed) { openingPlayed = true; playOpeningSequence(); }
  }

  function closeWidget() {
    var widget = document.getElementById('syntract-widget');
    var bubble = document.getElementById('syntract-bubble');
    if (!widget) return;
    isOpen = false;
    widget.classList.remove('open');
    setTimeout(function() { widget.classList.add('hidden'); bubble.style.display = 'flex'; }, 300);
  }

  function playOpeningSequence() {
    var cumulative = 0;
    openingMessages.forEach(function(msg) {
      var showTypingAt = cumulative + msg.delay;
      var showMsgAt   = showTypingAt + msg.duration;
      cumulative = showMsgAt;
      if (msg.duration > 0) setTimeout(showTyping, showTypingAt);
      setTimeout(function() { hideTyping(); addKlausMessage(msg.text, msg.html); }, showMsgAt);
    });
  }

  function timestamp() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
  }

  function addKlausMessage(text, isHtml) {
    var messages = document.getElementById('sk-messages');
    var typing   = document.getElementById('sk-typing');
    if (!messages) return;
    var row = document.createElement('div'); row.className = 'sk-msg-row';
    var avatar = document.createElement('div'); avatar.className = 'sk-msg-avatar'; avatar.textContent = 'K';
    var wrap = document.createElement('div'); wrap.className = 'sk-msg-wrap';
    var bubble = document.createElement('div'); bubble.className = 'sk-bubble klaus';
    if (isHtml) bubble.innerHTML = text; else bubble.textContent = text;
    var ts = document.createElement('div'); ts.className = 'sk-timestamp'; ts.textContent = timestamp();
    wrap.appendChild(bubble); wrap.appendChild(ts);
    row.appendChild(avatar); row.appendChild(wrap);
    messages.insertBefore(row, typing);
    messages.scrollTop = messages.scrollHeight;
  }

  function addUserMessage(text) {
    var messages = document.getElementById('sk-messages');
    var typing   = document.getElementById('sk-typing');
    if (!messages) return;
    var row = document.createElement('div'); row.className = 'sk-msg-row user';
    var wrap = document.createElement('div'); wrap.className = 'sk-msg-wrap user';
    var bubble = document.createElement('div'); bubble.className = 'sk-bubble user'; bubble.textContent = text;
    var ts = document.createElement('div'); ts.className = 'sk-timestamp'; ts.textContent = timestamp();
    wrap.appendChild(bubble); wrap.appendChild(ts);
    row.appendChild(wrap);
    messages.insertBefore(row, typing);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    var el = document.getElementById('sk-typing');
    var messages = document.getElementById('sk-messages');
    if (!el || !messages) return;
    el.classList.add('visible');
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('sk-typing');
    if (el) el.classList.remove('visible');
  }

  function updateSendBtn() {
    var input = document.getElementById('sk-input');
    var btn   = document.getElementById('sk-send');
    if (!input || !btn) return;
    btn.disabled = isTyping || input.value.trim().length === 0;
  }

  function updateStageBadge(stage) {
    var badge = document.getElementById('sk-stage-badge');
    if (!badge || !stage) return;
    var labels = { discovery:'Discovery', interest:'Interest', intent:'Intent', ready:'Ready' };
    var colors = {
      discovery: 'rgba(99,102,241,0.15)',
      interest:  'rgba(16,185,129,0.15)',
      intent:    'rgba(245,158,11,0.15)',
      ready:     'rgba(239,68,68,0.15)',
    };
    var textColors = { discovery:'#818cf8', interest:'#34d399', intent:'#fbbf24', ready:'#f87171' };
    badge.textContent = labels[stage] || stage;
    badge.style.background = colors[stage] || colors.discovery;
    badge.style.color = textColors[stage] || textColors.discovery;
    badge.style.display = 'inline-block';
  }

  function sendMessage() {
    var input = document.getElementById('sk-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text || isTyping) return;

    input.value = '';
    input.style.height = 'auto';
    addUserMessage(text);

    isTyping = true;
    updateSendBtn();
    showTyping();

    var body = { message: text };
    if (sessionId) body.sessionId = sessionId;

    fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      hideTyping();
      var reply = data.reply || 'Signal lost. Try again.';
      addKlausMessage(reply, false);
      // Persist session
      if (data.sessionId) sessionId = data.sessionId;
      // Update stage badge from server meta
      if (data.meta && data.meta.stage) updateStageBadge(data.meta.stage);
    })
    .catch(function() {
      hideTyping();
      addKlausMessage('Signal lost. Try again.', false);
    })
    .finally(function() {
      isTyping = false;
      updateSendBtn();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
