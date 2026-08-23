/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  NEXUS · MOTOR DE REGRAS                                             ║
   ║                                                                      ║
   ║  O Nexus NÃO é um modelo de linguagem. É um motor determinístico:    ║
   ║  lê os números reais do portfólio, avalia um conjunto de regras      ║
   ║  declaradas em JSON e devolve as que baterem.                        ║
   ║                                                                      ║
   ║  Isso é escolha de produto, não limitação. Para dinheiro, regra      ║
   ║  determinística ganha de LLM em tudo que importa: responde igual     ║
   ║  toda vez, não inventa número, e cada afirmação é rastreável até a   ║
   ║  conta que a gerou. Um usuário pode conferir e você pode defender.   ║
   ║                                                                      ║
   ║  ── AS TRÊS PEÇAS ───────────────────────────────────────────────    ║
   ║   nexus-regras.json   as regras — DADO, sem código                   ║
   ║   nexus-motor.js      calcula os fatos e avalia as regras (este)     ║
   ║   nexus-portfolio-kb  liga o motor ao widget de chat                 ║
   ║                                                                      ║
   ║  Para mudar o que o Nexus fala, edite o JSON. Só mexa aqui para      ║
   ║  criar um FATO novo ou um operador novo.                             ║
   ║                                                                      ║
   ║  ── ESPAÇO PARA API DEPOIS ──────────────────────────────────────    ║
   ║  Os fatos são um objeto plano e serializável. No dia em que houver   ║
   ║  uma API, `NexusMotor.fatos()` já é o payload de contexto pronto —   ║
   ║  o nexus-core alterna via NEXUS_CORE_CONFIG.mode = "api".            ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
