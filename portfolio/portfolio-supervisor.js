/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  MUNDODEFI · PORTFÓLIO — SUPERVISOR (portfolio-supervisor.js)        ║
   ║                                                                      ║
   ║  Ele NÃO calcula nada. Cada parte do sistema sabe fazer a sua conta; ║
   ║  o supervisor pergunta e confere se as respostas fecham entre si.    ║
   ║  Recalcular aqui criaria uma segunda fonte da verdade — que é o      ║
   ║  defeito que ele existe para encontrar.                              ║
   ║                                                                      ║
   ║  E ele diz quando NÃO PÔDE conferir: sem fonte para comparar, `ok`   ║
   ║  vem null e a tela escreve "não conferido" — nunca "tudo certo".     ║
   ║  Um verificador que tranquiliza sobre o vazio é pior que nenhum.     ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
(function (raiz) {
  'use strict';
  var C = raiz.PCore || (typeof require === 'function' ? require('./portfolio-core.js') : null);
  var S = {};
  var EPS = 0.005;

  function abs(n) { return Math.abs(Number(n) || 0); }
  function money(n) { return (Number(n) || 0).toFixed(2); }

  function confereCapitalCaixa(st, cartId) {
    var t = C.totais(st, {}, cartId);
    var caixa = C.caixaDe(st, cartId);
    var dep = 0, saq = 0;
    C.movsDe(st, { cart: cartId }).forEach(function (m) {
      if (m.tipo === 'deposito') dep += Number(m.usd) || 0;
      else if (m.tipo === 'saque') saq += Number(m.usd) || 0;
    });
    var lhs = caixa + (t.investido || 0);
    var rhs = (dep - saq) + (t.realizado || 0);
    return { ok: abs(lhs - rhs) <= EPS, lhs: lhs, rhs: rhs };
  }

  S.conferir = function (st) {
    var achados = [];
    if (!st || !st.mov || !st.mov.length) return { ok: null, achados: achados };

    var vivas = {};
    (st.carteiras || []).forEach(function (c) { vivas[c.id] = true; });

    /* caixa negativo: dinheiro que saiu sem ter entrado */
    (st.carteiras || []).forEach(function (c) {
      var caixa = C.caixaDe(st, c.id);
      if (caixa < -EPS) {
        achados.push({ chave: 'caixa-negativo', grave: true,
          txt: 'A carteira "' + c.nome + '" gastou mais do que entrou nela (' + money(caixa) + ').' });
      }
    });

    /* o que saiu do caixa virou posição (ou resultado) */
    (st.carteiras || []).forEach(function (c) {
      var r = confereCapitalCaixa(st, c.id);
      if (!r.ok) {
        achados.push({ chave: 'capital-caixa', grave: true,
          txt: 'O capital da carteira "' + c.nome + '" não fecha com o caixa ('
            + money(r.lhs) + ' vs ' + money(r.rhs) + ').' });
      }
    });

    /* dinheiro preso em carteira que não existe mais */
    var fantasmas = {};
    st.mov.forEach(function (m) { if (m.cart && !vivas[m.cart]) fantasmas[m.cart] = true; });
    Object.keys(fantasmas).forEach(function (id) {
      achados.push({ chave: 'carteira-fantasma', grave: true,
        txt: 'Há movimentações numa carteira que não existe mais.' });
    });

    /* transferência precisa das duas pernas */
    var pernas = {};
    st.mov.forEach(function (m) {
      if (m.tipo !== 'transf' || !m.ref) return;
      pernas[m.ref] = (pernas[m.ref] || 0) + 1;
    });
    Object.keys(pernas).forEach(function (ref) {
      if (pernas[ref] !== 2) {
        achados.push({ chave: 'transf-manca', grave: true,
          txt: 'Uma transferência está incompleta — falta a outra ponta.' });
      }
    });

    /* cache de tela (snapshot diário) precisa refletir o livro */
    var hoje = C.hoje();
    var snapHoje = null;
    if (st.snaps && st.snaps.length) {
      for (var i = st.snaps.length - 1; i >= 0; i--) {
        if (st.snaps[i] && st.snaps[i].dt === hoje) { snapHoje = st.snaps[i]; break; }
      }
    }
    if (snapHoje) {
      var tAll = C.totais(st, {}, 'all');
      var divergiu = abs((snapHoje.pat || 0) - tAll.patrimonio) > EPS
        || abs((snapHoje.inv || 0) - tAll.investido) > EPS
        || abs((snapHoje.real || 0) - tAll.realizado) > EPS
        || abs((snapHoje.naoReal || 0) - tAll.naoRealizado) > EPS;
      if (divergiu) {
        C.registrarSnapshot(st, tAll, hoje);
        achados.push({ chave: 'tela-cache', grave: false,
          txt: 'A foto de hoje da tela estava desatualizada e foi reescrita a partir do livro.' });
      }
    }

    return { ok: achados.length === 0, achados: achados };
  };

  raiz.PSuper = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
