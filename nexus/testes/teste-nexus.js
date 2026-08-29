/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  TESTES DO NEXUS                                                     ║
   ║                                                                      ║
   ║      node nexus/testes/teste-nexus.js                                ║
   ║                                                                      ║
   ║  Roda o motor DE VERDADE (nexus/nexus-motor.js) com o JSON real de   ║
   ║  regras e com portfólios montados pelo PCore, que também é o de      ║
   ║  verdade. Nada aqui é cópia: cópia de código em teste prova que a    ║
   ║  cópia funciona, não o produto.                                      ║
   ║                                                                      ║
   ║  ── POR QUE ISTO PRECISA EXISTIR ────────────────────────────────    ║
   ║  As regras são DADO em JSON, editável — que é a melhor parte do      ║
   ║  Nexus e a mais perigosa. Uma condição mal escrita não dá erro em    ║
   ║  lugar nenhum: o motor simplesmente não encontra a regra e o Nexus   ║
   ║  fica calado, ou fala a coisa errada sobre o dinheiro de alguém.     ║
   ║  Não existe tela vermelha para isso. Existe este arquivo.            ║
   ║                                                                      ║
   ║  ── AS TRÊS FAMÍLIAS DE TESTE ───────────────────────────────────    ║
   ║   1. INTEGRIDADE   toda condição e todo {placeholder} citam um fato  ║
   ║                    que o motor realmente produz; ids únicos;         ║
   ║                    operadores conhecidos; grupos ligados dos dois    ║
   ║                    lados.                                            ║
   ║   2. VIVACIDADE    nenhuma regra é letra morta — para cada uma       ║
   ║                    existe um portfólio que a dispara.                ║
   ║   3. COBERTURA     em cenários realistas o Nexus não pode ficar      ║
   ║                    mudo. Silêncio é resposta errada quando a         ║
   ║                    pergunta era boa.                                 ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '../..');
const PCore = require(path.join(RAIZ, 'portfolio/portfolio-core.js'));
const REGRAS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'nexus/nexus-regras.json'), 'utf8'));
const FONTE_MOTOR = fs.readFileSync(path.join(RAIZ, 'nexus/nexus-motor.js'), 'utf8');

/* ── harness ──────────────────────────────────────────────────────────
   O motor termina em `})()` e conversa com `window`, `document` e
   `fetch`. No Node emprestamos os três. O fetch devolve o JSON real
   lido do disco, então a rota de carga testada é a mesma de produção.

   O encadeamento roda SÍNCRONO de propósito. `M.carregar()` é assíncrono
   só porque usa fetch; com uma Promise de verdade as regras só entrariam
   no próximo microtask, e todo `avaliar()` logo abaixo veria REGRAS
   ainda em null — devolvendo lista vazia e fazendo o teste "passar"
   porque nada aconteceu. Este thenable resolve na hora. */
function jaResolvido(valor) {
  /* achata thenable dentro de thenable, como Promise faz. Sem isto,
     `.then(r => r.json())` devolveria o invólucro em vez do JSON, e o
     motor guardaria um objeto vazio como se fossem as regras. */
  if (valor && valor.__jaResolvido) return valor;
  return {
    __jaResolvido: true,
    then: function (f) { return jaResolvido(f ? f(valor) : valor); },
    catch: function () { return this; }
  };
}

function montar(st, precos) {
  const janela = {
    PCore,
    P: {
      st: st,
      precos: precos || {},
      cart: function () { return 'all'; },
      money: function (v) {
        return '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
      }
    },
    fetch: function () {
      return jaResolvido({ ok: true, json: function () { return jaResolvido(REGRAS); } });
    },
    document: { currentScript: null }
  };
  janela.window = janela;
  new Function('window', 'document', 'fetch', FONTE_MOTOR)(janela, janela.document, janela.fetch);
  const M = janela.NexusMotor;
  M.carregar();
  const carregadas = M.regrasCarregadas();
  if (!carregadas || !Array.isArray(carregadas.regras)) {
    throw new Error('as regras nao carregaram no harness');
  }
  return M;
}

