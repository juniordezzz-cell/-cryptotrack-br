/* Convite de conta gratuita usado nas prévias do portfólio. */
(function () {
  'use strict';
  if (window.MDFBanner) return;
  var B = {};
  B.duo = function (o) {
    o = o || {};
    var intro = o.intro != null ? o.intro : 'Os números desta tela são <b>fictícios</b>. Entre para criar sua carteira e acompanhar seus próprios resultados.';
    var sub = o.subFree != null ? o.subFree : '<a href="/portfolio/hold.html">ou começar sem conta →</a>';
    return '<div class="mdfb"><div class="mdfb-card mdfb-free">'
      + '<div class="mdfb-name">Gratuito</div>'
      + '<div class="mdfb-title">Comece o seu portfólio</div>'
      + '<div class="mdfb-desc">' + intro + '</div>'
      + '<div class="mdfb-feats">'
      + '<div class="mdfb-feat"><div class="mdfb-check">✓</div><div class="mdfb-ftext">Carteiras, metas e ativos ilimitados</div></div>'
      + '<div class="mdfb-feat"><div class="mdfb-check">✓</div><div class="mdfb-ftext">HOLD, DeFi, Trade, Nexus e exportação CSV</div></div>'
      + '<div class="mdfb-feat"><div class="mdfb-check">✓</div><div class="mdfb-ftext">Todas as ferramentas sem pagamento</div></div>'
      + '</div><button type="button" class="mdfb-btn mdfb-btn-free" id="mdfbFree">' + (o.ctaFree || 'Criar conta gratuita') + '</button>'
      + (sub ? '<div class="mdfb-btnsub">' + sub + '</div>' : '')
      + '</div></div>';
  };
  B.wire = function (acao, ids) {
    var fn = function (ev) { if (ev) ev.preventDefault(); if (typeof acao === 'function') acao(); };
    var el = document.getElementById('mdfbFree');
    if (el) el.onclick = fn;
    (ids || []).forEach(function (id) {
      var x = document.getElementById(id);
      if (x) x.onclick = fn;
    });
  };
  window.MDFBanner = B;
})();
