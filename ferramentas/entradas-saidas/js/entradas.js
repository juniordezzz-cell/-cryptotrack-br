/* ============================================================
   ENTRADAS — página de VISUALIZAÇÃO
   ------------------------------------------------------------
   Não existe cadastro aqui. Os lançamentos vêm da página
   "Entradas x Saídas" (fonte única). Esta página só mostra:
   totais, gráfico por origem e o histórico das ENTRADAS.
   ============================================================ */

(function () {
  function filteredEntries(state) {
    const query = document.querySelector("#entradaSearch")?.value.trim().toLowerCase() || "";
    const month = document.querySelector("#entradaMonth")?.value || "all";

    return state.entries.filter((item) => {
      const matchesQuery = `${item.source} ${item.description}`.toLowerCase().includes(query);
      const matchesMonth = month === "all" || FinanceUtils.getMonthKey(item.date) === month;
      return matchesQuery && matchesMonth;
    });
  }

  function renderCards(state) {
    const rows = state.entries;
    const total = rows.reduce((acc, r) => acc + r.value, 0);
    const maior = rows.reduce((best, r) => (r.value > (best ? best.value : 0) ? r : best), null);

    FinanceUtils.countUpCurrency("[data-entradas-total]", total);
    FinanceUtils.countUpCurrency("[data-entradas-maior]", maior ? maior.value : 0);
    FinanceUtils.setText("[data-entradas-maior-nome]", maior ? maior.source : "—");
    FinanceUtils.setText("[data-entradas-fontes]", String(rows.length));
    FinanceUtils.countUpCurrency("[data-entradas-media]", rows.length ? total / rows.length : 0);
  }

  function renderTable(state) {
    const rows = filteredEntries(state);
    const tbody = document.querySelector("#entradasTableBody");
    if (!rows.length) {
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma entrada ainda. Lance seus valores na página <a href="entradas-saidas.html">Entradas x Saídas</a>.</td></tr>';
      }
      return;
    }
    FinanceUtils.renderRows(tbody, rows, (item) => `
      <tr>
        <td>${FinanceUtils.formatDate(item.date)}</td>
        <td>${item.source}</td>
        <td>${item.description}</td>
        <td><span class="tag green">Receita</span></td>
        <td class="success-text">${FinanceUtils.formatCurrency(item.value)}</td>
      </tr>
    `);
  }

  function renderChart(state) {
    /* Top origens pelo valor (funciona com qualquer rótulo do planejamento) */
    const porOrigem = {};
    state.entries.forEach((r) => {
      porOrigem[r.source] = (porOrigem[r.source] || 0) + r.value;
    });
    const top = Object.entries(porOrigem)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    FinanceCharts.barChart("#entradasFonteChart", {
      labels: top.length ? top.map(([nome]) => (nome.length > 14 ? nome.slice(0, 13) + "…" : nome)) : ["Sem dados"],
      datasets: [
        {
          label: "Receitas",
          color: FinanceCharts.colors.green,
          values: top.length ? top.map(([, valor]) => valor) : [0]
        }
      ]
    });
  }

  function bindFilters() {
    ["#entradaSearch", "#entradaMonth"].forEach((selector) => {
      const element = document.querySelector(selector);
      if (element) {
        element.addEventListener("input", () => renderTable(FinanceUtils.getState()));
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page !== "entradas") {
      return;
    }

    const state = FinanceUtils.refreshSummary(FinanceUtils.getState());
    FinanceUtils.saveState(state);
    FinanceUtils.fillMonthSelect("#entradaMonth", state);
    renderCards(state);
    renderTable(state);
    renderChart(state);
    bindFilters();
  });
})();
