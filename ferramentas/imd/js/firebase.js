/* ============================================================
   IMD — js/firebase.js
   Login Google (Auth) + salvar diagnóstico (Firestore).
   Usa Firebase v10 compat (carregado via CDN nas páginas).
   Se a config não estiver preenchida, expõe um stub que
   mantém o app funcionando em "modo local".
   ============================================================ */
(function (global) {
  "use strict";

  var cfg = global.IMD_FIREBASE_CONFIG || {};
  var configurado = Object.keys(cfg).length > 0 &&
    Object.values(cfg).every(function (v) { return v && v !== "COLE_AQUI"; });

  var IMD = {
    configurado: configurado,
    app: null,
    auth: null,
    db: null,
    usuario: null,

    init: function () {
      if (!this.configurado) {
        console.info("[IMD] Firebase não configurado — rodando em modo local.");
        return false;
      }
      if (typeof firebase === "undefined") {
        console.warn("[IMD] SDK do Firebase não carregou — modo local.");
        this.configurado = false;
        return false;
      }
      try {
        this.app = firebase.initializeApp(cfg);
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        var self = this;
        this.auth.onAuthStateChanged(function (u) {
          self.usuario = u || null;
          document.dispatchEvent(new CustomEvent("imd:auth", { detail: u }));
        });
        return true;
      } catch (e) {
        console.error("[IMD] Falha ao iniciar Firebase:", e);
        this.configurado = false;
        return false;
      }
    },

    login: function () {
      if (!this.configurado) return Promise.reject(new Error("modo-local"));
      var provider = new firebase.auth.GoogleAuthProvider();
      return this.auth.signInWithPopup(provider).then(function (res) {
        return res.user;
      });
    },

    logout: function () {
      if (!this.configurado) return Promise.resolve();
      return this.auth.signOut();
    },

    getUser: function () { return this.usuario; },

    /* Salva em users/{uid}/diagnosticos/{autoId} */
    salvarDiagnostico: function (resultado, consentimento) {
      if (!this.configurado) return Promise.reject(new Error("modo-local"));
      var u = this.usuario;
      if (!u) return Promise.reject(new Error("sem-usuario"));

      var doc = {
        imd: resultado.imd,
        perfil: resultado.perfil ? resultado.perfil.nome : null,
        pilares: resultado.pilares,
        competencias: Object.keys(resultado.competencias).reduce(function (o, k) {
          o[k] = resultado.competencias[k].valor; return o;
        }, {}),
        respostas: resultado.respostas,
        tempoConclusao: resultado.tempoConclusao,
        totalPerguntas: resultado.totalPerguntas,
        consentimento: consentimento || {},
        usuario: { nome: u.displayName || null, email: u.email || null },
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      return this.db
        .collection("users").doc(u.uid)
        .collection("diagnosticos").add(doc);
    }
  };

  global.IMDFire = IMD;
  document.addEventListener("DOMContentLoaded", function () { IMD.init(); });
})(window);
