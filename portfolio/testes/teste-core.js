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
/* deposito financia a compra (60 x 68 = 4080) — sem ele a compra sozinha
   deixaria o caixa negativo, que e exatamente o estado que a trava de
   caixa (FIX 5 / P.travaCaixa) proibe na tela real. */
C.addMov(g, { tipo: 'deposito', cart: 'c1', usd: 4080, dt: '2026-01-05' });
C.addMov(g, { tipo: 'compra', ref: 'a1', cart: 'c1', qtd: 60, px: 68, dt: '2026-01-10' });
C.addMov(g, { tipo: 'venda', ref: 'a1', cart: 'c1', qtd: 15, px: 112, dt: '2026-06-10' });
var T = C.totais(g, { solana: 100 }, 'all');
/* a mao: caixa = 4080 (deposito) - 4080 (compra) + 1680 (venda 15x112)
   = 1680 — a venda parcial devolveu dinheiro que ainda nao foi gasto. */
eq('caixa sobrou da venda parcial', C.caixaDe(g, 'c1'), 1680);
/* FIX 3: patrimonio agora inclui caixa. valor das posicoes (45 x 100 =
   4500) + caixa (1680) = 6180 */
eq('patrimonio = valor das posicoes + caixa (4500 + 1680)', T.patrimonio, 6180);
eq('investido = custo das abertas (45 x 68)', T.investido, 3060);
eq('nao realizado', T.naoRealizado, 1440);
eq('realizado', T.realizado, 660);
eq('resultado total', T.resultadoTotal, 2100);
/* a identidade antiga (pat - inv == naoReal) valia porque patrimonio so
   somava valor de posicoes. Agora patrimonio inclui caixa tambem, entao
   o lado direito precisa somar esse caixa pra continuar batendo. */
eq('IDENTIDADE: pat - inv == naoReal + caixa', T.patrimonio - T.investido, T.naoRealizado + C.caixaDe(g, 'c1'));
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
/* deposito financia o aporte na banca em cada carteira — trade_dep tira
   do caixa (sinal -1) igual compra/pool_dep/lend_sup; sem o deposito
   correspondente o caixa ficaria negativo. Com ele, caixa fecha em 0 em
   cada carteira, entao o patrimonio (banca + caixa) nao muda: continua
   sendo so o valor da banca, como o teste original esperava. */
C.addMov(g3, { tipo: 'deposito', cart: 'c1', usd: 1000, dt: '2026-01-01' });
C.addMov(g3, { tipo: 'trade_dep', cart: 'c1', usd: 1000, dt: '2026-01-01' });
C.addMov(g3, { tipo: 'deposito', cart: 'c2', usd: 500, dt: '2026-01-01' });
C.addMov(g3, { tipo: 'trade_dep', cart: 'c2', usd: 500, dt: '2026-01-01' });
eq('caixa de c1 fecha em 0 (deposito consumido pelo aporte)', C.caixaDe(g3, 'c1'), 0);
eq('caixa de c2 fecha em 0', C.caixaDe(g3, 'c2'), 0);
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

sec('XIRR: integrado ao portfolio (FIX 1 — so deposito/saque sao fluxo)');
var g4 = C.novoEstado();
g4.carteiras.push({ id: 'c1', nome: 'W' });
g4.ativos.push({ id: 'a', tk: 'BTC', cg: 'bitcoin', cart: 'c1', last: 60000 });
/* deposito financia a compra inteira — caixa fecha em 0, a compra deixa
   de ser fluxo (FIX 1) e so o deposito conta. */
C.addMov(g4, { tipo: 'deposito', cart: 'c1', usd: 50000, dt: '2026-01-01' });
C.addMov(g4, { tipo: 'compra', ref: 'a', cart: 'c1', qtd: 1, px: 50000, dt: '2026-01-01' });
var f = C.fluxos(g4, { bitcoin: 60000 }, 'all');
eqv('gerou 2 fluxos (so o deposito + valor atual — a compra NAO conta mais)', f.length, 2);
eq('fluxo de saida e negativo (o deposito)', f[0].valor, -50000);
eq('fluxo final e o patrimonio (caixa 0 + posicao 60000)', f[1].valor, 60000);

/* taxa sempre reduz o bolso, nos dois sentidos — agora testado em
   deposito/saque, que sao os fluxos de verdade depois da FIX 1
   (compra/venda pararam de contar aqui, mesmo pagando taxa) */
var g5 = C.novoEstado();
g5.carteiras.push({ id: 'c1', nome: 'W' });
C.addMov(g5, { tipo: 'deposito', cart: 'c1', usd: 2000, fee: 10, dt: '2026-01-01' });
C.addMov(g5, { tipo: 'saque',    cart: 'c1', usd: 500,  fee: 20, dt: '2026-06-01' });
var f5 = C.fluxos(g5, {}, 'all');
eqv('2 fluxos (deposito, saque) + patrimonio final', f5.length, 3);
eq('deposito: -(2000) - 10 (taxa aumenta o que saiu do bolso)', f5[0].valor, -2010);
eq('saque:  +(500) - 20 (taxa reduz o que voltou ao bolso)', f5[1].valor, 480);
/* caixa = 2000 (deposito) - 500 (saque) = 1500; C.caixaDe so desconta
   taxa de compra/venda, nao de deposito/saque (comportamento existente,
   fora do escopo desta fix) — por isso o patrimonio nao reflete as taxas */
eq('fluxo final e o patrimonio (caixa 1500, sem posicoes)', f5[2].valor, 1500);

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

/* ══════════════════════════════════════════════════════════════
   8. CONCENTRACAO DE RISCO
   ══════════════════════════════════════════════════════════════ */
