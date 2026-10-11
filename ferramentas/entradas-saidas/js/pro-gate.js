/* Compatibilidade com as páginas existentes: a ferramenta é gratuita.
   Sem conta, os dados ficam neste navegador. Com conta, tenta sincronizar
   no Firestore e mantém uma cópia local por usuário. */
(function () {
  let uidAtual = null;
  function aplicar() {
    document.body.classList.remove('mdf-locked');
    document.querySelector('.pro-banner')?.remove();
    const auth = window.NexusAuth;
    const uid = auth && auth.ready && auth.user ? auth.user.uid : null;
    if (uid === uidAtual) return;
    uidAtual = uid;
    if (uid) FinanceUtils.ativarNuvem(uid);
    else {
      FinanceUtils.desativarNuvem();
      document.dispatchEvent(new CustomEvent('finance-cloud-ready'));
    }
  }
  document.addEventListener('nexus-auth-changed', aplicar);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar);
  else aplicar();
})();
