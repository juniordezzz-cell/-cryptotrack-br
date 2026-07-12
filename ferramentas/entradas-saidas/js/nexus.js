/* ============================================================
   NEXUS — Motor de análise + chat flutuante
   Lê window.NEXUS_KB (base de conhecimento) e window.NEXUS_CONFIG.
   ============================================================ */

(function () {
  const KB = window.NEXUS_KB;
  const CONFIG = window.NEXUS_CONFIG;
  const HISTORY_KEY = "nexus-chat-history";

  if (!KB || !CONFIG || !window.FinanceUtils) {
    return;
  }

  const fmt = FinanceUtils.formatCurrency;

  /* ============================================================
     1. UTILITÁRIOS DE TEXTO
     ============================================================ */

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function fill(template, values) {
    return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function plural(qtd, singular, plural_) {
    return `${qtd} ${qtd === 1 ? singular : plural_}`;
  }

  /* ============================================================
     2. PERÍODOS ("últimos 3 meses", "em junho", "mês passado"...)
     ============================================================ */

  const MONTHS = {
    janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
    julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12
  };

  function monthKeyFromDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function shiftMonth(date, delta) {
    return new Date(date.getFullYear(), date.getMonth() + delta, 1);
  }

  /* Retorna { keys: Set de "AAAA-MM", label: "texto pro usuário", raw: trecho da frase } */
  function parsePeriod(text) {
    const now = new Date();

    let match = text.match(/ultim[oa]s?\s+(\d+)\s+mes(?:es)?/);
    if (match) {
      const qty = Math.max(1, Math.min(24, Number(match[1])));
      const keys = new Set();
      for (let i = 0; i < qty; i += 1) {
        keys.add(monthKeyFromDate(shiftMonth(now, -i)));
      }
      return { keys, label: `nos últimos ${qty} meses`, raw: match[0] };
    }

    match = text.match(/ultimo\s+mes|mes\s+passado/);
    if (match) {
      return { keys: new Set([monthKeyFromDate(shiftMonth(now, -1))]), label: "no mês passado", raw: match[0] };
    }

    match = text.match(/es[st]e\s+ano|ano\s+atual/);
    if (match) {
      const keys = new Set();
      for (let m = 0; m <= now.getMonth(); m += 1) {
        keys.add(monthKeyFromDate(new Date(now.getFullYear(), m, 1)));
      }
      return { keys, label: `em ${now.getFullYear()}`, raw: match[0] };
    }

    const monthNames = Object.keys(MONTHS).join("|");
    match = text.match(new RegExp(`(?:em\\s+|de\\s+)?(${monthNames})(?:\\s+de\\s+(\\d{4}))?`));
    if (match) {
      const year = match[2] ? Number(match[2]) : now.getFullYear();
      const key = `${year}-${String(MONTHS[match[1]]).padStart(2, "0")}`;
      return { keys: new Set([key]), label: `em ${match[1]} de ${year}`, raw: match[0] };
    }

    match = text.match(/es[st][ea]\s+mes|mes\s+atual|nesse\s+mes|neste\s+mes/);
    if (match) {
      return { keys: new Set([monthKeyFromDate(now)]), label: "este mês", raw: match[0] };
    }

    return null;
  }

  function inPeriod(item, period) {
    if (!period) {
      return true;
    }
    return period.keys.has(FinanceUtils.getMonthKey(item.date));
  }

  /* ============================================================
     3. EXTRAÇÃO DO TERMO ("ifood", "mercado", "uber"...)
     ============================================================ */

  function extractTerm(text, period) {
    let clean = text;
    if (period && period.raw) {
      clean = clean.replace(period.raw, " ");
    }
    const stop = new Set(KB.stopwords.map(normalize));
    const tokens = clean.split(" ").filter((token) => token && !stop.has(token) && !/^\d+$/.test(token));
    return tokens.join(" ").trim();
  }

  function matchesTerm(item, term) {
    if (!term) {
      return true;
    }
    const haystack = normalize([item.category, item.source, item.description, item.type].filter(Boolean).join(" "));
    return term.split(" ").every((word) => haystack.includes(word));
  }

  /* ============================================================
     4. CÁLCULOS (cada intenção tem sua função)
     ============================================================ */

  function sumRecords(records, period, term) {
    const filtered = records.filter((item) => inPeriod(item, period) && matchesTerm(item, term));
    return {
      total: filtered.reduce((acc, item) => acc + (Number(item.value) || 0), 0),
      count: filtered.length,
      items: filtered
    };
  }

  const handlers = {
    gasto(state, text, period, term, replies) {
      const periodLabel = period ? period.label : "no total";
      const anyInPeriod = state.expenses.some((item) => inPeriod(item, period));
      if (!anyInPeriod) {
        return fill(replies.semRegistros, { periodo: periodLabel });
      }

      const result = sumRecords(state.expenses, period, term);
      if (term && !result.count) {
        return fill(replies.nadaEncontrado, { termo: term, periodo: periodLabel });
      }

      const values = {
        valor: fmt(result.total),
        termo: term,
        periodo: periodLabel,
        qtd: plural(result.count, "lançamento", "lançamentos")
      };
      return fill(term ? replies.comTermo : replies.semTermo, values);
    },

    entrada(state, text, period, term, replies) {
      const periodLabel = period ? period.label : "no total";
      const anyInPeriod = state.entries.some((item) => inPeriod(item, period));
      if (!anyInPeriod) {
        return fill(replies.semRegistros, { periodo: periodLabel });
      }

      const result = sumRecords(state.entries, period, term);
      if (term && !result.count) {
        return fill(replies.nadaEncontrado, { termo: term, periodo: periodLabel });
      }

      const values = {
        valor: fmt(result.total),
        termo: term,
        periodo: periodLabel,
        qtd: plural(result.count, "lançamento", "lançamentos")
      };
      return fill(term ? replies.comTermo : replies.semTermo, values);
    },

    saldo(state, text, period, term, replies) {
      const periodLabel = period ? capitalize(period.label) : "No total,";
      const entradas = sumRecords(state.entries, period, "").total;
      const saidas = sumRecords(state.expenses, period, "").total;
      const saldo = entradas - saidas;
      const values = {
        periodo: periodLabel,
        entradas: fmt(entradas),
        saidas: fmt(saidas),
        valor: fmt(Math.abs(saldo))
      };
      if (saldo > 0) {
        return fill(replies.positivo, values);
      }
      if (saldo < 0) {
        return fill(replies.negativo, values);
      }
      return fill(replies.zerado, values);
    },

    maior_gasto(state, text, period, term, replies) {
      const periodLabel = period ? period.label : "no total";
      const result = sumRecords(state.expenses, period, "");
      if (!result.count) {
        return fill(replies.semRegistros, { periodo: periodLabel });
      }

      const byCategory = {};
      result.items.forEach((item) => {
        const key = item.category || "Sem categoria";
        byCategory[key] = (byCategory[key] || 0) + item.value;
      });
      const [topCategory, topValue] = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
      const biggest = [...result.items].sort((a, b) => b.value - a.value)[0];

      return fill(replies.resultado, {
        periodo: periodLabel,
        termo: topCategory,
        valor: fmt(topValue),
        pct: Math.round((topValue / result.total) * 100),
        maiorItem: biggest.description || biggest.category,
        maiorValor: fmt(biggest.value)
      });
    },

    reserva(state, text, period, term, replies) {
      const essentials = state.planner && Array.isArray(state.planner.essentials)
        ? state.planner.essentials.reduce((acc, row) => acc + (Number(row.value) || 0), 0)
        : 0;
      if (!essentials) {
        return replies.semOrcamento;
      }

      const meta = essentials * 6;
      const atual = (state.investments && Number(state.investments.emergencyReserve)) || 0;
      if (atual >= meta) {
        return fill(replies.completa, { atual: fmt(atual), meta: fmt(meta) });
      }
      return fill(replies.comMeta, {
        meta: fmt(meta),
        atual: fmt(atual),
        pct: Math.round((atual / meta) * 100),
        falta: fmt(meta - atual)
      });
    },

    orcamento(state, text, period, term, replies) {
      const planner = state.planner;
      const sum = (rows) => (Array.isArray(rows) ? rows.reduce((acc, row) => acc + (Number(row.value) || 0), 0) : 0);
      const entradas = planner ? sum(planner.incomes) : 0;
      const saidas = planner ? sum(planner.essentials) + sum(planner.nonEssentials) : 0;
      if (!entradas && !saidas) {
        return replies.semOrcamento;
      }

      const sobra = entradas - saidas;
      const values = {
        entradas: fmt(entradas),
        saidas: fmt(saidas),
        sobra: fmt(Math.abs(sobra)),
        pct: entradas > 0 ? Math.round((saidas / entradas) * 100) : 0
      };
      return fill(sobra >= 0 ? replies.resultado : replies.negativo, values);
    },

    lista_compras(state, text, period, term, replies) {
      const shopping = Array.isArray(state.shopping) ? state.shopping : [];
      if (!shopping.length) {
        return replies.vazia;
      }

      const pending = shopping.filter((item) => !item.done);
      if (!pending.length) {
        return fill(replies.tudoPago, { qtd: plural(shopping.length, "item", "itens") });
      }

      const total = pending.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
      const names = pending.slice(0, 5).map((item) => item.name).join(", ") + (pending.length > 5 ? "..." : "");
      return fill(replies.pendentes, {
        qtd: plural(pending.length, "item", "itens"),
        valor: fmt(total),
        itens: names
      });
    },

    ajuda(state, text, period, term, replies) {
      return replies.texto;
    }
  };

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /* ============================================================
     5. MOTOR LOCAL — detecta a intenção e responde
     ============================================================ */

  function detectIntent(text) {
    const tokens = new Set(text.split(" "));
    for (const intent of KB.intents) {
      const hit = intent.keywords.some((group) => group.every((word) => tokens.has(normalize(word))));
      if (hit) {
        return intent;
      }
    }
    return null;
  }

  const NexusLocal = {
    answer(question) {
      const state = FinanceUtils.getState();
      const text = normalize(question);
      const intent = detectIntent(text);

      if (!intent) {
        const exemplo = state.expenses[0]?.category?.toLowerCase() || "mercado";
        return fill(pick(KB.fallback), { exemplo });
      }

      const period = parsePeriod(text);
      const term = ["gasto", "entrada"].includes(intent.id) ? extractTerm(text, period) : "";
      return handlers[intent.id](state, text, period, term, intent.respostas);
    }
  };

  /* ============================================================
     6. PROVEDOR — local hoje, API amanhã (troque em nexus-config.js)
     ============================================================ */

  function buildApiContext() {
    const state = FinanceUtils.getState();
    return {
      resumo: state.summary,
      entradas: state.entries,
      despesas: state.expenses,
      orcamento: state.planner || null,
      listaCompras: state.shopping || [],
      investimentos: state.investments
    };
  }

  const NexusProvider = {
    async ask(question) {
      if (CONFIG.mode === "api" && CONFIG.api.endpoint) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), CONFIG.api.timeoutMs);
          const response = await fetch(CONFIG.api.endpoint, {
            method: "POST",
            headers: CONFIG.api.headers,
            body: JSON.stringify({ question, context: buildApiContext() }),
            signal: controller.signal
          });
          clearTimeout(timer);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const data = await response.json();
          if (data && data.answer) {
            return data.answer;
          }
          throw new Error("Resposta sem campo 'answer'");
        } catch (error) {
          console.warn("[Nexus] API indisponível, usando modo local:", error.message);
        }
      }
      return NexusLocal.answer(question);
    }
  };

  window.NexusProvider = NexusProvider;
  window.NexusLocal = NexusLocal;

  /* ============================================================
     7. INTERFACE — botão flutuante + chat
     ============================================================ */

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch (error) {
      return [];
    }
  }

  function saveHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-CONFIG.chat.maxHistorico)));
  }

  function buildUI() {
    const root = document.createElement("div");
    root.className = "nexus-root";
    root.innerHTML = `
      <button class="nexus-fab" type="button" aria-label="Abrir o Nexus, analista financeiro" aria-expanded="false" title="Nexus — seu analista financeiro">
        <span class="nexus-fab-icon">◆</span>
        <span class="nexus-fab-label">Falar com o Nexus</span>
      </button>
      <section class="nexus-panel" role="dialog" aria-label="Chat com o Nexus" hidden>
        <header class="nexus-header">
          <span class="nexus-status" aria-hidden="true"></span>
          <div class="nexus-header-text">
            <strong>${KB.nome}</strong>
            <small>${KB.subtitulo}</small>
          </div>
          <button class="nexus-close" type="button" aria-label="Fechar chat">✕</button>
        </header>
        <div class="nexus-messages" aria-live="polite"></div>
        <div class="nexus-chips"></div>
        <form class="nexus-form">
          <input type="text" placeholder="Pergunte sobre suas finanças..." aria-label="Sua pergunta" autocomplete="off">
          <button class="nexus-send" type="submit" aria-label="Enviar pergunta">➤</button>
        </form>
      </section>
    `;
    document.body.appendChild(root);
    return root;
  }

  function addMessage(container, role, text, history, persist) {
    const message = document.createElement("div");
    message.className = `nexus-msg ${role}`;
    message.textContent = text;
    container.appendChild(message);
    container.scrollTop = container.scrollHeight;
    if (persist !== false) {
      history.push({ role, text });
      saveHistory(history);
    }
    return message;
  }

  function showTyping(container) {
    const typing = document.createElement("div");
    typing.className = "nexus-msg bot nexus-typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
    return typing;
  }

  function initUI() {
    const root = buildUI();
    const fab = root.querySelector(".nexus-fab");
    const panel = root.querySelector(".nexus-panel");
    const closeButton = root.querySelector(".nexus-close");
    const messages = root.querySelector(".nexus-messages");
    const chips = root.querySelector(".nexus-chips");
    const form = root.querySelector(".nexus-form");
    const input = form.querySelector("input");

    const history = loadHistory();

    if (history.length) {
      history.forEach((msg) => addMessage(messages, msg.role, msg.text, history, false));
    } else {
      addMessage(messages, "bot", pick(KB.saudacoes), history);
    }

    KB.sugestoes.forEach((suggestion) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "nexus-chip";
      chip.textContent = suggestion;
      chip.addEventListener("click", () => {
        input.value = suggestion;
        form.requestSubmit();
      });
      chips.appendChild(chip);
    });

    function toggle(open) {
      const willOpen = open !== undefined ? open : panel.hidden;
      panel.hidden = !willOpen;
      fab.setAttribute("aria-expanded", String(willOpen));
      root.classList.toggle("is-open", willOpen);
      if (willOpen) {
        messages.scrollTop = messages.scrollHeight;
        input.focus();
      }
    }

    fab.addEventListener("click", () => toggle());
    closeButton.addEventListener("click", () => toggle(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        toggle(false);
      }
    });

    let busy = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const question = input.value.trim();
      if (!question || busy) {
        return;
      }

      busy = true;
      input.value = "";
      addMessage(messages, "user", question, history);
      const typing = showTyping(messages);

      const [min, max] = CONFIG.chat.delayDigitandoMs;
      const delay = min + Math.random() * (max - min);
      const [answer] = await Promise.all([
        NexusProvider.ask(question),
        new Promise((resolve) => setTimeout(resolve, delay))
      ]);

      typing.remove();
      addMessage(messages, "bot", answer, history);
      busy = false;
      input.focus();
    });
  }

  document.addEventListener("DOMContentLoaded", initUI);
})();
