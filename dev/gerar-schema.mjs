/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  GERADOR DE SCHEMA.ORG (JSON-LD)                                     ║
   ║                                                                      ║
   ║  Schema.org é a única parte da página escrita para máquina ler. O    ║
   ║  Google usa para entender o que a página É; os rastreadores de IA    ║
   ║  usam pelo mesmo motivo, e com mais peso, porque a maioria deles não ║
   ║  executa JavaScript e depende do que está no HTML cru.               ║
   ║                                                                      ║
   ║  O site tinha isso em 5 de 20 páginas, sem Organization em lugar     ║
   ║  nenhum — ou seja, nada dizia às máquinas quem publica o conteúdo.   ║
   ║                                                                      ║
   ║  O bloco é gerado a partir de /mundodefi-catalogo.js, entre marcas   ║
   ║  de comentário, e pode ser regerado quantas vezes quiser. O que      ║
   ║  estiver FORA das marcas (os FAQPage escritos à mão) fica intacto.   ║
   ║                                                                      ║
   ║  ── COMO RODAR ──────────────────────────────────────────────────    ║
   ║      node dev/gerar-schema.mjs                                       ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://mundodefi.com.br';
const ABRE = '<!-- schema:auto — gerado por dev/gerar-schema.mjs, nao edite a mao -->';
const FECHA = '<!-- /schema:auto -->';

/* Identidade única do publicador. Todas as páginas apontam para este @id
   em vez de repetir o objeto inteiro: é assim que o Google entende que é
   sempre a mesma organização, e não vinte homônimas. */
const ORG_ID = SITE + '/#organizacao';
const SITE_ID = SITE + '/#site';

const ORGANIZACAO = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'MundoDeFi',
  url: SITE + '/',
  logo: { '@type': 'ImageObject', url: SITE + '/favicon.svg', width: 512, height: 512 },
  description: 'Ferramentas gratuitas em português para investir em criptomoedas e DeFi: '
             + 'impermanent loss, staking, juros compostos, conversão e portfólio.',
  sameAs: ['https://instagram.com/mundodefi'],
  areaServed: { '@type': 'Country', name: 'Brasil' },
  knowsLanguage: 'pt-BR'
};

const WEBSITE = {
  '@type': 'WebSite',
  '@id': SITE_ID,
  url: SITE + '/',
  name: 'MundoDeFi',
  inLanguage: 'pt-BR',
  publisher: { '@id': ORG_ID }
};

function lerCatalogo() {
  const src = fs.readFileSync(path.join(RAIZ, 'mundodefi-catalogo.js'), 'utf8');
  const janela = {};
  new Function('window', src)(janela);
  return janela.MDF_CATALOGO;
}

/* Uma ferramenta é um aplicativo web, não um artigo. O tipo certo faz o
   Google poder mostrar preço e categoria; dizer "grátis" em linguagem de
   máquina é o que separa aparecer de não aparecer numa comparação. */
function appDaFerramenta(item) {
  const url = SITE + item.url;
  const gratis = item.plano !== 'pro';
  return {
    '@type': 'WebApplication',
    '@id': url + '#app',
    name: item.nome,
    url,
    description: item.resumo,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requer JavaScript',
    inLanguage: 'pt-BR',
    isAccessibleForFree: gratis,
    offers: {
      '@type': 'Offer',
      price: gratis ? '0' : '19.90',
      priceCurrency: 'BRL',
      ...(gratis ? {} : { category: 'Assinatura MundoDeFi PRO' })
    },
    featureList: item.tags,
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': SITE_ID }
  };
}

function trilha(item) {
  const partes = [
    { name: 'Início', item: SITE + '/' },
    { name: 'Ferramentas', item: SITE + '/ferramentas/ferramentas.html' },
    { name: item.nome, item: SITE + item.url }
  ];
  return {
    '@type': 'BreadcrumbList',
    itemListElement: partes.map((p, i) => ({
      '@type': 'ListItem', position: i + 1, name: p.name, item: p.item
    }))
  };
}

function bloco(grafo) {
  return ABRE + '\n<script type="application/ld+json">\n'
    + JSON.stringify({ '@context': 'https://schema.org', '@graph': grafo }, null, 1)
    + '\n</script>\n' + FECHA;
}

