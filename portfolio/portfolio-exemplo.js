(function (root) {
  'use strict';

  var E = {};

  function m(n) {
    var d = new Date();
    d.setMonth(d.getMonth() - n);
    return d.toISOString().slice(0, 10);
  }

  E.aplicar = function (st, C) {
    var c1 = { id: C.uid(), nome: 'Phantom (exemplo)' };
    var c2 = { id: C.uid(), nome: 'MetaMask (exemplo)' };
    st.carteiras.push(c1, c2);

    var btc = { id: C.uid(), tk: 'BTC', cg: 'bitcoin', cart: c2.id, last: 61000 };
    var eth = { id: C.uid(), tk: 'ETH', cg: 'ethereum', cart: c2.id, last: 1700 };
    var sol = { id: C.uid(), tk: 'SOL', cg: 'solana', cart: c1.id, last: 80 };
    st.ativos.push(btc, eth, sol);

    C.addMov(st, { tipo: 'compra', ref: btc.id, cart: c2.id, qtd: 0.08, px: 44500, fee: 12, dt: m(9) });
    C.addMov(st, { tipo: 'compra', ref: btc.id, cart: c2.id, qtd: 0.04, px: 56800, fee: 9, dt: m(3) });
    C.addMov(st, { tipo: 'compra', ref: eth.id, cart: c2.id, qtd: 1.5, px: 2350, fee: 7, dt: m(8) });
    C.addMov(st, { tipo: 'compra', ref: sol.id, cart: c1.id, qtd: 60, px: 68, fee: 5, dt: m(10) });
    C.addMov(st, { tipo: 'venda', ref: sol.id, cart: c1.id, qtd: 15, px: 112, fee: 4, dt: m(2) });

    var p1 = { id: C.uid(), par: 'SOL/USDC', proto: 'Orca', chain: 'Solana', cart: c1.id, st: 'e', ab: m(10), en: m(7),
      cur: { usd: 0, tok: '', at: m(7) }, di: { obj: 'Renda em dólar com par líquido' }, notas: [], reb: [] };
    var p2 = { id: C.uid(), par: 'SOL/USDC', proto: 'Orca', chain: 'Solana', cart: c1.id, st: 'a', ab: m(2), en: null,
      cur: { usd: 3120, tok: '21,4 SOL + 1.310 USDC', at: C.hoje() }, di: { obj: 'Range médio' }, notas: [], reb: [],
      il: { a: { cg: 'solana', sym: 'SOL', px0: 112 }, b: { cg: 'usd-coin', sym: 'USDC', px0: 1 }, w: 0.5 } };
    st.pools.push(p1, p2);
    C.addMov(st, { tipo: 'pool_dep', ref: p1.id, cart: c1.id, usd: 2000, dt: m(10) });
    C.addMov(st, { tipo: 'pool_fee', ref: p1.id, cart: c1.id, usd: 133, dt: m(8) });
    C.addMov(st, { tipo: 'pool_ret', ref: p1.id, cart: c1.id, usd: 2245, dt: m(7) });
    C.addMov(st, { tipo: 'pool_dep', ref: p2.id, cart: c1.id, usd: 3000, dt: m(2) });
    C.addMov(st, { tipo: 'pool_fee', ref: p2.id, cart: c1.id, usd: 96, dt: m(1) });

    var l1 = { id: C.uid(), plat: 'Kamino', chain: 'Solana', tipo: 's', tk: 'USDC', cart: c1.id, apy: 8.4, st: 'a', ab: m(4) };
    st.lend.push(l1);
    C.addMov(st, { tipo: 'lend_sup', ref: l1.id, cart: c1.id, usd: 1500, dt: m(4) });
    C.addMov(st, { tipo: 'lend_juros', ref: l1.id, cart: c1.id, usd: 42, dt: m(1) });

    C.addMov(st, { tipo: 'trade_dep', cart: c1.id, usd: 1000, dt: m(3) });
    [['BTC', 'L', 5, 120, m(2)], ['SOL', 'S', 3, -45, m(2)], ['ETH', 'L', 5, 105, m(1)]].forEach(function (t) {
      st.trades.push({ id: C.uid(), dt: t[4], ativo: t[0], dir: t[1], alav: t[2], res: t[3], txt: 'Operação de exemplo', cart: c1.id });
      C.addMov(st, { tipo: 'trade_res', cart: c1.id, usd: Math.abs(t[3]), px: t[3] >= 0 ? 1 : -1, dt: t[4], nota: t[0] });
    });

    var nvdax = { id: C.uid(), tk: 'NVDAx', nome: 'Nvidia', plataforma: 'xStocks',
      cg: 'nvidia-x', cart: c2.id, last: 132, lastAt: null };
    (st.rwa = st.rwa || []).push(nvdax);
    C.addMov(st, { tipo: 'deposito', cart: c2.id, usd: 1300, dt: m(6), nota: 'Aporte para RWA de exemplo' });
    C.addMov(st, { tipo: 'rwa_compra', ref: nvdax.id, cart: c2.id, qtd: 10, px: 118, fee: 6, dt: m(5) });

    st.metas = st.metas || [];
    st.metas.push(
      { id: C.uid(), nome: 'Patrimônio em US$ 35 mil', tipo: 'patrimonio', ativoTk: '',
        medida: 'valor', alvo: 35000, moeda: 'usd',
        prazo: C.somaMeses(C.hoje(), 10), escopo: 'total', criadaEm: C.hoje() },
      { id: C.uid(), nome: '1 BTC inteiro', tipo: 'ativo', ativoTk: 'BTC',
        medida: 'qtd', alvo: 1, moeda: 'usd',
        prazo: C.somaMeses(C.hoje(), 14), escopo: 'total', criadaEm: C.hoje() },
      { id: C.uid(), nome: 'R$ 150 mil em cripto', tipo: 'patrimonio', ativoTk: '',
        medida: 'valor', alvo: 150000, moeda: 'brl',
        prazo: C.somaMeses(C.hoje(), 12), escopo: 'total', criadaEm: C.hoje() }
    );
  };

  E.montar = function (C) {
    var st = C.novoEstado();
    E.aplicar(st, C);
    C.aberturaDeSaldo(st);
    return st;
  };

  if (typeof module === 'object' && module.exports) module.exports = E;
  else root.PExemplo = E;

})(typeof self !== 'undefined' ? self : this);
