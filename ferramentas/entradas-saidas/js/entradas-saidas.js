(function () {
  const LISTS = ["incomes", "essentials", "nonEssentials"];

  function defaultPlanner() {
    return {
      owner: "",
      incomes: [
        { id: "i1", label: "Salário líquido (trabalho principal)", value: 0 },
        { id: "i2", label: "Salário líquido (trabalho 2)", value: 0 },
        { id: "i3", label: "Vale-alimentação / refeição", value: 0 },
        { id: "i4", label: "Renda extra (freelas, vendas...)", value: 0 },
        { id: "i5", label: "Outras entradas (bônus, aluguel...)", value: 0 }
      ],
      essentials: [
        { id: "s1", label: "Aluguel / financiamento", value: 0 },
        { id: "s2", label: "Condomínio", value: 0 },
        { id: "s3", label: "Luz", value: 0 },
        { id: "s4", label: "Água", value: 0 },
        { id: "s5", label: "Gás", value: 0 },
        { id: "s6", label: "Internet", value: 0 },
        { id: "s7", label: "Supermercado (valor médio)", value: 0 },
        { id: "s8", label: "Transporte / combustível", value: 0 },
        { id: "s9", label: "Plano de saúde", value: 0 },
        { id: "s10", label: "Farmácia", value: 0 },
        { id: "s11", label: "IPTU / impostos", value: 0 },
        { id: "s12", label: "Aporte em investimentos (pague-se primeiro!)", value: 0 }
      ],
      nonEssentials: [
        { id: "n1", label: "Cartão de crédito (evite girar!)", value: 0 },
        { id: "n2", label: "Streaming (Netflix, Spotify...)", value: 0 },
        { id: "n3", label: "Delivery / padaria", value: 0 },
        { id: "n4", label: "Saídas / lazer", value: 0 },
        { id: "n5", label: "Celular / telefonia", value: 0 },
        { id: "n6", label: "Cuidados pessoais", value: 0 },
        { id: "n7", label: "Gastos com pets", value: 0 },
        { id: "n8", label: "Cursos / assinaturas", value: 0 },
        { id: "n9", label: "Imprevistos (valor médio)", value: 0 }
      ]
    };
  }

  function getPlanner(state) {
    if (!state.planner || !Array.isArray(state.planner.incomes)) {
      state.planner = defaultPlanner();
    }
    return state.planner;
  }

  function sum(rows) {
    return rows.reduce((acc, row) => acc + (Number(row.value) || 0), 0);
  }

  function rowTemplate(listName, row) {
    return `
      <div class="planner-row" data-row-id="${row.id}">
        <input type="text" class="row-label" value="${escapeHtml(row.label)}" placeholder="Descrição" aria-label="Descrição">
        <input type="number" class="row-value" value="${row.value || ""}" min="0" step="0.01" placeholder="0,00" inputmode="decimal" aria-label="Valor">
        <button class="row-remove" type="button" title="Remover linha" aria-label="Remover linha">✕</button>
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderLists(planner) {
    LISTS.forEach((listName) => {
      const container = document.querySelector(`[data-planner-list="${listName}"]`);
      if (!container) {
        return;
      }
      container.innerHTML = planner[listName].map((row) => rowTemplate(listName, row)).join("");
    });
  }

  function renderTotals(planner) {
    const fmt = FinanceUtils.formatCurrency;
    const entradas = sum(planner.incomes);
    const essenciais = sum(planner.essentials);
    const naoEssenciais = sum(planner.nonEssentials);
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

  function savePlanner(planner) {
    FinanceUtils.updateState((state) => {
      state.planner = planner;
      return state;
    });
  }

  function bindEvents(planner) {
    LISTS.forEach((listName) => {
      const container = document.querySelector(`[data-planner-list="${listName}"]`);
      if (!container) {
        return;
      }

      container.addEventListener("input", (event) => {
        const rowElement = event.target.closest("[data-row-id]");
        if (!rowElement) {
          return;
        }
        const row = planner[listName].find((item) => item.id === rowElement.dataset.rowId);
        if (!row) {
          return;
        }
        if (event.target.classList.contains("row-label")) {
          row.label = event.target.value;
        }
        if (event.target.classList.contains("row-value")) {
          row.value = Number(event.target.value) || 0;
        }
        savePlanner(planner);
        renderTotals(planner);
      });

      container.addEventListener("click", (event) => {
        const button = event.target.closest(".row-remove");
        if (!button) {
          return;
        }
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
        planner[listName].push({ id: FinanceUtils.uid("row"), label: "", value: 0 });
        savePlanner(planner);
        renderLists(planner);
        renderTotals(planner);
        const container = document.querySelector(`[data-planner-list="${listName}"]`);
        const lastLabel = container?.querySelector(".planner-row:last-child .row-label");
        lastLabel?.focus();
      });
    });

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
        if (!confirmed) {
          return;
        }
        const fresh = defaultPlanner();
        Object.assign(planner, fresh);
        savePlanner(planner);
        renderLists(planner);
        renderTotals(planner);
        if (owner) {
          owner.value = "";
        }
        FinanceUtils.toast("Orçamento reiniciado.");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page !== "comparativo") {
      return;
    }

    const state = FinanceUtils.getState();
    const planner = getPlanner(state);
    FinanceUtils.saveState(state);

    renderLists(planner);
    renderTotals(planner);
    bindEvents(planner);
  });
})();