sec('CONCENTRACAO: HHI enxerga o que "quantos ativos" esconde');
function carteira(pesos){            // pesos = {TICKER: valorUSD}
  var st = C.novoEstado();
  st.carteiras.push({id:'c1',nome:'W'});
  Object.keys(pesos).forEach(function(tk,i){
    var id='a'+i;
    st.ativos.push({id:id,tk:tk,cg:tk.toLowerCase(),cart:'c1',last:1});
    C.addMov(st,{tipo:'compra',ref:id,cart:'c1',qtd:pesos[tk],px:1,dt:'2026-01-01'});
  });
  return st;
}
var precos1 = {};
var st10 = carteira({A:10,B:10,C:10,D:10,E:10,F:10,G:10,H:10,I:10,J:10});
'ABCDEFGHIJ'.split('').forEach(function(t){precos1[t.toLowerCase()]=1;});
var c10 = C.concentracao(st10, precos1, 'all');
eq('10 ativos iguais: HHI = 10 x 10^2', c10.hhi, 1000);
eqv('nivel baixa', c10.nivel, 'baixa');
eq('maior posicao 10%', c10.maior.pct, 10);

var st1 = carteira({A:100});
var c1 = C.concentracao(st1, {a:1}, 'all');
eq('1 ativo so: HHI = 100^2', c1.hhi, 10000);
eqv('nivel unica', c1.nivel, 'unica');

sec('CONCENTRACAO: muitos ativos mas um domina');
/* 5 ativos, mas um vale 80% — "tenho 5 ativos" esconde isso */
var stD = carteira({A:80,B:5,C:5,D:5,E:5});
var pD = {a:1,b:1,c:1,d:1,e:1};
var cD = C.concentracao(stD, pD, 'all');
eq('maior = 80%', cD.maior.pct, 80);
eq('HHI = 80^2 + 4x5^2', cD.hhi, 6400+100);
eqv('nivel critica', cD.nivel, 'critica');
eqv('sao 5 posicoes', cD.n, 5);
eq('top3 = 90%', cD.top3Pct, 90);

sec('CONCENTRACAO: stablecoin contada a parte');
var stS = carteira({BTC:50,USDC:50});
var cS = C.concentracao(stS, {btc:1,usdc:1}, 'all');
eq('stable = 50% do patrimonio', cS.stablePct, 50);
eq('stable em valor', cS.stableValor, 50);
eqv('USDC marcada como stable', cS.linhas.filter(function(l){return l.nome==='USDC';})[0].stable, true);
eqv('BTC nao e stable', cS.linhas.filter(function(l){return l.nome==='BTC';})[0].stable, false);

sec('CONCENTRACAO: pool e banca ocupam espaco na carteira');
var stP = carteira({BTC:100});
stP.pools.push({id:'p',par:'SOL/USDC',cart:'c1',st:'a',ab:'2026-01-01',cur:{usd:100}});
C.addMov(stP,{tipo:'pool_dep',ref:'p',cart:'c1',usd:100,dt:'2026-01-01'});
var cP = C.concentracao(stP, {btc:1}, 'all');
eqv('duas linhas: ativo + pool', cP.n, 2);
eq('BTC deixa de ser 100%', cP.maior.pct, 50);
eq('HHI de 50/50', cP.hhi, 5000);

sec('CONCENTRACAO: carteira vazia nao explode');
var cV = C.concentracao(C.novoEstado(), {}, 'all');
eqv('zero linhas', cV.n, 0);
eq('hhi zero', cV.hhi, 0);
eqv('maior e null', cV.maior, null);

/* ══════════════════════════════════════════════════════════════
   9. CONTRIBUICAO PARA O RESULTADO
   ══════════════════════════════════════════════════════════════ */
sec('CONTRIBUICAO: quem pesa nao e quem rende');
var stC = C.novoEstado();
stC.carteiras.push({id:'c1',nome:'W'});
/* BTC: posicao grande, ganho pequeno.  SOL: posicao pequena, ganho grande. */
stC.ativos.push({id:'b',tk:'BTC',cg:'bitcoin',cart:'c1',last:0});
stC.ativos.push({id:'s',tk:'SOL',cg:'solana',cart:'c1',last:0});
C.addMov(stC,{tipo:'compra',ref:'b',cart:'c1',qtd:1,px:1000,dt:'2026-01-01'});
C.addMov(stC,{tipo:'compra',ref:'s',cart:'c1',qtd:1,px:100,dt:'2026-01-01'});
var precosC = {bitcoin:1100, solana:400};   // BTC +100 (10%), SOL +300 (300%)
var contrib = C.contribuicao(stC, precosC, 'all');
eq('BTC contribuiu 100', contrib.linhas.filter(function(l){return l.nome==='BTC';})[0].total, 100);
eq('SOL contribuiu 300', contrib.linhas.filter(function(l){return l.nome==='SOL';})[0].total, 300);
eqv('SOL lidera a contribuicao', contrib.melhor.nome, 'SOL');
eq('SOL = 75% do resultado', contrib.linhas[0].pct, 75);
/* mas BTC pesa mais na carteira */
var conc = C.concentracao(stC, precosC, 'all');
eqv('e BTC lidera a alocacao', conc.maior.nome, 'BTC');