/* Carteira base: BTC + ETH + USDT, tudo no lucro, sem nada de estranho.
   Os cenários partem daqui e mudam UMA coisa, para que a regra que
   dispara seja atribuível àquela mudança. */
function carteiraBase() {
  const st = PCore.novoEstado();
  st.carteiras.push({ id: 'c1', nome: 'Principal' });
  st.ativos.push({ id: 'btc', tk: 'BTC', cg: 'bitcoin', cart: 'c1', last: 60000 });
  st.ativos.push({ id: 'eth', tk: 'ETH', cg: 'ethereum', cart: 'c1', last: 3000 });
  st.ativos.push({ id: 'usdt', tk: 'USDT', cg: 'tether', cart: 'c1', last: 1 });
  PCore.addMov(st, { tipo: 'compra', ref: 'btc', cart: 'c1', qtd: 1, px: 50000, dt: '2026-01-10' });
  PCore.addMov(st, { tipo: 'compra', ref: 'eth', cart: 'c1', qtd: 10, px: 2000, dt: '2026-01-10' });
  PCore.addMov(st, { tipo: 'compra', ref: 'usdt', cart: 'c1', qtd: 20000, px: 1, dt: '2026-01-10' });
  return st;
}
const PRECOS = { bitcoin: 60000, ethereum: 3000, tether: 1 };

/* Adiciona n operações de trade com ganho/perda controlados. */
function comTrade(st, ganhos, valorGanho, perdas, valorPerda, deposito) {
  st.trades.push({ id: 'tr', cart: 'c1' });
  PCore.addMov(st, { tipo: 'trade_dep', cart: 'c1', usd: deposito, dt: '2026-01-01' });
  for (let i = 0; i < ganhos; i++) {
    PCore.addMov(st, { tipo: 'trade_res', cart: 'c1', usd: valorGanho, px: 1, dt: '2026-02-01' });
  }
  for (let i = 0; i < perdas; i++) {
    PCore.addMov(st, { tipo: 'trade_res', cart: 'c1', usd: valorPerda, px: -1, dt: '2026-02-02' });
  }
  return st;
}

function disparadas(st, precos, grupos) {
  const M = montar(st, precos || PRECOS);
  return M.avaliar(M.fatos(), grupos || null).map(function (a) { return a.id; });
}

/* ── placar ─────────────────────────────────────────────────────────── */
let ok = 0, fail = 0;
function sec(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length))); }
function eqv(nome, real, esperado) {
  const bom = real === esperado;
  console.log('  ' + (bom ? 'ok  ' : 'FALHOU') + ' ' + nome
    + (bom ? '' : '  -> ' + JSON.stringify(real) + '  esperado ' + JSON.stringify(esperado)));
  bom ? ok++ : fail++;
}
function eq(nome, real, esperado, tol) {
  tol = tol == null ? 1e-9 : tol;
  const bom = Math.abs(real - esperado) <= tol;
  console.log('  ' + (bom ? 'ok  ' : 'FALHOU') + ' ' + nome + '  = ' + real
    + (bom ? '' : '  esperado ' + esperado));
  bom ? ok++ : fail++;
}
function lista(nome, real, esperados) {
  const faltando = esperados.filter(function (e) { return real.indexOf(e) < 0; });
  const bom = faltando.length === 0;
  console.log('  ' + (bom ? 'ok  ' : 'FALHOU') + ' ' + nome
    + (bom ? '' : '  -> faltou ' + faltando.join(', ') + '  (veio: ' + (real.join(', ') || 'nada') + ')'));
  bom ? ok++ : fail++;
}

/* ══════════════════════════════════════════════════════════════
   1. INTEGRIDADE — a forma das regras
   ══════════════════════════════════════════════════════════════ */
sec('Integridade: os fatos citados existem');
const MOTOR_REF = montar(carteiraBase(), PRECOS);
const FATOS_REF = MOTOR_REF.fatos();
const NOMES = Object.keys(FATOS_REF);

eqv('o portfolio de referencia produz fatos', FATOS_REF.temDados, true);
eqv('o motor produz mais de 60 fatos', NOMES.length > 60, true);

