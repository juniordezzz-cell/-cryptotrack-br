/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  MUNDODEFI · CATÁLOGO DE FERRAMENTAS — FONTE ÚNICA                   ║
   ║                                                                      ║
   ║  Antes existiam TRÊS listas escritas à mão que discordavam entre si: ║
   ║    home (grade)      11 itens                                        ║
   ║    mega-menu         12 itens                                        ║
   ║    hub /ferramentas   9 itens  ← a página chamada "todas as          ║
   ║                                   ferramentas" era a que tinha menos ║
   ║  Cada uma era HTML num arquivo diferente, então continuariam         ║
   ║  divergindo a cada mudança. Agora as três renderizam daqui.          ║
   ║                                                                      ║
   ║  ── PARA ADICIONAR UMA FERRAMENTA ───────────────────────────────    ║
   ║  Acrescente um objeto em ITENS. Ela aparece automaticamente na home, ║
   ║  no hub e no menu. Nada mais precisa ser editado.                    ║
   ║                                                                      ║
   ║  ── AS CATEGORIAS ───────────────────────────────────────────────    ║
   ║  Organizadas pela PERGUNTA que o usuário está fazendo, não pelo tipo ║
   ║  técnico do artefato. "Calculadora" e "simulador" são a mesma coisa  ║
   ║  do ponto de vista de quem usa — o que muda é o que a pessoa quer    ║
   ║  descobrir.                                                          ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