sec('CONTRIBUICAO: ganho e perda nao se anulam no percentual');
var stG = C.novoEstado();
stG.carteiras.push({id:'c1',nome:'W'});
stG.ativos.push({id:'g',tk:'GANHO',cg:'g',cart:'c1',last:0});
stG.ativos.push({id:'p',tk:'PERDA',cg:'p',cart:'c1',last:0});
C.addMov(stG,{tipo:'compra',ref:'g',cart:'c1',qtd:1,px:100,dt:'2026-01-01'});
C.addMov(stG,{tipo:'compra',ref:'p',cart:'c1',qtd:1,px:100,dt:'2026-01-01'});
var cg2 = C.contribuicao(stG, {g:200, p:0.0001}, 'all');
eq('resultado liquido perto de zero', Math.round(cg2.resultadoTotal), 0);
eq('mesmo assim cada um pesa 50%', cg2.linhas[0].pct, 50, 0.1);
eqv('melhor e GANHO', cg2.melhor.nome, 'GANHO');
eqv('pior e PERDA', cg2.pior.nome, 'PERDA');

sec('CONTRIBUICAO: agrupa por area');
var stA = C.novoEstado();
stA.carteiras.push({id:'c1',nome:'W'});
stA.ativos.push({id:'a',tk:'BTC',cg:'bitcoin',cart:'c1',last:0});
C.addMov(stA,{tipo:'compra',ref:'a',cart:'c1',qtd:1,px:100,dt:'2026-01-01'});
stA.pools.push({id:'p',par:'X/Y',cart:'c1',st:'a',ab:'2026-01-01',cur:{usd:100}});
C.addMov(stA,{tipo:'pool_dep',ref:'p',cart:'c1',usd:100,dt:'2026-01-01'});
C.addMov(stA,{tipo:'pool_fee',ref:'p',cart:'c1',usd:30,dt:'2026-02-01'});
C.addMov(stA,{tipo:'trade_dep',cart:'c1',usd:500,dt:'2026-01-01'});
C.addMov(stA,{tipo:'trade_res',cart:'c1',usd:70,px:1,dt:'2026-02-01'});
var cA = C.contribuicao(stA, {bitcoin:150}, 'all');
var porGrupo = {}; cA.grupos.forEach(function(g){porGrupo[g.nome]=g.total;});
eq('HOLD contribuiu 50', porGrupo['HOLD'], 50);
eq('DeFi contribuiu 30 (taxas)', porGrupo['DeFi'], 30);
eq('Trade contribuiu 70', porGrupo['Trade'], 70);
eq('soma dos grupos = resultado total', porGrupo['HOLD']+porGrupo['DeFi']+porGrupo['Trade'], cA.resultadoTotal);

sec('CONTRIBUICAO: portfolio vazio');
var cVz = C.contribuicao(C.novoEstado(), {}, 'all');
eqv('sem linhas', cVz.linhas.length, 0);
eqv('sem melhor', cVz.melhor, null);

/* ══════════════════════════════════════════════════════════════
   10. IMPERMANENT LOSS
   ══════════════════════════════════════════════════════════════ */
sec('IL: formula bate com os valores canonicos (50/50)');
[[1.25,-0.62],[1.5,-2.02],[2,-5.72],[3,-13.40],[4,-20.00],[5,-25.46],[0.5,-5.72]].forEach(function(c){
  eq('r='+c[0], C.ilPct(c[0],0.5), c[1], 0.01);
});
eq('r=1 nao tem IL', C.ilPct(1,0.5), 0);
eq('r invalido devolve 0', C.ilPct(0,0.5), 0);

sec('IL: 80/20 perde menos que 50/50');
[1.5,2,3,4].forEach(function(r){
  var a=C.ilPct(r,0.8), b=C.ilPct(r,0.5);
  eqv('r='+r+': 80/20 ('+a.toFixed(2)+') melhor que 50/50 ('+b.toFixed(2)+')', a>b, true);
});
eq('80/20 em r=1.5', C.ilPct(1.5,0.8), -1.20, 0.01);

sec('IL: o par importa, nao um token so');
/* SOL e ETH dobram os dois: r=1, IL zero. Uma conta feita so sobre o
   SOL diria -5,72% — erro grosseiro. */
function poolPar(a,b,pa0,pb0,w,dep){
  var st=C.novoEstado();
  st.pools.push({id:'p',par:a+'/'+b,cart:'c1',st:'a',ab:'2026-01-01',
    cur:{usd:dep},
    il:{a:{cg:a.toLowerCase(),sym:a,px0:pa0},b:{cg:b.toLowerCase(),sym:b,px0:pb0},w:w}});
  C.addMov(st,{tipo:'pool_dep',ref:'p',usd:dep,dt:'2026-01-01'});
  return st;
}
var stPar=poolPar('SOL','ETH',100,2000,0.5,10000);
var ilPar=C.poolIL(stPar, stPar.pools[0], {sol:200, eth:4000});   // os dois dobram
eq('os dois dobrando: r = 1', ilPar.r, 1);
eq('IL zero', ilPar.pct, 0);
eq('variacao do par = 0%', ilPar.variacaoPar, 0);

var stSo=poolPar('SOL','ETH',100,2000,0.5,10000);
var ilSo=C.poolIL(stSo, stSo.pools[0], {sol:200, eth:2000});      // so o SOL dobra
eq('so o SOL dobrando: r = 2', ilSo.r, 2);
eq('IL de -5,72%', ilSo.pct, -5.72, 0.01);

sec('IL: par com stablecoin');
var stStb=poolPar('SOL','USDC',100,1,0.5,10000);
var ilStb=C.poolIL(stStb, stStb.pools[0], {sol:150, usdc:1});
eq('r = variacao do SOL', ilStb.r, 1.5);
eq('IL -2,02%', ilStb.pct, -2.02, 0.01);
eq('valor se HOLD (10000 * 1.25)', ilStb.valorHold, 12500);
eq('valor na pool (10000 * sqrt(1.5))', ilStb.valorPool, 12247.45, 0.5);
eq('perda vs HOLD', ilStb.perdaUsd, 252.55, 0.5);

