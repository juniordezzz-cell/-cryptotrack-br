(function () {
  function setTheme(theme) {
    const state = FinanceUtils.updateState((current) => {
      current.settings.theme = theme;
      return current;
    });
    FinanceUtils.applyTheme(state.settings.theme);
    document.querySelectorAll("[data-theme]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.theme === theme);
    });
  }

  function initThemeControls() {
    const state = FinanceUtils.getState();
    document.querySelectorAll("[data-theme]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.theme === state.settings.theme);
      button.addEventListener("click", () => setTheme(button.dataset.theme));
    });
  }

  function initSwitches() {
    const state = FinanceUtils.getState();
    const animations = document.querySelector("#animationsToggle");
    const compact = document.querySelector("#compactTablesToggle");

    if (animations) {
      animations.checked = state.settings.animations !== false;
      animations.addEventListener("change", () => {
        FinanceUtils.updateState((current) => {
          current.settings.animations = animations.checked;
          return current;
        });
      });
    }

    if (compact) {
      compact.checked = state.settings.compactTables === true;
      compact.addEventListener("change", () => {
        FinanceUtils.updateState((current) => {
          current.settings.compactTables = compact.checked;
          return current;
        });
      });
    }
  }

  function initProfile() {
    const state = FinanceUtils.getState();
    const form = document.querySelector("#profileForm");
    if (!form) {
      return;
    }

    form.elements.name.value = state.profile.name;
    form.elements.email.value = state.profile.email;
    form.elements.currency.value = state.profile.currency;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      FinanceUtils.updateState((current) => {
        current.profile = {
          name: formData.get("name"),
          email: formData.get("email"),
          currency: formData.get("currency")
        };
        return current;
      });
      FinanceUtils.toast("Perfil atualizado.");
    });
  }

  function initBackup() {
    const exportButton = document.querySelector("#exportBackup");
    const importInput = document.querySelector("#importBackup");
    const resetButton = document.querySelector("#resetData");

    if (exportButton) {
      exportButton.addEventListener("click", () => {
        FinanceUtils.downloadText(
          "backup-finance-dashboard.json",
          JSON.stringify(FinanceUtils.getState(), null, 2),
          "application/json;charset=utf-8"
        );
      });
    }

    if (importInput) {
      importInput.addEventListener("change", () => {
        const file = importInput.files[0];
        if (!file) {
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          try {
            const nextState = JSON.parse(reader.result);
            FinanceUtils.saveState(FinanceUtils.refreshSummary(nextState));
            FinanceUtils.toast("Backup importado.");
          } catch (error) {
            FinanceUtils.toast("Arquivo inválido.");
          }
        };
        reader.readAsText(file);
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", () => {
        localStorage.removeItem(FinanceUtils.STORAGE_KEY);
        FinanceUtils.applyTheme("dark");
        FinanceUtils.toast("Dados restaurados.");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page !== "configuracoes") {
      return;
    }

    initThemeControls();
    initSwitches();
    initProfile();
    initBackup();
  });
})();