(function () {
  'use strict';

  var CATEGORIAS = [
    /* Estas cores viram texto ("Abrir ferramenta →"), não só borda:
       por isso o roxo aqui é a variante clara, que passa em contraste AA. */
    { id: 'gerenciar',   nome: 'Gerenciar',    pergunta: 'Onde está meu dinheiro?',    icone: '📊', cor: 'var(--purple-txt,#A96BFF)' },
    { id: 'projetar',    nome: 'Projetar',     pergunta: 'Quanto isso rende?',         icone: '📈', cor: 'var(--green,#14F195)' },
    { id: 'decidir',     nome: 'Decidir',      pergunta: 'Vale a pena?',               icone: '⚖️', cor: 'var(--gold,#F5B614)' },
    { id: 'converter',   nome: 'Converter',    pergunta: 'Quanto dá em reais?',        icone: '🔄', cor: 'var(--cyan,#00E5FF)' },
    { id: 'diagnosticar',nome: 'Diagnosticar', pergunta: 'Em que pé eu estou?',        icone: '🧭', cor: 'var(--blue,#4D9FFF)' }
  ];

  /* plano: 'gratis' | 'pro'
     destaque: aparece primeiro e ganha card maior na home
     busca: termos que o usuário pode digitar procurando a ferramenta   */
  var ITENS = [

    /* ── GERENCIAR ── */
    {
      slug: 'portfolio',
      nome: 'Portfólio',
      url: '/portfolio/index.html',
      categoria: 'gerenciar',
      plano: 'gratis',
      icone: '💼',
      resumo: 'Acompanhe HOLD, DeFi e Trade num lugar só, com preço médio, lucro realizado e retorno anualizado.',
      curto: 'Todo o seu patrimônio cripto num lugar só',
      tags: ['Preço médio', 'Lucro realizado', 'Cotação ao vivo'],
      busca: ['portfolio', 'carteira', 'patrimonio', 'meus ativos', 'quanto tenho'],
      destaque: true
    },
    {
      slug: 'entradas-saidas',
      nome: 'Entradas e Saídas',
      url: '/ferramentas/entradas-saidas/',
      categoria: 'gerenciar',
      plano: 'pro',
      icone: '💰',
      resumo: 'Controle financeiro completo: registre entradas, despesas e investimentos e veja para onde seu dinheiro está indo.',
      curto: 'Seu fluxo de caixa organizado',
      tags: ['Fluxo de caixa', 'Relatórios', 'Nexus'],
      busca: ['entradas', 'saidas', 'despesas', 'orcamento', 'financas', 'gastos']
    },

    /* ── PROJETAR ── */
    {
      slug: 'juros-compostos',
      nome: 'Juros Compostos',
      url: '/ferramentas/juros-compostos.html',
      categoria: 'projetar',
      plano: 'gratis',
      icone: '📈',
      resumo: 'Simule o crescimento do seu patrimônio com aportes mensais, em Real, Dólar ou Euro, com gráfico e tabela mês a mês.',
      curto: 'Quanto seu dinheiro vira com aportes mensais',
      tags: ['Aportes mensais', '3 moedas', 'Retiradas'],
      busca: ['juros', 'compostos', 'aporte', 'crescimento', 'bola de neve', 'projecao']
    },
    {
      slug: 'staking',
      nome: 'Simulador de Staking',
      url: '/ferramentas/staking.html',
      categoria: 'projetar',
      plano: 'gratis',
      icone: '🔒',
      resumo: 'Quanto rendem seus tokens em staking, com APR simples ou APY composto e preço ao vivo.',
      curto: 'Quanto rende deixar seus tokens em staking',
      tags: ['APR e APY', 'Preço ao vivo', 'Mês a mês'],
      busca: ['staking', 'stake', 'apy', 'apr', 'renda passiva', 'rendimento']
    },
    {
      slug: 'pool-liquidez',
      nome: 'Pool de Liquidez',
      url: '/ferramentas/pool-liquidez.html',
      categoria: 'projetar',
      plano: 'gratis',
      icone: '💧',
      resumo: 'A pergunta de todo provedor de liquidez: as taxas compensam o impermanent loss? Compare pool contra simplesmente segurar os tokens.',
      curto: 'As taxas compensam o impermanent loss?',
      tags: ['Impermanent loss', '50/50 e 80/20', 'Compara com HOLD'],
      busca: ['pool', 'liquidez', 'impermanent', 'loss', 'lp', 'defi', 'uniswap', 'orca'],
      destaque: true
    },

    /* ── DECIDIR ── */
    {
      slug: 'lucro-cripto',
      nome: 'Lucro Cripto',
      url: '/ferramentas/lucro-cripto.html',
      categoria: 'decidir',
      plano: 'gratis',
      icone: '🪙',
      resumo: 'Seu lucro líquido de verdade: busca o preço ao vivo de qualquer token e desconta as taxas da exchange.',
      curto: 'Quanto sobra depois das taxas',
      tags: ['Preço ao vivo', 'Taxas de exchange', 'Qualquer token'],
      busca: ['lucro', 'ganho', 'taxas', 'liquido', 'quanto ganhei']
    },
    {
      slug: 'comparador-de-ativos',
      nome: 'Comparador de Ativos',
      url: '/ferramentas/comparador-de-ativos.html',
      categoria: 'decidir',
      plano: 'gratis',
      icone: '⚖️',
      resumo: 'Compare a rentabilidade de cripto, ações e renda fixa lado a lado — qualquer ativo contra o CDI, com dados ao vivo.',
      curto: 'Cripto contra ações, ouro e CDI',
      tags: ['Cripto · ações · CDI', 'Dados ao vivo', 'Lado a lado'],
      busca: ['comparar', 'comparador', 'cdi', 'bolsa', 'acoes', 'ouro', 'rentabilidade']
    },
    {
      slug: 'simulador-de-trade',
      nome: 'Simulador de Trade',
      url: '/ferramentas/simulador-de-trade.html',
      categoria: 'decidir',
      plano: 'pro',
      icone: '⚡',
      resumo: 'Long e short com alavancagem, preço de liquidação com margem de manutenção e a banca crescendo operação após operação.',
      curto: 'Alavancagem, liquidação e gestão de banca',
      tags: ['Long e short', 'Preço de liquidação', 'Gestão de banca'],
      busca: ['trade', 'alavancagem', 'long', 'short', 'liquidacao', 'banca', 'futuros']
    },

    /* ── CONVERTER ── */
    {
      slug: 'conversor',
      nome: 'Conversor Cripto',
      url: '/ferramentas/conversor.html',
      categoria: 'converter',
      plano: 'gratis',
      icone: '🔄',
      resumo: 'BTC, ETH, SOL e mais convertidos para Real, Dólar e Euro em tempo real, com variação de 24h.',
      curto: 'Cripto para Real, Dólar ou Euro',
      tags: ['Tempo real', 'BRL · USD · EUR', 'Market cap'],
      busca: ['conversor', 'converter', 'quanto vale', 'cotacao', 'preco', 'real', 'dolar']
    },
    {
      slug: 'cambio',
      nome: 'Câmbio',
      url: '/ferramentas/cambio.html',
      categoria: 'converter',
      plano: 'gratis',
      icone: '💵',
      resumo: 'Converta Real, Dólar, Euro e Libra entre si usando a cotação do mercado cripto ao vivo, via stablecoins.',
      curto: 'Moedas entre si, pela cotação cripto',
      tags: ['BRL · USD · EUR · GBP', 'USDT e USDC', 'Ao vivo'],
      busca: ['cambio', 'dolar', 'euro', 'libra', 'moeda', 'usdt', 'stablecoin']
    },

    /* ── DIAGNOSTICAR ── */
    {
      slug: 'imd',
      nome: 'Índice Mundo DeFi',
      url: '/ferramentas/imd/',
      categoria: 'diagnosticar',
      plano: 'gratis',
      icone: '🧭',
      resumo: 'Diagnóstico gratuito: descubra seu nível em cripto de 0 a 100, com perfil de risco e onde estão suas maiores lacunas.',
      curto: 'Sua nota como investidor cripto, de 0 a 100',
      tags: ['~5 minutos', 'Perfil de risco', 'Onde melhorar'],
      busca: ['imd', 'indice', 'diagnostico', 'nivel', 'teste', 'avaliacao', 'quiz'],
      destaque: true
    }
  ];

  /* ═══════════════ API ═══════════════ */
  var C = {
    categorias: CATEGORIAS,
    itens: ITENS,

    porCategoria: function (id) {
      return ITENS.filter(function (i) { return i.categoria === id; });
    },
    porSlug: function (s) {
      return ITENS.filter(function (i) { return i.slug === s; })[0] || null;
    },
    destaques: function () {
      return ITENS.filter(function (i) { return i.destaque; });
    },
    gratuitas: function () {
      return ITENS.filter(function (i) { return i.plano === 'gratis'; });
    },
    /* Agrupado e na ordem das categorias — é assim que home e hub montam. */
    agrupado: function () {
      return CATEGORIAS.map(function (c) {
        return { categoria: c, itens: C.porCategoria(c.id) };
      }).filter(function (g) { return g.itens.length; });
    },
    /* Busca simples por nome e pelos termos declarados em `busca`. */
    buscar: function (q) {
      q = String(q || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
      if (!q) return [];
      return ITENS.filter(function (i) {
        var alvo = (i.nome + ' ' + i.resumo + ' ' + (i.busca || []).join(' '))
          .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        return alvo.indexOf(q) >= 0;
      });
    },
    /* Selo do plano, usado por home e hub. */
    selo: function (i) {
      return i.plano === 'pro'
        ? '<span class="cat-selo cat-selo-pro">PRO</span>'
        : '<span class="cat-selo cat-selo-free">Grátis</span>';
    },
    total: ITENS.length
  };

  window.MDF_CATALOGO = C;
})();