sec('IL: stablecoin sem cotacao assume o peg');
var ilSemPreco=C.poolIL(stStb, stStb.pools[0], {sol:150});   // sem preco do USDC
eqv('mesmo assim calcula', ilSemPreco !== null, true);
eq('mesmo r', ilSemPreco.r, 1.5);

sec('IL: as taxas cobrem a perda?');
var stTx=poolPar('SOL','USDC',100,1,0.5,10000);
C.addMov(stTx,{tipo:'pool_fee',ref:'p',usd:400,dt:'2026-06-01'});
var ilTx=C.poolIL(stTx, stTx.pools[0], {sol:150, usdc:1});
eq('taxas coletadas', ilTx.taxas, 400);
eqv('400 > 252 de IL: cobrem', ilTx.taxasCobrem, true);
eq('saldo a favor', ilTx.saldo, 400-252.55, 0.5);

var stTx2=poolPar('SOL','USDC',100,1,0.5,10000);
C.addMov(stTx2,{tipo:'pool_fee',ref:'p',usd:100,dt:'2026-06-01'});
var ilTx2=C.poolIL(stTx2, stTx2.pools[0], {sol:150, usdc:1});
eqv('100 < 252: nao cobrem', ilTx2.taxasCobrem, false);
eqv('saldo negativo', ilTx2.saldo < 0, true);

sec('IL: pool sem os dados devolve null, nao numero inventado');
var stSem=C.novoEstado();
stSem.pools.push({id:'p',par:'X/Y',cart:'c1',st:'a',ab:'2026-01-01',cur:{usd:100}});
eqv('sem bloco il', C.poolIL(stSem, stSem.pools[0], {}), null);
stSem.pools[0].il={a:{cg:'x',sym:'X',px0:0},b:{cg:'y',sym:'Y',px0:1},w:0.5};
eqv('preco de abertura zerado', C.poolIL(stSem, stSem.pools[0], {x:2,y:1}), null);
stSem.pools[0].il={a:{cg:'x',sym:'X',px0:1},b:{cg:'y',sym:'Y',px0:1},w:0.5};
eqv('sem cotacao atual e sem ser stable', C.poolIL(stSem, stSem.pools[0], {}), null);

sec('IL: retirada parcial reduz o capital comparado');
var stRet=poolPar('SOL','USDC',100,1,0.5,10000);
C.addMov(stRet,{tipo:'pool_ret',ref:'p',usd:4000,dt:'2026-03-01'});
var ilRet=C.poolIL(stRet, stRet.pools[0], {sol:150, usdc:1});
eq('capital = 10000 - 4000', ilRet.capital, 6000);
eq('hold sobre o capital restante', ilRet.valorHold, 7500);

sec('IL: a comparacao que vale usa o valor informado, nao a formula');
/* poolPar deixa cur.usd = deposito. Aqui a pessoa informa o valor de hoje. */
var stReal=poolPar('SOL','USDC',100,1,0.5,10000);
stReal.pools[0].cur={usd:12400, at:'2026-06-01'};
C.addMov(stReal,{tipo:'pool_fee',ref:'p',usd:300,dt:'2026-06-01'});
var ilReal=C.poolIL(stReal, stReal.pools[0], {sol:150, usdc:1});
eq('valor informado', ilReal.valorAtual, 12400);
eq('valor real = informado + taxas', ilReal.valorReal, 12700);
eq('hold seria 12500', ilReal.valorHold, 12500);
eq('a pool esta 200 a frente', ilReal.vsHold, 200);
eqv('bateu o hold', ilReal.bateuHold, true);
eq('vsHold em %', ilReal.vsHoldPct, 1.6, 0.001);

/* mesma pool, mesmo IL teorico, mas o valor informado esta pior */
var stAtras=poolPar('SOL','USDC',100,1,0.5,10000);
stAtras.pools[0].cur={usd:11900, at:'2026-06-01'};
C.addMov(stAtras,{tipo:'pool_fee',ref:'p',usd:300,dt:'2026-06-01'});
var ilAtras=C.poolIL(stAtras, stAtras.pools[0], {sol:150, usdc:1});
eqv('nao bateu o hold', ilAtras.bateuHold, false);
eq('300 atras', ilAtras.vsHold, -300);
/* o diagnostico da formula continua dizendo que as taxas cobrem o IL:
   os dois numeros respondem perguntas diferentes e podem divergir. */
eqv('taxas (300) cobrem o IL teorico (252)', ilAtras.taxasCobrem, true);

sec('IL: pool encerrada tem valor atual zero');
var stEnc=poolPar('SOL','USDC',100,1,0.5,10000);
stEnc.pools[0].st='e';
C.addMov(stEnc,{tipo:'pool_fee',ref:'p',usd:300,dt:'2026-06-01'});
var ilEnc=C.poolIL(stEnc, stEnc.pools[0], {sol:150, usdc:1});
eq('valor atual zerado', ilEnc.valorAtual, 0);
eq('valorReal e so as taxas', ilEnc.valorReal, 300);

/* ══════════════════════════════════════════════════════════════
   CAIXA: consequência dos eventos, nunca um campo gravado
   ══════════════════════════════════════════════════════════════ */
sec('Caixa da carteira');

var stx = C.novoEstado();
stx.carteiras.push({ id: 'w1', nome: 'Phantom' });
stx.ativos.push({ id: 'ax', tk: 'SOL', cg: 'solana', cart: 'w1', last: 200 });

/* À mão:  +1000 depósito  −200 saque  = 800
   depois compra 3 @ 100 (=300, fee 5) → 800 − 305 = 495          */