const condOrfas = [];
REGRAS.regras.forEach(function (r) {
  (r.quando || []).forEach(function (c) {
    if (NOMES.indexOf(c.fato) < 0) condOrfas.push(r.id + ' -> ' + c.fato);
  });
});
eqv('nenhuma condicao cita fato inexistente' +
  (condOrfas.length ? ' [' + condOrfas.join('; ') + ']' : ''), condOrfas.length, 0);

/* Um {fato} inexistente não some: ele aparece LITERALMENTE na tela do
   usuário, com chaves e tudo. */
sec('Integridade: os {placeholders} existem');
const RE_PH = /\{([a-zA-Z0-9_]+)(?:\|([a-z0-9]+))?\}/g;
const phOrfaos = [];
function conferirTexto(origem, s) {
  let m; RE_PH.lastIndex = 0;
  while ((m = RE_PH.exec(String(s || ''))) !== null) {
    if (NOMES.indexOf(m[1]) < 0) phOrfaos.push(origem + ' -> {' + m[1] + '}');
  }
}
REGRAS.regras.forEach(function (r) {
  conferirTexto(r.id + '.titulo', r.titulo);
  conferirTexto(r.id + '.texto', r.texto);
});
REGRAS.assuntos.forEach(function (a) { conferirTexto('assunto:' + a.id, a.semAchado); });
Object.keys(REGRAS.mensagens).forEach(function (k) { conferirTexto('msg:' + k, REGRAS.mensagens[k]); });
eqv('nenhum placeholder cita fato inexistente' +
  (phOrfaos.length ? ' [' + phOrfaos.join('; ') + ']' : ''), phOrfaos.length, 0);

sec('Integridade: ids, operadores e grupos');
const ids = REGRAS.regras.map(function (r) { return r.id; });
eqv('todo id de regra e unico', ids.length, new Set(ids).size);
eqv('toda regra tem grupo', REGRAS.regras.every(function (r) { return !!r.grupo; }), true);
eqv('toda regra tem titulo e texto',
  REGRAS.regras.every(function (r) { return !!r.titulo && !!r.texto; }), true);
eqv('toda regra tem ao menos uma condicao',
  REGRAS.regras.every(function (r) { return (r.quando || []).length > 0; }), true);

const OPS_VALIDOS = ['>', '>=', '<', '<=', '==', '!=', 'entre'];
const opsRuins = [];
REGRAS.regras.forEach(function (r) {
  (r.quando || []).forEach(function (c) {
    if (OPS_VALIDOS.indexOf(c.op) < 0) opsRuins.push(r.id + ' -> ' + c.op);
    if (c.op === 'entre' && !(Array.isArray(c.valor) && c.valor.length === 2)) {
      opsRuins.push(r.id + ' -> entre sem par [min,max]');
    }
  });
});
eqv('nenhum operador desconhecido' + (opsRuins.length ? ' [' + opsRuins.join('; ') + ']' : ''),
  opsRuins.length, 0);

const gruposRegra = new Set(REGRAS.regras.map(function (r) { return r.grupo; }));
const gruposAssunto = new Set();
REGRAS.assuntos.forEach(function (a) { (a.grupos || []).forEach(function (g) { gruposAssunto.add(g); }); });
const semAssunto = [...gruposRegra].filter(function (g) { return !gruposAssunto.has(g); });
const semRegra = [...gruposAssunto].filter(function (g) { return !gruposRegra.has(g); });
eqv('todo grupo de regra e alcancavel por algum assunto' +
  (semAssunto.length ? ' [' + semAssunto.join(', ') + ']' : ''), semAssunto.length, 0);
eqv('todo grupo citado por assunto tem regra' +
  (semRegra.length ? ' [' + semRegra.join(', ') + ']' : ''), semRegra.length, 0);

sec('Integridade: severidades e prioridades');
const SEV = ['info', 'positivo', 'atencao', 'alerta'];
eqv('toda severidade e conhecida',
  REGRAS.regras.every(function (r) { return SEV.indexOf(r.severidade || 'info') >= 0; }), true);
