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

    /* invariante do patrimônio: caixa + investido tem que bater com
       depositado − sacado + resultado. `resultado` aqui é só o REALIZADO
       (C.totais com precos={} não usa cotação nenhuma) — de propósito,
       porque `investido` é custo, não valor de mercado, e comparar custo
       com valor exigiria cotação que este supervisor não recebe.
       Checado no AGREGADO do portfólio, não carteira por carteira: uma
       transferência entre carteiras muda o caixa de cada lado sem gerar
       depósito/saque nenhum, então olhar carteira a carteira acusaria
       toda transferência legítima como um furo. Somando tudo, as duas
       pernas (−X de um lado, +X do outro) se cancelam sozinhas, e só
       sobra incoerência de verdade — como dinheiro que saiu do caixa
       para uma posição que não existe mais em `st.pools`/`st.lend`/
       `st.ativos` (apagada sem limpar o ledger). */
    if (st.mov.length) {
      var caixaTotal = 0;
      (st.carteiras || []).forEach(function (c) { caixaTotal += C.caixaDe(st, c.id); });
      var tAgg = C.totais(st, {}, 'all');
      var depositado = 0, sacado = 0;
      st.mov.forEach(function (m) {
        if (m.tipo === 'deposito') depositado += m.usd;
        else if (m.tipo === 'saque') sacado += m.usd;
      });
      var esperado = depositado - sacado + tAgg.realizado;
      var real = caixaTotal + tAgg.investido;
      if (Math.abs(real - esperado) > 0.01) {
        achados.push({ chave: 'patrimonio-nao-fecha', grave: true,
          txt: 'O patrimônio não fecha: caixa + investido (' + real.toFixed(2) +
               ') deveria ser depositado − sacado + resultado (' + esperado.toFixed(2) + ').' });
      }
    }

    return { ok: achados.length === 0, achados: achados };
  };

  raiz.PSuper = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