/* Substitui o bloco antigo, se existir; senão insere antes de </head>. */
function aplicar(rel, grafo) {
  const p = path.join(RAIZ, rel);
  if (!fs.existsSync(p)) { console.log('  pulando (nao existe):', rel); return; }
  let s = fs.readFileSync(p, 'utf8');
  const novo = bloco(grafo);
  const i = s.indexOf(ABRE), j = s.indexOf(FECHA);
  if (i >= 0 && j > i) {
    s = s.slice(0, i) + novo + s.slice(j + FECHA.length);
  } else {
    const h = s.lastIndexOf('</head>');
    if (h < 0) { console.log('  pulando (sem </head>):', rel); return; }
    s = s.slice(0, h) + novo + '\n' + s.slice(h);
  }
  fs.writeFileSync(p, s);
  console.log('ok', rel, '→', grafo.map(x => x['@type']).join(' + '));
}

const cat = lerCatalogo();

/* ── home: quem somos + o site ─────────────────────────────────────── */
aplicar('index.html', [ORGANIZACAO, WEBSITE]);

/* ── hub de ferramentas: a lista, para a máquina saber o que existe ── */
aplicar('ferramentas/ferramentas.html', [
  { '@id': ORG_ID, '@type': 'Organization' },
  {
    '@type': 'CollectionPage',
    '@id': SITE + '/ferramentas/ferramentas.html',
    name: 'Ferramentas de cripto do MundoDeFi',
    inLanguage: 'pt-BR',
    isPartOf: { '@id': SITE_ID },
    about: 'Ferramentas para investir em criptomoedas e DeFi',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: cat.itens.length,
      itemListElement: cat.itens.map((it, i) => ({
        '@type': 'ListItem', position: i + 1, name: it.nome, url: SITE + it.url
      }))
    }
  }
]);

/* ── uma ferramenta por vez ────────────────────────────────────────── */
for (const item of cat.itens) {
  if (item.slug === 'portfolio') continue;      /* casca de JS, ver robots.txt */
  const arquivo = item.url.replace(/^\//, '') + (item.url.endsWith('/') ? 'index.html' : '');
  aplicar(arquivo, [{ '@id': ORG_ID, '@type': 'Organization' }, appDaFerramenta(item), trilha(item)]);
}

/* ── planos: o produto pago, com preço legível por máquina ─────────── */
aplicar('planos.html', [
  { '@id': ORG_ID, '@type': 'Organization' },
  {
    '@type': 'WebApplication',
    '@id': SITE + '/planos.html#pro',
    name: 'MundoDeFi PRO',
    url: SITE + '/planos.html',
    description: 'Carteiras ilimitadas no portfólio, o Nexus respondendo sobre os seus números, '
               + 'Entradas e Saídas, Simulador de Trade e exportação em CSV.',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    inLanguage: 'pt-BR',
    isAccessibleForFree: false,
    offers: {
      '@type': 'Offer', price: '19.90', priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      url: SITE + '/planos.html'
    },
    publisher: { '@id': ORG_ID }
  }
]);

/* ── Nexus: página de produto ──────────────────────────────────────── */
aplicar('nexus/index.html', [
  { '@id': ORG_ID, '@type': 'Organization' },
  {
    '@type': 'WebApplication',
    '@id': SITE + '/nexus/index.html#app',
    name: 'Nexus',
    url: SITE + '/nexus/index.html',
    description: 'Lê os números do seu portfólio e responde sobre concentração, resultado, '
               + 'pools de liquidez e trade — por regras auditáveis, não por texto gerado.',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    inLanguage: 'pt-BR',
    isAccessibleForFree: false,
    offers: { '@type': 'Offer', price: '19.90', priceCurrency: 'BRL' },
    publisher: { '@id': ORG_ID }
  }
]);

/* ── política de privacidade ───────────────────────────────────────── */
aplicar('politica-de-privacidade.html', [
  { '@id': ORG_ID, '@type': 'Organization' },
  {
    '@type': 'WebPage',
    '@id': SITE + '/politica-de-privacidade.html',
    name: 'Política de Privacidade',
    inLanguage: 'pt-BR',
    isPartOf: { '@id': SITE_ID },
    publisher: { '@id': ORG_ID }
  }
]);

console.log('\nPronto. Valide em https://validator.schema.org/');
