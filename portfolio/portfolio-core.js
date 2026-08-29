/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  MUNDODEFI · PORTFÓLIO — NÚCLEO DE CÁLCULO (portfolio-core.js)        ║
   ║                                                                      ║
   ║  Funções PURAS. Zero DOM, zero fetch, zero localStorage.             ║
   ║  Isso é de propósito: dá para rodar tudo aqui no Node e provar que   ║
   ║  a matemática está certa antes de qualquer pixel aparecer na tela.   ║
   ║                                                                      ║
   ║  ── O MODELO ────────────────────────────────────────────────────    ║
   ║  Toda movimentação de valor é um EVENTO datado no ledger `mov`.      ║
   ║  Posição, custo médio, lucro e patrimônio são DERIVADOS do ledger —  ║
   ║  nunca guardados. Guardar saldo é como o v1 perdia o lucro           ║
   ║  realizado: a venda mexia na quantidade e o ganho evaporava.         ║
   ║                                                                      ║
   ║  As entidades (`ativos`, `pools`, `lend`) guardam só metadado        ║
   ║  descritivo: ticker, nome da pool, diário. Nenhum número de saldo.   ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
(function (root) {
  'use strict';

  var C = {};
  C.VER = 2;

  /* ═══════════════════ TIPOS DE EVENTO ═══════════════════
     Cada tipo declara como afeta o dinheiro. `sinal` é do ponto de vista
     do SEU BOLSO: -1 = saiu capital para a posição, +1 = voltou capital.
     `externo` marca os eventos que contam como fluxo de caixa do
     portfólio (base do XIRR). Movimento interno não é fluxo externo. */
  C.TIPOS = {
    compra:      { grupo:'hold',  sinal:-1, externo:true,  lbl:'Compra' },
    venda:       { grupo:'hold',  sinal:+1, externo:true,  lbl:'Venda' },
    pool_dep:    { grupo:'defi',  sinal:-1, externo:true,  lbl:'Depósito em pool' },
    pool_ret:    { grupo:'defi',  sinal:+1, externo:true,  lbl:'Retirada de pool' },
    pool_fee:    { grupo:'defi',  sinal:+1, externo:false, lbl:'Taxas coletadas' },
    lend_sup:    { grupo:'defi',  sinal:-1, externo:true,  lbl:'Depósito em lending' },
    lend_ret:    { grupo:'defi',  sinal:+1, externo:true,  lbl:'Retirada de lending' },
    lend_juros:  { grupo:'defi',  sinal:+1, externo:false, lbl:'Juros de lending' },
    trade_dep:   { grupo:'trade', sinal:-1, externo:true,  lbl:'Aporte na banca' },
    trade_saq:   { grupo:'trade', sinal:+1, externo:true,  lbl:'Saque da banca' },
    trade_res:   { grupo:'trade', sinal: 0, externo:false, lbl:'Resultado de trade' },
    deposito:    { grupo:'caixa', sinal:+1, externo:true,  lbl:'Depósito' },
    saque:       { grupo:'caixa', sinal:-1, externo:true,  lbl:'Saque' },
    transf:      { grupo:'caixa', sinal: 0, externo:false, lbl:'Transferência' },
    swap:        { grupo:'caixa', sinal: 0, externo:false, lbl:'Troca de ativo' }
  };

  /* ═══════════════════ UTILITÁRIOS ═══════════════════ */
  C.uid = function () { return 'x' + Math.random().toString(36).slice(2, 9); };
  C.hoje = function () { return new Date().toISOString().slice(0, 10); };
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function dias(a, b) { return (Date.parse(b) - Date.parse(a)) / 864e5; }
  C.num = num;
  C.dias = dias;

  /* ordena por data e, em empate, por ordem de inserção — determinístico */
  function cronologico(movs) {
    return movs.slice().sort(function (a, b) {
      var d = String(a.dt || '').localeCompare(String(b.dt || ''));
      return d !== 0 ? d : num(a.seq) - num(b.seq);
    });
  }
  C.cronologico = cronologico;

  /* ═══════════════════ ESTADO ═══════════════════ */
  C.novoEstado = function () {
    return {
      ver: C.VER,
      cfg: { moeda: 'usd', cart: 'all' },
      carteiras: [],
      ativos: [],
      pools: [],
      lend: [],
      trades: [],
      mov: [],
      snaps: []
    };
  };

  /* Registra um evento no ledger. `seq` garante ordem estável quando
     várias movimentações caem no mesmo dia. */
  C.addMov = function (st, mov) {
    var m = {
      id: mov.id || C.uid(),
      seq: st.mov.length,
      dt: mov.dt || C.hoje(),
      tipo: mov.tipo,
      cart: mov.cart || null,
      ref: mov.ref || null,
      usd: Math.abs(num(mov.usd)),
      qtd: mov.qtd == null ? null : Math.abs(num(mov.qtd)),
      px: mov.px == null ? null : num(mov.px),
      fee: Math.abs(num(mov.fee)),
      fx: mov.fx == null ? null : num(mov.fx),
      nota: mov.nota || ''
    };
    if (!C.TIPOS[m.tipo]) throw new Error('tipo de movimentação desconhecido: ' + m.tipo);
    /* Compra e venda são lançadas por quantidade × preço. Normalizamos o
       valor em dólar aqui para que `usd` signifique a mesma coisa em TODO
       evento do ledger — sem isso o fluxo de caixa de uma compra sai zerado. */
    if ((m.tipo === 'compra' || m.tipo === 'venda') && !m.usd && m.qtd != null && m.px != null) {
      m.usd = Math.abs(m.qtd * m.px);
    }
    st.mov.push(m);
    return m;
  };

  C.movsDe = function (st, filtro) {
    filtro = filtro || {};
    return cronologico(st.mov.filter(function (m) {
      if (filtro.tipo && m.tipo !== filtro.tipo) return false;
      if (filtro.ref && m.ref !== filtro.ref) return false;
      if (filtro.grupo && (C.TIPOS[m.tipo] || {}).grupo !== filtro.grupo) return false;
      if (filtro.cart && filtro.cart !== 'all' && m.cart !== filtro.cart) return false;
      return true;
    }));
  };

  /* CAIXA = soma do livro daquela carteira. Nunca um campo gravado: um
     saldo guardado pode divergir do extrato que o produziu, e é justamente
     essa divergência que esta fase existe para tornar impossível.
     O `sinal` de C.TIPOS já é o efeito no caixa: −1 saiu capital para a
     posição, +1 voltou. Fee sai do caixa junto com a compra. */
  C.caixaDe = function (st, cartId) {
    var total = 0;
    (st.mov || []).forEach(function (m) {
      if (m.cart !== cartId) return;
      var t = C.TIPOS[m.tipo];
      if (!t) return;
      /* transf carrega o sinal na perna (px), não no tipo */
      var s = (m.tipo === 'transf') ? (num(m.px) < 0 ? -1 : +1) : t.sinal;
      total += s * num(m.usd);
      /* a taxa sempre sai do bolso, em qualquer direção da operação */
      if (m.tipo === 'compra') total -= num(m.fee);
      else if (m.tipo === 'venda') total -= num(m.fee);
    });
    return total;
  };

  /* A trava vive AQUI, na camada de dados, e não na tela: assim vale para
     importação, restauração de backup e qualquer tela futura. A tela também
     checa, mas só para poder dizer QUANTO falta. */
  C.podeGastar = function (st, cartId, usd) {
    var caixa = C.caixaDe(st, cartId);
    var v = Math.abs(num(usd));
    var falta = v - caixa;
    return { ok: falta <= 0, caixa: caixa, falta: falta > 0 ? falta : 0 };
  };

  /* Transferência é UM evento com DUAS pernas unidas pelo mesmo `ref`.
     Nunca duas movimentações soltas: se uma perna sumir, o supervisor
     acusa, e apagar a transferência apaga as duas. O sinal de cada perna
     vai em `px` (−1 origem, +1 destino), como `trade_res` já faz. */
  C.transferir = function (st, o) {
    o = o || {};
    var usd = Math.abs(num(o.usd));
    if (!o.de || !o.para || o.de === o.para || !usd) {
      return { ok: false, ref: null, falta: 0 };
    }
    var pode = C.podeGastar(st, o.de, usd);
    if (!pode.ok) return { ok: false, ref: null, falta: pode.falta };

    var ref = C.uid();
    var dt = o.dt || C.hoje();
    C.addMov(st, { tipo: 'transf', ref: ref, cart: o.de,   usd: usd, px: -1, dt: dt, nota: o.nota || '' });
    C.addMov(st, { tipo: 'transf', ref: ref, cart: o.para, usd: usd, px: +1, dt: dt, nota: o.nota || '' });
    return { ok: true, ref: ref, falta: 0 };
  };

  /* Portfólio anterior à fase 2 tem posições sem evento de caixa que as
     explique — o caixa daria negativo e o supervisor acusaria um erro que
     é da migração, não do usuário. A abertura de saldo é a resposta, e ela
     SOME SOZINHA quando não há o que migrar (carteira com caixa >= 0). */
  C.aberturaDeSaldo = function (st) {
    var n = 0;
    (st.carteiras || []).forEach(function (c) {
      var caixa = C.caixaDe(st, c.id);
      if (caixa >= 0) return;
      var movs = C.movsDe(st, { cart: c.id });
      var dt = movs.length ? movs[0].dt : C.hoje();
      var m = C.addMov(st, {
        tipo: 'deposito', cart: c.id, usd: Math.abs(caixa), dt: dt,
        nota: 'Abertura de saldo — posições registradas antes do controle de caixa'
      });
      /* Quando a data da abertura EMPATA com a primeira movimentação da
         carteira (o caso comum: ela é datada dessa mesma movimentação),
         addMov deu a ela o `seq` mais alto de todos — e o sort cronológico
         desempata por seq, então a posição apareceria ANTES do depósito
         no extrato, com o saldo corrente negativo por uma linha. Um seq
         negativo garante que a abertura sempre vem primeiro no empate. */
      m.seq = -1 - n;
      n++;
    });
    return n;
  };

  /* ═══════════════════ HOLD — CUSTO MÉDIO PONDERADO ═══════════════════
     Método de custo médio (o mesmo que a Receita usa no Brasil).
     A venda NÃO altera o custo médio; ela baixa custo proporcional
     à quantidade vendida e materializa o ganho.

       custoMédio = custoTotal / qtd
       baixa      = custoMédio × qtdVendida
       receita    = qtdVendida × preço − taxa
       realizado += receita − baixa

     Taxas entram no custo na compra e reduzem a receita na venda, que é
     como o custo de aquisição/alienação realmente funciona. */
  C.posicao = function (st, ativoId, precoAtual) {
    var movs = C.movsDe(st, { ref: ativoId });
    var qtd = 0, custoTotal = 0, realizado = 0, taxasPagas = 0;
    var compras = 0, vendas = 0, alertas = [];

    movs.forEach(function (m) {
      if (m.tipo === 'compra') {
        qtd += m.qtd;
        custoTotal += m.qtd * m.px + m.fee;
        taxasPagas += m.fee;
        compras++;
      } else if (m.tipo === 'venda') {
        var q = m.qtd;
        if (q > qtd + 1e-12) {
          alertas.push({
            dt: m.dt,
            txt: 'Venda de ' + q + ' com apenas ' + qtd.toFixed(8).replace(/0+$/, '') + ' em carteira. Registrada só a parte disponível.'
          });
          q = qtd;
        }
        if (q <= 0) return;
        var custoMedio = qtd > 0 ? custoTotal / qtd : 0;
        var baixa = custoMedio * q;
        var receita = q * m.px - m.fee;
        realizado += receita - baixa;
        taxasPagas += m.fee;
        qtd -= q;
        custoTotal -= baixa;
        vendas++;
      }
    });

    if (qtd < 1e-12) { qtd = 0; custoTotal = 0; }
    var px = num(precoAtual);
    var valor = qtd * px;
    return {
      id: ativoId,
      qtd: qtd,
      custoTotal: custoTotal,
      custoMedio: qtd > 0 ? custoTotal / qtd : 0,
      precoAtual: px,
      valor: valor,
      naoRealizado: qtd > 0 ? valor - custoTotal : 0,
      naoRealizadoPct: custoTotal > 0 ? (valor - custoTotal) / custoTotal * 100 : 0,
      realizado: realizado,
      taxasPagas: taxasPagas,
      nTx: compras + vendas,
      encerrada: qtd === 0 && (compras + vendas) > 0,
      alertas: alertas
    };
  };

  /* Todas as posições. Inclui as ENCERRADAS — o v1 as escondia com
     `if(qty<=0) return ''` e junto sumia todo o lucro realizado delas. */
  C.posicoes = function (st, precos, cart) {
    precos = precos || {};
    return st.ativos
      .filter(function (a) { return !cart || cart === 'all' || a.cart === cart; })
      .map(function (a) {
        var p = C.posicao(st, a.id, precos[a.cg] != null ? precos[a.cg] : a.last);
        p.tk = a.tk; p.cg = a.cg; p.cart = a.cart; p.lastAt = a.lastAt || null;
        return p;
      })
      .filter(function (p) { return p.nTx > 0; });
  };

  /* ═══════════════════ POOLS ═══════════════════
     resultado = (valor atual, se aberta) + retiradas + taxas − depósitos

     O v1 parava aqui. Número absoluto sozinho não diz se a pool presta:
     $200 em 3 meses sobre $3.000 é ótimo; sobre $300.000 é péssimo.
     Por isso calculamos também percentual e APR realizado — e o APR usa
     SÓ as taxas, que é a renda que a pool de fato gera; valorização do
     par é outro fenômeno e misturar os dois engana. */
  C.poolResultado = function (st, pool, ate) {
    var movs = C.movsDe(st, { ref: pool.id });
    var dep = 0, ret = 0, fees = 0;
    movs.forEach(function (m) {
      if (m.tipo === 'pool_dep') dep += m.usd;
      else if (m.tipo === 'pool_ret') ret += m.usd;
      else if (m.tipo === 'pool_fee') fees += m.usd;
    });
    var aberta = pool.st === 'a';
    var atual = aberta ? num(pool.cur && pool.cur.usd) : 0;
    var resultado = atual + ret + fees - dep;
    var fim = pool.en || ate || C.hoje();
    var d = Math.max(1, dias(pool.ab, fim));
    return {
      id: pool.id,
      dep: dep, ret: ret, fees: fees, atual: atual,
      resultado: resultado,
      resultadoPct: dep > 0 ? resultado / dep * 100 : 0,
      /* APR realizado só das taxas, anualizado */
      aprFees: dep > 0 ? (fees / dep) * (365 / d) * 100 : 0,
      dias: Math.round(d),
      aberta: aberta,
      /* quão velho é o "valor atual" que a pessoa digitou */
      valorDesatualizado: aberta && pool.cur && pool.cur.at
        ? Math.round(dias(pool.cur.at, C.hoje()))
        : null
    };
  };

  /* ═══════════════════ LENDING ═══════════════════
     No v1 o APY era decorativo e não havia como encerrar posição.
     Aqui supply é positivo, borrow é passivo (negativo), e os juros
     só entram se forem lançados como evento — nada de renda imaginária. */
  C.lendResultado = function (st, l) {
    var movs = C.movsDe(st, { ref: l.id });
    var sup = 0, ret = 0, juros = 0;
    movs.forEach(function (m) {
      if (m.tipo === 'lend_sup') sup += m.usd;
      else if (m.tipo === 'lend_ret') ret += m.usd;
      else if (m.tipo === 'lend_juros') juros += m.usd;
    });
    var aberta = l.st === 'a';
    var emprestimo = l.tipo === 'b';
    /* Juros de lending COMPÕEM no saldo — é assim que Aave e Kamino
       funcionam: o rendimento vai para a sua posição, não para fora dela.
       Sem isso o juro entrava no resultado mas sumia do patrimônio, e o
       total deixava de fechar. Numa dívida, o juro aumenta o que você deve. */
    var principal = Math.max(0, sup + juros - ret);
    return {
      id: l.id,
      principal: principal,
      capital: Math.max(0, sup - ret),   /* o que você pôs, sem o rendimento */
      juros: juros,
      aberta: aberta,
      /* borrow entra como PASSIVO no patrimônio */
      valor: aberta ? (emprestimo ? -principal : principal) : 0,
      emprestimo: emprestimo,
      resultado: emprestimo ? -juros : juros
    };
  };

  /* ═══════════════════ TRADE ═══════════════════
     A banca deixa de ser um campo editável à mão (que fazia aporte virar
     "lucro") e passa a ser derivada:  banca = depósitos − saques + Σ resultados

     Win rate sozinho é métrica de vaidade: dá para acertar 90% e perder
     dinheiro. Por isso saem também profit factor, expectativa e drawdown. */
  C.tradeResumo = function (st, cart) {
    var movs = C.movsDe(st, { grupo: 'trade', cart: cart });
    var dep = 0, saq = 0, res = 0;
    var ganhos = [], perdas = [], curva = [], saldo = 0, pico = 0, ddMax = 0;

    movs.forEach(function (m) {
      if (m.tipo === 'trade_dep') { dep += m.usd; saldo += m.usd; }
      else if (m.tipo === 'trade_saq') { saq += m.usd; saldo -= m.usd; }
      else if (m.tipo === 'trade_res') {
        /* resultado guarda o sinal em px (+1 ganho / -1 perda) porque
           `usd` é sempre positivo por contrato do ledger */
        var r = m.usd * (m.px < 0 ? -1 : 1);
        res += r; saldo += r;
        if (r >= 0) ganhos.push(r); else perdas.push(Math.abs(r));
      }
      curva.push({ dt: m.dt, v: saldo });
      if (saldo > pico) pico = saldo;
      if (pico > 0) ddMax = Math.max(ddMax, (pico - saldo) / pico * 100);
    });

    var n = ganhos.length + perdas.length;
    var somaG = ganhos.reduce(function (s, x) { return s + x; }, 0);
    var somaP = perdas.reduce(function (s, x) { return s + x; }, 0);
    var mediaG = ganhos.length ? somaG / ganhos.length : 0;
    var mediaP = perdas.length ? somaP / perdas.length : 0;
    var winRate = n ? ganhos.length / n : 0;

    return {
      banca: saldo,
      depositos: dep,
      saques: saq,
      resultado: res,
      /* rentabilidade sobre o capital REALMENTE aportado — não sobre
         "banca inicial", que o v1 deixava o usuário editar */
      rentabilidade: dep > 0 ? res / dep * 100 : 0,
      n: n,
      vitorias: ganhos.length,
      derrotas: perdas.length,
      winRate: winRate * 100,
      mediaGanho: mediaG,
      mediaPerda: mediaP,
      /* > 1 = sistema ganhador. Infinity quando ainda não houve perda. */
      profitFactor: somaP > 0 ? somaG / somaP : (somaG > 0 ? Infinity : 0),
      /* quanto se espera ganhar por operação, no longo prazo */
      expectativa: n ? (winRate * mediaG) - ((1 - winRate) * mediaP) : 0,
      payoff: mediaP > 0 ? mediaG / mediaP : 0,
      maiorGanho: ganhos.length ? Math.max.apply(null, ganhos) : 0,
      maiorPerda: perdas.length ? Math.max.apply(null, perdas) : 0,
      drawdownMax: ddMax,
      curva: curva
    };
  };

  /* ═══════════════════ CONSOLIDADO ═══════════════════
     A diferença central para o v1:

       v1:  invest = pat − lucro            (identidade inválida)
       v2:  investido = custo das posições ABERTAS
            naoRealizado = patrimônio − investido   (agora é válido:
                           os dois lados falam só do que está aberto)
            realizado    = ganhos já materializados, contados à parte

     Taxas de pool e juros de lending JÁ estão dentro de `realizado`.
     São devolvidas separadas só para exibição — nunca some as duas
     coisas na tela, foi assim que o v1 contava taxa duas vezes. */
  C.totais = function (st, precos, cart) {
    var pos = C.posicoes(st, precos, cart);
    var holdValor = 0, holdCusto = 0, holdNaoReal = 0, holdReal = 0;
    pos.forEach(function (p) {
      holdValor += p.valor;
      holdCusto += p.custoTotal;
      holdNaoReal += p.naoRealizado;
      holdReal += p.realizado;
    });

    var poolValor = 0, poolCusto = 0, poolReal = 0, poolNaoReal = 0, taxas = 0;
    st.pools.filter(function (p) { return !cart || cart === 'all' || p.cart === cart; })
      .forEach(function (p) {
        var r = C.poolResultado(st, p);
        taxas += r.fees;
        if (r.aberta) {
          poolValor += r.atual;
          poolCusto += Math.max(0, r.dep - r.ret);
          poolNaoReal += r.atual - Math.max(0, r.dep - r.ret);
          poolReal += r.fees;                 /* taxa coletada é ganho realizado */
        } else {
          poolReal += r.resultado;            /* pool fechada: resultado inteiro */
        }
      });

    var lendValor = 0, lendCusto = 0, lendReal = 0;
    st.lend.filter(function (l) { return !cart || cart === 'all' || l.cart === cart; })
      .forEach(function (l) {
        var r = C.lendResultado(st, l);
        lendValor += r.valor;
        if (r.aberta && !r.emprestimo) lendCusto += r.capital;
        lendReal += r.resultado;
      });

    var tr = C.tradeResumo(st, cart);

    var patrimonio = holdValor + poolValor + lendValor + tr.banca;
    var investido = holdCusto + poolCusto + lendCusto + Math.max(0, tr.depositos - tr.saques);
    var naoRealizado = holdNaoReal + poolNaoReal;
    var realizado = holdReal + poolReal + lendReal + tr.resultado;

    return {
      patrimonio: patrimonio,
      investido: investido,
      naoRealizado: naoRealizado,
      realizado: realizado,
      resultadoTotal: naoRealizado + realizado,
      /* rentabilidade das posições ABERTAS sobre o que custaram */
      rentAberta: investido > 0 ? naoRealizado / investido * 100 : 0,

      hold:  { valor: holdValor, custo: holdCusto, naoRealizado: holdNaoReal, realizado: holdReal },
      defi:  { valor: poolValor + lendValor, custo: poolCusto + lendCusto,
               naoRealizado: poolNaoReal, realizado: poolReal + lendReal, taxas: taxas },
      trade: { valor: tr.banca, custo: Math.max(0, tr.depositos - tr.saques), realizado: tr.resultado },

      /* já dentro de `realizado` — exibir sempre como detalhe, nunca somado */
      taxasDeFi: taxas,
      vazio: patrimonio === 0 && realizado === 0 && st.mov.length === 0
    };
  };



  /* ═══════════════════ IMPERMANENT LOSS ═══════════════════
     Mesma fórmula da calculadora de pool, agora aplicada à pool que a
     pessoa realmente tem. Vale para qualquer proporção de pesos:

         IL = r^w1 / (w1·r + w2) − 1

     `r` é o desempenho RELATIVO entre os dois tokens do par, não a
     variação de um só:

         r = (pxA_agora / pxA_abertura) / (pxB_agora / pxB_abertura)

     Isso importa: num par SOL/ETH, se os dois dobram, r = 1 e não há IL
     nenhum — o que uma conta feita só sobre o SOL erraria feio. Com
     stablecoin do outro lado, pxB fica em 1 e r vira a variação de A,
     que é o caso simples.

     A pergunta que o número responde não é "tive IL?" — sempre se tem.
     É "as taxas que eu coletei cobriram o IL?". Por isso devolvemos
     também a comparação com simplesmente ter segurado os tokens. */
  C.ilPct = function (r, w1) {
    if (!(r > 0)) return 0;
    w1 = (w1 == null ? 0.5 : w1);
    var w2 = 1 - w1;
    var v = (Math.pow(r, w1) / (w1 * r + w2) - 1) * 100;
    return v > 0 ? 0 : v;   /* IL nunca é ganho; r=1 pode dar +1e-15 */
  };

  /* Devolve null quando a pool não tem os dados de IL preenchidos —
     mostrar um IL inventado seria pior que não mostrar nada. */
  C.poolIL = function (st, pool, precos) {
    var il = pool.il;
    if (!il || !il.a || !il.b) return null;
    var pa0 = num(il.a.px0), pb0 = num(il.b.px0);
    if (!(pa0 > 0) || !(pb0 > 0)) return null;

    var pa = num(precos && precos[il.a.cg]) || num(il.a.pxAtual);
    var pb = num(precos && precos[il.b.cg]) || num(il.b.pxAtual);
    /* stablecoin sem cotação: assume o peg, que é o comportamento normal */
    if (!(pa > 0) && C.ehStable(il.a.sym)) pa = pa0;
    if (!(pb > 0) && C.ehStable(il.b.sym)) pb = pb0;
    if (!(pa > 0) || !(pb > 0)) return null;

    var w1 = num(il.w) || 0.5;
    var r = (pa / pa0) / (pb / pb0);
    var pct = C.ilPct(r, w1);

    var R = C.poolResultado(st, pool);
    var capital = Math.max(0, R.dep - R.ret);
    /* Quanto o mesmo depósito valeria se você tivesse só segurado os
       dois tokens, nas mesmas proporções. */
    var valorHold = capital * (w1 * r + (1 - w1));
    var valorPool = valorHold * (1 + pct / 100);
    var perda = valorHold - valorPool;

    /* `valorPool` é o que a fórmula diz. `valorReal` é o que a pessoa
       de fato tem: o valor que ela informou para a posição mais as taxas
       que já coletou. É esse que vale a comparação com o HOLD — a fórmula
       serve para explicar QUANTO da diferença é custo estrutural do AMM.
       Quando os dois se afastam muito, quase sempre é o valor informado
       que está velho; por isso devolvemos também há quantos dias ele é. */
    var valorReal = R.atual + R.fees;

    return {
      pct: pct,
      r: r,
      w1: w1,
      variacaoPar: (r - 1) * 100,
      capital: capital,
      valorHold: valorHold,
      valorPool: valorPool,
      perdaUsd: perda,
      taxas: R.fees,
      /* a pergunta que importa, respondida com o dado real */
      valorAtual: R.atual,
      valorReal: valorReal,
      vsHold: valorReal - valorHold,
      vsHoldPct: valorHold > 0 ? (valorReal / valorHold - 1) * 100 : 0,
      bateuHold: valorReal >= valorHold,
      valorDesatualizado: R.valorDesatualizado,
      /* e a mesma pergunta em cima só da fórmula, como diagnóstico */
      taxasCobrem: R.fees >= perda,
      saldo: R.fees - perda,
      simbolos: il.a.sym + '/' + il.b.sym
    };
  };

  /* ═══════════════════ CONCENTRAÇÃO DE RISCO ═══════════════════
     A pergunta "estou concentrado?" não se responde com "quantos ativos
     eu tenho". Dez ativos com um deles valendo 80% é uma carteira
     concentrada. Por isso, além da maior posição, calculamos o HHI —
     soma dos quadrados das participações:

       10 ativos de 10% cada  →  10 × 10²  = 1.000   (bem distribuída)
        1 ativo de 100%       →  1  × 100² = 10.000  (tudo num só)

     As faixas seguem a convenção antitruste, que é onde o índice nasceu.

     Stablecoin entra separada de propósito: não é "posição parada", é a
     reserva que define quanto de queda você aguenta sem vender nada. */
  C.STABLES = ['USDT','USDC','DAI','BUSD','TUSD','FDUSD','USDE','PYUSD','BRZ','USDP','EURC','GUSD'];
  C.ehStable = function (tk) { return C.STABLES.indexOf(String(tk||'').toUpperCase()) >= 0; };

  C.concentracao = function (st, precos, cart) {
    var T = C.totais(st, precos, cart);
    var pos = C.posicoes(st, precos, cart).filter(function (p) { return p.qtd > 0; });

    /* Pools e banca de trade também ocupam espaço na carteira: ignorá-las
       faria a concentração em HOLD parecer maior do que é. */
    var linhas = pos.map(function (p) {
      return { tipo: 'ativo', id: p.id, nome: p.tk, valor: p.valor, stable: C.ehStable(p.tk) };
    });
    st.pools.filter(function (x) { return (!cart || cart === 'all' || x.cart === cart) && x.st === 'a'; })
      .forEach(function (x) {
        var r = C.poolResultado(st, x);
        if (r.atual > 0) linhas.push({ tipo: 'pool', id: x.id, nome: x.par, valor: r.atual, stable: false });
      });
    if (T.trade.valor > 0) linhas.push({ tipo: 'trade', id: 'trade', nome: 'Banca de trade', valor: T.trade.valor, stable: false });

    var total = linhas.reduce(function (s2, l) { return s2 + l.valor; }, 0);
    linhas.forEach(function (l) { l.pct = total > 0 ? l.valor / total * 100 : 0; });
    linhas.sort(function (a, b) { return b.valor - a.valor; });

    var hhi = linhas.reduce(function (s2, l) { return s2 + l.pct * l.pct; }, 0);
    var stableVal = linhas.filter(function (l) { return l.stable; })
                          .reduce(function (s2, l) { return s2 + l.valor; }, 0);

    function soma(n) { return linhas.slice(0, n).reduce(function (s2, l) { return s2 + l.pct; }, 0); }

    var maior = linhas[0] || null;
    var nivel = 'baixa';
    if (linhas.length <= 1) nivel = 'unica';
    else if (hhi >= 5000 || (maior && maior.pct >= 60)) nivel = 'critica';
    else if (hhi >= 2500 || (maior && maior.pct >= 40)) nivel = 'alta';
    else if (hhi >= 1500) nivel = 'media';

    return {
      linhas: linhas,
      total: total,
      maior: maior,
      top3Pct: soma(3),
      top5Pct: soma(5),
      hhi: hhi,
      nivel: nivel,
      n: linhas.length,
      stableValor: stableVal,
      stablePct: total > 0 ? stableVal / total * 100 : 0
    };
  };

  /* ═══════════════════ CONTRIBUIÇÃO PARA O RESULTADO ═══════════════════
     "Onde estou ganhando dinheiro?" é outra pergunta que a alocação não
     responde: o ativo que mais PESA não é necessariamente o que mais
     RENDEU. Aqui cada linha traz quanto contribuiu para o resultado
     total — realizado mais não realizado, somados.

     O percentual usa a soma dos ABSOLUTOS como base. Se um ativo ganhou
     100 e outro perdeu 100, o resultado é zero: dividir por zero não diz
     nada, e dividir pelo líquido daria percentuais sem sentido. */
  C.contribuicao = function (st, precos, cart) {
    var T = C.totais(st, precos, cart);
    var linhas = [];

    C.posicoes(st, precos, cart).forEach(function (p) {
      var t = p.realizado + p.naoRealizado;
      if (t === 0 && p.qtd === 0) return;
      linhas.push({ tipo: 'ativo', id: p.id, nome: p.tk, grupo: 'HOLD',
                    realizado: p.realizado, naoRealizado: p.naoRealizado, total: t });
    });

    st.pools.filter(function (x) { return !cart || cart === 'all' || x.cart === cart; })
      .forEach(function (x) {
        var r = C.poolResultado(st, x);
        if (r.resultado === 0) return;
        linhas.push({ tipo: 'pool', id: x.id, nome: x.par, grupo: 'DeFi',
                      realizado: r.aberta ? r.fees : r.resultado,
                      naoRealizado: r.aberta ? r.resultado - r.fees : 0,
                      total: r.resultado });
      });

    st.lend.filter(function (x) { return !cart || cart === 'all' || x.cart === cart; })
      .forEach(function (x) {
        var r = C.lendResultado(st, x);
        if (r.resultado === 0) return;
        linhas.push({ tipo: 'lend', id: x.id, nome: x.plat + ' · ' + x.tk, grupo: 'DeFi',
                      realizado: r.resultado, naoRealizado: 0, total: r.resultado });
      });

    if (T.trade.realizado !== 0) {
      linhas.push({ tipo: 'trade', id: 'trade', nome: 'Trade', grupo: 'Trade',
                    realizado: T.trade.realizado, naoRealizado: 0, total: T.trade.realizado });
    }

    var absTotal = linhas.reduce(function (s2, l) { return s2 + Math.abs(l.total); }, 0);
    linhas.forEach(function (l) { l.pct = absTotal > 0 ? Math.abs(l.total) / absTotal * 100 : 0; });
    linhas.sort(function (a, b) { return b.total - a.total; });

    var grupos = {};
    linhas.forEach(function (l) { grupos[l.grupo] = (grupos[l.grupo] || 0) + l.total; });

    return {
      linhas: linhas,
      grupos: Object.keys(grupos).map(function (g) { return { nome: g, total: grupos[g] }; })
                    .sort(function (a, b) { return b.total - a.total; }),
      melhor: linhas.length ? linhas[0] : null,
      pior: linhas.length ? linhas[linhas.length - 1] : null,
      resultadoTotal: T.resultadoTotal
    };
  };

  /* ═══════════════════ RETORNO PONDERADO PELO DINHEIRO (XIRR) ═══════════════════
     Rentabilidade simples mente quando há aportes ao longo do tempo:
     quem aportou tudo no fundo do poço "rende" igual a quem aportou no topo.
     O XIRR resolve isso — é a taxa que zera o valor presente dos fluxos. */
  C.fluxos = function (st, precos, cart) {
    var f = [];
    C.movsDe(st, { cart: cart }).forEach(function (m) {
      var t = C.TIPOS[m.tipo];
      if (!t || !t.externo || t.sinal === 0) return;
      /* sinal -1 = dinheiro saiu do bolso para a posição.
         A taxa SEMPRE subtrai: numa compra ela aumenta o desembolso,
         numa venda ela reduz o que você recebe. */
      f.push({ dt: m.dt, valor: t.sinal * m.usd - m.fee });
    });
    if (!f.length) return f;
    /* valor de mercado hoje entra como resgate final */
    var T = C.totais(st, precos, cart);
    f.push({ dt: C.hoje(), valor: T.patrimonio });
    return f;
  };

  function npv(taxa, fluxos, t0) {
    var s = 0;
    for (var i = 0; i < fluxos.length; i++) {
      var anos = dias(t0, fluxos[i].dt) / 365;
      s += fluxos[i].valor / Math.pow(1 + taxa, anos);
    }
    return s;
  }

  /* Newton-Raphson com bisseção de segurança. Devolve null quando não há
     resposta confiável — melhor não mostrar número do que mostrar um errado. */
  C.xirr = function (fluxos) {
    if (!fluxos || fluxos.length < 2) return null;
    var ord = fluxos.slice().sort(function (a, b) { return String(a.dt).localeCompare(String(b.dt)); });
    var t0 = ord[0].dt;
    var temPos = false, temNeg = false;
    ord.forEach(function (f) { if (f.valor > 0) temPos = true; if (f.valor < 0) temNeg = true; });
    if (!temPos || !temNeg) return null;      /* sem sinais opostos não há TIR */
    if (dias(t0, ord[ord.length - 1].dt) < 1) return null;  /* período curto demais */

    var taxa = 0.1, i, d;
    for (i = 0; i < 60; i++) {
      var v = npv(taxa, ord, t0);
      if (Math.abs(v) < 1e-7) return taxa * 100;
      d = (npv(taxa + 1e-6, ord, t0) - v) / 1e-6;
      if (!isFinite(d) || Math.abs(d) < 1e-12) break;
      var prox = taxa - v / d;
      if (!isFinite(prox) || prox <= -0.9999) break;
      if (Math.abs(prox - taxa) < 1e-9) { taxa = prox; break; }
      taxa = prox;
    }
    if (isFinite(taxa) && Math.abs(npv(taxa, ord, t0)) < 1e-4) return taxa * 100;

    /* fallback: bisseção entre -99% e +1000% */
    var lo = -0.9999, hi = 10, flo = npv(lo, ord, t0);
    if (flo * npv(hi, ord, t0) > 0) return null;
    for (i = 0; i < 200; i++) {
      var mid = (lo + hi) / 2, fm = npv(mid, ord, t0);
      if (Math.abs(fm) < 1e-7) return mid * 100;
      if (flo * fm < 0) hi = mid; else { lo = mid; flo = fm; }
    }
    return ((lo + hi) / 2) * 100;
  };

  /* ═══════════════════ SNAPSHOTS ═══════════════════
     O v1 desenhava a "Evolução do Patrimônio" a partir de uma função seno.
     Aqui só entra o que foi realmente medido — um ponto por dia, no máximo. */
  C.registrarSnapshot = function (st, totais, quando) {
    var dt = quando || C.hoje();
    var s = {
      dt: dt,
      pat: totais.patrimonio,
      inv: totais.investido,
      real: totais.realizado,
      naoReal: totais.naoRealizado
    };
    var ultimo = st.snaps[st.snaps.length - 1];
    if (ultimo && ultimo.dt === dt) { st.snaps[st.snaps.length - 1] = s; return s; }
    st.snaps.push(s);
    /* 3 anos de histórico diário é mais que suficiente e cabe no Firestore */
    if (st.snaps.length > 1100) st.snaps = st.snaps.slice(-1100);
    return s;
  };

  /* Série pronta para o gráfico, recortada por período.
     Devolve `suficiente:false` quando ainda não há histórico — a tela deve
     mostrar um estado vazio honesto em vez de inventar uma curva. */
  C.serie = function (st, periodo) {
    var mapa = { '7d': 7, '30d': 30, '90d': 90, '1a': 365 };
    var snaps = st.snaps.slice().sort(function (a, b) { return String(a.dt).localeCompare(String(b.dt)); });
    if (periodo === 'ytd') {
      var ano = new Date().getFullYear() + '-01-01';
      snaps = snaps.filter(function (s) { return s.dt >= ano; });
    } else if (mapa[periodo]) {
      var corte = new Date(Date.now() - mapa[periodo] * 864e5).toISOString().slice(0, 10);
      snaps = snaps.filter(function (s) { return s.dt >= corte; });
    }
    var ini = snaps.length ? snaps[0] : null;
    var fim = snaps.length ? snaps[snaps.length - 1] : null;
    return {
      pontos: snaps,
      suficiente: snaps.length >= 2,
      variacao: (ini && fim) ? fim.pat - ini.pat : 0,
      variacaoPct: (ini && fim && ini.pat > 0) ? (fim.pat - ini.pat) / ini.pat * 100 : 0
    };
  };

  if (typeof module === 'object' && module.exports) module.exports = C;
  else root.PCore = C;

})(typeof self !== 'undefined' ? self : this);
