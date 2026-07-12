/* ============================================================
   NEXUS CORE — motor do widget (esfera + chat + gating PRO)
   ------------------------------------------------------------
   Como usar em qualquer página:
     <link rel="stylesheet" href="/nexus/nexus.css">
     <script src="/nexus/nexus-portfolio-kb.js"></script>  (a base de conhecimento)
     <script src="/nexus/nexus-auth.js"></script>          (plano via Firebase)
     <script src="/nexus/nexus-core.js"></script>          (este arquivo)

   Regras:
   • A esfera aparece para todo mundo (brilhando e orbitando).
   • Ao clicar:
       - não logado  → convite para entrar com Google
       - plano grátis → tela "recurso PRO" com CTA /planos.html
       - PRO/Premium → chat liberado
   • ESPAÇO PARA A IA DE VERDADE: troque NEXUS_CORE_CONFIG.mode
     para "api" e aponte o endpoint. O chat envia
     POST { question, context } e espera { answer }. Se a API
     falhar, cai no modo local sozinho.
   ============================================================ */

(function () {
  var KB = window.NEXUS_KB;
  if (!KB) return;

  var CONFIG = window.NEXUS_CORE_CONFIG || {
    mode: "local", /* "local" | "api" */
    api: { endpoint: "", timeoutMs: 15000, headers: { "Content-Type": "application/json" } },
    chat: { maxHistorico: 30, delayDigitandoMs: [450, 900] },
    requerPro: true,
    planosUrl: "/planos.html",
    historyKey: "nexus-chat-" + (document.body.getAttribute("data-nexus-page") || location.pathname)
  };
  window.NEXUS_CORE_CONFIG = CONFIG;

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  /* ---------- provedor de respostas (local hoje, API amanhã) ---------- */
  var Provider = {
    contexto: function () {
      try {
        if (window.P && P.st) {
          var T = P.totais();
          return { patrimonio: T.pat, lucro: T.lucro, rentabilidade: T.rent, hold: T.hold, defi: T.defi, trade: T.trade, taxas: T.tax };
        }
      } catch (e) {}
      return {};
    },
    local: function (question) {
      var resposta = KB.answer ? KB.answer(question) : null;
      return Promise.resolve(resposta || pick(KB.fallback));
    },
    api: function (question) {
      var ctl = new AbortController();
      var t = setTimeout(function () { ctl.abort(); }, CONFIG.api.timeoutMs || 15000);
      return fetch(CONFIG.api.endpoint, {
        method: "POST",
        headers: CONFIG.api.headers || { "Content-Type": "application/json" },
        signal: ctl.signal,
        body: JSON.stringify({ question: question, context: Provider.contexto() })
      }).then(function (r) {
        clearTimeout(t);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).then(function (d) {
        if (!d || !d.answer) throw new Error("resposta vazia");
        return d.answer;
      }).catch(function () {
        return Provider.local(question);
      });
    },
    ask: function (question) {
      if (CONFIG.mode === "api" && CONFIG.api.endpoint) return Provider.api(question);
      return Provider.local(question);
    }
  };
  window.NexusProvider = Provider;

  /* ---------- histórico ---------- */
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(CONFIG.historyKey)) || []; } catch (e) { return []; }
  }
  function saveHistory(h) {
    try { localStorage.setItem(CONFIG.historyKey, JSON.stringify(h.slice(-CONFIG.chat.maxHistorico))); } catch (e) {}
  }

  /* ---------- UI ---------- */
  function buildUI() {
    var root = document.createElement("div");
    root.className = "nexus-root";
    root.innerHTML =
      '<button class="nexus-fab" type="button" aria-label="Abrir o Nexus" aria-expanded="false" title="Nexus — a inteligência do MundoDeFi">' +
        '<span class="nexus-fab-icon">◆</span>' +
        '<span class="nexus-fab-label">Falar com o Nexus</span>' +
      '</button>' +
      '<section class="nexus-panel" role="dialog" aria-label="Chat com o Nexus" hidden>' +
        '<header class="nexus-header">' +
          '<span class="nexus-status" aria-hidden="true"></span>' +
          '<div class="nexus-header-text"><strong>' + KB.nome + '</strong><small>' + KB.subtitulo + '</small></div>' +
          '<button class="nexus-close" type="button" aria-label="Fechar chat">✕</button>' +
        '</header>' +
        '<div class="nexus-body"></div>' +
      '</section>';
    document.body.appendChild(root);
    return root;
  }

  function telaGate(body, estado) {
    var html =
      '<div class="nexus-gate">' +
        '<div class="nexus-gate-orb">◆</div>' +
        '<span class="nexus-gate-pro">EXCLUSIVO PRO</span>';
    if (estado === "loading") {
      html += '<h3>Um segundo…</h3><p>Verificando seu acesso ao Nexus.</p>';
    } else if (estado === "deslogado") {
      html += '<h3>Entre para falar com o Nexus</h3>' +
        '<p>O Nexus lê seu portfólio e responde sobre patrimônio, pools, HOLD e trade. Entre com sua conta para eu verificar seu plano.</p>' +
        '<button class="nexus-gate-btn cyan" type="button" data-nexus-login>Entrar com Google</button>' +
        '<p class="nexus-gate-sub">Ainda não tem conta? O login cria uma na hora.</p>';
    } else {
      html += '<h3>O Nexus é do plano PRO</h3>' +
        '<p>Assinantes PRO conversam com o Nexus sobre o próprio portfólio: melhor ativo, pool que mais rende, winrate no trade e muito mais.</p>' +
        '<a class="nexus-gate-btn" href="' + CONFIG.planosUrl + '">Assinar MundoDeFi PRO</a>' +
        '<p class="nexus-gate-sub">R$ 19,90/mês · cancele quando quiser</p>';
    }
    html += '</div>';
    body.innerHTML = html;
    var btn = body.querySelector("[data-nexus-login]");
    if (btn) {
      btn.addEventListener("click", function () {
        btn.disabled = true;
        btn.textContent = "Abrindo login…";
        if (window.NexusAuth) {
          NexusAuth.login().catch(function () {
            btn.disabled = false;
            btn.textContent = "Entrar com Google";
          });
        }
      });
    }
  }

  function telaChat(body) {
    body.innerHTML =
      '<div class="nexus-messages" aria-live="polite"></div>' +
      '<div class="nexus-chips"></div>' +
      '<form class="nexus-form">' +
        '<input type="text" placeholder="Pergunte sobre seu portfólio…" aria-label="Sua pergunta" autocomplete="off">' +
        '<button class="nexus-send" type="submit" aria-label="Enviar pergunta">➤</button>' +
      '</form>';

    var messages = body.querySelector(".nexus-messages");
    var chips = body.querySelector(".nexus-chips");
    var form = body.querySelector(".nexus-form");
    var input = form.querySelector("input");
    var history = loadHistory();

    function addMessage(role, text, persist) {
      var el = document.createElement("div");
      el.className = "nexus-msg " + role;
      el.textContent = text;
      messages.appendChild(el);
      messages.scrollTop = messages.scrollHeight;
      if (persist !== false) {
        history.push({ role: role, text: text });
        saveHistory(history);
      }
    }

    if (history.length) {
      history.forEach(function (m) { addMessage(m.role, m.text, false); });
    } else {
      addMessage("bot", pick(KB.saudacoes));
    }

    KB.sugestoes.forEach(function (s) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "nexus-chip";
      chip.textContent = s;
      chip.addEventListener("click", function () {
        input.value = s;
        form.requestSubmit();
      });
      chips.appendChild(chip);
    });

    var busy = false;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var question = input.value.trim();
      if (!question || busy) return;
      busy = true;
      input.value = "";
      addMessage("user", question);

      var typing = document.createElement("div");
      typing.className = "nexus-msg bot nexus-typing";
      typing.innerHTML = "<span></span><span></span><span></span>";
      messages.appendChild(typing);
      messages.scrollTop = messages.scrollHeight;

      var range = CONFIG.chat.delayDigitandoMs;
      var delay = range[0] + Math.random() * (range[1] - range[0]);
      Promise.all([
        Provider.ask(question),
        new Promise(function (r) { setTimeout(r, delay); })
      ]).then(function (res) {
        typing.remove();
        addMessage("bot", res[0]);
        busy = false;
        input.focus();
      });
    });

    setTimeout(function () { input.focus(); }, 50);
  }

  function estadoAtual() {
    if (!CONFIG.requerPro) return "pro";
    var A = window.NexusAuth;
    if (!A || !A.ready) return "loading";
    if (!A.user) return "deslogado";
    return A.isPro() ? "pro" : "gratis";
  }

  function init() {
    var root = buildUI();
    var fab = root.querySelector(".nexus-fab");
    var panel = root.querySelector(".nexus-panel");
    var closeBtn = root.querySelector(".nexus-close");
    var body = root.querySelector(".nexus-body");
    var renderizado = null;

    function render() {
      var estado = estadoAtual();
      if (estado === renderizado) return;
      renderizado = estado;
      if (estado === "pro") telaChat(body);
      else telaGate(body, estado);
    }

    function toggle(open) {
      var willOpen = open !== undefined ? open : panel.hidden;
      panel.hidden = !willOpen;
      fab.setAttribute("aria-expanded", String(willOpen));
      root.classList.toggle("is-open", willOpen);
      if (willOpen) render();
    }

    fab.addEventListener("click", function () { toggle(); });
    closeBtn.addEventListener("click", function () { toggle(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) toggle(false);
    });

    /* quando o Firebase resolver o plano, atualiza o painel se estiver aberto */
    document.addEventListener("nexus-auth-changed", function () {
      if (!panel.hidden) { renderizado = null; render(); }
      else renderizado = null;
    });
  }

  /* estilo do corpo flexível */
  var style = document.createElement("style");
  style.textContent = ".nexus-body{flex:1;display:flex;flex-direction:column;min-height:0}";
  document.head.appendChild(style);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
