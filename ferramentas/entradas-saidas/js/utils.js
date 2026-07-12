(function () {
  const STORAGE_KEY = "finance-dashboard-state";

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
      { name: "Casa", value: 850, type: "Essenciais" },
      { name: "Transporte", value: 250, type: "Essenciais" },
      { name: "Alimentação", value: 350, type: "Essenciais" },
      { name: "Saúde", value: 100, type: "Essenciais" },
      { name: "Lazer", value: 80, type: "Não essenciais" },
      { name: "Outros", value: 180, type: "Não essenciais" }
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
      { id: "d1", date: "2026-03-02", category: "Casa", type: "Essenciais", description: "Aluguel e contas", value: 850 },
      { id: "d2", date: "2026-03-07", category: "Transporte", type: "Essenciais", description: "Aplicativos e combustível", value: 250 },
      { id: "d3", date: "2026-03-11", category: "Alimentação", type: "Essenciais", description: "Mercado", value: 350 },
      { id: "d4", date: "2026-03-14", category: "Saúde", type: "Essenciais", description: "Farmácia", value: 100 },
      { id: "d5", date: "2026-03-20", category: "Lazer", type: "Não essenciais", description: "Cinema", value: 80 },
      { id: "d6", date: "2026-03-27", category: "Outros", type: "Não essenciais", description: "Compras diversas", value: 180 }
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

  function getState() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return clone(defaultState);
    }

    try {
      return { ...clone(defaultState), ...JSON.parse(stored) };
    } catch (error) {
      return clone(defaultState);
    }
  }

  function saveState(nextState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
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

  window.FinanceUtils = {
    STORAGE_KEY,
    defaultState,
    getState,
    saveState,
    updateState,
    refreshSummary,
    formatCurrency,
    formatPercent,
    formatDate,
    parseMoney,
    uid,
    getMonthKey,
    monthLabel,
    monthOptions,
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
