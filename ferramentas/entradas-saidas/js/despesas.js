(function () {
  function getFilteredExpenses(state) {
    const month = document.querySelector("#despesaMonth")?.value || "all";
    const category = document.querySelector("#despesaCategory")?.value || "all";

    return state.expenses.filter((item) => {
      const matchesMonth = month === "all" || FinanceUtils.getMonthKey(item.date) === month;
      const matchesCategory = category === "all" || item.category === category;
      return matchesMonth && matchesCategory;
    });
  }

  function renderCards(state) {
    const TYPES = FinanceUtils.EXPENSE_TYPES;
    const summary = FinanceUtils.summarizeExpenses(state.expenses);
    FinanceUtils.setText("[data-despesas-total]", FinanceUtils.formatCurrency(summary.total));
    FinanceUtils.setText("[data-despesas-essenciais]", FinanceUtils.formatCurrency(summary.byType[TYPES.fixed] || 0));
    FinanceUtils.setText("[data-despesas-nao-essenciais]", FinanceUtils.formatCurrency(summary.byType[TYPES.variable] || 0));
    const categorias = Object.values(summary.byCategory);
    FinanceUtils.setText("[data-despesas-maior]", FinanceUtils.formatCurrency(categorias.length ? Math.max(...categorias) : 0));
  }

  function renderTables(state) {
    const rows = getFilteredExpenses(state);
    const tbody = document.querySelector("#despesasTableBody");
    if (!rows.length) {
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma saída ainda. Lance seus gastos na página <a href="entradas-saidas.html">Entradas x Saídas</a>.</td></tr>';
      }
      return;
    }
    FinanceUtils.renderRows(tbody, rows, (item) => `
      <tr>
        <td>${FinanceUtils.formatDate(item.date)}</td>
        <td>${item.category}</td>
        <td>${item.description}</td>
        <td><span class="tag red">${item.type}</span></td>
        <td class="danger-text">${FinanceUtils.formatCurrency(item.value)}</td>
      </tr>
    `);
  }

  function renderCharts(state) {
    const TYPES = FinanceUtils.EXPENSE_TYPES;
    const essentials = state.expenses.filter((item) => item.type === TYPES.fixed);
    const nonEssentials = state.expenses.filter((item) => item.type === TYPES.variable);
    const sorted = [...state.categories].sort((a, b) => b.value - a.value);

    FinanceCharts.barChart("#essenciaisChart", {
      labels: essentials.map((item) => item.category),
      datasets: [{ label: TYPES.fixed, color: FinanceCharts.colors.red, values: essentials.map((item) => item.value) }]
    });

    FinanceCharts.barChart("#naoEssenciaisChart", {
      labels: nonEssentials.map((item) => item.category),
      datasets: [{ label: TYPES.variable, color: "#ff7279", values: nonEssentials.map((item) => item.value) }]
    });

    FinanceCharts.horizontalBars("#topCategoriasChart", {
      labels: sorted.map((item) => item.name),
      values: sorted.map((item) => item.value),
      color: FinanceCharts.colors.red
    });
  }

  /* ---------- Lista de compras do mês ---------- */
  function getShopping(state) {
    if (!Array.isArray(state.shopping)) {
      state.shopping = [
        { id: "c1", name: "Gás", value: 0, done: false },
        { id: "c2", name: "Luz", value: 0, done: false },
        { id: "c3", name: "Supermercado", value: 0, done: false }
      ];
    }
    return state.shopping;
  }

  function renderShopping(state) {
    const container = document.querySelector("[data-shopping-list]");
    if (!container) {
      return;
    }

    const items = getShopping(state);

    if (!items.length) {
      container.innerHTML = '<p class="empty-state" style="margin: 12px 18px;">Sua lista está vazia. Adicione o primeiro item acima.</p>';
    } else {
      container.innerHTML = items
        .map(
          (item) => `
            <div class="shopping-item ${item.done ? "is-done" : ""}" data-shopping-id="${item.id}">
              <input type="checkbox" ${item.done ? "checked" : ""} aria-label="Marcar como pago">
              <span class="item-name">${item.name}</span>
              <span class="item-value">${FinanceUtils.formatCurrency(item.value)}</span>
              <button class="row-remove" type="button" title="Remover item" aria-label="Remover item">✕</button>
            </div>
          `
        )
        .join("");
    }

    const total = items.reduce((acc, item) => acc + item.value, 0);
    const pago = items.filter((item) => item.done).reduce((acc, item) => acc + item.value, 0);
    FinanceUtils.setText("[data-shopping-total]", FinanceUtils.formatCurrency(total));
    FinanceUtils.setText("[data-shopping-pago]", FinanceUtils.formatCurrency(pago));
    FinanceUtils.setText("[data-shopping-pendente]", FinanceUtils.formatCurrency(total - pago));
  }

  function bindShopping() {
    const form = document.querySelector("#shoppingForm");
    const container = document.querySelector("[data-shopping-list]");
    const launch = document.querySelector("#shoppingLaunch");
    if (!form || !container) {
      return;
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = document.querySelector("#shoppingName").value.trim();
      const value = Number(document.querySelector("#shoppingValue").value) || 0;
      if (!name) {
        return;
      }

      const state = FinanceUtils.updateState((current) => {
        getShopping(current).push({ id: FinanceUtils.uid("item"), name, value, done: false });
        return current;
      });

      form.reset();
      document.querySelector("#shoppingName").focus();
      renderShopping(state);
    });

    container.addEventListener("click", (event) => {
      const row = event.target.closest("[data-shopping-id]");
      if (!row) {
        return;
      }

      if (event.target.matches('input[type="checkbox"]')) {
        const state = FinanceUtils.updateState((current) => {
          const item = getShopping(current).find((entry) => entry.id === row.dataset.shoppingId);
          if (item) {
            item.done = event.target.checked;
          }
          return current;
        });
        renderShopping(state);
      }

      if (event.target.closest(".row-remove")) {
        const state = FinanceUtils.updateState((current) => {
          current.shopping = getShopping(current).filter((entry) => entry.id !== row.dataset.shoppingId);
          return current;
        });
        renderShopping(state);
      }
    });

    if (launch) {
      launch.addEventListener("click", () => {
        const category = document.querySelector("#shoppingCategory")?.value || "Casa";
        let launched = 0;

        const state = FinanceUtils.updateState((current) => {
          const paid = getShopping(current).filter((item) => item.done && item.value > 0);
          if (!paid.length) {
            return current;
          }

          const today = new Date().toISOString().slice(0, 10);
          paid.forEach((item) => {
            current.expenses.push({
              id: FinanceUtils.uid("d"),
              date: today,
              category,
              type: FinanceUtils.EXPENSE_TYPES.variable,
              description: `Lista de compras: ${item.name}`,
              value: item.value
            });
            launched += 1;
          });

          current.shopping = getShopping(current).filter((item) => !(item.done && item.value > 0));
          return FinanceUtils.refreshSummary(current);
        });

        if (!launched) {
          FinanceUtils.toast("Marque itens pagos com valor para lançar.");
          return;
        }

        FinanceUtils.toast(`${launched} ${launched === 1 ? "item lançado" : "itens lançados"} como despesa.`);
        renderShopping(state);
        renderCards(state);
        renderTables(state);
        renderCharts(state);
      });
    }
  }

  function bindFilters() {
    ["#despesaMonth", "#despesaCategory"].forEach((selector) => {
      const element = document.querySelector(selector);
      if (element) {
        element.addEventListener("input", () => renderTables(FinanceUtils.getState()));
      }
    });
  }

  function boot() {
    const state = FinanceUtils.refreshSummary(FinanceUtils.getState());
    FinanceUtils.saveState(state);
    FinanceUtils.fillMonthSelect("#despesaMonth", state);
    renderCards(state);
    renderTables(state);
    renderCharts(state);
    renderShopping(state);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page !== "despesas") {
      return;
    }
    boot();
    bindFilters();
    bindShopping();
    document.addEventListener("finance-cloud-ready", boot);
  });
})();
