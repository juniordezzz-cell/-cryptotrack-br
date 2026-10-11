/* ============================================================
   NEXUS AUTH — identidade da conta gratuita
   ------------------------------------------------------------
   • Carrega o Firebase sozinho (não precisa mexer nas páginas).
   • O Portfólio ouve "nexus-auth-changed" para sincronizar a conta.
   • Expõe window.NexusAuth:
       .ready   → já sabemos quem é? (true/false)
       .user    → usuário do Firebase (ou null)
       .plano   → "gratis" (compatibilidade com páginas antigas)
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
    isPro: function () { return false; },
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
      firebase.auth().onAuthStateChanged(function (user) {
        A.user = user || null;
        A.plano = "gratis";
        A.ready = true;
        emit();
      });
    }).catch(function () {
      /* As ferramentas locais continuam disponíveis se Firebase falhar. */
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
