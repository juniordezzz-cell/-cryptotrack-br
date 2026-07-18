(function () {
  const STORAGE_KEY = "finance-dashboard-state";

  /* Tipos de gasto (fonte única do texto que aparece na tela e nos
     lançamentos). Trocamos "Essenciais/Não essenciais" por
     "Gastos fixos/Gastos não fixos" — fixo = repete todo mês. */
  const EXPENSE_TYPES = { fixed: "Gastos fixos", variable: "Gastos não fixos" };

  /* De->Para dos nomes antigos, usado na migração automática. */
  const LEGACY_TYPE_MAP = {
    "Essenciais": EXPENSE_TYPES.fixed,
    "Não essenciais": EXPENSE_TYPES.variable
  };

  const defaultState = {
    summary: {
      receitas: 2000,
      despesas: 1810,
      saldo: 190,
      investimentos: 0
    },
    cashFlow: {
      labels: ["01 Mar", "05 Mar", "10 Mar", "15 Mar", "20 Mar", "25 Mar", "31 Mar"],
      receitas: [80, 310, 720, 980, 1420, 1780, 2050],
      despesas: [40, 95, 340, 520, 860, 1220, 1600]
    },
    categories: [
      { name: "Casa", value: 850, type: "Gastos fixos" },
      { name: "Transporte", value: 250, type: "Gastos fixos" },
      { name: "Alimentação", value: 350, type: "Gastos não fixos" },
      { name: "Saúde", value: 100, type: "Gastos fixos" },
      { name: "Lazer", value: 80, type: "Gastos não fixos" },
      { name: "Outros", value: 180, type: "Gastos não fixos" }
    ],
    netWorth: {
      labels: ["Out", "Nov", "Dez", "Jan", "Fev", "Mar"],
      values: [-980, -610, -220, 90, 360, 720]
    },
    entries: [
      { id: "e1", date: "2026-03-05", source: "Salário", description: "Salário mensal", value: 1550 },
      { id: "e2", date: "2026-03-12", source: "Freelance", description: "Projeto de identidade visual", value: 350 },
      { id: "e3", date: "2026-03-24", source: "Outras receitas", description: "Reembolso", value: 100 }
    ],
    expenses: [
      { id: "d1", date: "2026-03-02", category: "Casa", type: "Gastos fixos", description: "Aluguel e contas", value: 850 },
      { id: "d2", date: "2026-03-07", category: "Transporte", type: "Gastos fixos", description: "Aplicativos e combustível", value: 250 },
      { id: "d3", date: "2026-03-11", category: "Alimentação", type: "Gastos não fixos", description: "Mercado", value: 350 },
      { id: "d4", date: "2026-03-14", category: "Saúde", type: "Gastos fixos", description: "Farmácia", value: 100 },
      { id: "d5", date: "2026-03-20", category: "Lazer", type: "Gastos não fixos", description: "Cinema", value: 80 },
      { id: "d6", date: "2026-03-27", category: "Outros", type: "Gastos não fixos", description: "Compras diversas", value: 180 }
    ],
    investments: {
      emergencyReserve: 0,
      invested: 0,
      availableCash: 190,
      profitability: 0,
      allocation: [
        { name: "Reserva de emergência", value: 0 },
        { name: "Investimentos", value: 0 },
        { name: "Caixa disponível", value: 190 }
      ]
    },
    profile: {
      name: "Usuário",
      email: "usuario@email.com",
      currency: "BRL"
    },
    settings: {
      theme: "dark",
      animations: true,
      compactTables: false
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /* ============================================================
     MIGRAÇÃO AUTOMÁTICA — roda ao carregar os dados da conta.
     É idempotente (pode rodar quantas vezes quiser). Faz duas
     coisas:
       1. Renomeia os tipos antigos ("Essenciais" etc.) para os
          novos ("Gastos fixos" etc.) em lançamentos e categorias.
       2. Completa o planner antigo com os campos do motor de
          recorrência (frequência da renda, dia dos gastos fixos,
          mês dos gastos não fixos) sem perder nada do que existe.
     ============================================================ */
  function migrateState(state) {
    if (!state || typeof state !== "object") {
      return state;
    }

    const fixType = (row) => {
      if (row && LEGACY_TYPE_MAP[row.type]) {
        row.type = LEGACY_TYPE_MAP[row.type];
      }
      return row;
    };
    (state.expenses || []).forEach(fixType);
    (state.categories || []).forEach(fixType);

    if (state.planner && Array.isArray(state.planner.incomes)) {
      const mesAtual = new Date().toISOString().slice(0, 7);
      state.planner.incomes.forEach((row) => {
        if (!row.frequency) {
          row.frequency = "monthly";
          row.monthday = row.monthday || 5;
          row.weekday = row.weekday === undefined ? 5 : row.weekday;
          row.startDate = row.startDate || `${new Date().getFullYear()}-01-05`;
        }
      });
      (state.planner.essentials || []).forEach((row) => {
        if (row.monthday === undefined) {
          row.monthday = 5;
        }
      });
      (state.planner.nonEssentials || []).forEach((row) => {
        if (!row.month) {
          row.month = mesAtual;
        }
      });
    }

    return state;
  }

  /* Estado zerado — é o que um assinante PRO novo recebe na
     primeira vez (sem herdar nenhum dado de demonstração). */
  function freshState() {
    const fresh = clone(defaultState);
    fresh.entries = [];
    fresh.expenses = [];
    fresh.categories = [];
    fresh.summary = { receitas: 0, despesas: 0, saldo: 0, investimentos: 0 };
    fresh.cashFlow = { labels: defaultState.cashFlow.labels, receitas: [0, 0, 0, 0, 0, 0, 0], despesas: [0, 0, 0, 0, 0, 0, 0] };
    fresh.netWorth = { labels: defaultState.netWorth.labels, values: [0, 0, 0, 0, 0, 0] };
    fresh.investments = { emergencyReserve: 0, invested: 0, availableCash: 0, profitability: 0, allocation: [] };
    delete fresh.planner;
    return fresh;
  }

  /* ============================================================
     MODO NUVEM (PRO) vs MODO VITRINE (todo mundo)
     ------------------------------------------------------------
     • Sem nuvem ativa → getState() sempre devolve os dados de
       DEMONSTRAÇÃO (defaultState), só leitura. Isso é a vitrine.
     • Com nuvem ativa (pessoa logada e PRO) → getState() e
       saveState() passam a ler/gravar no Firestore, na conta
       da pessoa. Nada mais fica salvo no navegador.
     ============================================================ */
  let cloudUid = null;
  let cloudCache = null;
  let cloudSaveTimer = null;

  function cloudDocRef(uid) {
    return firebase.firestore().collection("entradas_saidas_dados").doc(uid);
  }

  function ativarNuvem(uid) {
    if (cloudUid === uid && cloudCache) {
      return; /* já carregado */
    }
    cloudUid = uid;
    cloudDocRef(uid)
      .get()
      .then((snap) => {
        cloudCache = snap.exists && snap.data() && snap.data().state ? migrateState({ ...freshState(), ...snap.data().state }) : freshState();
        document.dispatchEvent(new CustomEvent("finance-cloud-ready"));
      })
      .catch(() => {
        cloudCache = freshState();
        document.dispatchEvent(new CustomEvent("finance-cloud-ready"));
      });
  }

  function desativarNuvem() {
    cloudUid = null;
    cloudCache = null;
    window.clearTimeout(cloudSaveTimer);
  }

  function persistirNuvemAgora() {
    if (!cloudUid || !cloudCache) {
      return;
    }
    cloudDocRef(cloudUid)
      .set({ state: cloudCache, atualizadoEm: new Date().toISOString() }, { merge: true })
      .catch(() => {});
  }

  function persistirNuvem() {
    window.clearTimeout(cloudSaveTimer);
    cloudSaveTimer = window.setTimeout(persistirNuvemAgora, 500);
  }

  function resetarNuvem() {
    if (!cloudUid) {
      return;
    }
    cloudCache = freshState();
    persistirNuvemAgora();
    document.dispatchEvent(new CustomEvent("finance-cloud-ready"));
  }

  function getState() {
    if (cloudUid && cloudCache) {
      return clone(cloudCache);
    }
    return clone(defaultState);
  }

  function saveState(nextState) {
    if (cloudUid) {
      cloudCache = clone(nextState);
      persistirNuvem();
    }
    /* Sem nuvem ativa (vitrine): não persiste em lugar nenhum —
       são só os dados de demonstração, de propósito. */
    return nextState;
  }

  function updateState(updater) {
    const current = getState();
    const next = updater(current) || current;
    saveState(next);
    return next;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value) || 0);
  }

  function formatPercent(value) {
    return `${new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Number(value) || 0)}%`;
  }

  function formatDate(value) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  function parseMoney(value) {
    if (typeof value === "number") {
      return value;
    }

    const normalized = String(value)
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    return Number(normalized) || 0;
  }

  function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  function getMonthKey(date) {
    return String(date || "").slice(0, 7);
  }

  const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  function monthLabel(key) {
    const [year, month] = String(key).split("-");
    const name = MONTH_NAMES[Number(month) - 1] || key;
    return `${name} / ${year}`;
  }

  function monthOptions(state) {
    const keys = new Set();
    (state.entries || []).forEach((item) => keys.add(getMonthKey(item.date)));
    (state.expenses || []).forEach((item) => keys.add(getMonthKey(item.date)));
    return [...keys].filter(Boolean).sort().reverse();
  }

  function fillMonthSelect(selector, state, allLabel) {
    const element = document.querySelector(selector);
    if (!element) {
      return;
    }

    const current = element.value;
    const options = monthOptions(state)
      .map((key) => `<option value="${key}">${monthLabel(key)}</option>`)
      .join("");

    element.innerHTML = `<option value="all">${allLabel || "Todos os meses"}</option>${options}`;
    if ([...element.options].some((option) => option.value === current)) {
      element.value = current;
    }
  }

  function summarizeEntries(entries) {
    return entries.reduce(
      (acc, item) => {
        acc.total += item.value;
        acc.bySource[item.source] = (acc.bySource[item.source] || 0) + item.value;
        return acc;
      },
      { total: 0, bySource: {} }
    );
  }

  function summarizeExpenses(expenses) {
    return expenses.reduce(
      (acc, item) => {
        acc.total += item.value;
        acc.byType[item.type] = (acc.byType[item.type] || 0) + item.value;
        acc.byCategory[item.category] = (acc.byCategory[item.category] || 0) + item.value;
        return acc;
      },
      { total: 0, byType: {}, byCategory: {} }
    );
  }

  function refreshSummary(state) {
    const entries = summarizeEntries(state.entries);
    const expenses = summarizeExpenses(state.expenses);
    state.summary.receitas = entries.total;
    state.summary.despesas = expenses.total;
    state.summary.saldo = entries.total - expenses.total;
    state.summary.investimentos = state.investments.invested;
    state.categories = Object.entries(expenses.byCategory).map(([name, value]) => {
      const found = state.expenses.find((expense) => expense.category === name);
      return { name, value, type: found ? found.type : "Outros" };
    });
    deriveCashFlow(state);
    deriveNetWorth(state);
    return state;
  }

  /* Fluxo do mês atual: acumulado de entradas x saídas em 7 marcos */
  function deriveCashFlow(state) {
    const keys = monthOptions(state);
    if (!keys.length) {
      return;
    }
    const key = keys[0];
    const [year, month] = key.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const checkpoints = [1, 5, 10, 15, 20, 25, lastDay];
    const inMonth = (rows) => rows.filter((r) => getMonthKey(r.date) === key);
    const upTo = (rows, day) =>
      rows.reduce((acc, r) => (Number(String(r.date).slice(8, 10)) <= day ? acc + r.value : acc), 0);
    const monthEntries = inMonth(state.entries);
    const monthExpenses = inMonth(state.expenses);
    state.cashFlow = {
      labels: checkpoints.map((d) => `${String(d).padStart(2, "0")} ${monthLabel(key).slice(0, 3)}`),
      receitas: checkpoints.map((d) => upTo(monthEntries, d)),
      despesas: checkpoints.map((d) => upTo(monthExpenses, d))
    };
  }

  /* Evolução do saldo: acumulado mês a mês (últimos 6 meses com dados) */
  function deriveNetWorth(state) {
    const keys = monthOptions(state).slice(0, 6).reverse();
    if (!keys.length) {
      return;
    }
    const sumMonth = (rows, key) =>
      rows.reduce((acc, r) => (getMonthKey(r.date) === key ? acc + r.value : acc), 0);
    let acumulado = 0;
    const values = keys.map((key) => {
      acumulado += sumMonth(state.entries, key) - sumMonth(state.expenses, key);
      return acumulado;
    });
    state.netWorth = {
      labels: keys.map((key) => monthLabel(key).slice(0, 3)),
      values
    };
  }

  function renderRows(tbody, rows, template) {
    if (!tbody) {
      return;
    }

    tbody.innerHTML = rows.map(template).join("");
  }

  function setText(selector, value) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      element.textContent = value;
    });
  }

  /* Contador animado: o valor "sobe" até o número final (R$) */
  function countUpCurrency(selector, value, duration) {
    const elements = document.querySelectorAll(selector);
    const target = Number(value) || 0;
    const animations = getState().settings.animations !== false;
    if (!elements.length) {
      return;
    }
    if (!animations) {
      elements.forEach((el) => { el.textContent = formatCurrency(target); });
      return;
    }
    const total = duration || 900;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    let start = null;
    function frame(ts) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / total, 1);
      const current = target * ease(p);
      elements.forEach((el) => { el.textContent = formatCurrency(current); });
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function toCsv(rows) {
    return rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\n");
  }

  function toast(message) {
    let element = document.querySelector(".toast");
    if (!element) {
      element = document.createElement("div");
      element.className = "toast";
      document.body.appendChild(element);
    }

    element.textContent = message;
    element.classList.add("is-visible");
    window.setTimeout(() => element.classList.remove("is-visible"), 2400);
  }

  function applyTheme(theme) {
    document.body.classList.toggle("light-theme", theme === "light");
  }

  /* Lista as 12 chaves de mês (YYYY-MM) de um ano, Jan..Dez. */
  function yearMonthKeys(year) {
    const y = year || new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, "0")}`);
  }

  window.FinanceUtils = {
    STORAGE_KEY,
    EXPENSE_TYPES,
    defaultState,
    migrateState,
    yearMonthKeys,
    getState,
    saveState,
    updateState,
    ativarNuvem,
    desativarNuvem,
    resetarNuvem,
    refreshSummary,
    formatCurrency,
    formatPercent,
    formatDate,
    parseMoney,
    uid,
    getMonthKey,
    monthLabel,
    monthOptions,
    MONTH_NAMES,
    fillMonthSelect,
    summarizeEntries,
    summarizeExpenses,
    renderRows,
    setText,
    countUpCurrency,
    downloadText,
    toCsv,
    toast,
    applyTheme
  };
})();