eqv('toda prioridade e numero',
  REGRAS.regras.every(function (r) { return typeof r.prioridade === 'number'; }), true);

/* ══════════════════════════════════════════════════════════════
   2. VIVACIDADE — nenhuma regra é letra morta
   ══════════════════════════════════════════════════════════════ */
sec('Vivacidade: cada cenario dispara a regra que deveria');

/* concentração */
function carteiraConcentrada(pctMaior) {
  const st = PCore.novoEstado();
  st.carteiras.push({ id: 'c1', nome: 'P' });
  st.ativos.push({ id: 'x', tk: 'BTC', cg: 'bitcoin', cart: 'c1', last: pctMaior });
  st.ativos.push({ id: 'y', tk: 'ETH', cg: 'ethereum', cart: 'c1', last: 100 - pctMaior });
  /* deposito financia as duas compras (fase 2 do portfolio: patrimônio
     passou a incluir caixa — sem um depósito que explique as compras, o
     caixa fica negativo e derruba o patrimônio total para 0, zerando
     maiorAtivoPct por divisão por zero em vez do percentual real). */
  PCore.addMov(st, { tipo: 'deposito', cart: 'c1', usd: 100, dt: '2026-01-09' });
  PCore.addMov(st, { tipo: 'compra', ref: 'x', cart: 'c1', qtd: 1, px: pctMaior, dt: '2026-01-10' });
  PCore.addMov(st, { tipo: 'compra', ref: 'y', cart: 'c1', qtd: 1, px: 100 - pctMaior, dt: '2026-01-10' });
  return { st: st, precos: { bitcoin: pctMaior, ethereum: 100 - pctMaior } };
}
const c70 = carteiraConcentrada(70);
lista('70% num ativo dispara sem-diversificacao',
  disparadas(c70.st, c70.precos, ['risco']), ['sem-diversificacao']);
const c50 = carteiraConcentrada(50);
lista('50% num ativo dispara concentracao-alta',
  disparadas(c50.st, c50.precos, ['risco']), ['concentracao-alta']);

/* um ativo só */
const stUm = PCore.novoEstado();
stUm.carteiras.push({ id: 'c1', nome: 'P' });
stUm.ativos.push({ id: 'z', tk: 'BTC', cg: 'bitcoin', cart: 'c1', last: 60000 });
PCore.addMov(stUm, { tipo: 'compra', ref: 'z', cart: 'c1', qtd: 1, px: 50000, dt: '2026-01-10' });
lista('carteira de um ativo so dispara carteira-unica',
  disparadas(stUm, { bitcoin: 60000 }, ['risco']), ['carteira-unica']);

/* trade ruim */
const stRuim = comTrade(carteiraBase(), 5, 100, 15, 300, 10000);
lista('profit factor abaixo de 1 dispara profit-factor-ruim',
  disparadas(stRuim, PRECOS, ['trade']), ['profit-factor-ruim']);

/* trade bom */
const stBom = comTrade(carteiraBase(), 20, 500, 15, 200, 50000);
lista('profit factor alto com 35 ops dispara profit-factor-bom',
  disparadas(stBom, PRECOS, ['trade']), ['profit-factor-bom']);

/* amostra pequena */
const stPouco = comTrade(carteiraBase(), 3, 200, 2, 100, 10000);
lista('5 operacoes disparam trade-amostra-pequena',
  disparadas(stPouco, PRECOS, ['trade']), ['trade-amostra-pequena']);

/* higiene: ativo sem preço automático */
const stSemPreco = carteiraBase();
stSemPreco.ativos.push({ id: 'q', tk: 'XYZ', cg: '', cart: 'c1', last: 5 });
PCore.addMov(stSemPreco, { tipo: 'compra', ref: 'q', cart: 'c1', qtd: 10, px: 5, dt: '2026-01-10' });
lista('ativo sem id de preco dispara ativos-sem-preco',
  disparadas(stSemPreco, PRECOS, ['higiene']), ['ativos-sem-preco']);

