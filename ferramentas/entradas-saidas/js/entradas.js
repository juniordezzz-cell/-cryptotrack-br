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
    const summary = FinanceUtils.summarizeEntries(state.entries);
    FinanceUtils.setText("[data-entradas-total]", FinanceUtils.formatCurrency(summary.total));
    FinanceUtils.setText("[data-entradas-salario]", FinanceUtils.formatCurrency(summary.bySource["Salário"] || 0));
    FinanceUtils.setText("[data-entradas-freelance]", FinanceUtils.formatCurrency(summary.bySource.Freelance || 0));
    FinanceUtils.setText("[data-entradas-outras]", FinanceUtils.formatCurrency(summary.bySource["Outras receitas"] || 0));
  }

  function renderTable(state) {
    const rows = filteredEntries(state);
    FinanceUtils.renderRows(document.querySelector("#entradasTableBody"), rows, (item) => `
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
    const summary = FinanceUtils.summarizeEntries(state.entries);
    const labels = ["Salário", "Freelance", "Outras"];
    FinanceCharts.barChart("#entradasFonteChart", {
      labels,
      datasets: [
        {
          label: "Receitas",
          color: FinanceCharts.colors.green,
          values: [
            summary.bySource["Salário"] || 0,
            summary.bySource.Freelance || 0,
            summary.bySource["Outras receitas"] || 0
          ]
        }
      ]
    });
  }

  function bindForm() {
    const form = document.querySelector("#entradaForm");
    if (!form) {
      return;
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const entry = {
        id: FinanceUtils.uid("entrada"),
        date: formData.get("date"),
        source: formData.get("source"),
        description: formData.get("description"),
        value: FinanceUtils.parseMoney(formData.get("value"))
      };

      const state = FinanceUtils.updateState((current) => {
        current.entries.unshift(entry);
        return FinanceUtils.refreshSummary(current);
      });

      form.reset();
      renderCards(state);
      renderTable(state);
      renderChart(state);
      FinanceUtils.toast("Entrada cadastrada.");
    });
  }

  function bindFilters(state) {
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
    bindForm();
    bindFilters(state);
  });
})();
