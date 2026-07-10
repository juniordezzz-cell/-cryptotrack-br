(function () {
  function renderCards(state) {
    FinanceUtils.setText("[data-reserva]", FinanceUtils.formatCurrency(state.investments.emergencyReserve));
    FinanceUtils.setText("[data-investido]", FinanceUtils.formatCurrency(state.investments.invested));
    FinanceUtils.setText("[data-caixa]", FinanceUtils.formatCurrency(state.investments.availableCash));
    FinanceUtils.setText("[data-rentabilidade]", FinanceUtils.formatPercent(state.investments.profitability));
  }

  function renderDistribution(state) {
    const container = document.querySelector("[data-investment-distribution]");
    if (!container) {
      return;
    }

    const total = state.investments.allocation.reduce((sum, item) => sum + item.value, 0) || 1;
    container.innerHTML = state.investments.allocation
      .map((item) => {
        const percent = Math.round((item.value / total) * 100);
        return `
          <div class="progress-item">
            <span>${item.name}</span>
            <span class="progress-track"><span class="progress-fill green" style="--value: ${percent}%"></span></span>
            <strong>${percent}%</strong>
          </div>
        `;
      })
      .join("");
  }

  function renderChart(state) {
    FinanceCharts.doughnutChart("#investimentosPizzaChart", {
      values: state.investments.allocation.map((item) => item.value || 0.01),
      colors: [FinanceCharts.colors.green, "#2c8f26", "rgba(255, 255, 255, 0.22)"],
      center: FinanceUtils.formatCurrency(state.investments.availableCash).replace(",00", ""),
      caption: "caixa"
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page !== "investimentos") {
      return;
    }

    const state = FinanceUtils.getState();
    renderCards(state);
    renderDistribution(state);
    renderChart(state);
  });
})();