/* desempenho: lucro realizado */
const stRealizou = carteiraBase();
PCore.addMov(stRealizou, { tipo: 'venda', ref: 'btc', cart: 'c1', qtd: 0.5, px: 70000, dt: '2026-03-10' });
lista('venda no lucro dispara resultado-realizado',
  disparadas(stRealizou, PRECOS, ['desempenho']), ['resultado-realizado']);

/* ══════════════════════════════════════════════════════════════
   3. COBERTURA — o Nexus não pode ficar mudo
   ══════════════════════════════════════════════════════════════ */

sec('Cobertura: PREJUIZO REALIZADO tem que ser dito');
/* Comprou 1 BTC a 70k, vendeu meio a 50k: perdeu $10.000 de verdade,
   dinheiro que saiu. O resto da carteira está no lucro.
   A pergunta do usuário é literalmente "estou ganhando ou perdendo?".
   Se o Nexus fala do retorno anualizado e de quem lidera, mas não
   menciona os $10.000, ele respondeu tudo menos a pergunta. */
const stPerdeu = PCore.novoEstado();
stPerdeu.carteiras.push({ id: 'c1', nome: 'P' });
stPerdeu.ativos.push({ id: 'btc', tk: 'BTC', cg: 'bitcoin', cart: 'c1', last: 60000 });
stPerdeu.ativos.push({ id: 'eth', tk: 'ETH', cg: 'ethereum', cart: 'c1', last: 3000 });
PCore.addMov(stPerdeu, { tipo: 'compra', ref: 'btc', cart: 'c1', qtd: 1, px: 70000, dt: '2026-01-10' });
PCore.addMov(stPerdeu, { tipo: 'venda', ref: 'btc', cart: 'c1', qtd: 0.5, px: 50000, dt: '2026-02-10' });
PCore.addMov(stPerdeu, { tipo: 'compra', ref: 'eth', cart: 'c1', qtd: 10, px: 2000, dt: '2026-01-10' });
const mPerdeu = montar(stPerdeu, PRECOS);
const fPerdeu = mPerdeu.fatos();
eq('o prejuizo realizado e de $10.000', fPerdeu.realizado, -10000, 1e-6);
eqv('e o restante da carteira esta no lucro', fPerdeu.naoRealizado > 0, true);
lista('perda realizada dispara prejuizo-realizado',
  mPerdeu.avaliar(fPerdeu, ['desempenho']).map(function (a) { return a.id; }),
  ['prejuizo-realizado']);

sec('Cobertura: o trader COMPETENTE nao pode ouvir silencio');
/* 40 operações, profit factor 1,20, payoff 1,20, expectativa positiva,
   drawdown abaixo de 5%. Não é um desastre nem um fenômeno — é a maior
   parte de quem opera com método. As oito regras de trade tratavam só
   dos extremos, e esse usuário recebia "semAchado". */
/* A carteira aqui e' GRANDE de proposito: com trade valendo pouco do
   patrimonio, a regra de composicao (trade-peso-alto) nao dispara e
   sobra so a pergunta que o usuario fez de verdade -- a qualidade do
   trade. Com uma base pequena o teste passaria pelo motivo errado. */
const stMedio = carteiraBase();
PCore.addMov(stMedio, { tipo: 'compra', ref: 'btc', cart: 'c1', qtd: 20, px: 50000, dt: '2026-01-11' });
comTrade(stMedio, 20, 300, 20, 250, 100000);
const mMedio = montar(stMedio, PRECOS);
const fMedio = mMedio.fatos();
eq('sao 40 operacoes', fMedio.nOps, 40);
eq('profit factor 1,2', fMedio.profitFactor, 1.2, 1e-9);
eqv('expectativa positiva', fMedio.expectativa > 0, true);
eqv('drawdown abaixo de 30%', fMedio.drawdownMax < 30, true);
const achadosMedio = mMedio.avaliar(fMedio, ['trade']);
eqv('o Nexus tem o que dizer sobre esse trade', achadosMedio.length > 0, true);

