/* ============================================================
   ANÁLISES — central de gráficos do ano
   ------------------------------------------------------------
   • Renda mês a mês (Jan..Dez) + a média mensal recebida no ano.
   • Gasto por categoria: escolha no seletor (totais de fixos /
     não fixos, ou uma categoria) e veja o valor mês a mês + média.
   Lê state.entries / state.expenses, que já vêm datados do motor
   de recorrência da página Entradas x Saídas.
   ============================================================ */

(function () {
  const YEAR = new Date().getFullYear();
  const MONTH_ABBR = FinanceUtils.MONTH_NAMES.map((n) => n.slice(0, 3));

  /* Soma por mês (12 posições, Jan..Dez) das linhas que passam no filtro */
  function byMonth(rows, filterFn) {
    const keys = FinanceUtils.yearMonthKeys(YEAR);
    return keys.map((mk) =>
      rows
        .filter((r) => String(r.date).slice(0, 7) === mk && (!filterFn || filterFn(r)))
        .reduce((acc, r) => acc + (Number(r.value) || 0), 0)
    );
  }

  /* Média mensal considerando só os meses que tiveram movimento */
  function mediaMensal(valores) {
    const comValor = valores.filter((v) => v > 0);
    if (!comValor.length) { return 0; }
    return comValor.reduce((a, b) => a + b, 0) / comValor.length;
  }

  function renderRenda(state) {
    const valores = byMonth(state.entries);
    FinanceUtils.setText("[data-renda-media]", FinanceUtils.formatCurrency(mediaMensal(valores)));
    FinanceCharts.barChart("#rendaAnualChart", {
      labels: MONTH_ABBR,
      datasets: [{ label: "Renda", color: FinanceCharts.colors.green, values: valores }]
    });
  }

  function fillCategorias(state) {
    const select = document.querySelector("#analiseCategoria");
    if (!select) { return; }
    const TYPES = FinanceUtils.EXPENSE_TYPES;
    const cats = [...new Set(state.expenses.map((e) => e.category).filter(Boolean))].sort();

    const options = [
      `<option value="__fixed__">Todos os gastos fixos</option>`,
      `<option value="__variable__">Todos os gastos não fixos</option>`,
      `<option disabled>──────────</option>`,
      ...cats.map((c) => `<option value="cat:${c}">${c}</option>`)
    ].join("");

    const current = select.value;
    select.innerHTML = options;
    if ([...select.options].some((o) => o.value === current)) {
      select.value = current;
    }
  }

  function renderCategoria(state) {
    const TYPES = FinanceUtils.EXPENSE_TYPES;
    const select = document.querySelector("#analiseCategoria");
    const choice = select?.value || "__fixed__";

    let filterFn;
    let cor = FinanceCharts.colors.red;
    if (choice === "__fixed__") {
      filterFn = (r) => r.type === TYPES.fixed;
    } else if (choice === "__variable__") {
      filterFn = (r) => r.type === TYPES.variable;
      cor = "#ff7279";
    } else if (choice.startsWith("cat:")) {
      const cat = choice.slice(4);
      filterFn = (r) => r.category === cat;
    } else {
      filterFn = () => true;
    }

    const valores = byMonth(state.expenses, filterFn);
    FinanceUtils.setText("[data-cat-media]", FinanceUtils.formatCurrency(mediaMensal(valores)));
    FinanceCharts.barChart("#categoriaChart", {
      labels: MONTH_ABBR,
      datasets: [{ label: "Gasto", color: cor, values: valores }]
    });
  }

  function boot() {
    const state = FinanceUtils.refreshSummary(FinanceUtils.getState());
    FinanceUtils.saveState(state);
    FinanceUtils.setText("[data-analise-ano]", String(YEAR));
    fillCategorias(state);
    renderRenda(state);
    renderCategoria(state);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page !== "analises") { return; }
    boot();
    const select = document.querySelector("#analiseCategoria");
    if (select) {
      select.addEventListener("change", () => renderCategoria(FinanceUtils.getState()));
    }
    document.addEventListener("finance-cloud-ready", boot);
  });
})();
