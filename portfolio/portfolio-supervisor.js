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

  S.conferir = function (st) {
    var achados = [];
    if (!st || !st.mov || !st.mov.length) return { ok: null, achados: achados };

    var vivas = {};
    (st.carteiras || []).forEach(function (c) { vivas[c.id] = true; });

    /* caixa negativo: dinheiro que saiu sem ter entrado */
    (st.carteiras || []).forEach(function (c) {
      var caixa = C.caixaDe(st, c.id);
      if (caixa < -0.005) {
        achados.push({ chave: 'caixa-negativo', grave: true,
          txt: 'A carteira "' + c.nome + '" gastou mais do que entrou nela (' + caixa.toFixed(2) + ').' });
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

    return { ok: achados.length === 0, achados: achados };
  };

  raiz.PSuper = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
