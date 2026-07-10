/* ============================================================
   NEXUS — Configuração do provedor de respostas
   ------------------------------------------------------------
   HOJE: mode "local" → o Nexus responde na hora usando os dados
   do localStorage, sem custo e sem internet.

   FUTURO: quando você tiver uma API (ex.: um backend seu que
   chama a IA), troque para:

     mode: "api",
     api: {
       endpoint: "https://sua-api.mundodefi.com.br/nexus",
       timeoutMs: 15000
     }

   O chat envia POST { question, context } e espera { answer }.
   "context" já vai com um resumo financeiro pronto pra IA usar.
   Se a API falhar, o Nexus cai automaticamente pro modo local.
   ============================================================ */

window.NEXUS_CONFIG = {
  mode: "local",

  api: {
    endpoint: "",
    timeoutMs: 15000,
    headers: {
      "Content-Type": "application/json"
    }
  },

  chat: {
    maxHistorico: 30,
    delayDigitandoMs: [450, 900]
  }
};
