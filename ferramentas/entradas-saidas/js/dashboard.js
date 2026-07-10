(function () {
  function renderSummary(state) {
    FinanceUtils.setText("[data-total-entradas]", FinanceUtils.formatCurrency(state.summary.receitas));
    FinanceUtils.setText("[data-total-despesas]", FinanceUtils.formatCurrency(state.summary.despesas));
    FinanceUtils.setText("[data-saldo-mes]", FinanceUtils.formatCurrency(state.summary.saldo));
    FinanceUtils.setText("[data-total-investimentos]", FinanceUtils.formatCurrency(state.summary.investimentos));

    FinanceUtils.setText("[data-resumo-entradas]", FinanceUtils.formatCurrency(state.summary.receitas));
    FinanceUtils.setText("[data-resumo-despesas]", FinanceUtils.formatCurrency(state.summary.despesas));
    FinanceUtils.setText("[data-resumo-investimentos]", FinanceUtils.formatCurrency(state.summary.investimentos));
    FinanceUtils.setText("[data-resumo-saldo]", FinanceUtils.formatCurrency(state.summary.saldo));
    renderMonthNotes(state);
  }

  function monthTotals(state, key) {
    const sumBy = (rows) =>
      rows.filter((item) => FinanceUtils.getMonthKey(item.date) === key).reduce((acc, item) => acc + item.value, 0);
    return { in: sumBy(state.entries), out: sumBy(state.expenses) };
  }

  function deltaLabel(current, previous, invert) {
    if (!previous) {
      return "Sem dados do mês anterior";
    }
    const pct = Math.round(((current - previous) / previous) * 100);
    const arrow = pct >= 0 ? "↑" : "↓";
    const good = invert ? pct <= 0 : pct >= 0;
    const cls = good ? "success-text" : "danger-text";
    return `<span class="${cls}">${arrow} ${Math.abs(pct)}%</span> vs mês anterior`;
  }

  function renderMonthNotes(state) {
    const keys = FinanceUtils.monthOptions(state);
    if (!keys.length) {
      return;
    }

    const current = monthTotals(state, keys[0]);
    const previous = keys[1] ? monthTotals(state, keys[1]) : null;

    const setNote = (selector, html) => {
      const element = document.querySelector(selector);
      if (element) {
        element.innerHTML = html;
      }
    };

    setNote("[data-note-entradas]", deltaLabel(current.in, previous?.in, false));
    setNote("[data-note-despesas]", deltaLabel(current.out, previous?.out, true));

    const saldoCurrent = current.in - current.out;
    const saldoPrevious = previous ? previous.in - previous.out : null;
    setNote(
      "[data-note-saldo]",
      saldoPrevious === null || saldoPrevious === 0
        ? "Sem dados do mês anterior"
        : deltaLabel(saldoCurrent, saldoPrevious, false)
    );
  }

  function renderExpenseDetails(state) {
    const total = state.categories.reduce((sum, item) => sum + item.value, 0) || 1;
    const container = document.querySelector("[data-expense-detail]");
    if (!container) {
      return;
    }

    container.innerHTML = state.categories
      .map((item) => {
        const width = Math.round((item.value / total) * 100);
        return `
          <div class="progress-item">
            <span>${item.name}</span>
            <span class="progress-track"><span class="progress-fill" style="--value: ${width}%"></span></span>
            <strong>${FinanceUtils.formatCurrency(item.value)}</strong>
          </div>
        `;
      })
      .join("");
  }

  function renderTransactions(state) {
    const container = document.querySelector("[data-last-transactions]");
    if (!container) {
      return;
    }

    const rows = [
      ...state.entries.map((item) => ({ ...item, kind: "Entrada" })),
      ...state.expenses.map((item) => ({ ...item, kind: "Despesa" }))
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    container.innerHTML = rows
      .map((item) => {
        const valueClass = item.kind === "Entrada" ? "success-text" : "danger-text";
        const sign = item.kind === "Entrada" ? "+" : "-";
        return `
          <div class="transaction-item">
            <div>
              <p>${item.description}</p>
              <small>${item.kind} · ${FinanceUtils.formatDate(item.date)}</small>
            </div>
            <strong class="${valueClass}">${sign} ${FinanceUtils.formatCurrency(item.value)}</strong>
          </div>
        `;
      })
      .join("");
  }

  function renderMonthlyPerformance(state) {
    const container = document.querySelector("[data-monthly-performance]");
    if (!container) {
      return;
    }

    const months = {};
    state.entries.forEach((item) => {
      const key = FinanceUtils.getMonthKey(item.date);
      months[key] = months[key] || { in: 0, out: 0 };
      months[key].in += item.value;
    });
    state.expenses.forEach((item) => {
      const key = FinanceUtils.getMonthKey(item.date);
      months[key] = months[key] || { in: 0, out: 0 };
      months[key].out += item.value;
    });

    const keys = Object.keys(months).sort().reverse().slice(0, 6);
    if (!keys.length) {
      return;
    }

    const max = Math.max(...keys.map((key) => Math.max(months[key].in, months[key].out)), 1);

    container.innerHTML = keys
      .map((key) => {
        const data = months[key];
        const saldo = data.in - data.out;
        const saldoClass = saldo >= 0 ? "success-text" : "danger-text";
        const inWidth = Math.round((data.in / max) * 100);
        const outWidth = Math.round((data.out / max) * 100);
        return `
          <div class="month-row">
            <div class="month-row-head">
              <h3>${FinanceUtils.monthLabel(key)}</h3>
              <span class="month-saldo ${saldoClass}">${saldo >= 0 ? "sobrou" : "faltou"} ${FinanceUtils.formatCurrency(Math.abs(saldo))}</span>
            </div>
            <div class="month-bars">
              <div class="month-bar">
                <span>Entradas</span>
                <span class="month-bar-track"><span class="month-bar-fill green" style="--value: ${inWidth}%"></span></span>
                <strong>${FinanceUtils.formatCurrency(data.in)}</strong>
              </div>
              <div class="month-bar">
                <span>Saídas</span>
                <span class="month-bar-track"><span class="month-bar-fill red" style="--value: ${outWidth}%"></span></span>
                <strong>${FinanceUtils.formatCurrency(data.out)}</strong>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderDistribution(state) {
    const summary = FinanceUtils.summarizeExpenses(state.expenses);
    const total = summary.total || 1;

    FinanceUtils.setText("[data-essential-percent]", `${Math.round(((summary.byType["Essenciais"] || 0) / total) * 100)}%`);
    FinanceUtils.setText("[data-essential-value]", FinanceUtils.formatCurrency(summary.byType["Essenciais"] || 0));
    FinanceUtils.setText("[data-non-essential-percent]", `${Math.round(((summary.byType["Não essenciais"] || 0) / total) * 100)}%`);
    FinanceUtils.setText("[data-non-essential-value]", FinanceUtils.formatCurrency(summary.byType["Não essenciais"] || 0));
    FinanceUtils.setText("[data-total-expenses]", FinanceUtils.formatCurrency(summary.total));
  }

  function renderCharts(state) {
    FinanceCharts.lineChart("#cashFlowChart", {
      labels: state.cashFlow.labels,
      datasets: [
        { label: "Entradas", values: state.cashFlow.receitas, color: FinanceCharts.colors.green, fill: "rgba(98, 255, 77, 0.15)" },
        { label: "Saídas", values: state.cashFlow.despesas, color: FinanceCharts.colors.red, fill: "rgba(255, 71, 80, 0.18)" }
      ]
    });

    const summary = FinanceUtils.summarizeExpenses(state.expenses);
    FinanceCharts.doughnutChart("#expenseDistributionChart", {
      values: [summary.byType["Essenciais"] || 0, summary.byType["Não essenciais"] || 0, state.summary.investimentos || 0],
      colors: [FinanceCharts.colors.red, "#c82b35", FinanceCharts.colors.green],
      center: FinanceUtils.formatCurrency(summary.total).replace(",00", ""),
      caption: "despesas"
    });

    FinanceCharts.areaChart("#saldoChart", {
      labels: state.netWorth.labels,
      min: -1200,
      datasets: [
        { label: "Saldo", values: state.netWorth.values, color: FinanceCharts.colors.green, fill: "rgba(98, 255, 77, 0.18)" }
      ]
    });

    FinanceCharts.doughnutChart("#investmentChart", {
      values: [state.investments.invested, state.investments.availableCash || 1],
      colors: [FinanceCharts.colors.green, "rgba(98, 255, 77, 0.24)"],
      center: FinanceUtils.formatPercent(state.investments.invested ? 100 : 0),
      caption: "alocação"
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page !== "dashboard") {
      return;
    }

    const state = FinanceUtils.refreshSummary(FinanceUtils.getState());
    FinanceUtils.saveState(state);
    renderSummary(state);
    renderExpenseDetails(state);
    renderDistribution(state);
    renderMonthlyPerformance(state);
    renderTransactions(state);
    renderCharts(state);
  });
})();
