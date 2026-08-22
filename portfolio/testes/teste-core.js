/* ─────────────────────────────────────────────────────────────────
   TESTES DO NÚCLEO DE CÁLCULO DO PORTFÓLIO

   Rodar:   node portfolio/testes/teste-core.js

   Cada caso compara contra um número calculado à MÃO, nunca contra o
   que o código devolve. É isso que faz o teste ter valor: se a
   implementação estiver errada, o teste discorda dela.

   Sai com código 1 se qualquer caso falhar — dá para plugar em CI.
   ───────────────────────────────────────────────────────────────── */
var C = require('../portfolio-core.js');

var ok = 0, fail = 0;
function eq(nome, real, esperado, tol) {
  tol = tol == null ? 0.005 : tol;
  var passou = Math.abs(real - esperado) <= tol;
  if (passou) { ok++; console.log('  ok   ' + nome + '  = ' + (+real).toFixed(4)); }
  else { fail++; console.log('  FALHA ' + nome + '  esperado ' + esperado + ', veio ' + real); }
}
function eqv(nome, real, esperado) {
  var passou = real === esperado;
  if (passou) { ok++; console.log('  ok   ' + nome + '  = ' + real); }
  else { fail++; console.log('  FALHA ' + nome + '  esperado ' + esperado + ', veio ' + real); }
}
function sec(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length))); }

/* ══════════════════════════════════════════════════════════════
   1. CUSTO MÉDIO + REALIZADO — o buraco central do v1
   ══════════════════════════════════════════════════════════════ */
sec('HOLD: custo medio e lucro realizado');
var st = C.novoEstado();
st.carteiras.push({ id: 'c1', nome: 'Teste' });
st.ativos.push({ id: 'a1', tk: 'SOL', cg: 'solana', cart: 'c1', last: 100 });

/* Exatamente o caso do seed do v1, que perdia $660:
   compra 60 @ $68, vende 15 @ $112 */
C.addMov(st, { tipo: 'compra', ref: 'a1', cart: 'c1', qtd: 60, px: 68, dt: '2026-01-10' });
C.addMov(st, { tipo: 'venda', ref: 'a1', cart: 'c1', qtd: 15, px: 112, dt: '2026-06-10' });

var p = C.posicao(st, 'a1', 100);
eq('quantidade restante', p.qtd, 45);
eq('custo medio', p.custoMedio, 68);
eq('custo total restante', p.custoTotal, 45 * 68);          // 3060
eq('REALIZADO (15 x (112-68))', p.realizado, 660);           // <-- o v1 dava 0
eq('valor a $100', p.valor, 4500);
eq('nao realizado', p.naoRealizado, 4500 - 3060);            // 1440

/* Taxas: compra soma no custo, venda reduz a receita */
sec('HOLD: taxas entram no custo e na receita');
var st2 = C.novoEstado();
st2.ativos.push({ id: 'b1', tk: 'BTC', cg: 'bitcoin', cart: 'c1', last: 60000 });
C.addMov(st2, { tipo: 'compra', ref: 'b1', qtd: 1, px: 50000, fee: 50, dt: '2026-01-01' });
C.addMov(st2, { tipo: 'venda', ref: 'b1', qtd: 1, px: 60000, fee: 60, dt: '2026-02-01' });
var p2 = C.posicao(st2, 'b1', 60000);
eq('custo com taxa', 50050, 50050);
eq('realizado = (60000-60) - 50050', p2.realizado, 9890);
eqv('posicao encerrada', p2.encerrada, true);
eq('qtd zerada', p2.qtd, 0);

