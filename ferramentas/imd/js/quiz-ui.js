/* ============================================================
   IMD — js/quiz-ui.js
   Controla a tela do quiz (quiz.html).
   Depende de: motor.js, app.js (IMDApp), confetti.js
   ============================================================ */
(function (global) {
  "use strict";

  var M = global.IMDMotor;
  var App = global.IMDApp;

  var els = {};

  function cache() {
    els.progresso   = document.getElementById("barra-progresso");
    els.passo       = document.getElementById("passo-label");
    els.pilarTag    = document.getElementById("pilar-tag");
    els.pergunta    = document.getElementById("pergunta-texto");
    els.opcoes      = document.getElementById("opcoes");
    els.voltar      = document.getElementById("btn-voltar");
    els.card        = document.getElementById("quiz-card");
    els.conclusao   = document.getElementById("conclusao");
    els.imdPrevia   = document.getElementById("imd-previa");
  }

  function pilarInfo(chave) {
    return (M.dados.regras.pilares || {})[chave] || { nome: "", icone: "", cor: "#888" };
  }

  function render() {
    var q = M.proxima();

    // progresso
    var pct = Math.round(M.progresso() * 100);
    els.progresso.style.width = pct + "%";
    els.passo.textContent = "Pergunta " + (M.estado.ordem.length + (q ? 1 : 0));

    els.voltar.style.visibility = M.estado.ordem.length > 0 ? "visible" : "hidden";

    if (!q) { finalizar(); return; }

    var pi = pilarInfo(q.pilar);
    els.pilarTag.innerHTML =
      '<span style="color:' + pi.cor + '">' + pi.icone + "</span> " + pi.nome;
    els.pilarTag.style.borderColor = pi.cor + "55";

    els.pergunta.textContent = q.texto;

    els.opcoes.innerHTML = "";
    q.opcoes.forEach(function (op, idx) {
      var b = document.createElement("button");
      b.className = "opcao";
      b.type = "button";
      b.innerHTML =
        '<span class="opcao-marca"></span><span class="opcao-txt">' +
        App.escapar(op.texto) + "</span>";
      b.addEventListener("click", function () { escolher(q.id, idx, b); });
      els.opcoes.appendChild(b);
    });

    // animação de entrada
    els.card.classList.remove("entra");
    void els.card.offsetWidth;
    els.card.classList.add("entra");
  }

  function escolher(id, idx, botao) {
    botao.classList.add("selecionada");
    M.responder(id, idx);
    setTimeout(render, 220);
  }

  function voltar() {
    var ordem = M.estado.ordem;
    if (!ordem.length) return;
    var ultimo = ordem.pop();
    delete M.estado.respostas[ultimo];
    render();
  }

  function finalizar() {
    var resultado = M.calcular();
    App.salvarResultado(resultado);

    // prévia animada do número
    els.conclusao.classList.add("ativa");
    App.animarNumero(els.imdPrevia, 0, resultado.imd, 1400);

    if (global.IMDConfetti) {
      setTimeout(function () { global.IMDConfetti.disparar(); }, 250);
    }
  }

  function init() {
    cache();
    els.voltar.addEventListener("click", voltar);

    App.carregarDados()
      .then(function () {
        M.iniciar();
        render();
      })
      .catch(function (e) {
        App.erroDados(els.pergunta);
        console.error(e);
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);
