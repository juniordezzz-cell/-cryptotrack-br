/* ============================================================
   PRO-GATE — porteiro genérico de ferramentas PRO (MundoDeFi)
   ------------------------------------------------------------
   Regra de negócio:
     • Qualquer pessoa pode NAVEGAR pela ferramenta (modo vitrine,
       com dados de demonstração).
     • Só quem está logado E é PRO/Premium pode EDITAR.
     • Marque qualquer trecho da página com o atributo
       data-mdf-lock-zone para travá-lo enquanto a pessoa não for PRO.

   Este arquivo é o MESMO em todas as ferramentas PRO do site —
   não duplique, apenas inclua. Ele não depende de FinanceUtils
   (usa um toast próprio se FinanceUtils não existir na página),
   então funciona tanto em páginas do /portfolio/ quanto em
   ferramentas isoladas como o simulador de trade.

   Ganchos opcionais (use se a sua ferramenta precisar reagir
   à mudança de status, ex.: ligar/desligar salvamento em nuvem):

     window.MdfProGate.onProChange(function(user){ ... });
     window.MdfProGate.onFreeChange(function(estado){ ... });
     window.MdfProGate.estadoAtual(); // 'carregando'|'deslogado'|'gratis'|'pro'

   Depende de /nexus/nexus-auth.js, carregado ANTES deste script,
   que expõe window.NexusAuth com .ready, .user, .isPro().

   Uso em qualquer página:
     <script src="/nexus/nexus-auth.js"></script>
     <script src="/js/pro-gate.js"></script>
   ============================================================ */

(function () {
  function toast(msg) {
    if (window.FinanceUtils && typeof FinanceUtils.toast === "function") {
      FinanceUtils.toast(msg);
      return;
    }
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText =
      "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);" +
      "background:#1b1b22;color:#f2f2f5;border:1px solid #33333d;padding:11px 18px;" +
      "border-radius:10px;font-size:.85rem;font-family:inherit;z-index:9999;" +
      "box-shadow:0 8px 24px rgba(0,0,0,.4);opacity:0;transition:opacity .2s;max-width:90vw;text-align:center;";
    document.body.appendChild(t);
    requestAnimationFrame(() => {
      t.style.opacity = "1";
    });
    setTimeout(() => {
      t.style.opacity = "0";
      setTimeout(() => t.remove(), 250);
    }, 2600);
  }

  function buildBanner() {
    const bar = document.createElement("div");
    bar.className = "pro-banner";
    bar.innerHTML =
      '<span class="pro-banner-icon">👑</span>' +
      '<span class="pro-banner-text">Você está no <strong>modo demonstração</strong>. Assine o PRO para usar esta ferramenta.</span>' +
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
        toast("Isso é exclusivo do plano PRO. Assine para desbloquear.");
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
  const proCallbacks = [];
  const freeCallbacks = [];

  function aplicar() {
    const atual = estado();
    if (atual === ultimoEstado) {
      return;
    }
    ultimoEstado = atual;

    if (atual === "pro") {
      unlockEditing();
      proCallbacks.forEach((fn) => fn(window.NexusAuth.user));
      return;
    }

    /* carregando, deslogado ou grátis: modo vitrine travado */
    freeCallbacks.forEach((fn) => fn(atual));
    lockEditing();
    const banner = document.querySelector(".pro-banner-text");
    if (banner) {
      banner.innerHTML =
        atual === "deslogado"
          ? "Você está no <strong>modo demonstração</strong>. Entre e assine o PRO para usar esta ferramenta."
          : "Você está no <strong>modo demonstração</strong>. Assine o PRO para usar esta ferramenta.";
    }
  }

  window.MdfProGate = {
    onProChange(fn) {
      proCallbacks.push(fn);
    },
    onFreeChange(fn) {
      freeCallbacks.push(fn);
    },
    estadoAtual() {
      return ultimoEstado;
    },
  };

  document.addEventListener("nexus-auth-changed", aplicar);
  document.addEventListener("DOMContentLoaded", aplicar);
  /* estado inicial: trava por padrão até o Firebase responder */
  lockEditing();
})();
