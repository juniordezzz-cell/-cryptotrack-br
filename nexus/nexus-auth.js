/* ============================================================
   NEXUS AUTH — quem é o usuário e qual o plano dele
   ------------------------------------------------------------
   • Carrega o Firebase sozinho (não precisa mexer nas páginas).
   • Lê o plano REAL em Firestore: users/{uid}.plano
       "gratis" (padrão) | "pro" | "premium"
   • Se existir uma compra pendente da Kiwify para o e-mail
     logado (pendentes_pro/{email}), ativa o PRO sozinho.
   • O Portfólio ouve "nexus-auth-changed" e se sincroniza sozinho —
     o Firestore manda, o localStorage é só espelho.
   • Expõe window.NexusAuth:
       .ready   → já sabemos quem é? (true/false)
       .user    → usuário do Firebase (ou null)
       .plano   → "gratis" | "pro" | "premium"
       .isPro() → true se pro ou premium
       .login() → abre o popup do Google
   • Dispara o evento "nexus-auth-changed" no document a cada
     mudança — o nexus-core escuta e atualiza o painel.
   ============================================================ */

(function () {
  var FB_VERSION = "10.12.2";
  var FB_BASE = "https://www.gstatic.com/firebasejs/" + FB_VERSION + "/";
  var firebaseConfig = {
    apiKey: "AIzaSyCvHDXyRfaozjHKL0S9zvs9C00NS6Bd8cs",
    authDomain: "cryptotrack-br.firebaseapp.com",
    projectId: "cryptotrack-br",
    storageBucket: "cryptotrack-br.firebasestorage.app",
    messagingSenderId: "641396446846",
    appId: "1:641396446846:web:279a8b79d2e94f3f30ea2f"
  };

  var A = {
    ready: false,
    user: null,
    plano: "gratis",
    isPro: function () { return A.plano === "pro" || A.plano === "premium"; },
    login: function () {
      if (!window.firebase || !firebase.auth) return Promise.reject(new Error("Firebase indisponível"));
      return firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
    },
    logout: function () {
      if (window.firebase && firebase.auth) firebase.auth().signOut();
    }
  };
  window.NexusAuth = A;

  function emit() {
    try { document.dispatchEvent(new CustomEvent("nexus-auth-changed")); } catch (e) {}
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /* O Portfólio se sincroniza sozinho ouvindo "nexus-auth-changed"
     (ver P.syncPlano em portfolio.js). Não escreva em P.st daqui:
     dois donos do mesmo campo fazem o portfólio deixar de redesenhar
     quando o plano muda. */

  /* Se a Kiwify registrou a compra antes do usuário logar,
     o resgate acontece aqui, sozinho. */
  function resgatarCompraPendente(db, user) {
    var email = (user.email || "").toLowerCase();
    if (!email) return Promise.resolve(false);
    var ref = db.collection("pendentes_pro").doc(email);
    return ref.get().then(function (snap) {
      if (!snap.exists) return false;
      var dados = snap.data() || {};
      var plano = dados.plano === "premium" ? "premium" : "pro";
      return db.collection("users").doc(user.uid)
        .set({ plano: plano, planoOrigem: "kiwify", planoAtivadoEm: new Date().toISOString() }, { merge: true })
        .then(function () { return ref.delete().catch(function () {}); })
        .then(function () { return true; });
    }).catch(function () { return false; });
  }

  function carregarPlano(db, user) {
    return db.collection("users").doc(user.uid).get().then(function (snap) {
      var plano = snap.exists && snap.data() && snap.data().plano ? snap.data().plano : "gratis";
      if (plano !== "pro" && plano !== "premium") {
        /* Não é PRO ainda — verifica se há compra da Kiwify esperando */
        return resgatarCompraPendente(db, user).then(function (ativou) {
          return ativou ? (db.collection("users").doc(user.uid).get().then(function (s2) {
            return (s2.exists && s2.data().plano) || "pro";
          })) : "gratis";
        });
      }
      return plano;
    });
  }

  function init() {
    var jobs;
    if (window.firebase && firebase.apps) {
      jobs = Promise.resolve();
    } else {
      jobs = loadScript(FB_BASE + "firebase-app-compat.js")
        .then(function () {
          return Promise.all([
            loadScript(FB_BASE + "firebase-auth-compat.js"),
            loadScript(FB_BASE + "firebase-firestore-compat.js")
          ]);
        });
    }

    jobs.then(function () {
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      var db = firebase.firestore();

      firebase.auth().onAuthStateChanged(function (user) {
        A.user = user || null;
        if (!user) {
          A.plano = "gratis";
          A.ready = true;
          emit();
          return;
        }
        carregarPlano(db, user).then(function (plano) {
          A.plano = plano || "gratis";
          A.ready = true;
          emit();
        }).catch(function () {
          A.plano = "gratis";
          A.ready = true;
          emit();
        });
      });
    }).catch(function () {
      /* Sem internet ou Firebase fora do ar: Nexus fica bloqueado
         com convite para login (comportamento seguro). */
      A.ready = true;
      emit();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
