(function () {
  function initActiveNavigation() {
    const current = document.body.dataset.page;
    document.querySelectorAll("[data-nav]").forEach((link) => {
      link.classList.toggle("is-active", link.dataset.nav === current);
    });
  }

  function initSidebar() {
    const button = document.querySelector("[data-menu-toggle]");
    if (!button) {
      return;
    }

    button.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-open");
    });

    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => document.body.classList.remove("sidebar-open"));
    });
  }

  function initTheme() {
    const state = FinanceUtils.getState();
    FinanceUtils.applyTheme(state.settings.theme);
  }

  function initCurrentDate() {
    const dateInput = document.querySelector("[data-current-date]");
    if (!dateInput || dateInput.value) {
      return;
    }

    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initActiveNavigation();
    initSidebar();
    initCurrentDate();
  });
})();
