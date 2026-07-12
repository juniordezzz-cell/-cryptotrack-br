/* ============================================================
   PRO-GATE — porteiro da ferramenta Entradas e Saídas
   ------------------------------------------------------------
   Regra de negócio:
     • Qualquer pessoa pode NAVEGAR pela ferramenta (modo
       vitrine, com dados de demonstração).
     • Só quem está logado E é PRO/Premium pode EDITAR.
     • Quem é PRO tem os dados salvos na NUVEM (Firestore),
       na própria conta — não mais no navegador.

   Depende de /nexus/nexus-auth.js (já carregado antes deste
   script), que expõe window.NexusAuth com .ready, .user,
   .isPro(), .login().
   ============================================================ */

(function () {
  function buildBanner() {
    const bar = document.createElement("div");
    bar.className = "pro-banner";
    bar.innerHTML =
      '<span class="pro-banner-icon">👑</span>' +
      '<span class="pro-banner-text">Você está no <strong>modo demonstração</strong>. Assine o PRO para editar os seus próprios dados.</span>' +
      '<a class="pro-banner-btn" href="/planos.html">Assinar PRO — R$ 19,90/mês</a>';
    return bar;
  }

  function showBanner() {
    if (document.querySelector(".pro-banner")) {
      return;
    }
    const main = document.querySelector("main") || document.body;
    main.insertBefore(buildBanner(), main.firstChild);
  }

  function hideBanner() {
    document.querySelector(".pro-banner")?.remove();
  }

  function lockEditing() {
    document.body.classList.add("mdf-locked");
    showBanner();
  }

  function unlockEditing() {
    document.body.classList.remove("mdf-locked");
    hideBanner();
  }

  /* clique num campo travado explica o motivo, sem parecer bug */
  document.addEventListener(
    "click",
    (event) => {
      if (!document.body.classList.contains("mdf-locked")) {
        return;
      }
      const zone = event.target.closest("[data-mdf-lock-zone]");
      if (zone) {
        FinanceUtils.toast("Isso é exclusivo do plano PRO. Assine para editar seus dados.");
      }
    },
    true
  );

  function estado() {
    const A = window.NexusAuth;
    if (!A || !A.ready) {
      return "carregando";
    }
    if (!A.user) {
      return "deslogado";
    }
    return A.isPro() ? "pro" : "gratis";
  }

  let ultimoEstado = null;

  function aplicar() {
    const atual = estado();
    if (atual === ultimoEstado) {
      return;
    }
    ultimoEstado = atual;

    if (atual === "pro") {
      unlockEditing();
      FinanceUtils.ativarNuvem(window.NexusAuth.user.uid);
      return;
    }

    /* carregando, deslogado ou grátis: modo vitrine travado */
    FinanceUtils.desativarNuvem();
    lockEditing();
    const banner = document.querySelector(".pro-banner-text");
    if (banner) {
      banner.innerHTML =
        atual === "deslogado"
          ? "Você está no <strong>modo demonstração</strong>. Entre e assine o PRO para editar os seus próprios dados."
          : "Você está no <strong>modo demonstração</strong>. Assine o PRO para editar os seus próprios dados.";
    }
  }

  document.addEventListener("nexus-auth-changed", aplicar);
  document.addEventListener("DOMContentLoaded", aplicar);
  /* estado inicial: trava por padrão até o Firebase responder */
  lockEditing();
})();
