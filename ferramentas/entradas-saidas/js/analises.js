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

  let tipoAtivo = "fixed"; // atalho selecionado quando a busca está vazia

  /* Sugestões (datalist) enquanto a pessoa digita */
  function fillCategorias(state) {
    const datalist = document.querySelector("#analiseCats");
    if (!datalist) { return; }
    const termos = [...new Set(
      state.expenses.flatMap((e) => [e.category, e.description]).filter(Boolean)
    )].sort();
    datalist.innerHTML = termos.map((t) => `<option value="${t}"></option>`).join("");
  }

  function renderCategoria(state) {
    const TYPES = FinanceUtils.EXPENSE_TYPES;
    const busca = (document.querySelector("#analiseBusca")?.value || "").trim().toLowerCase();

    let filterFn;
    let cor = FinanceCharts.colors.red;

    if (busca) {
      /* Busca por texto: casa categoria OU descrição */
      filterFn = (r) => `${r.category || ""} ${r.description || ""}`.toLowerCase().includes(busca);
      cor = "#ff7279";
    } else if (tipoAtivo === "variable") {
      filterFn = (r) => r.type === TYPES.variable;
      cor = "#ff7279";
    } else {
      filterFn = (r) => r.type === TYPES.fixed;
    }

    const valores = byMonth(state.expenses, filterFn);
    FinanceUtils.setText("[data-cat-media]", FinanceUtils.formatCurrency(mediaMensal(valores)));
    FinanceCharts.barChart("#categoriaChart", {
      labels: MONTH_ABBR,
      datasets: [{ label: busca ? busca : (tipoAtivo === "variable" ? "Não fixos" : "Fixos"), color: cor, values: valores }]
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

    const busca = document.querySelector("#analiseBusca");
    if (busca) {
      busca.addEventListener("input", () => {
        /* Digitou algo: os atalhos de tipo ficam inativos */
        const temTexto = busca.value.trim().length > 0;
        document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", !temTexto && c.dataset.filtro === tipoAtivo));
        renderCategoria(FinanceUtils.getState());
      });
    }

    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        tipoAtivo = chip.dataset.filtro;
        if (busca) { busca.value = ""; }
        document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c === chip));
        renderCategoria(FinanceUtils.getState());
      });
    });

    document.addEventListener("finance-cloud-ready", boot);
  });
})();
