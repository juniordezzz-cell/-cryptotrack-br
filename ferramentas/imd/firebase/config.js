/* ============================================================
   IMD — firebase/config.js
   ------------------------------------------------------------
   Chaves do projeto Firebase do MundoDeFi (cryptotrack-br).
   O IMD usa Firebase compat via CDN, então aqui vai só o
   objeto de configuração — sem import de SDK.

   Para o login + salvamento funcionarem, garanta no Console:
   • Authentication → Sign-in method → Google = ativado
   • Firestore Database = criado
   • Authentication → Settings → Authorized domains =
     mundodefi.com.br (e o domínio .github.io, se testar lá)
   ============================================================ */
window.IMD_FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCvHDXyRfaozjHKL0S9zvs9C00NS6Bd8cs",
  authDomain:        "cryptotrack-br.firebaseapp.com",
  projectId:         "cryptotrack-br",
  storageBucket:     "cryptotrack-br.firebasestorage.app",
  messagingSenderId: "641396446846",
  appId:             "1:641396446846:web:279a8b79d2e94f3f30ea2f",
  measurementId:     "G-998VR1EZZ0"
};
