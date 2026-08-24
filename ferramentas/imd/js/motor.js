/* ============================================================
   IMD — Índice Mundo DeFi
   motor.js  ·  Núcleo de lógica (sem IA, 100% local)
   - Estado do diagnóstico
   - Filtragem adaptativa de perguntas (árvore de decisão)
   - Cálculo de pontuação por pilar e competência
   - Cálculo do índice final (pesos + penalidades)
   - Determinação do perfil
   ============================================================ */
(function (global) {
  "use strict";

  var IMDMotor = {
    dados: { perguntas: [], competencias: {}, regras: {} },
    estado: {
      respostas: {},        // { "FUN-01": { pontos: 4, opcao: 3 }, ... }
      ordem: [],            // ids respondidos, na ordem
      inicio: null,
      fim: null
    },

    /* ---- Carregamento dos dados (com fallback amigável) ---- */
    carregar: function () {
      var base = "data/";
      /* A versao sai do proprio <script src="...?v=">: sem isso, editar uma
         pergunta ou uma regra nao chegava em quem ja tinha visitado o site
         -- o navegador continuava servindo o JSON antigo. */
      var v = (function () {
        try {
          var m = (document.currentScript && document.currentScript.src || '')
            .match(/[?&]v=([^&#]+)/);
          if (m) return '?v=' + m[1];
          var tag = document.querySelector('script[src*="motor.js"]');
          var m2 = tag && tag.src.match(/[?&]v=([^&#]+)/);
          return m2 ? '?v=' + m2[1] : '';
        } catch (e) { return ''; }
      })();
      return Promise.all([
        fetch(base + "perguntas.json" + v).then(r => r.json()),
        fetch(base + "competencias.json" + v).then(r => r.json()),
        fetch(base + "regras.json" + v).then(r => r.json())
      ]).then(function (res) {
        IMDMotor.dados.perguntas = res[0].perguntas;
        IMDMotor.dados.competencias = res[1].competencias;
        IMDMotor.dados.regras = res[2];
        return IMDMotor.dados;
      });
    },

    /* ---- Início / reset do diagnóstico ---- */
    iniciar: function () {
      this.estado = { respostas: {}, ordem: [], inicio: Date.now(), fim: null };
    },

    /* ---- Avaliação de condição (árvore adaptativa) ---- */
    _condicaoOk: function (pergunta) {
      if (!pergunta.condicao) return true;
      var r = this.estado.respostas;
      return pergunta.condicao.every(function (c) {
        var resp = r[c.se];
        if (!resp) return false;              // pergunta-pré ainda não respondida
        var v = resp.pontos;
        switch (c.op) {
          case ">=": return v >= c.valor;
          case ">":  return v >  c.valor;
          case "<=": return v <= c.valor;
          case "<":  return v <  c.valor;
          case "==": return v === c.valor;
          default:   return false;
        }
      });
    },

    /* ---- Próxima pergunta válida ainda não respondida ---- */
    proxima: function () {
      var self = this;
      var p = this.dados.perguntas.find(function (q) {
        return !self.estado.respostas[q.id] && self._condicaoOk(q);
      });
      return p || null;
    },

    /* ---- Registrar resposta ---- */
    responder: function (perguntaId, indiceOpcao) {
      var p = this.dados.perguntas.find(function (q) { return q.id === perguntaId; });
      if (!p) return;
      var op = p.opcoes[indiceOpcao];
      this.estado.respostas[perguntaId] = {
        pontos: op.pontos,
        risco: (typeof op.risco === "number" ? op.risco : 0),
        opcao: indiceOpcao
      };
      if (this.estado.ordem.indexOf(perguntaId) === -1) this.estado.ordem.push(perguntaId);
    },

    /* ---- Progresso estimado (0..1) ----
       Como o quiz é adaptativo, estimamos com base nas perguntas
       atualmente elegíveis (respondidas + a próxima desbloqueada). */
    progresso: function () {
      var self = this;
      var elegiveis = this.dados.perguntas.filter(function (q) {
        return self.estado.respostas[q.id] || self._condicaoOk(q);
      });
      var feitas = this.estado.ordem.length;
      var total = Math.max(elegiveis.length, feitas + (this.proxima() ? 1 : 0));
      return total ? Math.min(feitas / total, 1) : 0;
    },

    /* ---- Pontuação por pilar (0..100) ---- */
    _pontuacaoPilares: function () {
      var pilares = this.dados.regras.pilares;
      var acc = {}; // pilar -> { obtido, max }
      Object.keys(pilares).forEach(function (k) { acc[k] = { obtido: 0, max: 0 }; });

      var self = this;
      this.dados.perguntas.forEach(function (q) {
        var resp = self.estado.respostas[q.id];
        if (!resp) return; // só conta o que foi de fato perguntado
        var maxOp = Math.max.apply(null, q.opcoes.map(function (o) { return o.pontos; }));
        acc[q.pilar].obtido += resp.pontos;
        acc[q.pilar].max += maxOp;
      });

      var out = {};
      Object.keys(pilares).forEach(function (k) {
        out[k] = acc[k].max > 0 ? Math.round((acc[k].obtido / acc[k].max) * 100) : 0;
      });
      return out;
    },

    /* ---- Pontuação por competência (0..100) ---- */
    _pontuacaoCompetencias: function () {
      var comps = this.dados.competencias;
      var acc = {};
      var self = this;
      this.dados.perguntas.forEach(function (q) {
        var resp = self.estado.respostas[q.id];
        if (!resp) return;
        var c = q.competencia;
        if (!acc[c]) acc[c] = { obtido: 0, max: 0 };
        var maxOp = Math.max.apply(null, q.opcoes.map(function (o) { return o.pontos; }));
        acc[c].obtido += resp.pontos;
        acc[c].max += maxOp;
      });
      var out = {};
      Object.keys(acc).forEach(function (c) {
        out[c] = {
          nome: comps[c] ? comps[c].nome : c,
          pilar: comps[c] ? comps[c].pilar : null,
          valor: acc[c].max > 0 ? Math.round((acc[c].obtido / acc[c].max) * 100) : 0
        };
      });
      return out;
    },

    /* ---- Perfil de RISCO (eixo independente, NÃO entra no IMD) ----
       Lê o campo 'risco' de cada resposta (-2..+2), soma, e normaliza
       de 0 a 100 com base no mínimo/máximo possível das perguntas que
       a pessoa de fato respondeu. 0 = ultraconservador, 100 = ultra-agressivo. */
    _calcularRisco: function () {
      var self = this;
      var soma = 0, min = 0, max = 0, contou = 0;

      this.dados.perguntas.forEach(function (q) {
        var resp = self.estado.respostas[q.id];
        if (!resp) return;
        // só considera perguntas que têm sinal de risco em alguma opção
        var riscos = q.opcoes.map(function (o) {
          return (typeof o.risco === "number" ? o.risco : 0);
        });
        var temSinal = riscos.some(function (v) { return v !== 0; });
        if (!temSinal) return;
        soma += resp.risco;
        min += Math.min.apply(null, riscos);
        max += Math.max.apply(null, riscos);
        contou++;
      });

      // sem nenhuma pergunta de risco respondida → moderado neutro (50)
      if (contou === 0 || max === min) {
        return { valor: 50, perfil: this._perfilRiscoPor(50), respondidas: 0 };
      }

      var valor = Math.round(((soma - min) / (max - min)) * 100);
      valor = Math.max(0, Math.min(100, valor));
      return { valor: valor, perfil: this._perfilRiscoPor(valor), respondidas: contou };
    },

    _perfilRiscoPor: function (valor) {
      var faixas = (this.dados.regras.perfilRisco || []);
      return faixas.find(function (f) {
        return valor >= f.min && valor <= f.max;
      }) || null;
    },

    /* ---- Cálculo final do IMD ---- */
    calcular: function () {
      this.estado.fim = this.estado.fim || Date.now();
      var regras = this.dados.regras;
      var pilares = this._pontuacaoPilares();

      // média ponderada
      var bruto = 0;
      Object.keys(regras.pilares).forEach(function (k) {
        bruto += pilares[k] * regras.pilares[k].peso;
      });

      // penalidades
      var imd = bruto;
      var aplicadas = [];
      (regras.penalidades || []).forEach(function (pen) {
        var valorPilar = pilares[pen.pilar];
        if (valorPilar < pen.abaixoDe) {
          if (pen.tipo === "multiplicador") {
            imd = imd * pen.fator;
            aplicadas.push(pen);
          } else if (pen.tipo === "teto" && imd > pen.teto) {
            imd = pen.teto;
            aplicadas.push(pen);
          }
        }
      });

      /* ── TETO POR TRILHA ────────────────────────────────────────
         O pilar e' medido contra o maximo PERGUNTADO, e o maximo depende
         da trilha. Sem isto, acertar tudo na trilha de iniciante dava 97
         ("Nativo DeFi") com 12 perguntas, contra 100 com 30 na avancada
         -- e ser honesto sobre ser avancado so rendia mais chance de
         errar. A trilha agora define ate onde o diagnostico pode ir.
         Configurado em regras.json; ausente, nada muda.               */
      var trilha = null;
      var respondidas = Object.keys(this.estado.respostas);
      (regras.trilhas || []).some(function (t) {
        var achou = respondidas.some(function (id) {
          return String(id).indexOf(t.prefixo + '-') === 0;
        });
        if (achou) { trilha = t; return true; }
        return false;
      });
      /* NAO entra na lista de penalidades: teto de trilha nao e' castigo,
         e' o alcance do diagnostico. Vai separado em `trilha`, e a tela
         explica em vez de mostrar um aviso vermelho. */
      var tetoAplicado = false;
      if (trilha && imd > trilha.teto) { imd = trilha.teto; tetoAplicado = true; }

      imd = Math.max(0, Math.min(100, Math.round(imd)));

      // perfil
      var perfil = (regras.perfis || []).find(function (p) {
        return imd >= p.min && imd <= p.max;
      }) || null;

      var tempo = this.estado.inicio
        ? Math.round((this.estado.fim - this.estado.inicio) / 1000)
        : 0;

      return {
        imd: imd,
        bruto: Math.round(bruto),
        trilha: trilha ? { id: trilha.id, teto: trilha.teto, rotulo: trilha.rotulo,
                            motivo: trilha.motivo, limitou: tetoAplicado } : null,
        perfil: perfil,
        risco: this._calcularRisco(),
        pilares: pilares,
        competencias: this._pontuacaoCompetencias(),
        penalidades: aplicadas,
        respostas: this._respostasResumo(),
        tempoConclusao: tempo,
        totalPerguntas: this.estado.ordem.length
      };
    },

    _respostasResumo: function () {
      var out = {};
      var self = this;
      Object.keys(this.estado.respostas).forEach(function (id) {
        out[id] = {
          pontos: self.estado.respostas[id].pontos,
          opcao: self.estado.respostas[id].opcao
        };
      });
      return out;
    }
  };

  global.IMDMotor = IMDMotor;
})(window);