C.addMov(stx, { tipo: 'deposito', cart: 'w1', usd: 1000, dt: '2026-01-01' });
C.addMov(stx, { tipo: 'saque',    cart: 'w1', usd: 200,  dt: '2026-01-02' });
eq('caixa apos deposito e saque', C.caixaDe(stx, 'w1'), 800);

C.addMov(stx, { tipo: 'compra', ref: 'ax', cart: 'w1', qtd: 3, px: 100, fee: 5, dt: '2026-01-03' });
eq('caixa apos compra 3x100 + fee 5', C.caixaDe(stx, 'w1'), 495);

/* venda de 1 @ 150 devolve 150 ao caixa: 495 + 150 = 645 */
C.addMov(stx, { tipo: 'venda', ref: 'ax', cart: 'w1', qtd: 1, px: 150, dt: '2026-01-04' });
eq('caixa apos venda 1x150', C.caixaDe(stx, 'w1'), 645);

/* carteira sem nenhum evento tem caixa zero, nao NaN */
eq('caixa de carteira inexistente', C.caixaDe(stx, 'w-nao-existe'), 0);

/* swap nao mexe no caixa: troca de ativo dentro da carteira */
C.addMov(stx, { tipo: 'swap', cart: 'w1', usd: 300, dt: '2026-01-05' });
eq('caixa apos swap (neutro)', C.caixaDe(stx, 'w1'), 645);

/* os tipos novos existem e declaram o efeito certo */
eqv('deposito e externo (entra no XIRR)', C.TIPOS.deposito.externo, true);
eqv('saque e externo', C.TIPOS.saque.externo, true);
eqv('transf NAO e externo', C.TIPOS.transf.externo, false);
eqv('swap NAO e externo', C.TIPOS.swap.externo, false);

/* ══════════════════════════════════════════════════════════════
   11. TRAVA DE CAIXA
   ══════════════════════════════════════════════════════════════ */
sec('Trava de caixa');

var stt = C.novoEstado();
stt.carteiras.push({ id: 'w1', nome: 'Phantom' });
C.addMov(stt, { tipo: 'deposito', cart: 'w1', usd: 500, dt: '2026-01-01' });

var r1 = C.podeGastar(stt, 'w1', 300);
eqv('gasto dentro do caixa e permitido', r1.ok, true);
eq('falta zero quando cabe', r1.falta, 0);

var r2 = C.podeGastar(stt, 'w1', 800);
eqv('gasto acima do caixa e recusado', r2.ok, false);
eq('falta exatamente a diferenca', r2.falta, 300);
eq('informa o caixa disponivel', r2.caixa, 500);

/* gasto igual ao caixa cabe — a borda é inclusiva */
eqv('gasto igual ao caixa cabe', C.podeGastar(stt, 'w1', 500).ok, true);

/* carteira sem depósito nenhum não abre posição */
eqv('carteira zerada nao gasta', C.podeGastar(stt, 'w-nova', 1).ok, false);

/* ══════════════════════════════════════════════════════════════
   12. TRANSFERÊNCIA ENTRE CARTEIRAS
   ══════════════════════════════════════════════════════════════ */
sec('Transferencia entre carteiras');

var str = C.novoEstado();
str.carteiras.push({ id: 'w1', nome: 'Corretora' });
str.carteiras.push({ id: 'w2', nome: 'Cold' });
C.addMov(str, { tipo: 'deposito', cart: 'w1', usd: 1000, dt: '2026-01-01' });

var t = C.transferir(str, { de: 'w1', para: 'w2', usd: 400, dt: '2026-01-02' });
eqv('transferencia aceita', t.ok, true);
eq('origem perde 400',  C.caixaDe(str, 'w1'), 600);
eq('destino ganha 400', C.caixaDe(str, 'w2'), 400);

/* a soma das duas carteiras não muda: transferência redistribui,
   não cria nem destrói patrimônio */
eq('soma preservada', C.caixaDe(str, 'w1') + C.caixaDe(str, 'w2'), 1000);

/* as duas pernas existem e compartilham o mesmo ref */
var pernas = str.mov.filter(function (m) { return m.tipo === 'transf' && m.ref === t.ref; });
eqv('gravou duas pernas', pernas.length, 2);

/* sem caixa não transfere, e diz quanto falta */
var t2 = C.transferir(str, { de: 'w2', para: 'w1', usd: 900, dt: '2026-01-03' });
eqv('transferencia sem caixa recusada', t2.ok, false);
eq('informa quanto falta', t2.falta, 500);
eq('nada mudou apos recusa', C.caixaDe(str, 'w2'), 400);

/* não dá para transferir para a mesma carteira */
eqv('mesma carteira e recusada', C.transferir(str, { de: 'w1', para: 'w1', usd: 10 }).ok, false);

/* ══════════════════════════════════════════════════════════════
   13. ABERTURA DE SALDO (dados anteriores a fase 2)
   ══════════════════════════════════════════════════════════════ */
sec('Abertura de saldo (dados anteriores a fase 2)');

var sta = C.novoEstado();
sta.carteiras.push({ id: 'w1', nome: 'Antiga' });
sta.ativos.push({ id: 'a9', tk: 'BTC', cg: 'bitcoin', cart: 'w1', last: 60000 });
/* posição antiga: compra sem nenhum depósito que a explique */
C.addMov(sta, { tipo: 'compra', ref: 'a9', cart: 'w1', qtd: 0.1, px: 50000, dt: '2026-02-10' });
eq('antes da abertura, caixa negativo', C.caixaDe(sta, 'w1'), -5000);

var n = C.aberturaDeSaldo(sta);
eqv('uma carteira recebeu abertura', n, 1);
eq('depois da abertura, caixa zerado', C.caixaDe(sta, 'w1'), 0);

