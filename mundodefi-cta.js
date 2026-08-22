/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  MUNDODEFI · CTA PADRÃO DO PRO                                       ║
   ║                                                                      ║
   ║  Um bloco só, usado em qualquer página. Antes cada página escrevia   ║
   ║  o seu — e por isso a oferta aparecia com preço, texto e botão       ║
   ║  diferentes em cada canto do site.                                   ║
   ║                                                                      ║
   ║  Uso:                                                                ║
   ║    <script src="/mundodefi-cta.js"></script>                         ║
   ║    elemento.innerHTML = MDF_CTA.pro();                               ║
   ║                                                                      ║
   ║  Opções (todas opcionais):                                           ║
   ║    { titulo, texto, itens: [], origem: 'token' }                     ║
   ║  `origem` vira o data-cta do botão, para você separar no analytics   ║
   ║  de onde veio cada clique.                                           ║
   ║                                                                      ║
   ║  Quem já é PRO não deve ver isto: chame MDF_CTA.montar(el) em vez    ║
   ║  de escrever o HTML direto — ele checa o plano e some sozinho.       ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
(function () {
  'use strict';

  /* Preço num lugar só. Mudou aqui, muda no site inteiro. */
  var PRECO = 'R$ 19,90';
  var PERIODO = '/mês';

  var PADRAO = {
    titulo: 'Acompanhe tudo isso no seu portfólio',
    texto: 'Registre suas compras e o MundoDeFi calcula preço médio, lucro realizado e não realizado, e o retorno anualizado de verdade — com cotação ao vivo.',
    itens: ['Carteiras ilimitadas', 'Pools, staking e trade num lugar só', 'Exportação dos seus dados em CSV'],
    origem: 'generico'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[<>&"]/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c];
    });
  }

  var CTA = {
    preco: PRECO,

    pro: function (o) {
      o = o || {};
      var titulo = o.titulo || PADRAO.titulo;
      var texto  = o.texto  || PADRAO.texto;
      var itens  = o.itens  || PADRAO.itens;
      var origem = o.origem || PADRAO.origem;

      return '<div class="mdf-cta">'
        + '<div class="mdf-cta-tag">⚡ MundoDeFi PRO</div>'
        + '<h3 class="mdf-cta-ttl">' + esc(titulo) + '</h3>'
        + '<p class="mdf-cta-txt">' + esc(texto) + '</p>'
        + '<ul class="mdf-cta-list">'
        + itens.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('')
        + '</ul>'
        + '<div class="mdf-cta-foot">'
        + '<a class="mdf-cta-btn" href="/planos.html" data-cta="' + esc(origem) + '">Assinar por ' + PRECO + PERIODO + '</a>'
        + '<span class="mdf-cta-sub">Cancele quando quiser · garantia de 7 dias</span>'
        + '</div>'
        + '</div>';
    },

    /* Renderiza só para quem ainda não é PRO. Mostrar oferta de assinatura
       para quem já assinou é o tipo de detalhe que faz o produto parecer
       desatento. */
    montar: function (el, o) {
      if (!el) return;
      function aplicar() {
        var A = window.NexusAuth;
        var jaEhPro = A && A.ready && A.isPro && A.isPro();
        el.innerHTML = jaEhPro ? '' : CTA.pro(o);
      }
      aplicar();
      document.addEventListener('nexus-auth-changed', aplicar);
    }
  };

  /* O CSS vem junto para o bloco não depender do tema de cada página —
     o site tem paletas diferentes por arquivo, e o CTA precisa ficar
     igual em todas. Cores fixas de propósito. */
  var css = ''
    + '.mdf-cta{background:linear-gradient(150deg,rgba(153,69,255,.14),rgba(0,229,255,.05));'
    + 'border:1px solid rgba(153,69,255,.32);border-radius:16px;padding:1.4rem 1.5rem;'
    + 'font-family:inherit;color:#EDF0F7}'
    + '.mdf-cta-tag{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;'
    + 'color:#B388FF;margin-bottom:.6rem}'
    + '.mdf-cta-ttl{font-size:1.12rem;font-weight:700;letter-spacing:-.02em;margin:0 0 .45rem;line-height:1.3}'
    + '.mdf-cta-txt{font-size:13px;line-height:1.65;color:#9AA3B8;margin:0 0 .9rem}'
    + '.mdf-cta-list{list-style:none;margin:0 0 1.15rem;padding:0;display:flex;flex-direction:column;gap:7px}'
    + '.mdf-cta-list li{font-size:12.5px;color:#C7CEDC;padding-left:20px;position:relative;line-height:1.45}'
    + '.mdf-cta-list li::before{content:"✓";position:absolute;left:0;color:#14F195;font-weight:700}'
    + '.mdf-cta-foot{display:flex;align-items:center;gap:14px;flex-wrap:wrap}'
    + '.mdf-cta-btn{display:inline-block;background:linear-gradient(120deg,#9945FF,#7B2FF7);color:#fff;'
    + 'text-decoration:none;font-size:13.5px;font-weight:700;padding:11px 22px;border-radius:99px;'
    + 'transition:transform .15s,box-shadow .15s;box-shadow:0 6px 20px rgba(153,69,255,.3)}'
    + '.mdf-cta-btn:hover{transform:translateY(-1px);box-shadow:0 9px 26px rgba(153,69,255,.42)}'
    + '.mdf-cta-sub{font-size:11px;color:#7A8399}'
    + '@media(max-width:520px){.mdf-cta{padding:1.15rem 1.15rem}.mdf-cta-btn{width:100%;text-align:center}}'
    + '@media(prefers-reduced-motion:reduce){.mdf-cta-btn{transition:none}.mdf-cta-btn:hover{transform:none}}';

  var tag = document.createElement('style');
  tag.textContent = css;
  document.head.appendChild(tag);

  window.MDF_CTA = CTA;
})();