(function () {
  'use strict';

  var M = {};
  var REGRAS = null;
  /* A versão sai do próprio <script src="...?v=">: assim o JSON acompanha
     o cache busting do JS que o carrega, sem ter que lembrar de bumpar dois
     lugares. Sem isto, editar o arquivo não chegava em quem já tinha
     visitado o site — e o dado ficava congelado no navegador dele. */
  var VERSAO = (function () {
    try {
      var s = document.currentScript && document.currentScript.src;
      var m = s && s.match(/[?&]v=([^&#]+)/);
      return m ? m[1] : '';
    } catch (e) { return ''; }
  })();
  function versionado(caminho) { return VERSAO ? caminho + '?v=' + VERSAO : caminho; }

  var CAMINHO = versionado('/nexus/nexus-regras.json');

  /* Tickers tratados como caixa. Stablecoin não é "investimento parado":
     é a posição que define quanto você aguenta de queda sem vender nada. */
  var STABLES = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'FDUSD', 'USDE', 'PYUSD', 'BRZ', 'USDP'];

  /* ═══════════════ CARGA DAS REGRAS ═══════════════ */
  M.carregar = function () {
    if (REGRAS) return Promise.resolve(REGRAS);
    return fetch(CAMINHO)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { REGRAS = j; return j; });
  };
  M.regrasCarregadas = function () { return REGRAS; };

  /* ═══════════════ FATOS ═══════════════
     Tudo que o Nexus sabe sobre o portfólio, num objeto plano.
     Nenhum número é calculado aqui: vem do PCore, que é testado. */
  M.fatos = function () {
    var vazio = { temDados: false };
    if (!window.P || !window.P.st || !window.PCore) return vazio;

    var C = window.PCore, P = window.P;
    var st = P.st, precos = P.precos || {}, cart = P.cart ? P.cart() : 'all';
    var T = C.totais(st, precos, cart);
    var pos = C.posicoes(st, precos, cart).filter(function (p) { return p.qtd > 0; });
    var tr = C.tradeResumo(st, cart);

    var f = { temDados: !T.vazio };
    if (T.vazio) return f;

    /* ── patrimônio e resultado ── */
    f.patrimonio    = T.patrimonio;
    f.investido     = T.investido;
    f.realizado     = T.realizado;
    f.naoRealizado  = T.naoRealizado;
    f.resultadoTotal = T.resultadoTotal;
    f.rentAberta    = T.rentAberta;
    f.taxasDeFi     = T.taxasDeFi;
    var x = C.xirr(C.fluxos(st, precos, cart));
    f.temXirr = x != null;
    f.xirr = x == null ? 0 : x;

    /* ── composição ── */
    f.pctHold  = T.patrimonio > 0 ? T.hold.valor / T.patrimonio * 100 : 0;
    f.pctDefi  = T.patrimonio > 0 ? T.defi.valor / T.patrimonio * 100 : 0;
    f.pctTrade = T.patrimonio > 0 ? T.trade.valor / T.patrimonio * 100 : 0;

    var stable = 0;
    pos.forEach(function (p) { if (STABLES.indexOf(String(p.tk).toUpperCase()) >= 0) stable += p.valor; });
    f.valorStable = stable;
    f.pctStable = T.patrimonio > 0 ? stable / T.patrimonio * 100 : 0;

    /* ── concentração ── */
    f.nAtivosAbertos = pos.length;
    var ordenado = pos.slice().sort(function (a, b) { return b.valor - a.valor; });
    f.maiorAtivoTk  = ordenado.length ? ordenado[0].tk : '—';
    f.maiorAtivoVal = ordenado.length ? ordenado[0].valor : 0;
    f.maiorAtivoPct = (ordenado.length && T.patrimonio > 0) ? ordenado[0].valor / T.patrimonio * 100 : 0;
    var top3 = ordenado.slice(0, 3).reduce(function (s, p) { return s + p.valor; }, 0);
    f.top3Pct = T.patrimonio > 0 ? top3 / T.patrimonio * 100 : 0;

    /* Índice HHI: soma dos quadrados das participações. Mede concentração
       melhor que "a maior posição" porque enxerga a carteira inteira —
       10 ativos de 10% dão 1000; 1 ativo de 100% dá 10000. */
    var hhi = 0;
    if (T.patrimonio > 0) {
      pos.forEach(function (p) { var w = p.valor / T.patrimonio * 100; hhi += w * w; });
    }
    f.hhi = hhi;

    /* ── melhor e pior posição ── */
    var porRent = pos.filter(function (p) { return p.custoTotal > 0; })
                     .sort(function (a, b) { return b.naoRealizadoPct - a.naoRealizadoPct; });
    f.temRanking     = porRent.length >= 2;
    f.melhorAtivoTk  = porRent.length ? porRent[0].tk : '—';
    f.melhorAtivoPct = porRent.length ? porRent[0].naoRealizadoPct : 0;
    f.piorAtivoTk    = porRent.length ? porRent[porRent.length - 1].tk : '—';
    f.piorAtivoPct   = porRent.length ? porRent[porRent.length - 1].naoRealizadoPct : 0;

    /* ── DeFi ── */
    var pools = st.pools.filter(function (p) { return cart === 'all' || p.cart === cart; });
    var abertas = pools.filter(function (p) { return p.st === 'a'; });
    var capital = 0, aprPond = 0, desatualizadas = 0;
    var melhorPool = null, piorPool = null;
    /* Impermanent loss: a pergunta que decide se a pool valeu a pena não é
       "quanto rendeu", é "rendeu mais do que ter só segurado os tokens?".
       Só entra na conta a pool que tem os preços de abertura preenchidos —
       sem eles o cálculo não existe, e inventar seria pior. */
    var comIL = 0, semIL = 0, atrasDoHold = 0, ilPerdaTotal = 0, ilSaldoTotal = 0;
    var piorIL = null;
    abertas.forEach(function (p) {
      var R = C.poolResultado(st, p);
      var cap = Math.max(0, R.dep - R.ret);
      capital += cap;
      aprPond += R.aprFees * cap;
      if (R.valorDesatualizado != null && R.valorDesatualizado > 14) desatualizadas++;
      if (!melhorPool || R.aprFees > melhorPool.apr) melhorPool = { par: p.par, apr: R.aprFees };
      if (!piorPool || R.aprFees < piorPool.apr) piorPool = { par: p.par, apr: R.aprFees };

      var IL = C.poolIL ? C.poolIL(st, p, precos) : null;
      if (!IL) { semIL++; return; }
      comIL++;
      ilPerdaTotal += IL.perdaUsd;
      ilSaldoTotal += IL.vsHold;
      if (!IL.bateuHold) atrasDoHold++;
      if (!piorIL || IL.vsHold < piorIL.vsHold) {
        piorIL = { par: p.par, vsHold: IL.vsHold, pct: IL.pct, taxas: IL.taxas, perda: IL.perdaUsd };
      }
    });
    f.nPools = pools.length;
    f.nPoolsAbertas = abertas.length;
    f.nPoolsEncerradas = pools.length - abertas.length;
    f.capitalEmPools = capital;
    f.aprMedioPools = capital > 0 ? aprPond / capital : 0;
    f.poolsDesatualizadas = desatualizadas;
    f.temVariasPools = abertas.length >= 2;
    f.melhorPoolPar = melhorPool ? melhorPool.par : '—';
    f.melhorPoolApr = melhorPool ? melhorPool.apr : 0;
    f.piorPoolPar   = piorPool ? piorPool.par : '—';
    f.piorPoolApr   = piorPool ? piorPool.apr : 0;

    /* impermanent loss */
    f.poolsComIL = comIL;
    f.poolsSemDadosIL = semIL;
    f.poolsAtrasDoHold = atrasDoHold;
    f.poolsBateramHold = comIL - atrasDoHold;
    f.ilPerdaTotal = ilPerdaTotal;
    f.ilSaldoTotal = ilSaldoTotal;
    f.ilTaxasCobrem = comIL > 0 && ilSaldoTotal >= 0;
    f.piorILPar = piorIL ? piorIL.par : '—';
    f.piorILvsHold = piorIL ? piorIL.vsHold : 0;
    /* mesmo número em valor absoluto: "está $2.838 atrás" lê melhor
       que "está -$2.838 em relação a" */
    f.piorILAtras = piorIL ? Math.abs(Math.min(0, piorIL.vsHold)) : 0;
    f.piorILPct = piorIL ? piorIL.pct : 0;
    f.piorILTaxas = piorIL ? piorIL.taxas : 0;

    var lends = st.lend.filter(function (l) { return cart === 'all' || l.cart === cart; });
    var jurosLend = 0, lendAbertos = 0;
    lends.forEach(function (l) {
      var R = C.lendResultado(st, l);
      jurosLend += R.juros;
      if (R.aberta) lendAbertos++;
    });
    f.nLendAbertos = lendAbertos;
    f.jurosLend = jurosLend;

    /* ── trade ── */
    f.nOps           = tr.n;
    f.temTrade       = tr.n > 0;
    f.winRate        = tr.winRate;
    f.profitFactor   = tr.profitFactor === Infinity ? 999 : tr.profitFactor;
    f.payoff         = tr.payoff;
    f.expectativa    = tr.expectativa;
    f.drawdownMax    = tr.drawdownMax;
    f.bancaTrade     = tr.banca;
    f.aportadoTrade  = tr.depositos;
    f.resultadoTrade = tr.resultado;
    f.rentTrade      = tr.rentabilidade;
    f.mediaGanho     = tr.mediaGanho;
    f.mediaPerda     = tr.mediaPerda;
    f.maiorPerda     = tr.maiorPerda;
    /* Abaixo de 30 operações qualquer estatística de trade é ruído.
       Dizer isso é mais útil que exibir um win rate bonito. */
    f.amostraTradePequena = tr.n > 0 && tr.n < 30;

    /* ── higiene dos dados ── */
    var semPreco = 0;
    st.ativos.forEach(function (a) {
      if (cart !== 'all' && a.cart !== cart) return;
      if (!a.cg) semPreco++;
    });
    f.ativosSemPrecoAuto = semPreco;
    f.diasDeHistorico = st.snaps.length;
    f.temHistorico = st.snaps.length >= 2;
    f.nCarteiras = st.carteiras.length;
    f.nMovimentacoes = st.mov.length;

    return f;
  };

  /* ═══════════════ FORMATAÇÃO ═══════════════ */
  /* Vírgula decimal: o Nexus escreve em prosa portuguesa, não em tabela.
     "0,0%" no meio de uma frase lê certo; "0.0%" tropeça. */
  function br(n, casas) { return Number(n).toFixed(casas).replace('.', ','); }

  function fmt(valor, tipo) {
    var P = window.P;
    if (valor == null || (typeof valor === 'number' && !isFinite(valor))) return '—';
    switch (tipo) {
      case 'money': return P && P.money ? P.money(valor) : '$' + Math.round(valor);
      case 'pct':   return (valor >= 0 ? '+' : '') + br(valor, 2) + '%';
      case 'pct0':  return br(valor, 0) + '%';
      case 'pct1':  return br(valor, 1) + '%';
      case 'num':   return String(Math.round(valor));
      case 'num2':  return br(valor, 2);
      default:      return String(valor);
    }
  }

  /* Troca {fato} e {fato|formato} pelos valores reais. */
  M.interpolar = function (texto, f) {
    return String(texto || '').replace(/\{([a-zA-Z0-9_]+)(?:\|([a-z0-9]+))?\}/g, function (todo, chave, tipo) {
      if (!(chave in f)) return todo;
      return fmt(f[chave], tipo);
    });
  };

  /* ═══════════════ AVALIAÇÃO ═══════════════
     Condições são estruturadas de propósito — nada de eval() sobre string
     vinda de JSON. Todas as condições de uma regra precisam bater (E). */
  var OPS = {
    '>':  function (a, b) { return a >  b; },
    '>=': function (a, b) { return a >= b; },
    '<':  function (a, b) { return a <  b; },
    '<=': function (a, b) { return a <= b; },
    '==': function (a, b) { return a === b; },
    '!=': function (a, b) { return a !== b; },
    'entre': function (a, b) { return Array.isArray(b) && a >= b[0] && a <= b[1]; }
  };

  function condicaoBate(cond, f) {
    if (!(cond.fato in f)) return false;
    var op = OPS[cond.op];
    if (!op) return false;
    return op(f[cond.fato], cond.valor);
  }

  M.avaliar = function (f, filtroGrupos) {
    if (!REGRAS || !f.temDados) return [];
    return REGRAS.regras
      .filter(function (r) {
        if (filtroGrupos && filtroGrupos.length && filtroGrupos.indexOf(r.grupo) < 0) return false;
        return (r.quando || []).every(function (c) { return condicaoBate(c, f); });
      })
      .sort(function (a, b) { return (b.prioridade || 0) - (a.prioridade || 0); })
      .map(function (r) {
        return {
          id: r.id,
          grupo: r.grupo,
          severidade: r.severidade || 'info',
          titulo: M.interpolar(r.titulo, f),
          texto: M.interpolar(r.texto, f)
        };
      });
  };

  /* ═══════════════ PERGUNTAS ═══════════════ */
  function normalizar(t) {
    return String(t || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* Casa a pergunta com um assunto por palavra-chave. Sem correspondência,
     devolve null — e o chamador oferece as perguntas que o Nexus sabe
     responder, em vez de fingir que entendeu. */
  M.assunto = function (pergunta) {
    if (!REGRAS) return null;
    var q = normalizar(pergunta);
    if (!q) return null;
    var melhor = null, melhorPontos = 0;
    REGRAS.assuntos.forEach(function (a) {
      var pontos = 0;
      a.palavras.forEach(function (p) {
        if (q.indexOf(normalizar(p)) >= 0) pontos += p.indexOf(' ') >= 0 ? 2 : 1;
      });
      if (pontos > melhorPontos) { melhorPontos = pontos; melhor = a; }
    });
    return melhorPontos > 0 ? melhor : null;
  };

  M.responder = function (pergunta) {
    var f = M.fatos();
    if (!f.temDados) {
      return { tipo: 'vazio', texto: REGRAS ? REGRAS.mensagens.semDados : 'Ainda não há dados no seu portfólio.' };
    }
    var a = M.assunto(pergunta);
    if (!a) {
      return { tipo: 'naoEntendi', texto: REGRAS.mensagens.naoEntendi, sugestoes: M.sugestoes() };
    }
    var achados = M.avaliar(f, a.grupos);
    if (!achados.length) {
      return { tipo: 'semAchado', texto: M.interpolar(a.semAchado || REGRAS.mensagens.semAchado, f) };
    }
    return { tipo: 'ok', assunto: a.id, titulo: a.label, achados: achados.slice(0, a.max || 4) };
  };

  M.sugestoes = function () { return REGRAS ? REGRAS.assuntos.map(function (a) { return a.label; }) : []; };
  M.assuntoPorLabel = function (label) {
    if (!REGRAS) return null;
    return REGRAS.assuntos.filter(function (a) { return a.label === label; })[0] || null;
  };

  /* Panorama: o que o Nexus falaria sem ser perguntado.
     Serve para abrir o chat já com conteúdo em vez de um "olá". */
  M.panorama = function (limite) {
    var f = M.fatos();
    if (!f.temDados) return [];
    return M.avaliar(f, null).slice(0, limite || 4);
  };

  window.NexusMotor = M;
})();