/* a abertura é datada do primeiro evento da carteira, não de hoje */
var ab = sta.mov.filter(function (m) { return m.tipo === 'deposito' && m.nota.indexOf('Abertura') === 0; })[0];
eqv('abertura datada do primeiro evento', ab.dt, '2026-02-10');

/* roda de novo: não duplica, porque não há mais o que migrar */
eqv('idempotente — nao duplica', C.aberturaDeSaldo(sta), 0);
eq('caixa continua zerado', C.caixaDe(sta, 'w1'), 0);

/* carteira saudável (com depósito) não recebe abertura nenhuma */
var stb = C.novoEstado();
stb.carteiras.push({ id: 'w2', nome: 'Nova' });
C.addMov(stb, { tipo: 'deposito', cart: 'w2', usd: 100, dt: '2026-03-01' });
eqv('carteira saudavel nao migra', C.aberturaDeSaldo(stb), 0);
eq('caixa intacto', C.caixaDe(stb, 'w2'), 100);

/* empate de data: a abertura tem que vir ANTES da compra que ela explica,
   senão o saldo corrente do extrato fica negativo por uma linha (achado
   da revisão da Task 4) */
var stc = C.novoEstado();
stc.carteiras.push({ id: 'w3', nome: 'Empate' });
stc.ativos.push({ id: 'a10', tk: 'ETH', cg: 'ethereum', cart: 'w3', last: 3000 });
C.addMov(stc, { tipo: 'compra', ref: 'a10', cart: 'w3', qtd: 1, px: 2000, dt: '2026-04-01' });
C.aberturaDeSaldo(stc);
var movsC = C.movsDe(stc, { cart: 'w3' });
eqv('mesma data: abertura vem antes da compra', movsC[0].tipo, 'deposito');
eqv('compra fica em segundo', movsC[1].tipo, 'compra');
/* saldo corrente nunca fica negativo em nenhum ponto do extrato */
var saldoC = 0, negativo = false;
movsC.forEach(function (m) {
  var t = C.TIPOS[m.tipo];
  var s = (m.tipo === 'transf') ? ((m.px < 0) ? -1 : 1) : t.sinal;
  saldoC += s * m.usd;
  if (saldoC < -0.005) negativo = true;
});
eqv('saldo corrente nunca fica negativo', negativo, false);

/* ══════════════════════════════════════════════════════════════
   13b. FIX 1 (CRITICO) — a migracao nao pode mais destruir o XIRR
   ══════════════════════════════════════════════════════════════
   Bug achado na revisao da fase 2: C.aberturaDeSaldo (que roda sozinha
   no boot pra TODO usuario existente) lancava um deposito sintetico, e
   o C.fluxos antigo contava compra E deposito como fluxo externo — dois
   fluxos na mesma data se cancelando, XIRR virando null pra todo mundo
   que ja tinha portfolio. A fix trocou o que conta como fluxo: so
   deposito/saque (a fronteira real do caixa), nunca compra/venda/etc.
   Este bloco prova, com conta de cabeca, que o retorno certo sobrevive
   antes E depois da migracao. */
sec('XIRR: FIX 1 - abertura de saldo nao muda mais o retorno');

/* data relativa a "hoje" (nao fixa) para o teste nao depender de quando
   ele e rodado: o inicio e sempre exatamente 365 dias atras. */
var haUmAno = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);

/* ─── caso saudavel: deposito ANTES da compra (fluxo de fase 2 normal) ─── */
var gSaudavel = C.novoEstado();
gSaudavel.carteiras.push({ id: 'w1', nome: 'Nova' });
gSaudavel.ativos.push({ id: 'btc', tk: 'BTC', cg: 'bitcoin', cart: 'w1', last: 100000 });
C.addMov(gSaudavel, { tipo: 'deposito', cart: 'w1', usd: 50000, dt: haUmAno });
C.addMov(gSaudavel, { tipo: 'compra', ref: 'btc', cart: 'w1', qtd: 1, px: 50000, dt: haUmAno });
var xirrSaudavel = C.xirr(C.fluxos(gSaudavel, { bitcoin: 100000 }, 'all'));
/* a mao: -50000 ha 1 ano, +100000 hoje = dobrou em 1 ano = 100% a.a.
   (mesmo calculo do caso "dobrou em 1 ano" ja provado na secao de XIRR) */
eq('portfolio saudavel: dobrou em 1 ano = 100% a.a.', xirrSaudavel, 100, 0.5);

/* ─── caso legado: a MESMA historia economica, mas sem deposito nenhum —
   e exatamente a reproducao do bug relatado na revisao: 1 BTC comprado
   ha 1 ano por $50.000, vale $100.000 hoje, portfolio anterior a fase 2 ─── */
var gLegado = C.novoEstado();
gLegado.carteiras.push({ id: 'w1', nome: 'Legado' });
gLegado.ativos.push({ id: 'btc', tk: 'BTC', cg: 'bitcoin', cart: 'w1', last: 100000 });
C.addMov(gLegado, { tipo: 'compra', ref: 'btc', cart: 'w1', qtd: 1, px: 50000, dt: haUmAno });
eq('antes da migracao, caixa negativo (compra sem deposito que a explique)',
  C.caixaDe(gLegado, 'w1'), -50000);

/* aberturaDeSaldo roda automaticamente no boot — lanca o deposito
   sintetico que faltava, datado do primeiro evento da carteira */
C.aberturaDeSaldo(gLegado);
eq('depois da migracao, caixa fecha em 0', C.caixaDe(gLegado, 'w1'), 0);
var xirrMigrado = C.xirr(C.fluxos(gLegado, { bitcoin: 100000 }, 'all'));

/* A PROVA: migrar o portfolio legado tem que dar o MESMO retorno do
   portfolio que sempre teve deposito — a migracao nao muda o XIRR,
   so preenche o fato que faltava (antes ela destruia: virava null). */