sec('Cobertura: a fresta do 59,99%');
/* Duas regras cobriam a concentração: uma até 59,99 e outra a partir de
   60. Entre elas havia um vão — e ponto flutuante coloca exatamente os
   60% dentro do vão, que é justo o valor mais importante da faixa. */
const vaos = [];
for (let alvo = 40; alvo <= 65; alvo += 0.005) {
  const c = carteiraConcentrada(alvo);
  const M = montar(c.st, c.precos);
  const f = M.fatos();
  if (f.maiorAtivoPct < 40 || f.maiorAtivoPct >= 65) continue;
  const disp = M.avaliar(f, ['risco']).map(function (a) { return a.id; });
  const falou = disp.indexOf('concentracao-alta') >= 0 || disp.indexOf('sem-diversificacao') >= 0;
  if (!falou) vaos.push(f.maiorAtivoPct.toFixed(4));
}
eqv('nao ha vao entre 40% e 65% de concentracao' +
  (vaos.length ? ' [' + vaos.slice(0, 5).join(', ') + ']' : ''), vaos.length, 0);

sec('Cobertura: quem nao faz trade nem pool ouve algo util');
/* O texto de fallback recitava "0 operações, resultado de $0 sobre $0
   aportados" — um relatório sobre coisa nenhuma. Quem nunca operou não
   precisa de números zerados, precisa saber que não há o que analisar. */
const mSoHold = montar(carteiraBase(), PRECOS);
const rTrade = mSoHold.responder('como vai meu trade?');
const rPool = mSoHold.responder('como estao minhas pools?');
eqv('a pergunta de trade e RESPONDIDA, nao cai no vazio', rTrade.tipo, 'ok');
eqv('a pergunta de pool e RESPONDIDA, nao cai no vazio', rPool.tipo, 'ok');
const idsTrade = (rTrade.achados || []).map(function (a) { return a.id; });
const idsPool = (rPool.achados || []).map(function (a) { return a.id; });
lista('e a resposta e a de quem nao opera', idsTrade, ['sem-trade']);
lista('e a de quem nao tem pool', idsPool, ['sem-pools']);

const txtTrade = (rTrade.achados || []).map(function (a) { return a.titulo + ' ' + a.texto; }).join(' ');
const txtPool = (rPool.achados || []).map(function (a) { return a.titulo + ' ' + a.texto; }).join(' ');
eqv('o texto de trade nao recita zeros', /0 opera|\$0|0,0%/.test(txtTrade), false);
eqv('o texto de pool nao recita zeros', /0 pool|\$0|0,0%/.test(txtPool), false);
eqv('o texto de pool nao diz que esta tudo certo', /nada fora do lugar/i.test(txtPool), false);

sec('Cobertura: estado vazio NAO polui o panorama');
/* "Voce nao tem pool nenhuma" e' util para quem perguntou sobre pools e
   ruido puro no painel de abertura de quem so faz HOLD. O panorama tem
   quatro linhas; nenhuma delas pode ser sobre coisa que a pessoa nao faz. */
const panoramaHold = mSoHold.panorama(4).map(function (a) { return a.id; });
eqv('o panorama nao traz sem-trade', panoramaHold.indexOf('sem-trade'), -1);
eqv('o panorama nao traz sem-pools', panoramaHold.indexOf('sem-pools'), -1);
eqv('mas o panorama tem conteudo', panoramaHold.length > 0, true);

sec('Cobertura: varredura de trade — ninguem pode ouvir silencio');
/* Tres cenarios escolhidos a dedo provam pouco. Aqui o espaco inteiro:
   toda combinacao de numero de operacoes e profit factor precisa render
   ao menos uma leitura. Silencio e' resposta errada quando a pergunta
   era boa -- e "como vai meu trade?" e' sempre uma pergunta boa. */
