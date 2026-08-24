/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  MUNDODEFI · PORTFÓLIO — PERSISTÊNCIA (portfolio-store.js)            ║
   ║                                                                      ║
   ║  O v1 vivia só no localStorage: limpar o navegador apagava tudo e    ║
   ║  celular e desktop mostravam carteiras diferentes. Inaceitável num   ║
   ║  produto pago — ainda mais porque o Entradas e Saídas, que é         ║
   ║  ferramenta secundária, já salvava no Firestore.                     ║
   ║                                                                      ║
   ║  ── COMO FUNCIONA ───────────────────────────────────────────────    ║
   ║  localStorage  = cache local, escrita imediata, funciona offline     ║
   ║  Firestore     = fonte de verdade, em portfolios/{uid}               ║
   ║                                                                      ║
   ║  Deslogado, tudo continua funcionando no cache local. Ao entrar      ║
   ║  pela primeira vez, o que estava local é ENVIADO para a nuvem em     ║
   ║  vez de descartado — ninguém perde o que já digitou.                 ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
(function () {
  'use strict';

  var CHAVE = 'mdf.portfolio.v2';
  var COLECAO = 'portfolios';
  var DEBOUNCE = 1500;

  var S = {
    estado: null,
    uid: null,
    sincronizando: false,
    ultimoErro: null,
    /* 'local' = só no navegador | 'nuvem' = salvo no Firestore
       | 'salvando' | 'erro' */
    status: 'local'
  };
  window.PStore = S;

  var timer = null, ouvintes = [];

  function avisar() { ouvintes.forEach(function (fn) { try { fn(S); } catch (e) {} }); }
  S.aoMudar = function (fn) { ouvintes.push(fn); };

  /* ═══════════════ CACHE LOCAL ═══════════════ */
  function lerLocal() {
    try {
      var o = JSON.parse(localStorage.getItem(CHAVE));
      if (o && o.ver === PCore.VER) return o;
    } catch (e) {}
    return null;
  }
  function gravarLocal(st) {
    try { localStorage.setItem(CHAVE, JSON.stringify(st)); return true; }
    catch (e) {
      /* cota estourada: o histórico antigo é o que mais cresce */
      S.ultimoErro = 'Não foi possível salvar localmente (armazenamento cheio).';
      return false;
    }
  }

  /* ═══════════════ FIRESTORE ═══════════════ */
  function db() {
    if (!window.firebase || !firebase.apps || !firebase.apps.length) return null;
    try { return firebase.firestore(); } catch (e) { return null; }
  }

  function baixar(uid) {
    var d = db();
    if (!d) return Promise.resolve(null);
    return d.collection(COLECAO).doc(uid).get().then(function (snap) {
      if (!snap.exists) return null;
      var dados = snap.data() || {};
      if (!dados.json) return null;
      try {
        var st = JSON.parse(dados.json);
        return st && st.ver === PCore.VER ? st : null;
      } catch (e) { return null; }
    }).catch(function () { return null; });
  }

  function enviar(uid, st) {
    var d = db();
    if (!d) return Promise.reject(new Error('firestore indisponível'));
    var json = JSON.stringify(st);
    /* Documento do Firestore tem teto de 1 MB. Avisamos bem antes disso. */
    if (json.length > 900000) {
      return Promise.reject(new Error('Portfólio grande demais para sincronizar.'));
    }
    return d.collection(COLECAO).doc(uid).set({
      json: json,
      ver: PCore.VER,
      atualizadoEm: new Date().toISOString(),
      /* campos soltos só para dar para inspecionar no console do Firebase */
      nMov: st.mov.length,
      nAtivos: st.ativos.length
    }, { merge: true });
  }

  /* ═══════════════ API ═══════════════ */

  /* Carrega o estado. Sempre devolve algo utilizável na hora — o cache
     local — e reconcilia com a nuvem depois, quando o auth responder. */
  S.carregar = function () {
    S.estado = lerLocal() || PCore.novoEstado();
    return S.estado;
  };

  S.salvar = function () {
    if (!S.estado) return;
    S.estado.atualizadoEm = new Date().toISOString();
    gravarLocal(S.estado);
    if (!S.uid) { S.status = 'local'; avisar(); return; }
    S.status = 'salvando'; avisar();
    clearTimeout(timer);
    timer = setTimeout(function () {
      enviar(S.uid, S.estado).then(function () {
        S.status = 'nuvem'; S.ultimoErro = null; avisar();
      }).catch(function (e) {
        S.status = 'erro'; S.ultimoErro = e.message || 'Falha ao sincronizar.'; avisar();
      });
    }, DEBOUNCE);
  };

  /* Chamado quando o Firebase diz quem é o usuário.
     Regra de reconciliação, com o usuário SEMPRE ganhando do vazio:
       nuvem vazia          → sobe o local (primeiro login não perde nada)
       local vazio          → baixa a nuvem
       os dois com conteúdo → vence o mais recente por `atualizadoEm` */
  S.entrar = function (uid) {
    S.uid = uid;
    if (!uid) { S.status = 'local'; avisar(); return Promise.resolve(S.estado); }
    S.sincronizando = true; avisar();
    return baixar(uid).then(function (remoto) {
      var local = S.estado || PCore.novoEstado();
      var localTemDados = local.mov && local.mov.length > 0;
      var remotoTemDados = remoto && remoto.mov && remoto.mov.length > 0;
      var escolhido;

      if (!remotoTemDados && localTemDados) {
        escolhido = local;                       /* primeiro login: sobe o que já existe */
      } else if (remotoTemDados && !localTemDados) {
        escolhido = remoto;
      } else if (remotoTemDados && localTemDados) {
        escolhido = String(remoto.atualizadoEm || '') >= String(local.atualizadoEm || '')
          ? remoto : local;
      } else {
        escolhido = remoto || local;
      }

      S.estado = escolhido;
      gravarLocal(escolhido);
      S.sincronizando = false;
      S.status = 'nuvem';
      avisar();
      /* garante que a nuvem fica com a versão vencedora */
      return enviar(uid, escolhido).catch(function () {}).then(function () { return escolhido; });
    }).catch(function (e) {
      S.sincronizando = false;
      S.status = 'erro';
      S.ultimoErro = e.message || 'Falha ao carregar da nuvem.';
      avisar();
      return S.estado;
    });
  };

  S.sair = function () {
    S.uid = null;
    S.status = 'local';
    avisar();
  };

  /* Apaga tudo, local e na nuvem. */
  S.limpar = function () {
    S.estado = PCore.novoEstado();
    gravarLocal(S.estado);
    if (S.uid) return enviar(S.uid, S.estado).catch(function () {});
    return Promise.resolve();
  };

  /* ═══════════════ SNAPSHOT DIÁRIO ═══════════════
     Um ponto por dia, gravado quando a pessoa abre o portfólio.
     É por isso que o gráfico de evolução leva alguns dias para existir —
     e é por isso que ele é verdadeiro, diferente da curva de seno do v1. */
  S.snapshotDiario = function (totais) {
    if (!S.estado || !totais) return false;
    /* não registra portfólio vazio: encheria o histórico de zeros */
    if (totais.patrimonio === 0 && totais.realizado === 0) return false;
    var hoje = PCore.hoje();
    var ultimo = S.estado.snaps[S.estado.snaps.length - 1];
    var jaTem = ultimo && ultimo.dt === hoje;
    PCore.registrarSnapshot(S.estado, totais, hoje);
    if (!jaTem) { S.salvar(); return true; }
    return false;
  };

})();