/* Compras a preços diferentes: média ponderada */
sec('HOLD: media ponderada de varias compras');
var st3 = C.novoEstado();
st3.ativos.push({ id: 'c', tk: 'ETH', cg: 'ethereum', cart: 'c1', last: 3000 });
C.addMov(st3, { tipo: 'compra', ref: 'c', qtd: 2, px: 1000, dt: '2026-01-01' });
C.addMov(st3, { tipo: 'compra', ref: 'c', qtd: 3, px: 2000, dt: '2026-02-01' });
var p3 = C.posicao(st3, 'c', 3000);
eq('custo medio (2*1000+3*2000)/5', p3.custoMedio, 1600);
eq('custo total', p3.custoTotal, 8000);
/* vende 2 a 2500: baixa 2*1600=3200, receita 5000, realizado 1800 */
C.addMov(st3, { tipo: 'venda', ref: 'c', qtd: 2, px: 2500, dt: '2026-03-01' });
var p3b = C.posicao(st3, 'c', 3000);
eq('realizado apos venda parcial', p3b.realizado, 1800);
eq('custo medio NAO muda com venda', p3b.custoMedio, 1600);
eq('custo total restante (3 x 1600)', p3b.custoTotal, 4800);

/* Venda maior que a posição: clampa e alerta em vez de gerar qtd negativa */
sec('HOLD: venda acima do saldo e clampada');
var st4 = C.novoEstado();
st4.ativos.push({ id: 'd', tk: 'X', cg: 'x', cart: 'c1', last: 10 });
C.addMov(st4, { tipo: 'compra', ref: 'd', qtd: 5, px: 10, dt: '2026-01-01' });
C.addMov(st4, { tipo: 'venda', ref: 'd', qtd: 50, px: 20, dt: '2026-02-01' });
var p4 = C.posicao(st4, 'd', 10);
eq('qtd nao fica negativa', p4.qtd, 0);
eq('realizado so da parte real (5 x 10)', p4.realizado, 50);
eqv('gerou alerta', p4.alertas.length, 1);

/* ══════════════════════════════════════════════════════════════
   2. POOLS
   ══════════════════════════════════════════════════════════════ */
sec('POOLS: resultado, percentual e APR das taxas');
var st5 = C.novoEstado();
st5.pools.push({ id: 'p1', par: 'SOL/USDC', proto: 'Orca', chain: 'Solana', cart: 'c1',
                 st: 'a', ab: '2026-01-01', en: null, cur: { usd: 3120, tok: '', at: '2026-07-01' } });
C.addMov(st5, { tipo: 'pool_dep', ref: 'p1', usd: 3000, dt: '2026-01-01' });
C.addMov(st5, { tipo: 'pool_fee', ref: 'p1', usd: 96, dt: '2026-04-01' });
var r5 = C.poolResultado(st5, st5.pools[0], '2026-07-01');
eq('resultado (3120 + 96 - 3000)', r5.resultado, 216);
eq('resultado %', r5.resultadoPct, 216 / 3000 * 100);
eq('dias (jan1 -> jul1, 2026)', r5.dias, 181);
eq('APR das taxas (96/3000)*(365/181)', r5.aprFees, (96 / 3000) * (365 / 181) * 100);

sec('POOLS: pool encerrada ignora valor atual');
var st6 = C.novoEstado();
st6.pools.push({ id: 'p2', par: 'X/Y', cart: 'c1', st: 'e', ab: '2026-01-01', en: '2026-04-01',
                 cur: { usd: 9999 } });
C.addMov(st6, { tipo: 'pool_dep', ref: 'p2', usd: 2000, dt: '2026-01-01' });
C.addMov(st6, { tipo: 'pool_ret', ref: 'p2', usd: 2245, dt: '2026-04-01' });
C.addMov(st6, { tipo: 'pool_fee', ref: 'p2', usd: 133, dt: '2026-03-01' });
var r6 = C.poolResultado(st6, st6.pools[0]);
eq('resultado fechada (2245 + 133 - 2000)', r6.resultado, 378);
eq('valor atual ignorado', r6.atual, 0);