const MUDOS = [];
[1, 5, 14, 15, 29, 30, 31, 50, 120].forEach(function (nOps) {
  /* pf desejado = (g*vg) / (p*vp). Fixamos metade ganhos, metade perdas
     e ajustamos o valor do ganho para chegar no profit factor alvo. */
  [0.4, 0.9, 0.99, 1.0, 1.01, 1.2, 1.49, 1.5, 1.51, 3.0].forEach(function (pfAlvo) {
    const perdas = Math.floor(nOps / 2);
    const ganhos = nOps - perdas;
    if (!ganhos || !perdas) return;
    const valorPerda = 200;
    const valorGanho = (pfAlvo * perdas * valorPerda) / ganhos;
    const st = carteiraBase();
    /* base grande: a fatia do trade fica pequena e a regra de composicao
       nao entra, deixando so as regras de QUALIDADE do trade em jogo */
    PCore.addMov(st, { tipo: 'compra', ref: 'btc', cart: 'c1', qtd: 40, px: 50000, dt: '2026-01-11' });
    comTrade(st, ganhos, valorGanho, perdas, valorPerda, 200000);
    const M = montar(st, PRECOS);
    const f = M.fatos();
    const achados = M.avaliar(f, ['trade']);
    if (!achados.length) {
      MUDOS.push('nOps=' + f.nOps + ' pf=' + f.profitFactor.toFixed(2));
    }
  });
});
eqv('nenhuma combinacao de nOps x profit factor fica muda' +
  (MUDOS.length ? ' [' + MUDOS.slice(0, 6).join('; ') + ']' : ''), MUDOS.length, 0);

sec('Cobertura: varredura de resultado — ganho e perda tem o mesmo peso');
/* O ganho realizado tinha regra e a perda realizada nao tinha nenhuma.
   Esta varredura garante que o Nexus fala dos dois lados: qualquer
   resultado diferente de zero precisa aparecer em alguma linha. */
const RESULTADO_MUDO = [];
[[70000, 50000], [40000, 60000], [50000, 50000], [80000, 20000], [20000, 80000]]
  .forEach(function (par) {
    const st = PCore.novoEstado();
    st.carteiras.push({ id: 'c1', nome: 'P' });
    st.ativos.push({ id: 'btc', tk: 'BTC', cg: 'bitcoin', cart: 'c1', last: 60000 });
    st.ativos.push({ id: 'eth', tk: 'ETH', cg: 'ethereum', cart: 'c1', last: 3000 });
    PCore.addMov(st, { tipo: 'compra', ref: 'btc', cart: 'c1', qtd: 1, px: par[0], dt: '2026-01-10' });
    PCore.addMov(st, { tipo: 'venda', ref: 'btc', cart: 'c1', qtd: 0.5, px: par[1], dt: '2026-02-10' });
    PCore.addMov(st, { tipo: 'compra', ref: 'eth', cart: 'c1', qtd: 10, px: 2000, dt: '2026-01-10' });
    const M = montar(st, PRECOS);
    const f = M.fatos();
    if (Math.abs(f.realizado) < 1) return;          /* zero nao precisa de regra */
    const texto = M.avaliar(f, ['desempenho'])
      .map(function (a) { return a.titulo + ' ' + a.texto; }).join(' ');
    /* o valor realizado, arredondado, tem que estar escrito em algum lugar */
    const alvo = Math.round(Math.abs(f.realizado)).toLocaleString('en-US');
    if (texto.indexOf(alvo) < 0) {
      RESULTADO_MUDO.push((f.realizado > 0 ? 'lucro' : 'perda') + ' de ' + alvo);
    }
  });
eqv('todo resultado realizado aparece escrito na resposta' +
  (RESULTADO_MUDO.length ? ' [' + RESULTADO_MUDO.join('; ') + ']' : ''), RESULTADO_MUDO.length, 0);

sec('Cobertura: o panorama sempre tem o que mostrar');
/* O painel abre com o panorama. Vazio ali é uma tela morta. */
eqv('carteira comum gera panorama', mSoHold.panorama(4).length > 0, true);
eqv('carteira concentrada gera panorama', montar(c70.st, c70.precos).panorama(4).length > 0, true);
eqv('carteira de um ativo gera panorama',
  montar(stUm, { bitcoin: 60000 }).panorama(4).length > 0, true);

