/* ============================================================
   MDF-AVATARS — avatares do MundoDeFi
   ------------------------------------------------------------
   7 personagens desenhados em SVG (touro, urso, trader de óculos,
   robô, Bitcoin, Solana, Ethereum) + opção de enviar uma foto do
   computador. A escolha fica salva por usuário no localStorage
   (chave mdf_avatar_<uid>) — o gancho para migrar a Firestore
   depois já existe em setAvatar().

   API:
     MdfAvatars.svg(id)         -> string SVG do avatar
     MdfAvatars.lista()         -> [{id, nome}]
     MdfAvatars.getSalvo(uid)   -> valor salvo (id 'mdf:xxx' ou dataURL) | ''
     MdfAvatars.setSalvo(uid,v) -> grava a escolha
     MdfAvatars.pintar(el, val, nomeParaIniciais) -> desenha no elemento
     MdfAvatars.abrirSeletor({uid, aoEscolher}) -> abre o modal
   ============================================================ */
(function () {
  var C = {
    roxo:  "#9945FF",
    verde: "#14F195",
    ciano: "#22D3EE",
    ouro:  "#F5B614",
    azul:  "#4B96FF",
    btc:   "#F7931A",
    sol1:  "#9945FF",
    sol2:  "#14F195",
    eth:   "#8A92B2"
  };

  /* Cada avatar é um <svg> 100x100 com viewBox, sem largura fixa,
     pra escalar bonito em qualquer tamanho. */
  var AV = {
    touro: {
      nome: "Touro (Bull)",
      svg:
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="100" height="100" rx="50" fill="#0e1a14"/>' +
        '<path d="M32 38C20 34 14 24 16 16c9 3 15 10 19 18" fill="none" stroke="' + C.verde + '" stroke-width="5.5" stroke-linecap="round"/>' +
        '<path d="M68 38C80 34 86 24 84 16c-9 3-15 10-19 18" fill="none" stroke="' + C.verde + '" stroke-width="5.5" stroke-linecap="round"/>' +
        '<ellipse cx="30" cy="46" rx="7" ry="5" fill="' + C.verde + '"/><ellipse cx="70" cy="46" rx="7" ry="5" fill="' + C.verde + '"/>' +
        '<path d="M34 44h32c3 0 5 2 5 5v10c0 12-9 23-21 23S29 71 29 59V49c0-3 2-5 5-5z" fill="' + C.verde + '"/>' +
        '<ellipse cx="50" cy="68" rx="14" ry="10" fill="#0a140f"/>' +
        '<circle cx="44" cy="66" r="2.6" fill="' + C.verde + '"/><circle cx="56" cy="66" r="2.6" fill="' + C.verde + '"/>' +
        '<circle cx="42" cy="54" r="3.4" fill="#0a140f"/><circle cx="58" cy="54" r="3.4" fill="#0a140f"/>' +
        '</svg>'
    },
    urso: {
      nome: "Urso (Bear)",
      svg:
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="100" height="100" rx="50" fill="#1a0e12"/>' +
        '<circle cx="29" cy="33" r="11" fill="#FF4D6A"/><circle cx="71" cy="33" r="11" fill="#FF4D6A"/>' +
        '<circle cx="29" cy="33" r="5" fill="#1a0e12"/><circle cx="71" cy="33" r="5" fill="#1a0e12"/>' +
        '<circle cx="50" cy="54" r="27" fill="#FF4D6A"/>' +
        '<circle cx="41" cy="50" r="3.6" fill="#1a0e12"/><circle cx="59" cy="50" r="3.6" fill="#1a0e12"/>' +
        '<ellipse cx="50" cy="63" rx="12" ry="9" fill="#2a0f16"/>' +
        '<circle cx="50" cy="60" r="4" fill="#1a0e12"/>' +
        '<path d="M50 64v6" stroke="#1a0e12" stroke-width="3" stroke-linecap="round"/>' +
        '</svg>'
    },
    trader: {
      nome: "Trader de óculos",
      svg:
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="100" height="100" rx="50" fill="#12101c"/>' +
        '<circle cx="50" cy="44" r="24" fill="' + C.ouro + '"/>' +
        '<path d="M26 42c0-14 10-24 24-24s24 10 24 24" fill="#2a2233"/>' +
        '<rect x="30" y="46" width="16" height="12" rx="4" fill="#0b0b12" stroke="' + C.ciano + '" stroke-width="2.5"/>' +
        '<rect x="54" y="46" width="16" height="12" rx="4" fill="#0b0b12" stroke="' + C.ciano + '" stroke-width="2.5"/>' +
        '<path d="M46 52h8" stroke="' + C.ciano + '" stroke-width="2.5"/>' +
        '<path d="M38 70c3 5 21 5 24 0" fill="none" stroke="#12101c" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M50 68v20M40 88h20" stroke="' + C.ouro + '" stroke-width="6" stroke-linecap="round"/>' +
        '</svg>'
    },
    robo: {
      nome: "Robô",
      svg:
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="100" height="100" rx="50" fill="#0b1420"/>' +
        '<path d="M50 14v10" stroke="' + C.ciano + '" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="12" r="4" fill="' + C.ciano + '"/>' +
        '<rect x="28" y="30" width="44" height="38" rx="12" fill="#16233a" stroke="' + C.ciano + '" stroke-width="2.5"/>' +
        '<circle cx="41" cy="49" r="6" fill="' + C.ciano + '"/><circle cx="59" cy="49" r="6" fill="' + C.ciano + '"/>' +
        '<rect x="40" y="60" width="20" height="4" rx="2" fill="' + C.azul + '"/>' +
        '<rect x="34" y="72" width="32" height="14" rx="6" fill="#16233a" stroke="' + C.ciano + '" stroke-width="2.5"/>' +
        '</svg>'
    },
    btc: {
      nome: "Bitcoin",
      svg:
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="50" cy="50" r="50" fill="' + C.btc + '"/>' +
        '<path d="M44 28v8M54 28v8M44 64v8M54 64v8" stroke="#fff" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M38 34h20a10 10 0 0 1 0 20H38zM38 54h22a10 10 0 0 1 0 20H38z" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="M38 34v40" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' +
        '</svg>'
    },
    sol: {
      nome: "Solana",
      svg:
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<defs><linearGradient id="solg" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="' + C.sol1 + '"/><stop offset="1" stop-color="' + C.sol2 + '"/></linearGradient></defs>' +
        '<rect width="100" height="100" rx="50" fill="#0b0b14"/>' +
        '<path d="M32 34h40l-8 8H24z" fill="url(#solg)"/>' +
        '<path d="M32 58h40l-8-8H24z" fill="url(#solg)"/>' +
        '<path d="M32 70h40l-8-8H24z" fill="url(#solg)"/>' +
        '</svg>'
    },
    eth: {
      nome: "Ethereum",
      svg:
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="50" cy="50" r="50" fill="#131a2b"/>' +
        '<path d="M50 18l18 30-18 10-18-10z" fill="' + C.ciano + '" opacity=".95"/>' +
        '<path d="M50 18l18 30-18 10z" fill="#8fdcff"/>' +
        '<path d="M50 62l18-10-18 26-18-26z" fill="' + C.ciano + '" opacity=".95"/>' +
        '<path d="M50 62l18-10-18 26z" fill="#8fdcff"/>' +
        '</svg>'
    }
  };

  var ORDEM = ["btc", "eth", "sol", "touro", "urso", "trader", "robo"];

  function iniciais(nome) {
    var s = (nome || "").trim();
    if (!s) return "U";
    var p = s.split(/\s+/);
    return (p[0][0] + (p[1] ? p[1][0] : "")).toUpperCase();
  }

  function svgDataUrl(svg) {
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  var M = {
    lista: function () {
      return ORDEM.map(function (id) { return { id: id, nome: AV[id].nome }; });
    },
    svg: function (id) { return AV[id] ? AV[id].svg : ""; },

    getSalvo: function (uid) {
      try { return localStorage.getItem("mdf_avatar_" + uid) || ""; }
      catch (e) { return ""; }
    },
    setSalvo: function (uid, val) {
      try { localStorage.setItem("mdf_avatar_" + uid, val); } catch (e) {}
      /* GANCHO FIRESTORE (ativar quando decidirmos migrar):
         if (window.firebase && firebase.firestore && uid)
           firebase.firestore().collection("users").doc(uid)
             .set({ avatar: val }, { merge: true }); */
    },

    /* Desenha o valor salvo em qualquer elemento redondo.
       val pode ser: '' (usa iniciais), 'mdf:btc' (avatar do pacote),
       ou uma dataURL/URL de imagem (upload ou foto do Google). */
    pintar: function (el, val, nomeParaIniciais) {
      if (!el) return;
      if (val && val.indexOf("mdf:") === 0) {
        var id = val.slice(4);
        el.style.backgroundImage = 'url("' + svgDataUrl(this.svg(id)) + '")';
        el.textContent = "";
      } else if (val) {
        el.style.backgroundImage = 'url("' + val + '")';
        el.textContent = "";
      } else {
        el.style.backgroundImage = "none";
        el.textContent = iniciais(nomeParaIniciais);
      }
    },

    abrirSeletor: function (opts) {
      opts = opts || {};
      var uid = opts.uid || "anon";
      var self = this;
      if (document.getElementById("mdfAvOverlay")) return;

      var ov = document.createElement("div");
      ov.id = "mdfAvOverlay";
      ov.style.cssText =
        "position:fixed;inset:0;z-index:2000;background:rgba(4,4,10,.72);" +
        "display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px)";

      var grade = self.lista().map(function (a) {
        return (
          '<button class="mdf-av-opt" data-val="mdf:' + a.id + '" title="' + a.nome + '" ' +
          'style="all:unset;cursor:pointer;width:70px;height:70px;border-radius:50%;overflow:hidden;' +
          'border:2px solid transparent;background:#000;background-image:url(\'' +
          svgDataUrl(self.svg(a.id)) + '\');background-size:cover;transition:.15s"></button>'
        );
      }).join("");

      ov.innerHTML =
        '<div style="width:100%;max-width:420px;background:#12121a;border:1px solid #2a2a38;border-radius:18px;' +
        'padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.6);font-family:inherit;color:#EDF0F7">' +
        '<div style="font-size:1.05rem;font-weight:700;margin-bottom:4px">Escolha seu avatar</div>' +
        '<div style="font-size:.8rem;color:#9aa;margin-bottom:16px">Um personagem do MundoDeFi ou uma foto sua.</div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;justify-items:center;margin-bottom:18px">' +
        grade + "</div>" +
        '<label style="display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border:1px dashed #3a3a48;' +
        'border-radius:12px;cursor:pointer;font-size:.85rem;color:#cfcfe0">📷 Enviar foto do computador' +
        '<input type="file" id="mdfAvFile" accept="image/*" hidden></label>' +
        '<div style="display:flex;gap:10px;margin-top:18px">' +
        '<button id="mdfAvCancel" style="flex:1;padding:11px;border-radius:10px;border:1px solid #33333d;background:transparent;color:#cfcfe0;cursor:pointer;font:inherit">Cancelar</button>' +
        "</div></div>";

      document.body.appendChild(ov);

      function fechar() { ov.remove(); }
      function escolher(val) {
        self.setSalvo(uid, val);
        if (typeof opts.aoEscolher === "function") opts.aoEscolher(val);
        fechar();
      }

      ov.addEventListener("click", function (e) { if (e.target === ov) fechar(); });
      ov.querySelector("#mdfAvCancel").addEventListener("click", fechar);
      Array.prototype.forEach.call(ov.querySelectorAll(".mdf-av-opt"), function (b) {
        b.addEventListener("mouseenter", function () { b.style.borderColor = C.ouro; b.style.transform = "scale(1.08)"; });
        b.addEventListener("mouseleave", function () { b.style.borderColor = "transparent"; b.style.transform = "scale(1)"; });
        b.addEventListener("click", function () { escolher(b.getAttribute("data-val")); });
      });
      ov.querySelector("#mdfAvFile").addEventListener("change", function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        if (f.size > 900 * 1024) { alert("Imagem muito grande. Escolha uma foto de até ~900 KB."); return; }
        var r = new FileReader();
        r.onload = function () { escolher(r.result); };
        r.readAsDataURL(f);
      });
    }
  };

  window.MdfAvatars = M;
})();