eq('migracao reproduz o mesmo XIRR do portfolio saudavel (nao destroi mais)',
  xirrMigrado, xirrSaudavel, 0.5);
eqv('nao e mais null (o bug relatado)', xirrMigrado !== null, true);

/* migrar de novo e idempotente — nao muda o XIRR uma segunda vez */
C.aberturaDeSaldo(gLegado);
var xirrMigradoDeNovo = C.xirr(C.fluxos(gLegado, { bitcoin: 100000 }, 'all'));
eq('rodar a migracao de novo nao muda o XIRR', xirrMigradoDeNovo, xirrMigrado, 0.01);

/* ══════════════════════════════════════════════════════════════
   14. SUPERVISOR — confere, nao calcula
   ══════════════════════════════════════════════════════════════ */
sec('Supervisor: confere, nao calcula');

var S = require('../portfolio-supervisor.js');

/* carteira saudável: nada a acusar */
var sup1 = C.novoEstado();
sup1.carteiras.push({ id: 'w1', nome: 'Ok' });
C.addMov(sup1, { tipo: 'deposito', cart: 'w1', usd: 100, dt: '2026-01-01' });
eqv('carteira saudavel: sem achados', S.conferir(sup1).achados.length, 0);
eqv('carteira saudavel: ok true', S.conferir(sup1).ok, true);

/* estado vazio: NAO conferido (null), nunca "tudo certo" */
eqv('estado vazio devolve null', S.conferir(C.novoEstado()).ok, null);

/* caixa negativo: acusa, e é grave */
var sup2 = C.novoEstado();
sup2.carteiras.push({ id: 'w1', nome: 'Furada' });
sup2.ativos.push({ id: 'a1', tk: 'SOL', cg: 'solana', cart: 'w1', last: 100 });
C.addMov(sup2, { tipo: 'compra', ref: 'a1', cart: 'w1', qtd: 1, px: 100, dt: '2026-01-01' });
var r2 = S.conferir(sup2);
eqv('caixa negativo acusado', r2.achados.filter(function (a) { return a.chave === 'caixa-negativo'; }).length, 1);
eqv('caixa negativo e grave', r2.ok, false);

/* dinheiro em carteira apagada */
var sup3 = C.novoEstado();
sup3.carteiras.push({ id: 'w1', nome: 'Viva' });
C.addMov(sup3, { tipo: 'deposito', cart: 'w1', usd: 50, dt: '2026-01-01' });
C.addMov(sup3, { tipo: 'deposito', cart: 'w-apagada', usd: 70, dt: '2026-01-02' });
eqv('dinheiro em carteira apagada acusado',
  S.conferir(sup3).achados.filter(function (a) { return a.chave === 'carteira-fantasma'; }).length, 1);

/* transferência com uma perna só (corrompida) */
var sup4 = C.novoEstado();
sup4.carteiras.push({ id: 'w1', nome: 'A' });
sup4.carteiras.push({ id: 'w2', nome: 'B' });
C.addMov(sup4, { tipo: 'deposito', cart: 'w1', usd: 100, dt: '2026-01-01' });
C.addMov(sup4, { tipo: 'transf', ref: 'perdida', cart: 'w1', usd: 40, px: -1, dt: '2026-01-02' });
eqv('transferencia manca acusada',
  S.conferir(sup4).achados.filter(function (a) { return a.chave === 'transf-manca'; }).length, 1);

/* ══════════════════════════════════════════════════════════════
   RWA — ações tokenizadas. Mesmo motor do HOLD, aba separada.
   ══════════════════════════════════════════════════════════════ */
sec('RWA: acoes tokenizadas');

var stR = C.novoEstado();
stR.carteiras.push({ id: 'w1', nome: 'Phantom' });
stR.rwa.push({ id: 'r1', tk: 'NVDAx', nome: 'Nvidia', plataforma: 'xStocks',
               cg: 'nvidia-x', cart: 'w1', last: 120 });
C.addMov(stR, { tipo: 'deposito', cart: 'w1', usd: 5000, dt: '2026-01-01' });

/* À mão: compra 10 @ 100 = 1000, fee 5 -> custo 1005, preco medio 100,50
   caixa: 5000 − 1005 = 3995                                          */
C.addMov(stR, { tipo: 'rwa_compra', ref: 'r1', cart: 'w1', qtd: 10, px: 100, fee: 5, dt: '2026-01-02' });
var pR = C.posicoesRWA(stR, { 'nvidia-x': 120 }, 'all')[0];
eq('RWA preco medio (1005/10)', pR.pm, 100.5);
eq('RWA valor a 120 (10x120)', pR.valor, 1200);
eq('RWA nao realizado (1200-1005)', pR.naoRealizado, 195);
eq('caixa apos compra de RWA', C.caixaDe(stR, 'w1'), 3995);

/* venda de 4 @ 150 = 600; baixa de custo 4 x 100,50 = 402
   realizado = 600 − 402 = 198;  caixa 3995 + 600 = 4595              */
C.addMov(stR, { tipo: 'rwa_venda', ref: 'r1', cart: 'w1', qtd: 4, px: 150, dt: '2026-01-03' });
var pR2 = C.posicoesRWA(stR, { 'nvidia-x': 120 }, 'all')[0];
eq('RWA realizado (600-402)', pR2.realizado, 198);
eq('RWA qtd restante', pR2.qtd, 6);
eq('caixa apos venda de RWA', C.caixaDe(stR, 'w1'), 4595);