sec('Cobertura: portfolio vazio responde sem quebrar');
const mVazio = montar(PCore.novoEstado(), {});
const fVazio = mVazio.fatos();
eqv('sem dados, temDados e falso', fVazio.temDados, false);
eqv('avaliar devolve lista vazia', mVazio.avaliar(fVazio, null).length, 0);
eqv('panorama devolve lista vazia', mVazio.panorama(4).length, 0);
eqv('responder devolve o tipo vazio', mVazio.responder('como esta meu patrimonio?').tipo, 'vazio');

/* ══════════════════════════════════════════════════════════════
   4. INTERPOLAÇÃO E ROTEAMENTO
   ══════════════════════════════════════════════════════════════ */
sec('Interpolacao: nenhuma resposta vaza chave na tela');
const cenarios = [
  ['base', carteiraBase(), PRECOS],
  ['concentrada', c70.st, c70.precos],
  ['um ativo', stUm, { bitcoin: 60000 }],
  ['trade ruim', stRuim, PRECOS],
  ['trade bom', stBom, PRECOS],
  ['perdeu', stPerdeu, PRECOS]
];
let vazou = 0;
cenarios.forEach(function (c) {
  const M = montar(c[1], c[2]);
  const f = M.fatos();
  M.avaliar(f, null).forEach(function (a) {
    if (/\{[a-zA-Z0-9_]+(\|[a-z0-9]+)?\}/.test(a.titulo + ' ' + a.texto)) vazou++;
  });
});
eqv('nenhum {placeholder} sobra no texto final', vazou, 0);

sec('Interpolacao: numero ausente nao vira zero');
eqv('null vira travessao', MOTOR_REF.interpolar('{x|money}', { x: null }), '—');
eqv('Infinity vira travessao', MOTOR_REF.interpolar('{x|pct}', { x: Infinity }), '—');
eqv('fato inexistente fica intacto, para o teste pegar',
  MOTOR_REF.interpolar('{naoExiste}', {}), '{naoExiste}');

sec('Roteamento: a pergunta cai no assunto certo');
const rotas = [
  ['tenho risco de concentracao?', 'risco'],
  ['como vai meu trade?', 'trade'],
  ['como estao minhas pools?', 'defi'],
  ['meus dados estao em dia?', 'dados']
];
rotas.forEach(function (r) {
  const a = MOTOR_REF.assunto(r[0]);
  eqv('"' + r[0] + '" -> ' + r[1], a ? a.id : null, r[1]);
});
eqv('pergunta sem relacao nenhuma nao casa assunto',
  MOTOR_REF.assunto('qual a capital da australia'), null);
eqv('pergunta vazia nao casa assunto', MOTOR_REF.assunto(''), null);
eqv('acento nao atrapalha o roteamento',
  (MOTOR_REF.assunto('tenho risco de concentração?') || {}).id, 'risco');

sec('Roteamento: pergunta desconhecida oferece o que o Nexus sabe');
const rNada = mSoHold.responder('qual a capital da australia');
eqv('tipo naoEntendi', rNada.tipo, 'naoEntendi');
eqv('e vem com sugestoes', (rNada.sugestoes || []).length, REGRAS.assuntos.length);

sec('Ordenacao: alerta grave aparece antes de informacao');
const ordenado = montar(stRuim, PRECOS).avaliar(montar(stRuim, PRECOS).fatos(), ['trade']);
const prioridades = ordenado.map(function (a) {
  return (REGRAS.regras.filter(function (r) { return r.id === a.id; })[0] || {}).prioridade || 0;
});
let decrescente = true;
for (let i = 1; i < prioridades.length; i++) if (prioridades[i] > prioridades[i - 1]) decrescente = false;
eqv('a lista sai da maior prioridade para a menor', decrescente, true);

/* ── fecho ─────────────────────────────────────────────────────────── */
console.log('\n' + '═'.repeat(64));
console.log(fail === 0
  ? 'TODOS OS ' + ok + ' TESTES PASSARAM'
  : fail + ' DE ' + (ok + fail) + ' FALHARAM');
console.log('═'.repeat(64) + '\n');
process.exit(fail === 0 ? 0 : 1);
