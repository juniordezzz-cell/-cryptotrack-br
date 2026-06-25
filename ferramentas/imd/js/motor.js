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
      var base = (function () {
        // caminho relativo à pasta /data a partir de qualquer página do projeto
        return "data/";
      })();
      return Promise.all([
        fetch(base + "perguntas.json").then(r => r.json()),
        fetch(base + "competencias.json").then(r => r.json()),
        fetch(base + "regras.json").then(r => r.json())
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
      this.estado.respostas[perguntaId] = { pontos: op.pontos, opcao: indiceOpcao };
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
        perfil: perfil,
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
        out[id] = self.estado.respostas[id].pontos;
      });
      return out;
    }
  };

  global.IMDMotor = IMDMotor;
})(window);
