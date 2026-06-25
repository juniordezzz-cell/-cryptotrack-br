/* ============================================================
   IMD — js/app.js
   Utilitários compartilhados + lógica das telas
   (landing e resultado). Depende de motor.js e firebase.js.
   ============================================================ */
(function (global) {
  "use strict";

  var M = global.IMDMotor;
  var CHAVE = "IMD_RESULTADO";

  var IMDApp = {

    /* ---------- Dados ---------- */
    carregarDados: function () {
      return M.carregar();
    },

    erroDados: function (el) {
      if (el) {
        el.innerHTML =
          "Não consegui carregar as perguntas. Se você abriu o arquivo " +
          "com duplo-clique, suba o projeto no GitHub Pages (seu fluxo normal) " +
          "ou rode um servidor local — o navegador bloqueia leitura de JSON " +
          "via <code>file://</code>.";
      }
    },

    /* ---------- Persistência entre páginas ---------- */
    salvarResultado: function (resultado) {
      try {
        sessionStorage.setItem(CHAVE, JSON.stringify(resultado));
      } catch (e) { console.warn("sessionStorage indisponível", e); }
    },
    lerResultado: function () {
      try {
        var raw = sessionStorage.getItem(CHAVE);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    limparResultado: function () {
      try { sessionStorage.removeItem(CHAVE); } catch (e) {}
    },

    /* ---------- Helpers ---------- */
    escapar: function (s) {
      var d = document.createElement("div");
      d.textContent = s == null ? "" : String(s);
      return d.innerHTML;
    },

    animarNumero: function (el, de, ate, dur) {
      if (!el) return;
      var t0 = null;
      function passo(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        el.textContent = Math.round(de + (ate - de) * eased);
        if (p < 1) requestAnimationFrame(passo);
      }
      requestAnimationFrame(passo);
    },

    /* ============================================================
       LANDING (index.html)
       ============================================================ */
    initLanding: function () {
      this.limparResultado(); // começa limpo
      var ano = document.getElementById("ano");
      if (ano) ano.textContent = new Date().getFullYear();
    },

    /* ============================================================
       RESULTADO (resultado.html)
       ============================================================ */
    initResultado: function () {
      var r = this.lerResultado();
      if (!r) { location.replace("index.html"); return; }
      this._r = r;
      var self = this;
      var ano = document.getElementById("ano");
      if (ano) ano.textContent = new Date().getFullYear();

      // precisamos das definições de pilares (cor/ícone/desc) para renderizar
      this.carregarDados()
        .then(function () {
          self._renderResultado(r);
          self._wireSalvar(r);
        })
        .catch(function (e) {
          console.error(e);
          // fallback: renderiza mesmo sem metadados de pilar
          self._renderResultado(r);
          self._wireSalvar(r);
        });
    },

    _renderResultado: function (r) {
      var perfil = r.perfil || { nome: "—", emoji: "", cor: "#888", resumo: "" };

      // número + perfil
      var elNum = document.getElementById("res-imd");
      this.animarNumero(elNum, 0, r.imd, 1500);

      // anel (gauge) animado
      var anel = document.getElementById("res-anel");
      if (anel) {
        var raio = anel.r.baseVal.value;
        var circ = 2 * Math.PI * raio;
        anel.style.strokeDasharray = circ;
        anel.style.strokeDashoffset = circ;
        anel.style.stroke = perfil.cor;
        setTimeout(function () {
          anel.style.transition = "stroke-dashoffset 1.5s cubic-bezier(.22,1,.36,1)";
          anel.style.strokeDashoffset = circ * (1 - r.imd / 100);
        }, 80);
      }

      var nome = document.getElementById("res-perfil-nome");
      if (nome) nome.textContent = (perfil.emoji ? perfil.emoji + " " : "") + perfil.nome;
      var nomeEl = document.getElementById("res-perfil-nome");
      if (nomeEl) nomeEl.style.color = perfil.cor;
      var resumo = document.getElementById("res-perfil-resumo");
      if (resumo) resumo.textContent = perfil.resumo;

      var meta = document.getElementById("res-meta");
      if (meta) {
        meta.textContent = r.totalPerguntas + " perguntas · concluído em " +
          this._tempo(r.tempoConclusao);
      }

      // pilares
      var box = document.getElementById("res-pilares");
      if (box) {
        box.innerHTML = "";
        var pil = M.dados.regras.pilares || {};
        Object.keys(pil).forEach(function (k) {
          var info = pil[k];
          var val = r.pilares[k];
          var row = document.createElement("div");
          row.className = "pilar";
          row.innerHTML =
            '<div class="pilar-top">' +
              '<span class="pilar-nome">' + info.icone + " " + info.nome + "</span>" +
              '<span class="pilar-val" style="color:' + info.cor + '">' + val + "</span>" +
            "</div>" +
            '<div class="pilar-bar"><i style="background:' + info.cor + ';width:0"></i></div>' +
            '<div class="pilar-desc">' + info.desc + "</div>";
          box.appendChild(row);
          var fill = row.querySelector("i");
          setTimeout(function () {
            fill.style.transition = "width 1.1s cubic-bezier(.22,1,.36,1)";
            fill.style.width = val + "%";
          }, 200);
        });
      }

      // competências
      var comp = document.getElementById("res-competencias");
      if (comp) {
        var ordenadas = Object.keys(r.competencias)
          .map(function (k) { return r.competencias[k]; })
          .sort(function (a, b) { return b.valor - a.valor; });
        comp.innerHTML = "";
        ordenadas.forEach(function (c) {
          var pi = (M.dados.regras.pilares || {})[c.pilar] || { cor: "#888" };
          var chip = document.createElement("div");
          chip.className = "comp";
          chip.innerHTML =
            '<span class="comp-nome">' + IMDApp.escapar(c.nome) + "</span>" +
            '<span class="comp-bar"><i style="width:' + c.valor + "%;background:" + pi.cor + '"></i></span>' +
            '<span class="comp-val">' + c.valor + "</span>";
          comp.appendChild(chip);
        });
      }

      // penalidades
      var pen = document.getElementById("res-penalidades");
      if (pen) {
        if (r.penalidades && r.penalidades.length) {
          pen.style.display = "block";
          pen.innerHTML = r.penalidades.map(function (p) {
            return '<div class="aviso"><strong>⚠ ' + IMDApp.escapar(p.rotulo) +
              "</strong><span>" + IMDApp.escapar(p.motivo) + "</span></div>";
          }).join("");
        } else {
          pen.style.display = "none";
        }
      }
    },

    _tempo: function (s) {
      if (!s) return "—";
      var m = Math.floor(s / 60), seg = s % 60;
      return m ? (m + "min " + seg + "s") : (seg + "s");
    },

    /* ---------- Salvar (Firebase + LGPD) ---------- */
    _wireSalvar: function (r) {
      var Fire = global.IMDFire;
      var bloco = document.getElementById("bloco-salvar");
      if (!bloco) return;

      var statusEl = document.getElementById("salvar-status");
      var btnLogin = document.getElementById("btn-login");
      var btnSalvar = document.getElementById("btn-salvar");
      var consentBox = document.getElementById("consentimentos");
      var checks = function () {
        return Array.prototype.slice.call(
          bloco.querySelectorAll('input[type="checkbox"]')
        );
      };

      function todosAceitos() {
        return checks().length > 0 && checks().every(function (c) { return c.checked; });
      }
      function atualizarBtnSalvar() {
        if (btnSalvar) btnSalvar.disabled = !(Fire.getUser() && todosAceitos());
      }

      // Modo local (sem Firebase configurado)
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

      bloco.addEventListener("change", atualizarBtnSalvar);

      function refletirAuth() {
        var u = Fire.getUser();
        if (u) {
          if (btnLogin) btnLogin.style.display = "none";
          if (consentBox) consentBox.style.display = "block";
          if (btnSalvar) btnSalvar.style.display = "inline-flex";
          if (statusEl) statusEl.textContent = "Conectado como " + (u.displayName || u.email) + ".";
        } else {
          if (btnLogin) btnLogin.style.display = "inline-flex";
          if (consentBox) consentBox.style.display = "none";
          if (btnSalvar) btnSalvar.style.display = "none";
          if (statusEl) statusEl.textContent = "Entre com o Google para salvar seu diagnóstico.";
        }
        atualizarBtnSalvar();
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
            armazenamento: !!document.getElementById("c-armazenamento")?.checked,
            historico: !!document.getElementById("c-historico")?.checked,
            analise: !!document.getElementById("c-analise")?.checked,
            educacional: !!document.getElementById("c-educacional")?.checked,
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
  };

  global.IMDApp = IMDApp;
})(window);
