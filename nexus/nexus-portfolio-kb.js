/* ============================================================
   NEXUS — Base de conhecimento do PORTFÓLIO
   ------------------------------------------------------------
   Lê os dados reais do Portfólio (objeto P do portfolio.js) e
   responde perguntas sobre patrimônio, HOLD, DeFi, pools e
   trade. Edite frases e adicione intenções aqui — sem tocar
   no nexus-core.js.
   ============================================================ */

(function () {
  function temP() { return typeof window.P !== "undefined" && P.st; }
  function fmt(v) { return temP() ? P.money(v) : "$" + Math.round(v); }
  function pct(v) { return temP() ? P.pct(v) : v.toFixed(2) + "%"; }

  function norm(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s\/]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function bate(q, grupos) {
    return grupos.some(function (grupo) {
      return grupo.every(function (palavra) { return q.indexOf(palavra) >= 0; });
    });
  }

  /* ---------- cálculos de apoio ---------- */

  function holdRank() {
    if (!temP() || !P.st.hold.length) return [];
    return P.st.hold.map(function (a) {
      var x = P.holdPos(a);
      var rentab = x.cost > 0 ? (x.lucro / x.cost) * 100 : 0;
      return { tk: a.tk, val: x.val, lucro: x.lucro, rent: rentab, qty: x.qty };
    }).filter(function (r) { return r.qty > 0; })
      .sort(function (a, b) { return b.rent - a.rent; });
  }

  function poolRank() {
    if (!temP() || !P.st.defi.pools.length) return [];
    return P.st.defi.pools.map(function (p) {
      return {
        nome: p.par + " (" + p.proto + " · " + p.chain + ")",
        lucro: P.poolLucro(p),
        taxas: P.poolSum(p, "tax"),
        ativa: p.st === "a"
      };
    }).sort(function (a, b) { return b.lucro - a.lucro; });
  }

  /* ---------- intenções ---------- */

  var INTENCOES = [
    {
      grupos: [["patrimonio"], ["quanto", "tenho"], ["valor", "total"], ["quanto", "vale"]],
      responder: function () {
        var T = P.totais();
        return "Seu patrimônio total é " + fmt(T.pat) + ".\n\n" +
          "• HOLD: " + fmt(T.hold) + "\n" +
          "• DeFi (pools): " + fmt(T.defi) + "\n" +
          "• Lend/Staking: " + fmt(T.lend) + "\n" +
          "• Banca de trade: " + fmt(T.trade) + "\n\n" +
          "Lucro acumulado: " + fmt(T.lucro) + " (" + pct(T.rent) + " de rentabilidade).";
      }
    },
    {
      grupos: [["melhor", "ativo"], ["ativo", "performa"], ["ativo", "performando"], ["qual", "ativo", "melhor"], ["melhor", "moeda"], ["melhor", "token"]],
      responder: function () {
        var r = holdRank();
        if (!r.length) return "Você ainda não tem ativos no HOLD. Cadastre suas compras na aba HOLD que eu começo a acompanhar tudo.";
        var top = r[0];
        var linha = r.slice(0, 3).map(function (a, i) {
          return (i + 1) + "º " + a.tk + ": " + pct(a.rent) + " (" + fmt(a.lucro) + ")";
        }).join("\n");
        return "Seu melhor ativo agora é o " + top.tk + ", com " + pct(top.rent) + " de rentabilidade (" + fmt(top.lucro) + " de lucro).\n\nRanking:\n" + linha;
      }
    },
    {
      grupos: [["pior", "ativo"], ["ativo", "pior"], ["maior", "prejuizo"], ["qual", "ativo", "caindo"]],
      responder: function () {
        var r = holdRank();
        if (!r.length) return "Sem ativos no HOLD por enquanto — nada para se preocupar. 😄";
        var pior = r[r.length - 1];
        return "O ativo com pior desempenho é o " + pior.tk + ": " + pct(pior.rent) + " (" + fmt(pior.lucro) + "). Vale revisar sua tese para ele.";
      }
    },
    {
      grupos: [["melhor", "pool"], ["pool", "performando"], ["pool", "rende"], ["qual", "pool"], ["pool", "melhor"]],
      responder: function () {
        var r = poolRank();
        if (!r.length) return "Você ainda não cadastrou pools. Registre suas posições na aba DeFi que eu passo a comparar o resultado de cada uma.";
        var top = r[0];
        var linhas = r.slice(0, 3).map(function (p, i) {
          return (i + 1) + "º " + p.nome + ": " + fmt(p.lucro) + (p.ativa ? " (ativa)" : " (encerrada)");
        }).join("\n");
        return "Sua melhor pool é " + top.nome + ", com resultado de " + fmt(top.lucro) + ".\n\nRanking:\n" + linhas;
      }
    },
    {
      grupos: [["taxas"], ["quanto", "coletei"], ["renda", "pools"], ["fees"]],
      responder: function () {
        var T = P.totais();
        var ativas = P.st.defi.pools.filter(function (p) { return p.st === "a"; }).length;
        return "Você já coletou " + fmt(T.tax) + " em taxas nas suas pools. " +
          (ativas ? "Tem " + ativas + " pool(s) ativa(s) gerando renda agora." : "Nenhuma pool ativa no momento.");
      }
    },
    {
      grupos: [["defi"], ["pools", "resultado"], ["liquidez"]],
      responder: function () {
        var T = P.totais();
        var ativas = P.st.defi.pools.filter(function (p) { return p.st === "a"; }).length;
        return "Resumo do seu DeFi:\n\n" +
          "• Valor em pools ativas: " + fmt(T.defi) + " (" + ativas + " pool(s))\n" +
          "• Resultado acumulado em DeFi: " + fmt(T.defiL) + "\n" +
          "• Taxas coletadas: " + fmt(T.tax) + "\n" +
          "• Lend/Staking: " + fmt(T.lend);
      }
    },
    {
      grupos: [["trade"], ["winrate"], ["win", "rate"], ["taxa", "acerto"], ["resultado", "operacoes"], ["banca"]],
      responder: function () {
        var s = P.tradeStats();
        var b = P.st.trade.banca;
        if (!s.n) return "Você ainda não registrou operações de trade. Cadastre na aba Trade que eu calculo winrate, resultado e evolução da banca.";
        return "Seu trade até aqui:\n\n" +
          "• Operações: " + s.n + "\n" +
          "• Winrate: " + s.win.toFixed(1) + "%\n" +
          "• Resultado acumulado: " + fmt(s.res) + "\n" +
          "• Banca: " + fmt(Number(b.ini) || 0) + " → " + fmt(Number(b.atu) || 0);
      }
    },
    {
      grupos: [["hold"], ["carteira", "longo"], ["posicoes"]],
      responder: function () {
        var T = P.totais();
        var r = holdRank();
        if (!r.length) return "Seu HOLD está vazio. Registre suas compras na aba HOLD para acompanhar preço médio, valor atual e lucro de cada ativo.";
        var linhas = r.map(function (a) {
          return "• " + a.tk + ": " + fmt(a.val) + " (" + pct(a.rent) + ")";
        }).join("\n");
        return "Seu HOLD vale " + fmt(T.hold) + " com lucro de " + fmt(T.holdL) + ".\n\n" + linhas;
      }
    },
    {
      grupos: [["lucro"], ["rentabilidade"], ["quanto", "ganhei"], ["resultado", "geral"]],
      responder: function () {
        var T = P.totais();
        return "Seu lucro total é " + fmt(T.lucro) + " — rentabilidade de " + pct(T.rent) + " sobre o capital investido.\n\n" +
          "Por frente: HOLD " + fmt(T.holdL) + " · DeFi " + fmt(T.defiL) + " · Trade " + fmt(T.trL) + ".";
      }
    },
    {
      grupos: [["alocacao"], ["distribuicao"], ["como", "dividido"], ["percentual"]],
      responder: function () {
        var T = P.totais();
        var pat = T.pat || 1;
        function p100(v) { return ((v / pat) * 100).toFixed(1) + "%"; }
        return "Alocação do seu patrimônio:\n\n" +
          "• HOLD: " + p100(T.hold) + "\n" +
          "• DeFi: " + p100(T.defi) + "\n" +
          "• Lend/Staking: " + p100(T.lend) + "\n" +
          "• Trade: " + p100(T.trade);
      }
    },
    {
      grupos: [["carteiras"], ["quantas", "carteira"], ["valor", "carteira"]],
      responder: function () {
        var linhas = P.st.carteiras.map(function (c) {
          return "• " + c.nome + ": " + fmt(P.cartVal(c.id));
        }).join("\n");
        return "Suas carteiras:\n\n" + linhas;
      }
    },
    /* ---------- educativas (sem depender de dados) ---------- */
    {
      grupos: [["impermanent"], ["perda", "impermanente"], ["o", "que", "e", "il"]],
      semDados: true,
      responder: function () {
        return "Impermanent loss é a diferença entre o valor dos seus tokens dentro de uma pool e o valor que eles teriam se você só tivesse segurado (HOLD). Ela cresce quando os preços do par se distanciam. As taxas coletadas existem justamente para compensar essa perda — por isso acompanho o resultado líquido das suas pools.";
      }
    },
    {
      grupos: [["o", "que", "e", "pool"], ["como", "funciona", "pool"]],
      semDados: true,
      responder: function () {
        return "Uma pool de liquidez é um cofre de dois tokens que permite trocas na rede. Quem deposita (você) vira provedor de liquidez e recebe parte das taxas de cada troca. O risco principal é o impermanent loss — e o jogo é as taxas pagarem mais do que ele custa.";
      }
    },
    {
      grupos: [["o", "que", "e", "hold"], ["diferenca", "hold", "trade"]],
      semDados: true,
      responder: function () {
        return "HOLD é comprar e segurar pensando em anos; trade é operar movimentos curtos com gestão de risco. No portfólio eu separo as duas frentes para você ver claramente o resultado de cada estratégia — sem misturar as contas.";
      }
    },
    {
      grupos: [["o", "que", "e", "dca"]],
      semDados: true,
      responder: function () {
        return "DCA (Dollar Cost Averaging) é aportar um valor fixo em intervalos regulares, comprando mais quando o preço cai e menos quando sobe. Reduz o impacto da volatilidade e tira a emoção da decisão.";
      }
    },
    {
      grupos: [["quem", "e", "voce"], ["o", "que", "voce", "faz"], ["ajuda"], ["help"]],
      semDados: true,
      responder: function () {
        return "Sou o Nexus, a inteligência do MundoDeFi. Leio os dados do seu portfólio e respondo na hora: patrimônio total, melhor ativo, melhor pool, taxas coletadas, winrate no trade, alocação e mais. Experimenta: \"qual ativo performa melhor?\"";
      }
    }
  ];

  window.NEXUS_KB = {
    version: 2,
    nome: "Nexus",
    subtitulo: "A inteligência do MundoDeFi",
    saudacoes: [
      "E aí! Sou o Nexus. Pergunta sobre seu patrimônio, pools, HOLD ou trade que eu respondo na hora.",
      "Nexus na área. 👋 Quer saber qual ativo está performando melhor? Qual pool rende mais? Manda a pergunta."
    ],
    sugestoes: [
      "Qual meu patrimônio total?",
      "Qual ativo performa melhor?",
      "Qual pool está rendendo mais?",
      "Como está meu trade?",
      "Como está minha alocação?"
    ],
    fallback: [
      "Essa eu ainda não sei. Sou bom em: patrimônio, melhor ativo, pools, taxas, trade, alocação e carteiras. Reformula pra mim?",
      "Hmm, não entendi. Tenta algo como \"qual pool está rendendo mais?\" ou \"qual meu patrimônio total?\""
    ],

    answer: function (pergunta) {
      var q = norm(pergunta);
      for (var i = 0; i < INTENCOES.length; i += 1) {
        var intencao = INTENCOES[i];
        if (bate(q, intencao.grupos)) {
          if (!intencao.semDados && !temP()) {
            return "Não consegui ler os dados do portfólio nesta página. Abre o Portfólio (menu acima) que lá eu respondo com seus números reais.";
          }
          try {
            return intencao.responder();
          } catch (e) {
            return "Deu um nó ao calcular isso. Recarrega a página e tenta de novo?";
          }
        }
      }
      return null; /* deixa o core usar o fallback */
    }
  };
})();
