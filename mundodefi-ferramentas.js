/* =====================================================================
   mundodefi-ferramentas.js
   ---------------------------------------------------------------------
   Injeta os BLOCOS REPETIDOS de toda ferramenta:
     • cabeçalho (header)
     • bloco de planos PRO / Premium (fica no fim da página)
     • rodapé (footer)

   Mexeu aqui  ->  muda o texto e os links em TODAS as ferramentas de
   uma vez só. Para trocar uma frase ou um destino, edite apenas o
   bloco CONFIG abaixo. Não precisa mexer em cada página.

   Como usar em cada ferramenta — basta ter estas âncoras vazias:
     <div data-mdf="header"></div>   (logo no começo do <body>)
     <div data-mdf="pro"></div>      (no fim, antes do aviso, se quiser)
     <div data-mdf="footer"></div>   (no fim do <body>)
   ...e a tag do script antes de fechar o </body>:
     <script src="/mundodefi-ferramentas.js" defer></script>
   ===================================================================== */

(function () {
  'use strict';

  /* ╔══════════════════════════════════════════════════════════════════╗
     ║  CONFIG — É AQUI QUE VOCÊ EDITA. Muda em todas as ferramentas.      ║
     ╚══════════════════════════════════════════════════════════════════╝ */
  const CONFIG = {
    base: 'https://mundodefi.com.br',

    // Links do site (caminhos a partir da raiz)
    links: {
      inicio:      '/index.html',
      ferramentas: '/ferramentas/ferramentas.html',
      portfolio:   '/portfolio/',
      planos:      '/planos.html',
      cadastro:    '/cadastro.html',
    },

    // Menu do cabeçalho (ordem = ordem que aparece)
    menu: [
      { texto: 'Ferramentas', link: '/ferramentas/ferramentas.html' },
      { texto: 'Portfólio',   link: '/portfolio/' },
    ],
    botaoPro: { texto: '👑 PRO', link: '/planos.html' },

    // Bloco PRO (roxo)
    pro: {
      tag:   '⚡ PRO',
      preco: 'R$ 19,90',
      ciclo: '/mês',
      desc:  'Portfólio completo e ilimitado: HOLD, DeFi e Trade com export para o IR.',
      cta:   'Assinar PRO',
      link:  '/planos.html',
    },

    // Bloco PREMIUM (dourado)
    premium: {
      badge: 'Mentoria individual',
      tag:   'PREMIUM',
      preco: 'R$ 49,90',
      ciclo: '/mês',
      desc:  'Tudo do PRO + estratégias avançadas + 1 encontro individual por mês — vagas limitadas.',
      cta:   'Em breve',
      link:  '/planos.html',
    },

    // Rodapé do bloco de planos (a linha azul-ciano embaixo dos dois cards)
    planosFoot: {
      texto: 'Cancele quando quiser · garantia de 7 dias · ',
      linkTexto: 'ou crie sua conta gratuita →',
      link: '/cadastro.html',
    },

    // Bloco "Outras ferramentas" — 4 cards fixos, NA ORDEM definida aqui.
    // Troque texto, cor, etiqueta, link ou a ordem -> muda em todas as ferramentas.
    // 'preview' aponta para uma ilustração do mapa PREVIEWS (logo abaixo do CONFIG);
    // 'emoji' é o iconezinho do cabeçalho do card.
    outras: {
      titulo: 'Outras ferramentas gratuitas',
      sub: 'Tudo o que você precisa para operar cripto com método — grátis e em português.',
      cards: [
        { preview: 'financas',   emoji: '💰', cor: '#14f195', nome: 'Entradas e Saídas',    desc: 'Controle financeiro completo com gráficos e o Nexus, seu analista.', badge: 'Novo', link: '/ferramentas/entradas-saidas/' },
        { preview: 'comparador', emoji: '📊', cor: '#00e5ff', nome: 'Comparador de Ativos', desc: 'Compare cripto com ouro, ações, índices e CDI.',               badge: 'Grátis',  link: '/ferramentas/comparador-de-ativos.html' },
        { preview: 'juros',      emoji: '📈', cor: '#14f195', nome: 'Juros Compostos',      desc: 'Simule o crescimento do patrimônio com aportes mensais.',      badge: 'Grátis',  link: '/ferramentas/juros-compostos.html' },
        { preview: 'lucro',      emoji: '🪙', cor: '#4d9fff', nome: 'Lucro Cripto',         desc: 'Calcule o lucro real com preço de entrada, saída, taxas e IR.', badge: 'Grátis',  link: '/ferramentas/lucro-cripto.html' },
        { preview: 'conversao',  emoji: '💱', cor: '#00e5ff', nome: 'Conversão',            desc: 'Converta entre cripto, Real, Dólar e Euro com cotação ao vivo.', badge: 'Grátis', link: '/ferramentas/conversor.html' },
        { preview: 'portfolio',  emoji: '💼', cor: '#9945ff', nome: 'Portfólio',            desc: 'Acompanhe HOLD, DeFi e Trade num painel só.',                  badge: 'Grátis',  link: '/portfolio/' },
      ],
    },

    // Rodapé do site
    rodape: {
      links: [
        { texto: 'Início',      link: '/index.html' },
        { texto: 'Ferramentas', link: '/ferramentas/ferramentas.html' },
        { texto: 'Planos',      link: '/planos.html' },
      ],
      nota: 'Conteúdo educacional — não é recomendação de investimento',
    },
  };

  /* ╔══════════════════════════════════════════════════════════════════╗
     ║  MONTAGEM — daqui pra baixo normalmente não precisa mexer.         ║
     ╚══════════════════════════════════════════════════════════════════╝ */

  /* ╔══════════════════════════════════════════════════════════════════╗
     ║  ILUSTRAÇÕES dos cards (240x120). Trocar aqui muda em todas.        ║
     ╚══════════════════════════════════════════════════════════════════╝ */
  const PREVIEWS = {
    financas:
      '<svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="120" fill="#07080d"/><defs><linearGradient id="mdfFinG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#14f195" stop-opacity=".28"/><stop offset="100%" stop-color="#14f195" stop-opacity="0"/></linearGradient></defs><path d="M16 96 L58 88 L100 74 L142 62 L184 44 L224 30 L224 104 L16 104 Z" fill="url(#mdfFinG)"/><path d="M16 96 L58 88 L100 74 L142 62 L184 44 L224 30" fill="none" stroke="#14f195" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/><path d="M16 98 L58 96 L100 90 L142 92 L184 84 L224 80" fill="none" stroke="#ff5470" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="224" cy="30" r="4" fill="#14f195"/><circle cx="224" cy="80" r="3.5" fill="#ff5470"/><rect x="146" y="10" width="80" height="16" rx="4" fill="rgba(20,241,149,.12)" stroke="rgba(20,241,149,.35)" stroke-width=".7"/><text x="186" y="21" text-anchor="middle" fill="#14f195" font-size="7.5" font-family="JetBrains Mono,monospace" font-weight="700">Saldo +R$ 190</text><g font-family="sans-serif" font-size="7"><circle cx="20" cy="112" r="3" fill="#14f195"/><text x="27" y="115" fill="#888aa8">Entradas</text><circle cx="70" cy="112" r="3" fill="#ff5470"/><text x="77" y="115" fill="#888aa8">Saídas</text></g></svg>',
    portfolio:
      '<svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="120" fill="#07080d"/><circle cx="64" cy="60" r="30" fill="none" stroke="#9945ff" stroke-width="11" stroke-dasharray="94 95" opacity=".95"/><circle cx="64" cy="60" r="30" fill="none" stroke="#14f195" stroke-width="11" stroke-dasharray="56 133" stroke-dashoffset="-94" opacity=".9"/><circle cx="64" cy="60" r="30" fill="none" stroke="#00e5ff" stroke-width="11" stroke-dasharray="38 151" stroke-dashoffset="-150" opacity=".85"/><text x="64" y="57" text-anchor="middle" fill="#eeeef8" font-size="11" font-family="JetBrains Mono,monospace" font-weight="700">$24.8K</text><text x="64" y="69" text-anchor="middle" fill="#888aa8" font-size="7" font-family="sans-serif">patrimônio</text><g font-family="sans-serif" font-size="8"><circle cx="126" cy="38" r="3" fill="#9945ff"/><text x="134" y="41" fill="#cfcfe0">HOLD 50%</text><circle cx="126" cy="54" r="3" fill="#14f195"/><text x="134" y="57" fill="#cfcfe0">DeFi 30%</text><circle cx="126" cy="70" r="3" fill="#00e5ff"/><text x="134" y="73" fill="#cfcfe0">Trade 20%</text></g><rect x="126" y="84" width="15" height="20" rx="2" fill="#9945ff" opacity=".8"/><rect x="146" y="90" width="15" height="14" rx="2" fill="#14f195" opacity=".8"/><rect x="166" y="95" width="15" height="9" rx="2" fill="#00e5ff" opacity=".8"/></svg>',
    juros:
      '<svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="120" fill="#07080d"/><defs><linearGradient id="mdfJg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#14f195" stop-opacity=".3"/><stop offset="100%" stop-color="#14f195" stop-opacity="0"/></linearGradient></defs><path d="M16 100 L60 92 L100 78 L140 58 L180 38 L224 18 L224 104 L16 104 Z" fill="url(#mdfJg)"/><path d="M16 100 L60 92 L100 78 L140 58 L180 38 L224 18" fill="none" stroke="#14f195" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="224" cy="18" r="4" fill="#14f195"/><rect x="150" y="12" width="76" height="22" rx="4" fill="#13141f" stroke="#14f195" stroke-width=".7"/><text x="188" y="22" text-anchor="middle" fill="#14f195" font-size="8" font-family="JetBrains Mono,monospace" font-weight="700">R$ 98.420</text><text x="188" y="30" text-anchor="middle" fill="#888aa8" font-size="6" font-family="sans-serif">em 24 meses</text></svg>',
    comparador:
      '<svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="120" fill="#07080d"/><text x="16" y="22" fill="#cfcfe0" font-size="8.5" font-family="sans-serif" font-weight="600">Bitcoin vs Ouro</text><path d="M16 90 L60 80 L100 62 L140 68 L180 42 L224 28" fill="none" stroke="#00e5ff" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M16 92 L60 90 L100 86 L140 88 L180 82 L224 78" fill="none" stroke="#f0a500" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="224" cy="28" r="3.5" fill="#00e5ff"/><circle cx="224" cy="78" r="3.5" fill="#f0a500"/><rect x="150" y="14" width="74" height="16" rx="4" fill="rgba(0,229,255,.12)" stroke="#00e5ff" stroke-width=".7"/><text x="187" y="25" text-anchor="middle" fill="#00e5ff" font-size="7.5" font-family="JetBrains Mono,monospace" font-weight="700">BTC +212%</text><g font-family="sans-serif" font-size="7"><circle cx="20" cy="106" r="3" fill="#00e5ff"/><text x="27" y="109" fill="#888aa8">BTC</text><circle cx="64" cy="106" r="3" fill="#f0a500"/><text x="71" y="109" fill="#888aa8">Ouro</text></g></svg>',
    lucro:
      '<svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="120" fill="#07080d"/><rect x="14" y="14" width="212" height="92" rx="5" fill="#0d0e16" stroke="#1e1f2e" stroke-width=".8"/><line x1="14" y1="36" x2="226" y2="36" stroke="#1e1f2e" stroke-width=".7"/><text x="22" y="28" fill="#888aa8" font-size="7.5" font-family="sans-serif" font-weight="600">Lucro Cripto — BTC</text><rect x="30" y="56" width="26" height="38" rx="3" fill="#4d9fff" opacity=".75"/><text x="43" y="52" text-anchor="middle" fill="#4d9fff" font-size="6.5" font-family="JetBrains Mono,monospace">$9.500</text><rect x="72" y="44" width="26" height="50" rx="3" fill="#14f195" opacity=".75"/><text x="85" y="40" text-anchor="middle" fill="#14f195" font-size="6.5" font-family="JetBrains Mono,monospace">$14.200</text><rect x="114" y="82" width="26" height="12" rx="3" fill="#ff5470" opacity=".7"/><text x="127" y="78" text-anchor="middle" fill="#ff5470" font-size="6.5" font-family="sans-serif">Taxas</text><rect x="156" y="62" width="26" height="32" rx="3" fill="#14f195"/><text x="169" y="58" text-anchor="middle" fill="#14f195" font-size="6.5" font-family="JetBrains Mono,monospace">+$4.700</text><text x="43" y="102" text-anchor="middle" fill="#4a4c60" font-size="6" font-family="sans-serif">Invest.</text><text x="85" y="102" text-anchor="middle" fill="#4a4c60" font-size="6" font-family="sans-serif">Saída</text><text x="127" y="102" text-anchor="middle" fill="#4a4c60" font-size="6" font-family="sans-serif">Taxas</text><text x="169" y="102" text-anchor="middle" fill="#14f195" font-size="6" font-family="sans-serif">Lucro</text><rect x="180" y="18" width="42" height="14" rx="3" fill="rgba(20,241,149,.12)" stroke="rgba(20,241,149,.3)" stroke-width=".7"/><text x="201" y="28" text-anchor="middle" fill="#14f195" font-size="7.5" font-family="JetBrains Mono,monospace" font-weight="700">+49.5%</text></svg>',
    conversao:
      '<svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="120" fill="#07080d"/><rect x="20" y="16" width="200" height="88" rx="6" fill="#0d0e16" stroke="#1e1f2e" stroke-width=".8"/><text x="30" y="32" fill="#888aa8" font-size="7.5" font-family="sans-serif" font-weight="600">Conversor — cotação ao vivo</text><rect x="30" y="40" width="180" height="20" rx="4" fill="#13141f" stroke="#1e1f2e" stroke-width=".7"/><text x="37" y="53" fill="#4a4c60" font-size="7" font-family="sans-serif">De</text><text x="203" y="53.5" text-anchor="end" fill="#eeeef8" font-size="8.5" font-family="JetBrains Mono,monospace" font-weight="700">1 BTC</text><rect x="30" y="64" width="180" height="20" rx="4" fill="#13141f" stroke="#00e5ff" stroke-width=".9"/><text x="37" y="77" fill="#4a4c60" font-size="7" font-family="sans-serif">Para</text><text x="203" y="77.5" text-anchor="end" fill="#00e5ff" font-size="8.5" font-family="JetBrains Mono,monospace" font-weight="700">R$ 95.000</text><circle cx="120" cy="62" r="9" fill="#0d0e16" stroke="#00e5ff" stroke-width="1.1"/><path d="M117 60 l3 -3 l3 3 M117 64 l3 3 l3 -3" fill="none" stroke="#00e5ff" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const url = (caminho) => CONFIG.base + caminho;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const tint = (cor, pct) => `color-mix(in srgb, ${cor} ${pct}%, transparent)`;

  function htmlCabecalho() {
    const itens = CONFIG.menu
      .map((m) => `<a href="${url(m.link)}">${esc(m.texto)}</a>`)
      .join('');
    return `
<header>
  <div class="container nav">
    <a href="${url(CONFIG.links.inicio)}" class="logo">₿ Mundo<em>DeFi</em></a>
    <nav class="nav-links">
      ${itens}
      <a href="${url(CONFIG.botaoPro.link)}" class="btn-pro">${esc(CONFIG.botaoPro.texto)}</a>
    </nav>
  </div>
</header>`;
  }

  function htmlPlanos() {
    const p = CONFIG.pro, pr = CONFIG.premium, f = CONFIG.planosFoot;
    return `
<section>
  <div class="planos">
    <div class="plano pro">
      <span class="tag">${esc(p.tag)}</span>
      <div class="preco">${esc(p.preco)} <small>${esc(p.ciclo)}</small></div>
      <p class="desc">${esc(p.desc)}</p>
      <a class="btn" href="${url(p.link)}">${esc(p.cta)}</a>
    </div>
    <div class="plano premium">
      <span class="badge">${esc(pr.badge)}</span>
      <span class="tag">${esc(pr.tag)}</span>
      <div class="preco">${esc(pr.preco)} <small>${esc(pr.ciclo)}</small></div>
      <p class="desc">${esc(pr.desc)}</p>
      <a class="btn" href="${url(pr.link)}">${esc(pr.cta)}</a>
    </div>
  </div>
  <p class="planos-foot">${esc(f.texto)}<a href="${url(f.link)}">${esc(f.linkTexto)}</a></p>
</section>`;
  }

  function htmlRodape() {
    const links = CONFIG.rodape.links
      .map((l) => `<a href="${url(l.link)}">${esc(l.texto)}</a>`)
      .join(' · ');
    const ano = new Date().getFullYear();
    return `
<footer>
  <div class="container">
    © ${ano} MundoDeFi · ${links}<br>${esc(CONFIG.rodape.nota)}
  </div>
</footer>`;
  }

  function htmlOutras() {
    const o = CONFIG.outras;
    const cards = o.cards
      .map((c) => `<a class="tool-card" style="--tc:${c.cor}" href="${url(c.link)}">
  <div class="tool-preview">${PREVIEWS[c.preview] || ''}</div>
  <div class="tool-body">
    <div class="tool-hdr"><div class="tool-icon" style="background:${tint(c.cor, 14)}">${c.emoji}</div><div class="tool-name">${esc(c.nome)}</div></div>
    <div class="tool-desc">${esc(c.desc)}</div>
    <div class="tool-foot"><span class="tool-badge" style="background:${tint(c.cor, 14)};color:${c.cor}">${esc(c.badge)}</span><span class="tool-arrow">→</span></div>
  </div>
</a>`)
      .join('');
    return `
<section>
  <h2><span class="ico">🛠️</span>${esc(o.titulo)}</h2>
  <p class="sub">${esc(o.sub)}</p>
  <div class="tools-grid">${cards}</div>
</section>`;
  }

  // troca a âncora vazia pelo bloco pronto
  function montar(seletor, html) {
    const el = document.querySelector(seletor);
    if (el) el.outerHTML = html;
  }

  function iniciar() {
    montar('[data-mdf="header"]', htmlCabecalho());
    montar('[data-mdf="outras"]', htmlOutras());
    montar('[data-mdf="pro"]',    htmlPlanos());
    montar('[data-mdf="footer"]', htmlRodape());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
