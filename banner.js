/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  MUNDODEFI · BANNERS DE PLANO — FONTE ÚNICA (banner.js)              ║
   ║                                                                      ║
   ║  Devolve o par de banners (Grátis + PRO) em HTML. Quatro telas do    ║
   ║  portfólio usam ISTO — se o texto da oferta mudar, muda aqui e vale  ║
   ║  em todas. Quatro cópias divergiriam no primeiro ajuste.             ║
   ║                                                                      ║
   ║  ── O QUE É VERDADE (não invente vantagem) ──────────────────────    ║
   ║  Grátis:  portfólio inteiro (HOLD/DeFi/Trade) com UMA carteira,      ║
   ║           ativos/pools/trades ilimitados, histórico sem corte, e a   ║
   ║           maioria das ferramentas do site.                           ║
   ║  PRO:     carteiras ilimitadas, exportação CSV, o Nexus sobre os     ║
   ║           próprios números, e as DUAS ferramentas PRO —              ║
   ║           Entradas e Saídas e Simulador de Trade.                    ║
   ║                                                                      ║
   ║  NÃO dizer "todas as ferramentas são grátis": duas são PRO.          ║
   ║  NÃO listar "gráficos avançados" como vantagem PRO: o grátis já os   ║
   ║  tem (portfolio.js, PLANOS.gratis.graficosAvancados = true).         ║
   ║  O preço vem de PRECO abaixo e bate com /planos.html.                ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
(function () {
  'use strict';
  if (window.MDFBanner) return;   /* idempotente, como o resto do site */

  var PRECO = '19,90';            /* mesmo valor da /planos.html */

  function feat(cls, txt) {
    return '<div class="mdfb-feat"><div class="mdfb-check">✓</div><div class="mdfb-ftext">' + txt + '</div></div>';
  }

  var B = {};

  /* Par de banners. Opções (todas opcionais):
       ctaFree  texto do botão do grátis        (padrão: "Criar conta grátis")
       subFree  linha abaixo do botão do grátis (padrão: link "começar sem conta")
       intro    frase do card grátis            (padrão: aviso de números fictícios) */
  B.duo = function (o) {
    o = o || {};
    var intro = o.intro != null ? o.intro
      : 'Os números desta tela são <b>fictícios</b> — é só um exemplo. Entre para criar a <b>sua</b> carteira e acompanhar os seus próprios números.';
    var ctaFree = o.ctaFree || 'Criar conta grátis';
    var subFree = o.subFree != null ? o.subFree
      : '<a href="/portfolio/hold.html">ou começar sem conta →</a>';

    return '<div class="mdfb">'

      + '<div class="mdfb-card mdfb-free">'
      +   '<div class="mdfb-name">Grátis</div>'
      +   '<div class="mdfb-title">Comece o seu portfólio</div>'
      +   '<div class="mdfb-desc">' + intro + '</div>'
      +   '<div class="mdfb-pricewrap"><div class="mdfb-price"><span class="mdfb-val">R$ 0</span></div>'
      +     '<div class="mdfb-note">Para sempre. Sem cartão de crédito.</div></div>'
      +   '<div class="mdfb-div"></div>'
      +   '<div class="mdfb-gtitle">O que já está liberado</div>'
      +   '<div class="mdfb-feats">'
      +     feat('', 'Portfólio completo — HOLD, DeFi e Trade <span class="mdfb-hl mdfb-hl-green">1 carteira</span>')
      +     feat('', 'Ativos, pools e trades <b>ilimitados</b>')
      +     feat('', 'Preço médio, lucro realizado e impermanent loss')
      +     feat('', 'Histórico completo, sem corte por tempo')
      +     feat('', 'A maioria das ferramentas do site, sem cadastro')
      +   '</div>'
      +   '<button type="button" class="mdfb-btn mdfb-btn-free" id="mdfbFree">' + ctaFree + '</button>'
      +   (subFree ? '<div class="mdfb-btnsub">' + subFree + '</div>' : '')
      + '</div>'

      + '<div class="mdfb-card mdfb-pro">'
      +   '<div class="mdfb-tag">⚡ Mais popular</div>'
      +   '<div class="mdfb-name">PRO</div>'
      +   '<div class="mdfb-title">Para quem separa o patrimônio</div>'
      +   '<div class="mdfb-desc">Quando uma carteira só não dá conta: corretora, cold wallet e DeFi, cada uma com os seus números.</div>'
      +   '<div class="mdfb-pricewrap"><div class="mdfb-price"><span class="mdfb-cur">R$</span>'
      +     '<span class="mdfb-val">' + PRECO + '</span><span class="mdfb-per">/mês</span></div>'
      +     '<div class="mdfb-note">Cancele quando quiser.</div></div>'
      +   '<div class="mdfb-div"></div>'
      +   '<div class="mdfb-gtitle">Tudo do grátis, e mais</div>'
      +   '<div class="mdfb-feats">'
      +     feat('', '<b>Carteiras ilimitadas</b> <span class="mdfb-hl mdfb-hl-purple">separadas</span>')
      +     feat('', 'As duas ferramentas PRO — <b>Entradas e Saídas</b> e <b>Simulador de Trade</b>')
      +     feat('', 'O <b>Nexus</b> respondendo sobre os seus próprios números')
      +     feat('', 'Exportar tudo em <b>CSV</b>, para o IR ou para a planilha')
      +   '</div>'
      +   '<a class="mdfb-btn mdfb-btn-pro" href="/planos.html">Ver o PRO →</a>'
      +   '<div class="mdfb-btnsub">PIX, cartão ou boleto</div>'
      + '</div>'

      + '</div>';
  };

  /* Liga o botão do grátis (e qualquer gatilho extra passado em `ids`).
     Recebe a ação porque cada tela decide o que "criar conta" significa:
     no portfólio é abrir o login; numa landing pode ser ir pro cadastro. */
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