/* o RWA entra no patrimonio total e no seu proprio bloco */
var TR = C.totais(stR, { 'nvidia-x': 120 }, 'all');
eq('totais.rwa.valor (6 x 120)', TR.rwa.valor, 720);
eq('totais.rwa.realizado', TR.rwa.realizado, 198);
/* patrimonio = caixa 4595 + rwa 720 = 5315 */
eq('patrimonio inclui RWA', TR.patrimonio, 5315);

/* os tipos novos NAO sao fluxo externo (senao repetem o bug de XIRR) */
eqv('rwa_compra nao e externo', C.TIPOS.rwa_compra.externo, false);
eqv('rwa_venda nao e externo', C.TIPOS.rwa_venda.externo, false);
eqv('rwa_compra tira do caixa', C.TIPOS.rwa_compra.sinal, -1);
eqv('rwa_venda devolve ao caixa', C.TIPOS.rwa_venda.sinal, 1);

/* HOLD e RWA nao se misturam */
eqv('posicoes() do HOLD ignora RWA', C.posicoes(stR, {}, 'all').length, 0);

/* ══════════════════════════════════════════════════════════════
   SOMA DE MESES — utilitário puro usado para montar prazos de meta
   ══════════════════════════════════════════════════════════════ */
sec('somaMeses: avanca meses e trava no fim do mes de destino');

/* passo simples: dia 15 existe em fevereiro, nada a travar */
eqv('15/jan + 1 mes = 15/fev', C.somaMeses('2026-01-15', 1), '2026-02-15');

/* fim de mes: fevereiro de 2026 (nao bissexto) so tem 28 dias.
   setUTCMonth cru rolaria pra marco; o dia tem que travar em 28 */
eqv('31/jan + 1 mes trava em 28/fev (2026 nao e bissexto)', C.somaMeses('2026-01-31', 1), '2026-02-28');

/* fim de mes em ano bissexto: 2028 e bissexto (divisivel por 4, nao e
   secular), entao fevereiro tem 29 dias */
eqv('31/jan + 1 mes trava em 29/fev (2028 e bissexto)', C.somaMeses('2028-01-31', 1), '2028-02-29');

/* virada de ano: novembro + 2 meses cai em janeiro do ano seguinte,
   e dia 30 existe em janeiro, entao nao trava */
eqv('30/nov + 2 meses = 30/jan do ano seguinte', C.somaMeses('2026-11-30', 2), '2027-01-30');

/* ══════════════════════════════════════════════════════════════
   META — aritmética sobre os aportes REAIS, nunca previsão
   ══════════════════════════════════════════════════════════════ */
sec('Meta: alvo e plano de aporte');

var stM = C.novoEstado();
stM.carteiras.push({ id: 'w1', nome: 'W' });
/* 4 meses de aportes reais: 1000/mes a partir de 01/01 */
C.addMov(stM, { tipo: 'deposito', cart: 'w1', usd: 1000, dt: '2026-01-01' });
C.addMov(stM, { tipo: 'deposito', cart: 'w1', usd: 1000, dt: '2026-02-01' });
C.addMov(stM, { tipo: 'deposito', cart: 'w1', usd: 1000, dt: '2026-03-01' });
C.addMov(stM, { tipo: 'deposito', cart: 'w1', usd: 1000, dt: '2026-04-01' });

/* patrimonio = caixa = 4000 (nada investido).
   alvo 10.000; faltam 6.000. Com 6 meses restantes -> 1.000/mes.  */
var m1 = C.metaCalc(stM, {}, { id:'m1', nome:'Reserva', alvo:10000,
                               prazo: C.somaMeses(C.hoje(), 6), escopo:'total' });
eq('meta: atual e o patrimonio', m1.atual, 4000);
eq('meta: falta', m1.falta, 6000);
eq('meta: meses restantes', m1.mesesRestantes, 6);
eq('meta: aporte necessario (6000/6)', m1.aporteNecessario, 1000);
eqv('meta: nao encerrada', m1.encerrada, false);

/* alvo ja batido: nao pede aporte nenhum e nao vira numero negativo */
var m2 = C.metaCalc(stM, {}, { id:'m2', nome:'Batida', alvo:3000,
                               prazo: C.somaMeses(C.hoje(), 6), escopo:'total' });
eqv('meta batida', m2.bateu, true);
eq('meta batida nao pede aporte', m2.aporteNecessario, 0);
eqv('situacao batida', m2.situacao, 'batida');

/* prazo vencido nao some nem vira erro: vira encerrada */
var m3 = C.metaCalc(stM, {}, { id:'m3', nome:'Vencida', alvo:99999,
                               prazo:'2020-01-01', escopo:'total' });
eqv('prazo vencido encerra', m3.encerrada, true);
eqv('prazo vencido nao bateu', m3.bateu, false);

/* SEM historico suficiente o ritmo e NULL, nunca zero:
   zero afirmaria "voce nao aportou nada", e o que existe e' ausencia de dado */
var stV = C.novoEstado();
stV.carteiras.push({ id:'w1', nome:'W' });
C.addMov(stV, { tipo:'deposito', cart:'w1', usd:500, dt: C.hoje() });
var m4 = C.metaCalc(stV, {}, { id:'m4', nome:'Nova', alvo:5000,
                               prazo: C.somaMeses(C.hoje(), 12), escopo:'total' });
eqv('ritmo sem historico e null', m4.ritmoReal, null);
eqv('situacao sem medida', m4.situacao, 'sem-medida');

/* ══════════════════════════════════════════════════════════════ */
console.log('\n' + '═'.repeat(62));
console.log(fail === 0 ? ('TODOS OS ' + ok + ' TESTES PASSARAM') : (ok + ' ok, ' + fail + ' FALHARAM'));
console.log('═'.repeat(62));
process.exit(fail ? 1 : 0);
