/* ============================================================
   INVESTIMENTOS — preenchimento MANUAL
   ------------------------------------------------------------
   Você digita: reserva de emergência, caixa disponível,
   rentabilidade acumulada e a lista de aportes (nome + valor).
   Tudo é salvo em state.investments e aparece no Dashboard
   (painel "Meus investimentos") e nas respostas do Nexus.
   ============================================================ */

(function () {
  function getInvestments(state) {
    const inv = state.investments || {};
    if (!Array.isArray(inv.assets)) {
      inv.assets = [];
    }
    inv.emergencyReserve = Number(inv.emergencyReserve) || 0;
    inv.availableCash = Number(inv.availableCash) || 0;
    inv.profitability = Number(inv.profitability) || 0;
    state.investments = inv;
    return inv;
  }

  function recompute(inv) {
    inv.invested = inv.assets.reduce((acc, a) => acc + (Number(a.value) || 0), 0);
    inv.allocation = [{ name: "Reserva de emergência", value: inv.emergencyReserve }]
      .concat(inv.assets.map((a) => ({ name: a.name || "Investimento", value: Number(a.value) || 0 })))
      .concat([{ name: "Caixa disponível", value: inv.availableCash }]);
    return inv;
  }

  function persist(inv) {
    FinanceUtils.updateState((state) => {
      state.investments = recompute(inv);
      return FinanceUtils.refreshSummary(state);
    });
  }

  function renderCards(inv) {
    const rendimento = inv.invested * (inv.profitability / 100);
    FinanceUtils.countUpCurrency("[data-investido]", inv.invested);
    FinanceUtils.countUpCurrency("[data-reserva]", inv.emergencyReserve);
    FinanceUtils.countUpCurrency("[data-caixa]", inv.availableCash);
    FinanceUtils.countUpCurrency("[data-rendimento]", rendimento);
    FinanceUtils.countUpCurrency("[data-invest-badge]", inv.invested);
    FinanceUtils.countUpCurrency("[data-invest-sub]", inv.invested);
    FinanceUtils.setText("[data-rentabilidade]", FinanceUtils.formatPercent(inv.profitability));
    FinanceUtils.setText("[data-rentabilidade-nota]", FinanceUtils.formatPercent(inv.profitability) + " de rentabilidade");
    FinanceUtils.setText(
      "[data-invest-nota]",
      inv.assets.length
        ? inv.assets.length + (inv.assets.length === 1 ? " investimento" : " investimentos")
        : "Some seus aportes abaixo"
    );
  }

  function renderDistribution(inv) {
    const container = document.querySelector("[data-investment-distribution]");
    if (!container) {
      return;
    }
    const itens = inv.allocation.filter((item) => item.value > 0);
    if (!itens.length) {
      container.innerHTML = '<p class="empty-state">Preencha os valores ao lado para ver a distribuição.</p>';
      return;
    }
    const total = itens.reduce((sum, item) => sum + item.value, 0) || 1;
    container.innerHTML = itens
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

  function renderChart(inv) {
    const itens = inv.allocation.filter((item) => item.value > 0);
    const paleta = ["#62ff4d", "#2c8f26", "#f2c14e", "#4d9fff", "#ff8a5c", "#c084fc", "rgba(255,255,255,0.25)"];
    FinanceCharts.doughnutChart("#investimentosPizzaChart", {
      values: itens.length ? itens.map((item) => item.value) : [1],
      colors: itens.length ? itens.map((_, i) => paleta[i % paleta.length]) : ["rgba(255,255,255,0.12)"],
      center: FinanceUtils.formatCurrency(inv.invested).replace(",00", ""),
      caption: "investido"
    });
  }

  function renderAll(inv) {
    renderCards(inv);
    renderDistribution(inv);
    renderChart(inv);
  }

  function rowTemplate(asset) {
    const safe = String(asset.name || "").replace(/"/g, "&quot;");
    return `
      <div class="planner-row" data-asset-id="${asset.id}">
        <input type="text" class="row-label" value="${safe}" placeholder="Ex: Tesouro, CDB, BTC..." aria-label="Nome do investimento">
        <input type="number" class="row-value" value="${asset.value || ""}" min="0" step="0.01" placeholder="0,00" inputmode="decimal" aria-label="Valor atual">
        <button class="row-remove" type="button" title="Remover" aria-label="Remover investimento">✕</button>
      </div>
    `;
  }

  function renderList(inv) {
    const container = document.querySelector("[data-invest-list]");
    if (!container) {
      return;
    }
    container.innerHTML = inv.assets.length
      ? inv.assets.map(rowTemplate).join("")
      : '<p class="empty-state" style="padding:10px 2px">Nenhum investimento ainda. Clique em "+ Adicionar investimento".</p>';
  }

  function bind(inv) {
    const campos = [
      ["#invReserva", "emergencyReserve"],
      ["#invCaixa", "availableCash"],
      ["#invRent", "profitability"]
    ];
    campos.forEach(([selector, key]) => {
      const el = document.querySelector(selector);
      if (!el) {
        return;
      }
      el.value = inv[key] || "";
      el.addEventListener("input", () => {
        inv[key] = Number(el.value) || 0;
        persist(inv);
        renderAll(inv);
      });
    });

    const lista = document.querySelector("[data-invest-list]");
    if (lista) {
      lista.addEventListener("input", (event) => {
        const row = event.target.closest("[data-asset-id]");
        if (!row) {
          return;
        }
        const asset = inv.assets.find((a) => a.id === row.dataset.assetId);
        if (!asset) {
          return;
        }
        if (event.target.classList.contains("row-label")) {
          asset.name = event.target.value;
        }
        if (event.target.classList.contains("row-value")) {
          asset.value = Number(event.target.value) || 0;
        }
        persist(inv);
        renderAll(inv);
      });

      lista.addEventListener("click", (event) => {
        const button = event.target.closest(".row-remove");
        if (!button) {
          return;
        }
        const row = button.closest("[data-asset-id]");
        inv.assets = inv.assets.filter((a) => a.id !== row.dataset.assetId);
        persist(inv);
        renderList(inv);
        renderAll(inv);
      });
    }

    const add = document.querySelector("[data-invest-add]");
    if (add) {
      add.addEventListener("click", () => {
        inv.assets.push({ id: FinanceUtils.uid("inv"), name: "", value: 0 });
        persist(inv);
        renderList(inv);
        renderAll(inv);
        const last = lista?.querySelector(".planner-row:last-child .row-label");
        last?.focus();
      });
    }
  }

  function boot(inv) {
    const state = FinanceUtils.getState();
    const fresh = recompute(getInvestments(state));
    inv.emergencyReserve = fresh.emergencyReserve;
    inv.availableCash = fresh.availableCash;
    inv.profitability = fresh.profitability;
    inv.assets = fresh.assets;
    inv.invested = fresh.invested;
    inv.allocation = fresh.allocation;
    FinanceUtils.saveState(FinanceUtils.refreshSummary(state));
    /* reflete os valores atualizados nos 3 campos numéricos do topo */
    const campos = [["#invReserva", "emergencyReserve"], ["#invCaixa", "availableCash"], ["#invRent", "profitability"]];
    campos.forEach(([selector, key]) => {
      const el = document.querySelector(selector);
      if (el && document.activeElement !== el) {
        el.value = inv[key] || "";
      }
    });
    renderList(inv);
    renderAll(inv);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page !== "investimentos") {
      return;
    }
    const state = FinanceUtils.getState();
    const inv = recompute(getInvestments(state));
    FinanceUtils.saveState(FinanceUtils.refreshSummary(state));
    renderList(inv);
    renderAll(inv);
    bind(inv);
    document.addEventListener("finance-cloud-ready", () => boot(inv));
  });
})();