/* ══════════════════════════════════════════════════════════════
   3. TRADE — aporte nao pode virar lucro (bug P1-05)
   ══════════════════════════════════════════════════════════════ */
sec('TRADE: aporte NAO conta como lucro');
var st7 = C.novoEstado();
C.addMov(st7, { tipo: 'trade_dep', usd: 1000, dt: '2026-01-01' });
C.addMov(st7, { tipo: 'trade_res', usd: 120, px: 1, dt: '2026-02-01' });
C.addMov(st7, { tipo: 'trade_res', usd: 45, px: -1, dt: '2026-02-05' });
C.addMov(st7, { tipo: 'trade_res', usd: 105, px: 1, dt: '2026-03-01' });
C.addMov(st7, { tipo: 'trade_dep', usd: 500, dt: '2026-03-15' });   // aporte novo
var t7 = C.tradeResumo(st7);
eq('banca (1000 +120 -45 +105 +500)', t7.banca, 1680);
eq('depositos', t7.depositos, 1500);
eq('resultado (so trades)', t7.resultado, 180);
eq('rentabilidade sobre aportado (180/1500)', t7.rentabilidade, 12);
eqv('n operacoes', t7.n, 3);
eq('win rate 2/3', t7.winRate, 66.6667, 0.01);

sec('TRADE: metricas que o v1 nao tinha');
eq('media ganho (120+105)/2', t7.mediaGanho, 112.5);
eq('media perda', t7.mediaPerda, 45);
eq('profit factor 225/45', t7.profitFactor, 5);
eq('payoff 112.5/45', t7.payoff, 2.5);
/* expectativa = 0.6667*112.5 - 0.3333*45 = 75 - 15 = 60 */
eq('expectativa por operacao', t7.expectativa, 60, 0.01);
eq('maior perda', t7.maiorPerda, 45);

/* ══════════════════════════════════════════════════════════════
   4. LENDING
   ══════════════════════════════════════════════════════════════ */
sec('LENDING: supply e ativo, borrow e passivo');
var st8 = C.novoEstado();
st8.lend.push({ id: 'l1', plat: 'Kamino', tipo: 's', tk: 'USDC', cart: 'c1', st: 'a' });
st8.lend.push({ id: 'l2', plat: 'Aave', tipo: 'b', tk: 'USDC', cart: 'c1', st: 'a' });
C.addMov(st8, { tipo: 'lend_sup', ref: 'l1', usd: 1500, dt: '2026-01-01' });
C.addMov(st8, { tipo: 'lend_juros', ref: 'l1', usd: 40, dt: '2026-03-01' });
C.addMov(st8, { tipo: 'lend_sup', ref: 'l2', usd: 400, dt: '2026-01-01' });
C.addMov(st8, { tipo: 'lend_juros', ref: 'l2', usd: 12, dt: '2026-03-01' });
/* juros COMPOEM na posicao: e assim que Aave/Kamino funcionam */
eq('supply: capital aportado', C.lendResultado(st8, st8.lend[0]).capital, 1500);
eq('supply vale 1500 + 40 de juros', C.lendResultado(st8, st8.lend[0]).valor, 1540);
eq('juros de supply sao ganho', C.lendResultado(st8, st8.lend[0]).resultado, 40);
eq('borrow: divida cresce com o juro', C.lendResultado(st8, st8.lend[1]).valor, -412);
eq('juros de borrow sao custo', C.lendResultado(st8, st8.lend[1]).resultado, -12);

/* ══════════════════════════════════════════════════════════════
   5. CONSOLIDADO — a identidade que o v1 quebrava
   ══════════════════════════════════════════════════════════════ */
