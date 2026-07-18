/* ============================================================
   ENTRADAS x SAÍDAS — planejador com MOTOR DE RECORRÊNCIA
   ------------------------------------------------------------
   Fonte única de lançamentos. Diferente da versão antiga (que
   jogava tudo no dia de hoje), agora cada coisa tem tempo:

     • RENDA        → cada fonte tem uma frequência (semanal,
                      quinzenal, mensal ou 1º dia útil). O motor
                      gera os recebimentos datados do ano todo.
     • GASTOS FIXOS → repetem todo mês, no dia escolhido.
     • GASTOS NÃO   → lançados por mês (variam), presos ao mês
       FIXOS          selecionado no topo.

   Tudo isso vira state.entries / state.expenses datados, que
   alimentam Dashboard, Entradas, Despesas, Relatórios e Análises.
   ============================================================ */

(function () {
  const LISTS = ["incomes", "essentials", "nonEssentials"];
  const YEAR = new Date().getFullYear();
  const RANGE_START = `${YEAR}-01-01`;
  const RANGE_END = `${YEAR}-12-31`;
  const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  /* ---------- Modelo padrão (com os campos do motor) ---------- */
  function defaultPlanner() {
    return {
      owner: "",
      year: YEAR,
      incomes: [
        { id: "i1", label: "Salário líquido (trabalho principal)", value: 0, frequency: "monthly", monthday: 5, weekday: 5, startDate: `${YEAR}-01-05` },
        { id: "i2", label: "Salário líquido (trabalho 2)", value: 0, frequency: "monthly", monthday: 5, weekday: 5, startDate: `${YEAR}-01-05` },
        { id: "i3", label: "Vale-alimentação / refeição", value: 0, frequency: "monthly", monthday: 1, weekday: 5, startDate: `${YEAR}-01-01` },
        { id: "i4", label: "Renda extra (freelas, vendas...)", value: 0, frequency: "monthly", monthday: 15, weekday: 5, startDate: `${YEAR}-01-15` },
        { id: "i5", label: "Outras entradas (bônus, aluguel...)", value: 0, frequency: "monthly", monthday: 20, weekday: 5, startDate: `${YEAR}-01-20` }
      ],
      essentials: [
        { id: "s1", label: "Aluguel / financiamento", value: 0, monthday: 5 },
        { id: "s2", label: "Condomínio", value: 0, monthday: 5 },
        { id: "s3", label: "Luz", value: 0, monthday: 10 },
        { id: "s4", label: "Água", value: 0, monthday: 10 },
        { id: "s5", label: "Gás", value: 0, monthday: 10 },
        { id: "s6", label: "Internet", value: 0, monthday: 15 },
        { id: "s7", label: "Plano de saúde", value: 0, monthday: 8 },
        { id: "s8", label: "Aporte em investimentos (pague-se primeiro!)", value: 0, monthday: 5 }
      ],
      nonEssentials: [
        { id: "n1", label: "Supermercado", value: 0, month: `${YEAR}-${String(new Date().getMonth() + 1).padStart(2, "0")}` },
        { id: "n2", label: "Transporte / combustível", value: 0, month: `${YEAR}-${String(new Date().getMonth() + 1).padStart(2, "0")}` },
        { id: "n3", label: "Delivery / iFood", value: 0, month: `${YEAR}-${String(new Date().getMonth() + 1).padStart(2, "0")}` },
        { id: "n4", label: "Farmácia", value: 0, month: `${YEAR}-${String(new Date().getMonth() + 1).padStart(2, "0")}` },
        { id: "n5", label: "Saídas / lazer", value: 0, month: `${YEAR}-${String(new Date().getMonth() + 1).padStart(2, "0")}` },
        { id: "n6", label: "Imprevistos", value: 0, month: `${YEAR}-${String(new Date().getMonth() + 1).padStart(2, "0")}` }
      ]
    };
  }

  function getPlanner(state) {
    if (!state.planner || !Array.isArray(state.planner.incomes)) {
      state.planner = defaultPlanner();
    }
    FinanceUtils.migrateState(state);
    return state.planner;
  }

  /* ---------- Motor: datas de recebimento de uma fonte ---------- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function parse(s) { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); }

  function payDates(income, startISO, endISO) {
    const start = parse(startISO);
    const end = parse(endISO);
    const out = [];
    const freq = income.frequency || "monthly";

    if (freq === "weekly") {
      const wd = Number(income.weekday);
      const d = new Date(start);
      while (d.getDay() !== wd) { d.setDate(d.getDate() + 1); }
      for (; d <= end; d.setDate(d.getDate() + 7)) { out.push(iso(d)); }
    } else if (freq === "biweekly") {
      let d = parse(income.startDate || startISO);
      while (d < start) { d.setDate(d.getDate() + 14); }
      for (; d <= end; d.setDate(d.getDate() + 14)) { out.push(iso(d)); }
    } else if (freq === "firstBusinessDay") {
      let y = start.getFullYear();
      let m = start.getMonth();
      while (true) {
        const d = new Date(y, m, 1);
        while (d.getDay() === 0 || d.getDay() === 6) { d.setDate(d.getDate() + 1); }
        if (d > end) { break; }
        if (d >= start) { out.push(iso(d)); }
        m += 1;
        if (m > 11) { m = 0; y += 1; }
      }
    } else {
      /* mensal (padrão) */
      const day = Math.min(31, Math.max(1, Number(income.monthday) || 1));
      let y = start.getFullYear();
      let m = start.getMonth();
      while (true) {
        const last = new Date(y, m + 1, 0).getDate();
        const d = new Date(y, m, Math.min(day, last));
        if (d > end) { break; }
        if (d >= start) { out.push(iso(d)); }
        m += 1;
        if (m > 11) { m = 0; y += 1; }
      }
    }
    return out;
  }

  function sum(rows) {
    return rows.reduce((acc, row) => acc + (Number(row.value) || 0), 0);
  }

  /* Recebimentos de UMA fonte no período, como [{date, value}].
     Frequência regular repete o mesmo valor; "custom" usa parcelas
     avulsas (cada uma com sua data e seu próprio valor). */
  function incomeEntries(income, startISO, endISO) {
    if (income.frequency === "custom") {
      return (income.installments || [])
        .filter((p) => p.date && p.date >= startISO && p.date <= endISO && (Number(p.value) || 0) > 0)
        .map((p) => ({ date: p.date, value: Number(p.value) || 0 }));
    }
    const v = Number(income.value) || 0;
    if (v <= 0) { return []; }
    return payDates(income, startISO, endISO).map((date) => ({ date, value: v }));
  }

  /* Soma da renda de uma fonte custom (usado pra manter income.value em dia) */
  function installmentsTotal(income) {
    return (income.installments || []).reduce((acc, p) => acc + (Number(p.value) || 0), 0);
  }

  /* Total de ENTRADAS que caem num mês. Para frequência regular, é
     nº de recebimentos × valor (é aqui que meses com 5 sextas rendem
     mais). Para custom, é a soma das parcelas daquele mês. */
  function incomeInMonth(planner, mk) {
    return planner.incomes.reduce((acc, income) => {
      const doMes = incomeEntries(income, RANGE_START, RANGE_END)
        .filter((e) => e.date.slice(0, 7) === mk)
        .reduce((s, e) => s + e.value, 0);
      return acc + doMes;
    }, 0);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------- Templates de linha ---------- */
  function freqParam(income) {
    const freq = income.frequency || "monthly";
    if (freq === "weekly") {
      const opts = WEEKDAYS.map((name, i) =>
        `<option value="${i}" ${Number(income.weekday) === i ? "selected" : ""}>${name}</option>`).join("");
      return `<select class="freq-param-input freq-weekday" aria-label="Dia da semana">${opts}</select>`;
    }
    if (freq === "biweekly") {
      return `<input type="date" class="freq-param-input freq-start" value="${income.startDate || RANGE_START}" aria-label="1º pagamento">`;
    }
    if (freq === "firstBusinessDay") {
      return `<span class="freq-note">1º dia útil do mês</span>`;
    }
    if (freq === "custom") {
      return `<span class="freq-note">Parcelas avulsas — some as datas abaixo</span>`;
    }
    return `<input type="number" class="freq-param-input freq-monthday" min="1" max="31" value="${income.monthday || 5}" aria-label="Dia do mês" title="Dia do mês">`;
  }

  /* Editor de parcelas (só para frequência "Personalizada") */
  function installmentsBlock(income) {
    if (income.frequency !== "custom") { return ""; }
    const parcelas = (income.installments || []);
    const linhas = parcelas.length
      ? parcelas.map((p) => `
          <div class="inst-row" data-inst-id="${p.id}">
            <input type="date" class="inst-date" value="${p.date || ""}" aria-label="Data da parcela">
            <input type="number" class="inst-value" value="${p.value || ""}" min="0" step="0.01" placeholder="0,00" inputmode="decimal" aria-label="Valor da parcela">
            <button class="inst-remove" type="button" title="Remover parcela" aria-label="Remover parcela">✕</button>
          </div>`).join("")
      : `<p class="inst-empty">Nenhuma parcela ainda. Ex: recebi 500 no dia 5, 500 no dia 15 e 400 no dia 25.</p>`;
    return `
      <div class="installments">
        <div class="inst-head">
          <span>Parcelas — data + valor (o total é somado sozinho)</span>
          <button class="inst-add" type="button" data-inst-add>+ parcela</button>
        </div>
        ${linhas}
      </div>`;
  }

  function incomeRow(row) {
    const freq = row.frequency || "monthly";
    const isCustom = freq === "custom";
    const freqOpts = [
      ["weekly", "Semanal"],
      ["biweekly", "Quinzenal"],
      ["monthly", "Mensal"],
      ["firstBusinessDay", "1º dia útil"],
      ["custom", "Personalizada"]
    ].map(([v, label]) => `<option value="${v}" ${freq === v ? "selected" : ""}>${label}</option>`).join("");

    /* Quando é personalizada, o valor vira um total calculado (só leitura) */
    const valorField = isCustom
      ? `<input type="text" class="row-value row-total" value="${FinanceUtils.formatCurrency(installmentsTotal(row))}" readonly tabindex="-1" aria-label="Total das parcelas" title="Somado das parcelas">`
      : `<input type="number" class="row-value" value="${row.value || ""}" min="0" step="0.01" placeholder="0,00" inputmode="decimal" aria-label="Valor por recebimento">`;

    return `
      <div class="planner-row income-row${isCustom ? " is-custom" : ""}" data-row-id="${row.id}">
        <input type="text" class="row-label" value="${escapeHtml(row.label)}" placeholder="Descrição" aria-label="Descrição">
        ${valorField}
        <div class="row-freq">
          <select class="freq-type" aria-label="Frequência">${freqOpts}</select>
          <span class="freq-param">${freqParam(row)}</span>
        </div>
        <button class="row-remove" type="button" title="Remover linha" aria-label="Remover linha">✕</button>
        ${installmentsBlock(row)}
      </div>
    `;
  }

  function fixedRow(row) {
    return `
      <div class="planner-row fixed-row" data-row-id="${row.id}">
        <input type="text" class="row-label" value="${escapeHtml(row.label)}" placeholder="Descrição" aria-label="Descrição">
        <input type="number" class="row-day" min="1" max="31" value="${row.monthday || 5}" aria-label="Dia do mês" title="Dia que vence todo mês">
        <input type="number" class="row-value" value="${row.value || ""}" min="0" step="0.01" placeholder="0,00" inputmode="decimal" aria-label="Valor">
        <button class="row-remove" type="button" title="Remover linha" aria-label="Remover linha">✕</button>
      </div>
    `;
  }

  function variableRow(row) {
    return `
      <div class="planner-row" data-row-id="${row.id}">
        <input type="text" class="row-label" value="${escapeHtml(row.label)}" placeholder="Descrição" aria-label="Descrição">
        <input type="number" class="row-value" value="${row.value || ""}" min="0" step="0.01" placeholder="0,00" inputmode="decimal" aria-label="Valor">
        <button class="row-remove" type="button" title="Remover linha" aria-label="Remover linha">✕</button>
      </div>
    `;
  }

  function selectedMonth() {
    return document.querySelector("#plannerMonth")?.value || new Date().toISOString().slice(0, 7);
  }

  function renderLists(planner) {
    const mk = selectedMonth();
    const incomes = document.querySelector('[data-planner-list="incomes"]');
    if (incomes) { incomes.innerHTML = planner.incomes.map(incomeRow).join(""); }

    const essentials = document.querySelector('[data-planner-list="essentials"]');
    if (essentials) { essentials.innerHTML = planner.essentials.map(fixedRow).join(""); }

    const nonEssentials = document.querySelector('[data-planner-list="nonEssentials"]');
    if (nonEssentials) {
      const doMes = planner.nonEssentials.filter((row) => (row.month || mk) === mk);
      nonEssentials.innerHTML = doMes.length
        ? doMes.map(variableRow).join("")
        : '<p class="empty-state" style="padding:14px 18px;">Nenhum gasto não fixo neste mês. Adicione abaixo.</p>';
    }
  }

  function fillMonthSelect(planner) {
    const select = document.querySelector("#plannerMonth");
    if (!select) { return; }
    const current = select.value || new Date().toISOString().slice(0, 7);
    select.innerHTML = FinanceUtils.yearMonthKeys(YEAR)
      .map((key) => `<option value="${key}">${FinanceUtils.monthLabel(key)}</option>`)
      .join("");
    const has = [...select.options].some((o) => o.value === current);
    select.value = has ? current : new Date().toISOString().slice(0, 7);
  }

  function renderTotals(planner) {
    const fmt = FinanceUtils.formatCurrency;
    const mk = selectedMonth();

    const entradas = incomeInMonth(planner, mk);
    const essenciais = sum(planner.essentials);
    const naoEssenciais = sum(planner.nonEssentials.filter((row) => (row.month || mk) === mk));
    const saidas = essenciais + naoEssenciais;
    const sobra = entradas - saidas;
    const reserva = essenciais * 6;

    FinanceUtils.setText("[data-planner-entradas]", fmt(entradas));
    FinanceUtils.setText("[data-planner-total-entradas]", fmt(entradas));
    FinanceUtils.setText("[data-planner-essenciais]", fmt(essenciais));
    FinanceUtils.setText("[data-planner-sub-essenciais]", fmt(essenciais));
    FinanceUtils.setText("[data-planner-nao-essenciais]", fmt(naoEssenciais));
    FinanceUtils.setText("[data-planner-sub-nao-essenciais]", fmt(naoEssenciais));
    FinanceUtils.setText("[data-planner-total-saidas]", fmt(saidas));
    FinanceUtils.setText("[data-planner-sobra]", fmt(sobra));
    FinanceUtils.setText("[data-planner-reserva]", fmt(reserva));

    const sobraBox = document.querySelector("[data-planner-sobra-box]");
    if (sobraBox) {
      sobraBox.classList.toggle("negative", sobra < 0);
      const sobraValue = sobraBox.querySelector("[data-planner-sobra]");
      if (sobraValue) {
        sobraValue.className = sobra >= 0 ? "success-text" : "danger-text";
      }
    }

    const meses = document.querySelector("[data-planner-meses]");
    if (meses) {
      if (sobra > 0 && reserva > 0) {
        const qty = Math.ceil(reserva / sobra);
        meses.textContent = `${qty} ${qty === 1 ? "mês" : "meses"}`;
      } else {
        meses.textContent = "—";
      }
    }

    const commit = document.querySelector("[data-planner-commit]");
    const commitPct = document.querySelector("[data-planner-commit-pct]");
    if (commit && commitPct) {
      const pct = entradas > 0 ? Math.round((saidas / entradas) * 100) : 0;
      commit.style.setProperty("--value", `${Math.min(pct, 100)}%`);
      commit.classList.toggle("warn", pct > 70 && pct <= 90);
      commit.classList.toggle("danger", pct > 90);
      commitPct.textContent = `${pct}%`;
    }
  }

  /* ============================================================
     GERAÇÃO — transforma o planejamento em lançamentos datados
     do ano todo (Jan..Dez), que abastecem as outras páginas.
     ============================================================ */
  const DEMO_IDS = ["e1", "e2", "e3", "d1", "d2", "d3", "d4", "d5", "d6"];

  function generateMovimentos(state, planner) {
    const manter = (row) => !String(row.id).startsWith("pl-") && !DEMO_IDS.includes(row.id);
    const TYPES = FinanceUtils.EXPENSE_TYPES;

    /* Entradas: um lançamento por recebimento no ano (parcelas custom
       entram com seus próprios valores) */
    const novasEntradas = [];
    planner.incomes.forEach((income, idx) => {
      incomeEntries(income, RANGE_START, RANGE_END).forEach((rec, i) => {
        novasEntradas.push({
          id: `pl-${income.id}-${rec.date}-${i}`,
          date: rec.date,
          source: income.label || "Entrada",
          description: income.label || "Entrada do planejamento",
          value: rec.value
        });
      });
    });

    /* Gastos fixos: um lançamento por mês, no dia escolhido */
    const novasSaidas = [];
    planner.essentials.forEach((row) => {
      const v = Number(row.value) || 0;
      if (v <= 0) { return; }
      const day = Math.min(31, Math.max(1, Number(row.monthday) || 5));
      FinanceUtils.yearMonthKeys(YEAR).forEach((mk) => {
        const [y, m] = mk.split("-").map(Number);
        const last = new Date(y, m, 0).getDate();
        const date = `${mk}-${pad(Math.min(day, last))}`;
        novasSaidas.push({
          id: `pl-${row.id}-${mk}`,
          date,
          category: row.label || "Gasto fixo",
          type: TYPES.fixed,
          description: row.label || "Gasto fixo",
          value: v
        });
      });
    });

    /* Gastos não fixos: um lançamento no mês a que pertencem (dia 15) */
    planner.nonEssentials.forEach((row) => {
      const v = Number(row.value) || 0;
      if (v <= 0) { return; }
      const mk = row.month || new Date().toISOString().slice(0, 7);
      novasSaidas.push({
        id: `pl-${row.id}`,
        date: `${mk}-15`,
        category: row.label || "Gasto não fixo",
        type: TYPES.variable,
        description: row.label || "Gasto não fixo",
        value: v
      });
    });

    state.entries = state.entries.filter(manter).concat(novasEntradas);
    state.expenses = state.expenses.filter(manter).concat(novasSaidas);
    return FinanceUtils.refreshSummary(state);
  }

  function savePlanner(planner) {
    FinanceUtils.updateState((state) => {
      state.planner = planner;
      return generateMovimentos(state, planner);
    });
  }

  /* ---------- Eventos ---------- */
  function bindEvents(planner) {
    LISTS.forEach((listName) => {
      const container = document.querySelector(`[data-planner-list="${listName}"]`);
      if (!container) { return; }

      container.addEventListener("input", (event) => {
        const rowElement = event.target.closest("[data-row-id]");
        if (!rowElement) { return; }
        const row = planner[listName].find((item) => item.id === rowElement.dataset.rowId);
        if (!row) { return; }

        if (event.target.classList.contains("row-label")) { row.label = event.target.value; }
        if (event.target.classList.contains("row-value") && !event.target.classList.contains("row-total")) { row.value = Number(event.target.value) || 0; }
        if (event.target.classList.contains("row-day")) { row.monthday = Number(event.target.value) || 1; }
        if (event.target.classList.contains("freq-weekday")) { row.weekday = Number(event.target.value); }
        if (event.target.classList.contains("freq-monthday")) { row.monthday = Number(event.target.value) || 1; }
        if (event.target.classList.contains("freq-start")) { row.startDate = event.target.value; }

        /* Parcelas da renda personalizada */
        if (event.target.classList.contains("inst-date") || event.target.classList.contains("inst-value")) {
          const instEl = event.target.closest("[data-inst-id]");
          const parcela = (row.installments || []).find((p) => p.id === instEl.dataset.instId);
          if (parcela) {
            if (event.target.classList.contains("inst-date")) { parcela.date = event.target.value; }
            if (event.target.classList.contains("inst-value")) { parcela.value = Number(event.target.value) || 0; }
            row.value = installmentsTotal(row);
            const totalField = rowElement.querySelector(".row-total");
            if (totalField) { totalField.value = FinanceUtils.formatCurrency(row.value); }
          }
        }

        savePlanner(planner);
        renderTotals(planner);
      });

      /* Trocar a frequência: se envolve "Personalizada", re-desenha a
         linha toda (muda o campo de valor e mostra/esconde parcelas). */
      container.addEventListener("change", (event) => {
        if (!event.target.classList.contains("freq-type")) { return; }
        const rowElement = event.target.closest("[data-row-id]");
        const row = planner[listName].find((item) => item.id === rowElement.dataset.rowId);
        if (!row) { return; }
        const eraCustom = row.frequency === "custom";
        row.frequency = event.target.value;
        if (row.frequency === "custom" && !Array.isArray(row.installments)) {
          row.installments = [{ id: FinanceUtils.uid("pc"), date: `${selectedMonth()}-05`, value: 0 }];
        }
        savePlanner(planner);
        if (row.frequency === "custom" || eraCustom) {
          renderLists(planner);
        } else {
          const paramSpan = rowElement.querySelector(".freq-param");
          if (paramSpan) { paramSpan.innerHTML = freqParam(row); }
        }
        renderTotals(planner);
      });

      container.addEventListener("click", (event) => {
        /* Adicionar parcela numa renda personalizada */
        const addInst = event.target.closest("[data-inst-add]");
        if (addInst) {
          const rowElement = addInst.closest("[data-row-id]");
          const row = planner[listName].find((item) => item.id === rowElement.dataset.rowId);
          if (row) {
            row.installments = row.installments || [];
            row.installments.push({ id: FinanceUtils.uid("pc"), date: `${selectedMonth()}-05`, value: 0 });
            savePlanner(planner);
            renderLists(planner);
            renderTotals(planner);
            rowElement.querySelector(".inst-row:last-child .inst-value")?.focus();
          }
          return;
        }

        /* Remover parcela */
        const rmInst = event.target.closest(".inst-remove");
        if (rmInst) {
          const rowElement = rmInst.closest("[data-row-id]");
          const instEl = rmInst.closest("[data-inst-id]");
          const row = planner[listName].find((item) => item.id === rowElement.dataset.rowId);
          if (row) {
            row.installments = (row.installments || []).filter((p) => p.id !== instEl.dataset.instId);
            row.value = installmentsTotal(row);
            savePlanner(planner);
            renderLists(planner);
            renderTotals(planner);
          }
          return;
        }

        const button = event.target.closest(".row-remove");
        if (!button) { return; }
        const rowElement = button.closest("[data-row-id]");
        planner[listName] = planner[listName].filter((item) => item.id !== rowElement.dataset.rowId);
        savePlanner(planner);
        renderLists(planner);
        renderTotals(planner);
      });
    });

    document.querySelectorAll("[data-planner-add]").forEach((button) => {
      button.addEventListener("click", () => {
        const listName = button.dataset.plannerAdd;
        const id = FinanceUtils.uid("row");
        if (listName === "incomes") {
          planner.incomes.push({ id, label: "", value: 0, frequency: "monthly", monthday: 5, weekday: 5, startDate: `${YEAR}-01-05` });
        } else if (listName === "essentials") {
          planner.essentials.push({ id, label: "", value: 0, monthday: 5 });
        } else {
          planner.nonEssentials.push({ id, label: "", value: 0, month: selectedMonth() });
        }
        savePlanner(planner);
        renderLists(planner);
        renderTotals(planner);
        const container = document.querySelector(`[data-planner-list="${listName}"]`);
        const lastLabel = container?.querySelector(".planner-row:last-child .row-label");
        lastLabel?.focus();
      });
    });

    const monthSelect = document.querySelector("#plannerMonth");
    if (monthSelect) {
      monthSelect.addEventListener("change", () => {
        renderLists(planner);
        renderTotals(planner);
      });
    }

    const owner = document.querySelector("#plannerOwner");
    if (owner) {
      owner.value = planner.owner || "";
      owner.addEventListener("input", () => {
        planner.owner = owner.value;
        savePlanner(planner);
      });
    }

    const reset = document.querySelector("#plannerReset");
    if (reset) {
      reset.addEventListener("click", () => {
        const confirmed = window.confirm("Limpar todos os valores e voltar ao modelo padrão?");
        if (!confirmed) { return; }
        const fresh = defaultPlanner();
        Object.assign(planner, fresh);
        savePlanner(planner);
        renderLists(planner);
        renderTotals(planner);
        if (owner) { owner.value = ""; }
        FinanceUtils.toast("Orçamento reiniciado.");
      });
    }
  }

  function boot(planner) {
    const state = FinanceUtils.getState();
    const fresh = getPlanner(state);
    planner.owner = fresh.owner;
    planner.year = fresh.year || YEAR;
    LISTS.forEach((listName) => { planner[listName] = fresh[listName]; });
    /* Regenera os lançamentos a partir do planejamento salvo */
    generateMovimentos(state, planner);
    FinanceUtils.saveState(state);
    fillMonthSelect(planner);
    renderLists(planner);
    renderTotals(planner);
    const ownerInput = document.querySelector("#plannerOwner");
    if (ownerInput && document.activeElement !== ownerInput) {
      ownerInput.value = planner.owner || "";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page !== "comparativo") { return; }

    const state = FinanceUtils.getState();
    const planner = getPlanner(state);
    FinanceUtils.saveState(state);

    fillMonthSelect(planner);
    renderLists(planner);
    renderTotals(planner);
    bindEvents(planner);
    document.addEventListener("finance-cloud-ready", () => boot(planner));
  });
})();
