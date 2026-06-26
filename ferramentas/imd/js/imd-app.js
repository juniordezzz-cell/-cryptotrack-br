/* ============================================================
   IMD — js/imd-app.js
   Ponte entre a CASCA (mockup "Mundo DeFi Intelligence",
   página única com telas) e o MIOLO (motor.js, dados, firebase).

   NÃO altera lógica: apenas lê o que motor.js expõe
   (carregar / iniciar / proxima / responder / progresso / calcular)
   e pinta as telas do mockup com dados reais.
   ============================================================ */
(function (global) {
  "use strict";

  var M = global.IMDMotor;
  var App = global.IMDApp;        // utilitários (escapar, animarNumero) do app.js original
  var Fire = global.IMDFire;      // firebase.js (login + salvar + modo local)

  var ui = {
    pronto: false,
    resultado: null,
    _el: {}
  };

  /* ---------------- Navegação entre telas ---------------- */
  function telas() {
    return Array.prototype.slice.call(document.querySelectorAll(".stage"));
  }
  function irPara(id) {
    telas().forEach(function (s) { s.classList.remove("active"); });
    var alvo = document.getElementById(id);
    if (alvo) alvo.classList.add("active");
    global.scrollTo({ top: 0, behavior: "smooth" });
  }
  // exposto pro onclick="go('...')" do HTML
  global.go = irPara;

  /* ---------------- Helpers de pilar ---------------- */
  function pilarInfo(chave) {
    return (M.dados.regras.pilares || {})[chave] ||
      { nome: chave, icone: "", cor: "#888", desc: "" };
  }

  /* ============================================================
     CADASTRO — nome + faixa etária (antes do quiz)
     ============================================================ */
  var usuario = { nome: "", idade: "" };

  function primeiroNome(s) {
    s = (s || "").trim();
    if (!s) return "";
    // pega só a primeira palavra e capitaliza
    var p = s.split(/\s+/)[0];
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }

  function wireCadastro() {
    var inputNome = document.getElementById("imd-nome");
    var opcoesIdade = document.getElementById("imd-idade-opcoes");
    var btnContinuar = document.getElementById("imd-cadastro-continuar");
    var aviso = document.getElementById("imd-cadastro-aviso");
    if (!inputNome || !opcoesIdade || !btnContinuar) return;

    function validar() {
      var nomeOk = inputNome.value.trim().length >= 2;
      var idadeOk = !!usuario.idade;
      var ok = nomeOk && idadeOk;
      btnContinuar.disabled = !ok;
      btnContinuar.style.opacity = ok ? "1" : ".5";
      return ok;
    }

    inputNome.addEventListener("input", function () {
      usuario.nome = primeiroNome(inputNome.value);
      validar();
    });

    // seleção de faixa etária (estilo .choice do mockup)
    opcoesIdade.querySelectorAll(".choice").forEach(function (c) {
      c.addEventListener("click", function () {
        opcoesIdade.querySelectorAll(".choice").forEach(function (x) {
          x.classList.remove("active");
        });
        c.classList.add("active");
        usuario.idade = c.getAttribute("data-idade");
        validar();
      });
    });

    btnContinuar.addEventListener("click", function () {
      if (!validar()) {
        if (aviso) aviso.textContent = "Preencha seu nome e escolha uma faixa de idade.";
        return;
      }
      iniciarQuiz();
    });
  }

  /* Mensagens de incentivo ancoradas no PROGRESSO (não no nº fixo de pergunta),
     porque o quiz é adaptativo e cada pessoa percorre um caminho diferente. */
  function atualizarSaudacao() {
    var el = document.getElementById("imd-saudacao");
    if (!el) return;
    var nome = usuario.nome || "";
    var pct = M.progresso();
    var msg;
    if (M.estado.ordem.length === 0) {
      msg = nome ? ("Bem-vindo, " + nome + "! Vamos começar 👋") : "Vamos começar 👋";
    } else if (pct >= 0.45 && pct < 0.8) {
      msg = nome ? ("Você está indo muito bem, " + nome + "! 💪") : "Você está indo muito bem! 💪";
    } else if (pct >= 0.8) {
      msg = nome ? ("Quase lá, " + nome + "! 🚀") : "Quase lá! 🚀";
    } else {
      msg = nome ? ("Seguindo com você, " + nome) : "";
    }
    el.textContent = msg;
  }

  /* ============================================================
     QUIZ — render adaptativo real
     ============================================================ */
  function renderPergunta() {
    var q = M.proxima();

    atualizarSaudacao();

    // progresso real (0..100)
    var pct = Math.round(M.progresso() * 100);
    var bar = ui._el.quizBar;
    if (bar) bar.style.width = pct + "%";

    // rótulo de etapa = pilar da pergunta atual
    if (!q) { finalizarQuiz(); return; }

    var pi = pilarInfo(q.pilar);
    if (ui._el.etapa) {
      ui._el.etapa.textContent = "Etapa atual: " + pi.nome;
    }
    if (ui._el.passoLabel) {
      ui._el.passoLabel.textContent = "Pergunta " + (M.estado.ordem.length + 1);
    }

    // enunciado
    if (ui._el.pergunta) ui._el.pergunta.textContent = q.texto;

    // opções
    var box = ui._el.choices;
    box.innerHTML = "";
    q.opcoes.forEach(function (op, idx) {
      var div = document.createElement("div");
      div.className = "choice";
      div.textContent = op.texto;
      div.addEventListener("click", function () {
        escolher(q.id, idx, div);
      });
      box.appendChild(div);
    });

    // botão Voltar só aparece se já há histórico
    if (ui._el.btnVoltar) {
      ui._el.btnVoltar.style.visibility =
        M.estado.ordem.length > 0 ? "visible" : "hidden";
    }
  }

  function escolher(id, idx, elemento) {
    // marca visual (classe .active do mockup)
    var irmaos = ui._el.choices.querySelectorAll(".choice");
    irmaos.forEach(function (c) { c.classList.remove("active"); });
    elemento.classList.add("active");

    M.responder(id, idx);
    // pequena pausa pro usuário ver a seleção, depois avança
    setTimeout(renderPergunta, 260);
  }

  function voltar() {
    var ordem = M.estado.ordem;
    if (!ordem.length) { irPara("screen-intro"); return; }
    var ultimo = ordem.pop();
    delete M.estado.respostas[ultimo];
    renderPergunta();
  }

  function iniciarQuiz() {
    M.iniciar();
    renderPergunta();
    irPara("screen-quiz");
  }

  /* ============================================================
     PROCESSING → calcula e segue pro resultado
     ============================================================ */
  function finalizarQuiz() {
    ui.resultado = M.calcular();
    ui.resultado.cadastro = { nome: usuario.nome || null, idade: usuario.idade || null };
    App.salvarResultado(ui.resultado);  // sessionStorage (usado pelo firebase salvar)
    irPara("screen-processing");

    // tempo do spinner: experiência do mockup (~1.6s)
    setTimeout(function () {
      renderResultado(ui.resultado);
      irPara("screen-result");
      if (global.IMDConfetti) {
        setTimeout(function () { global.IMDConfetti.disparar(); }, 200);
      }
    }, 1600);
  }

  /* ============================================================
     RESULTADO — preenche a tela com dados reais
     ============================================================ */
  function renderResultado(r) {
    if (!r) return;
    var pilares = M.dados.regras.pilares || {};

    // ----- Parabéns pelo nome (acolhimento final) -----
    var elParabens = document.getElementById("imd-parabens");
    if (elParabens) {
      elParabens.textContent = usuario.nome
        ? ("Parabéns, " + usuario.nome + "! Você concluiu seu diagnóstico 🎉")
        : "Diagnóstico concluído 🎉";
    }

    // ----- Score grande (IMD) -----
    var elScore = document.getElementById("imd-score");
    if (elScore) {
      App.animarNumero(elScore, 0, r.imd, 1400);
    }

    // ----- Perfil (nome + emoji + cor + resumo) -----
    var perfil = r.perfil || { nome: "—", emoji: "", cor: "#fff", resumo: "" };
    var elPerfilNome = document.getElementById("imd-perfil-nome");
    if (elPerfilNome) {
      elPerfilNome.textContent =
        (perfil.emoji ? perfil.emoji + " " : "") + perfil.nome;
    }
    var elDiag = document.getElementById("imd-diagnostico");
    if (elDiag) elDiag.textContent = perfil.resumo || "";

    // ----- Selo do PERFIL DE RISCO (eixo separado do IMD) -----
    var risco = r.risco || {};
    var rp = risco.perfil || { nome: "—", emoji: "", cor: "#fff", resumo: "" };
    var elRiscoNome = document.getElementById("imd-risco-nome");
    if (elRiscoNome) {
      elRiscoNome.textContent = (rp.emoji ? rp.emoji + " " : "") + rp.nome;
      elRiscoNome.style.color = rp.cor;
    }
    var elRiscoResumo = document.getElementById("imd-risco-resumo");
    if (elRiscoResumo) elRiscoResumo.textContent = rp.resumo || "";

    // ----- 4 checkpoints = 4 pilares reais -----
    var grid = document.getElementById("imd-pilares");
    if (grid) {
      grid.innerHTML = "";
      Object.keys(pilares).forEach(function (k) {
        var info = pilares[k];
        var val = r.pilares[k];
        var cp = document.createElement("div");
        cp.className = "checkpoint";
        cp.innerHTML =
          '<span>' + info.icone + " " + App.escapar(info.nome) + "</span>" +
          '<b style="color:' + info.cor + '">' + val + "%</b>";
        grid.appendChild(cp);
      });
    }

    // ----- Penalidades (avisos), se houver -----
    var avisos = document.getElementById("imd-penalidades");
    if (avisos) {
      if (r.penalidades && r.penalidades.length) {
        avisos.style.display = "block";
        avisos.innerHTML = r.penalidades.map(function (p) {
          return '<div class="checkpoint" style="border-color:rgba(255,110,143,.4);background:rgba(255,110,143,.08)">' +
            '<span>⚠ ' + App.escapar(p.rotulo) + "</span>" +
            '<b style="color:var(--danger);font-weight:600;font-size:12px">penalidade aplicada</b>' +
            "</div>";
        }).join("");
      } else {
        avisos.style.display = "none";
      }
    }

    // ----- Radar real dos 4 pilares -----
    desenharRadar(r.pilares, pilares);

    // ----- Próximas etapas (competências mais fracas) -----
    renderProximasEtapas(r);

    // ----- Ferramentas recomendadas (dinâmicas) -----
    renderFerramentas(r);

    // ----- Bloco salvar (Firebase + LGPD) -----
    wireSalvar(r);
  }

  /* ============================================================
     RADAR — SVG nativo dos 4 pilares (0..100)
     Sem libs. Casca pura: só desenha r.pilares.
     ============================================================ */
  function desenharRadar(valores, meta) {
    var host = document.getElementById("imd-radar");
    if (!host) return;

    var chaves = Object.keys(meta);          // seguranca, fundamentos, defi, autonomia
    var n = chaves.length;
    var size = 300, cx = size / 2, cy = size / 2, raioMax = 110;
    var niveis = 4;

    function ponto(i, raio) {
      // começa no topo (-90°) e gira no sentido horário
      var ang = (-Math.PI / 2) + (i * 2 * Math.PI / n);
      return [cx + raio * Math.cos(ang), cy + raio * Math.sin(ang)];
    }

    var svg = '<svg viewBox="0 0 ' + size + ' ' + size + '" width="100%" height="100%" style="max-height:300px">';

    // grades concêntricas
    for (var g = 1; g <= niveis; g++) {
      var rr = raioMax * (g / niveis);
      var pts = [];
      for (var i = 0; i < n; i++) {
        var p = ponto(i, rr);
        pts.push(p[0].toFixed(1) + "," + p[1].toFixed(1));
      }
      svg += '<polygon points="' + pts.join(" ") +
        '" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1"/>';
    }

    // eixos + rótulos
    for (var j = 0; j < n; j++) {
      var eixo = ponto(j, raioMax);
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + eixo[0].toFixed(1) +
        '" y2="' + eixo[1].toFixed(1) + '" stroke="rgba(255,255,255,.10)" stroke-width="1"/>';
      var lab = ponto(j, raioMax + 22);
      var info = meta[chaves[j]];
      var anchor = "middle";
      if (lab[0] < cx - 10) anchor = "end";
      else if (lab[0] > cx + 10) anchor = "start";
      svg += '<text x="' + lab[0].toFixed(1) + '" y="' + lab[1].toFixed(1) +
        '" fill="' + info.cor + '" font-size="13" font-weight="700" ' +
        'text-anchor="' + anchor + '" dominant-baseline="middle">' +
        info.icone + " " + info.nome + "</text>";
    }

    // polígono dos valores
    var valPts = [];
    for (var k = 0; k < n; k++) {
      var v = Math.max(0, Math.min(100, valores[chaves[k]] || 0));
      var pv = ponto(k, raioMax * (v / 100));
      valPts.push(pv[0].toFixed(1) + "," + pv[1].toFixed(1));
    }
    svg += '<defs><linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#9b5cff" stop-opacity=".55"/>' +
      '<stop offset="100%" stop-color="#28d7b7" stop-opacity=".45"/>' +
      "</linearGradient></defs>";
    svg += '<polygon points="' + valPts.join(" ") +
      '" fill="url(#radarFill)" stroke="#b97cff" stroke-width="2" stroke-linejoin="round"/>';

    // vértices
    for (var m = 0; m < n; m++) {
      var coord = valPts[m].split(",");
      svg += '<circle cx="' + coord[0] + '" cy="' + coord[1] +
        '" r="3.5" fill="#fff"/>';
    }

    svg += "</svg>";
    host.innerHTML = svg;
  }

  /* ============================================================
     PRÓXIMAS ETAPAS — competências mais fracas viram trilha
     (lê r.competencias, ordena crescente, pega as 5 menores)
     ============================================================ */
  function renderProximasEtapas(r) {
    var host = document.getElementById("imd-proximas");
    if (!host) return;

    var lista = Object.keys(r.competencias)
      .map(function (k) { return r.competencias[k]; })
      .sort(function (a, b) { return a.valor - b.valor; })
      .slice(0, 5);

    host.innerHTML = lista.map(function (c) {
      var pi = pilarInfo(c.pilar);
      var rotulo = c.valor < 50 ? "Quero aprender" :
                   c.valor < 80 ? "Posso melhorar" : "Já domino";
      return '<div class="tl-item">' +
        '<span style="color:' + pi.cor + '">' + App.escapar(c.nome) + "</span>" +
        '<span class="muted">' + rotulo + "</span>" +
        "</div>";
    }).join("");
  }

  /* ============================================================
     FERRAMENTAS RECOMENDADAS — dinâmicas pelo pilar mais fraco
     ============================================================ */
  function renderFerramentas(r) {
    var host = document.getElementById("imd-ferramentas");
    if (!host) return;

    // catálogo: pilar -> ferramentas sugeridas (rótulo + link relativo ao site)
    var CATALOGO = {
      seguranca: [
        { ico: "🔐", nome: "Guia de Carteiras & Seed", url: "/estudos" },
        { ico: "🛡", nome: "Checklist de Segurança", url: "/estudos" }
      ],
      fundamentos: [
        { ico: "📈", nome: "Calculadora de Juros Compostos", url: "/ferramentas/juros-compostos" },
        { ico: "🪙", nome: "Conversor Cripto/Real", url: "/ferramentas/conversor" }
      ],
      defi: [
        { ico: "🌊", nome: "Simulador de Pool de Liquidez", url: "/ferramentas/pool-liquidez" },
        { ico: "💧", nome: "Simulador de Staking", url: "/ferramentas/staking" }
      ],
      autonomia: [
        { ico: "📊", nome: "Comparador de Ativos", url: "/ferramentas/comparador-de-ativos" },
        { ico: "💱", nome: "Câmbio", url: "/ferramentas/cambio" }
      ]
    };

    // ordena pilares do mais fraco pro mais forte
    var ordem = Object.keys(r.pilares).sort(function (a, b) {
      return r.pilares[a] - r.pilares[b];
    });

    // monta até 4 recomendações priorizando os pilares mais fracos
    var recs = [];
    ordem.forEach(function (pilar) {
      (CATALOGO[pilar] || []).forEach(function (f) {
        if (recs.length < 4) recs.push(f);
      });
    });

    host.innerHTML = recs.map(function (f) {
      return '<li><a href="' + f.url + '" style="color:inherit;text-decoration:none">' +
        f.ico + " " + App.escapar(f.nome) + "</a></li>";
    }).join("");
  }

  /* ============================================================
     SALVAR — Firebase (login Google + LGPD) ou modo local
     Reaproveita a mesma lógica do app.js original, adaptada
     aos ids da casca nova.
     ============================================================ */
  function wireSalvar(r) {
    var bloco = document.getElementById("imd-salvar");
    if (!bloco) return;

    var statusEl = document.getElementById("imd-salvar-status");
    var btnLogin = document.getElementById("imd-btn-login");
    var btnSalvar = document.getElementById("imd-btn-salvar");
    var consentBox = document.getElementById("imd-consentimentos");

    function checks() {
      return Array.prototype.slice.call(
        bloco.querySelectorAll('input[type="checkbox"]'));
    }
    function todosAceitos() {
      var cs = checks();
      return cs.length > 0 && cs.every(function (c) { return c.checked; });
    }
    function atualizarBtn() {
      if (btnSalvar) {
        btnSalvar.disabled = !(Fire && Fire.getUser && Fire.getUser() && todosAceitos());
      }
    }

    // Modo local (sem chaves Firebase)
    if (!Fire || !Fire.configurado) {
      if (statusEl) {
        statusEl.innerHTML =
          "Modo local ativo — login e salvamento ficam disponíveis assim que " +
          "as chaves do Firebase forem preenchidas em <code>firebase/config.js</code>.";
      }
      if (btnLogin) btnLogin.style.display = "none";
      if (consentBox) consentBox.style.opacity = ".5";
      return;
    }

    bloco.addEventListener("change", atualizarBtn);

    function refletirAuth() {
      var u = Fire.getUser();
      if (u) {
        if (btnLogin) btnLogin.style.display = "none";
        if (consentBox) consentBox.style.display = "block";
        if (btnSalvar) btnSalvar.style.display = "inline-flex";
        if (statusEl) statusEl.textContent =
          "Conectado como " + (u.displayName || u.email) + ".";
      } else {
        if (btnLogin) btnLogin.style.display = "inline-flex";
        if (consentBox) consentBox.style.display = "none";
        if (btnSalvar) btnSalvar.style.display = "none";
        if (statusEl) statusEl.textContent =
          "Entre com o Google para salvar seu diagnóstico.";
      }
      atualizarBtn();
    }

    document.addEventListener("imd:auth", refletirAuth);
    refletirAuth();

    if (btnLogin) {
      btnLogin.addEventListener("click", function () {
        btnLogin.disabled = true;
        Fire.login()
          .catch(function (e) {
            if (statusEl) statusEl.textContent = "Não foi possível entrar. Tente de novo.";
            console.error(e);
          })
          .finally(function () { btnLogin.disabled = false; });
      });
    }

    if (btnSalvar) {
      btnSalvar.addEventListener("click", function () {
        btnSalvar.disabled = true;
        if (statusEl) statusEl.textContent = "Salvando…";
        var consentimento = {
          armazenamento: !!(document.getElementById("c-armazenamento") || {}).checked,
          historico: !!(document.getElementById("c-historico") || {}).checked,
          analise: !!(document.getElementById("c-analise") || {}).checked,
          educacional: !!(document.getElementById("c-educacional") || {}).checked,
          aceitoEm: new Date().toISOString()
        };
        Fire.salvarDiagnostico(r, consentimento)
          .then(function () {
            if (statusEl) statusEl.textContent = "✅ Diagnóstico salvo no seu perfil!";
            btnSalvar.textContent = "Salvo";
          })
          .catch(function (e) {
            if (statusEl) statusEl.textContent = "Erro ao salvar. Tente novamente.";
            btnSalvar.disabled = false;
            console.error(e);
          });
      });
    }
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function cache() {
    ui._el.quizBar    = document.getElementById("imd-quiz-bar");
    ui._el.etapa      = document.getElementById("imd-etapa");
    ui._el.passoLabel = document.getElementById("imd-passo");
    ui._el.pergunta   = document.getElementById("imd-pergunta");
    ui._el.choices    = document.getElementById("imd-choices");
    ui._el.btnVoltar  = document.getElementById("imd-btn-voltar");
  }

  function init() {
    cache();

    // liga a tela de cadastro (nome + faixa etária → inicia o quiz)
    wireCadastro();

    if (ui._el.btnVoltar) {
      ui._el.btnVoltar.addEventListener("click", voltar);
    }

    // ano no rodapé, se houver
    var ano = document.getElementById("ano");
    if (ano) ano.textContent = new Date().getFullYear();

    // carrega dados do motor (perguntas/competencias/regras)
    App.carregarDados()
      .then(function () {
        ui.pronto = true;
      })
      .catch(function (e) {
        console.error(e);
        var alvo = document.getElementById("imd-pergunta");
        if (alvo) App.erroDados(alvo);
      });
  }

  global.IMDUI = { irPara: irPara, _ui: ui };
  document.addEventListener("DOMContentLoaded", init);
})(window);