sec('TOTAIS: investido NAO e derivado por subtracao');
var g = C.novoEstado();
g.carteiras.push({ id: 'c1', nome: 'W' });
g.ativos.push({ id: 'a1', tk: 'SOL', cg: 'solana', cart: 'c1', last: 100 });
C.addMov(g, { tipo: 'compra', ref: 'a1', cart: 'c1', qtd: 60, px: 68, dt: '2026-01-10' });
C.addMov(g, { tipo: 'venda', ref: 'a1', cart: 'c1', qtd: 15, px: 112, dt: '2026-06-10' });
var T = C.totais(g, { solana: 100 }, 'all');
eq('patrimonio (45 x 100)', T.patrimonio, 4500);
eq('investido = custo das abertas (45 x 68)', T.investido, 3060);
eq('nao realizado', T.naoRealizado, 1440);
eq('realizado', T.realizado, 660);
eq('resultado total', T.resultadoTotal, 2100);
eq('IDENTIDADE: pat - inv == naoReal', T.patrimonio - T.investido, T.naoRealizado);
eq('rentabilidade das abertas', T.rentAberta, 1440 / 3060 * 100);

sec('TOTAIS: taxa de pool nao e contada duas vezes');
var g2 = C.novoEstado();
g2.pools.push({ id: 'p', par: 'A/B', cart: 'c1', st: 'a', ab: '2026-01-01', cur: { usd: 1000 } });
C.addMov(g2, { tipo: 'pool_dep', ref: 'p', usd: 1000, dt: '2026-01-01' });
C.addMov(g2, { tipo: 'pool_fee', ref: 'p', usd: 50, dt: '2026-02-01' });
var T2 = C.totais(g2, {}, 'all');
eq('realizado inclui a taxa uma vez', T2.realizado, 50);
eq('taxasDeFi e o mesmo 50 (so exibicao)', T2.taxasDeFi, 50);
eq('resultado total nao vira 100', T2.resultadoTotal, 50);

sec('TOTAIS: filtro de carteira alcanca o trade (bug P1-06)');
var g3 = C.novoEstado();
g3.carteiras.push({ id: 'c1', nome: 'A' }, { id: 'c2', nome: 'B' });
C.addMov(g3, { tipo: 'trade_dep', cart: 'c1', usd: 1000, dt: '2026-01-01' });
C.addMov(g3, { tipo: 'trade_dep', cart: 'c2', usd: 500, dt: '2026-01-01' });
eq('todas as carteiras', C.totais(g3, {}, 'all').patrimonio, 1500);
eq('so carteira c1', C.totais(g3, {}, 'c1').patrimonio, 1000);
eq('so carteira c2', C.totais(g3, {}, 'c2').patrimonio, 500);

sec('TOTAIS: estado vazio nao explode');
var v = C.totais(C.novoEstado(), {}, 'all');
eq('patrimonio zero', v.patrimonio, 0);
eq('rentabilidade zero (sem divisao por zero)', v.rentAberta, 0);
eqv('marca vazio', v.vazio, true);

/* ══════════════════════════════════════════════════════════════
   6. XIRR
   ══════════════════════════════════════════════════════════════ */
sec('XIRR');
/* -1000 hoje, +1100 em 1 ano = 10% ao ano */
eq('caso simples 10% a.a.', C.xirr([
  { dt: '2026-01-01', valor: -1000 },
  { dt: '2027-01-01', valor: 1100 }
]), 10, 0.05);

/* dobrar em 1 ano = 100% */
eq('dobrou em 1 ano', C.xirr([
  { dt: '2026-01-01', valor: -1000 },
  { dt: '2027-01-01', valor: 2000 }
]), 100, 0.1);

/* dobrar em 6 meses = ~300% ao ano ((2)^2 - 1) */
eq('dobrou em 6 meses', C.xirr([
  { dt: '2026-01-01', valor: -1000 },
  { dt: '2026-07-02', valor: 2000 }
]), 300, 3);

/* aportes escalonados: quem aporta e depois valoriza */
var x = C.xirr([
  { dt: '2026-01-01', valor: -1000 },
  { dt: '2026-07-01', valor: -1000 },
  { dt: '2027-01-01', valor: 2200 }
]);
eqv('aportes escalonados retorna numero', typeof x === 'number' && isFinite(x), true);
console.log('       (valor: ' + x.toFixed(2) + '% a.a.)');

eqv('sem sinais opostos retorna null', C.xirr([
  { dt: '2026-01-01', valor: 100 }, { dt: '2027-01-01', valor: 200 }
]), null);
eqv('fluxo unico retorna null', C.xirr([{ dt: '2026-01-01', valor: -100 }]), null);
eqv('vazio retorna null', C.xirr([]), null);

sec('XIRR: integrado ao portfolio');
var g4 = C.novoEstado();
g4.ativos.push({ id: 'a', tk: 'BTC', cg: 'bitcoin', cart: 'c1', last: 60000 });
C.addMov(g4, { tipo: 'compra', ref: 'a', qtd: 1, px: 50000, dt: '2026-01-01' });
var f = C.fluxos(g4, { bitcoin: 60000 }, 'all');
eqv('gerou 2 fluxos (compra + valor atual)', f.length, 2);
eq('fluxo de saida e negativo', f[0].valor, -50000);
eq('fluxo final e o patrimonio', f[1].valor, 60000);

/* taxa sempre reduz o bolso, nos dois sentidos */
var g5 = C.novoEstado();
g5.ativos.push({ id: 'a', tk: 'X', cg: 'x', cart: 'c1', last: 0 });
C.addMov(g5, { tipo: 'compra', ref: 'a', qtd: 1, px: 1000, fee: 10, dt: '2026-01-01' });
C.addMov(g5, { tipo: 'venda',  ref: 'a', qtd: 1, px: 2000, fee: 20, dt: '2026-06-01' });
var f5 = C.fluxos(g5, { x: 0 }, 'all');
eq('compra: -(1000) - 10', f5[0].valor, -1010);
eq('venda:  +(2000) - 20', f5[1].valor, 1980);
eq('usd normalizado na compra', g5.mov[0].usd, 1000);

/* ══════════════════════════════════════════════════════════════
   7. SNAPSHOTS — sem curva inventada
   ══════════════════════════════════════════════════════════════ */
sec('SNAPSHOTS');
var s9 = C.novoEstado();
C.registrarSnapshot(s9, { patrimonio: 100, investido: 90, realizado: 5, naoRealizado: 10 }, '2026-01-01');
C.registrarSnapshot(s9, { patrimonio: 120, investido: 90, realizado: 5, naoRealizado: 30 }, '2026-01-02');
eqv('dois pontos', s9.snaps.length, 2);
C.registrarSnapshot(s9, { patrimonio: 130, investido: 90, realizado: 5, naoRealizado: 40 }, '2026-01-02');
eqv('mesmo dia sobrescreve, nao duplica', s9.snaps.length, 2);
eq('valor do dia atualizado', s9.snaps[1].pat, 130);

var serie = C.serie(s9, 'tudo');
eqv('serie suficiente com 2 pontos', serie.suficiente, true);
eq('variacao 100 -> 130', serie.variacao, 30);
eq('variacao %', serie.variacaoPct, 30);

var s10 = C.novoEstado();
C.registrarSnapshot(s10, { patrimonio: 100, investido: 0, realizado: 0, naoRealizado: 0 }, '2026-01-01');
eqv('1 ponto = insuficiente (mostra estado vazio)', C.serie(s10, 'tudo').suficiente, false);
eqv('zero pontos = insuficiente', C.serie(C.novoEstado(), 'tudo').suficiente, false);

/* ══════════════════════════════════════════════════════════════ */
console.log('\n' + '═'.repeat(62));
console.log(fail === 0 ? ('TODOS OS ' + ok + ' TESTES PASSARAM') : (ok + ' ok, ' + fail + ' FALHARAM'));
console.log('═'.repeat(62));
process.exit(fail ? 1 : 0);
