/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  GERADOR DAS PÁGINAS DE MOEDA — /moedas/{id}.html                    ║
   ║                                                                      ║
   ║  ── O PROBLEMA QUE ISTO RESOLVE ─────────────────────────────────    ║
   ║  /token.html?id=X serve dezenas de moedas a partir do mesmo arquivo, ║
   ║  e todo o conteúdo aparece só depois do JavaScript. Medido com um    ║
   ║  parser de verdade: 202 caracteres, zero <h1>, zero parágrafo. O     ║
   ║  Google executa JS, com atraso e orçamento; a maioria dos            ║
   ║  rastreadores de IA não executa nada. Para eles a página está em     ║
   ║  branco — e o sitemap mandava 40 URLs assim.                         ║
   ║                                                                      ║
   ║  ── A ESCOLHA ───────────────────────────────────────────────────    ║
   ║  Só entram as moedas que têm texto escrito em /token-descricoes.json.║
   ║  São 16 hoje. Gerar as 40 com resumo automático encheria o site de   ║
   ║  páginas parecidas entre si — que o Google trata como conteúdo raso  ║
   ║  e que uma IA não teria motivo para citar. Dezesseis páginas boas    ║
   ║  valem mais que quarenta vazias.                                     ║
   ║                                                                      ║
   ║  Escrever uma descrição nova em token-descricoes.json e rodar isto   ║
   ║  de novo basta para a moeda virar página e entrar no sitemap. O      ║
   ║  gargalo passa a ser o texto, que é onde ele deve estar.             ║
   ║                                                                      ║
   ║  ── COMO RODAR ──────────────────────────────────────────────────    ║
   ║      node dev/gerar-paginas-token.mjs                                ║
   ║      node dev/gerar-sitemap.mjs      (depois, para incluir as novas) ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://mundodefi.com.br';
const VERSAO = (fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8')
  .match(/\?v=(2026-\d\d-\d+)/) || [])[1] || '1';

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const descricoes = JSON.parse(fs.readFileSync(path.join(RAIZ, 'token-descricoes.json'), 'utf8'));
const mapaIds = JSON.parse(fs.readFileSync(path.join(RAIZ, 'mundodefi-ids.json'), 'utf8')).ids;

/* Nome e símbolo vêm da CoinPaprika em tempo de geração: melhor buscar uma
   vez aqui do que manter uma segunda lista à mão que vai divergir. */
async function identidade(cgId) {
  const pk = mapaIds[cgId];
  if (!pk) return null;
  const r = await fetch(`https://api.coinpaprika.com/v1/tickers/${pk}?quotes=USD`);
  if (!r.ok) return null;
  const d = await r.json();
  return { nome: d.name, sym: (d.symbol || '').toUpperCase(), pk, rank: d.rank };
}

/* As ferramentas que fazem sentido para uma moeda específica, já com o
   link levando o token preenchido. É o funil: a página existe para trazer
   quem procurou a moeda e entregar a ferramenta que resolve a dúvida. */
function ferramentas(id, sym) {
  return [
    { url: `/ferramentas/staking.html?token=${id}`,
      titulo: `Quanto rende ${sym} em staking`,
      texto: `Informe a quantidade e a taxa que a plataforma anuncia. O simulador projeta o rendimento em APR simples ou APY composto, mês a mês.` },
    { url: `/ferramentas/pool-liquidez.html?token=${id}`,
      titulo: `${sym} numa pool de liquidez vale a pena?`,
      texto: `A conta que quase ninguém faz: se as taxas coletadas cobrem o impermanent loss, ou se teria sido melhor só segurar os dois tokens.` },
    { url: `/ferramentas/lucro-cripto.html?token=${id}`,
      titulo: `Quanto você lucrou com ${sym}`,
      texto: `Preço de entrada, preço de saída e as taxas da corretora descontadas — o lucro líquido de verdade, não o da tela da exchange.` },
    { url: `/ferramentas/comparador-de-ativos.html?token=${id}`,
      titulo: `${sym} rendeu mais que o CDI?`,
      texto: `Compare com renda fixa, ouro, dólar e ações no mesmo gráfico. A pergunta honesta sobre qualquer investimento.` },
    { url: `/ferramentas/conversor.html?cripto=${id}`,
      titulo: `Quanto vale ${sym} em reais`,
      texto: `Converta entre ${sym}, real, dólar e euro com cotação ao vivo, e veja a tabela de valores mais procurados.` },
    { url: '/portfolio/index.html',
      titulo: `Acompanhe seu ${sym} no portfólio`,
      texto: `Preço médio, lucro realizado e retorno anualizado de verdade. Grátis, com uma carteira.` }
  ];
}

function paginaHtml(id, d, ident) {
  const { nome, sym } = ident;
  const url = `${SITE}/moedas/${id}.html`;
  const titulo = `${nome} (${sym}): o que é e cotação hoje | MundoDeFi`;

  /* Description tirada do texto real: primeira frase, completada se ficar
     curta. Description única por página vale mais que a mesma frase
     repetida em dezesseis. */
  let desc = String(d.texto || '').replace(/\s+/g, ' ').trim();
  const frases = desc.split(/(?<=\.)\s+/);
  desc = '';
  for (const f of frases) {
    if (desc && (desc + ' ' + f).length > 158) break;
    desc = desc ? desc + ' ' + f : f;
  }
  if (desc.length < 100) {
    const extra = ` Veja a cotação ao vivo e as ferramentas para calcular com ${sym}.`;
    if ((desc + extra).length <= 158) desc += extra;
  }

  const paragrafos = String(d.texto || '').split('\n\n')
    .map(p => `      <p>${esc(p.trim())}</p>`).join('\n');
  const pontos = (d.pontos || []).length
    ? '      <ul class="pontos">\n'
      + d.pontos.map(p => `        <li>${esc(p)}</li>`).join('\n')
      + '\n      </ul>'
    : '';

  const cards = ferramentas(id, sym).map(f => `        <a class="fer-card" href="${f.url}">
          <div class="fer-ttl">${esc(f.titulo)}</div>
          <div class="fer-txt">${esc(f.texto)}</div>
          <span class="fer-seta">abrir ferramenta →</span>
        </a>`).join('\n');

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': SITE + '/#organizacao' },
      {
        '@type': 'WebPage',
        '@id': url,
        url,
        name: titulo,
        description: desc,
        inLanguage: 'pt-BR',
        isPartOf: { '@id': SITE + '/#site' },
        publisher: { '@id': SITE + '/#organizacao' },
        about: { '@type': 'Thing', name: `${nome} (${sym})`,
                 description: String(d.texto || '').split('\n\n')[0] },
        primaryImageOfPage: { '@type': 'ImageObject', url: SITE + '/favicon.svg' }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Moedas', item: SITE + '/moedas/' },
          { '@type': 'ListItem', position: 3, name: nome, item: url }
        ]
      }
    ]
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="/favicon.svg?v=${VERSAO}" type="image/svg+xml">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="article">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="MundoDeFi">
<meta property="og:image" content="${SITE}/og/moeda-${id}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(nome)} (${esc(sym)}) — MundoDeFi">
<meta name="twitter:image" content="${SITE}/og/moeda-${id}.png">
<meta name="twitter:card" content="summary_large_image">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/mundodefi-tokens.css?v=${VERSAO}">
<link rel="stylesheet" href="/mundodefi-ferramentas.css?v=${VERSAO}">
<style>
  .cotacao{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:1.6rem}
  .cot-item .cot-lbl{font-size:.66rem;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin-bottom:.3rem}
  .cot-item .cot-val{font-family:var(--mono);font-size:1.25rem;font-weight:700;letter-spacing:-.02em}
  .cot-nota{font-size:.7rem;color:var(--muted);margin-top:-.9rem;margin-bottom:1.8rem}
  .pontos{margin:1rem 0 0;padding-left:1.1rem;display:flex;flex-direction:column;gap:.5rem}
  .pontos li{font-size:.86rem;line-height:1.65;color:var(--text)}
  .fer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:14px}
  .fer-card{display:block;background:var(--bg2);border:1px solid var(--border2);border-radius:14px;
    padding:1.15rem 1.25rem;text-decoration:none;transition:border-color .15s,transform .15s}
  .fer-card:hover{border-color:var(--roxo);transform:translateY(-2px);text-decoration:none}
  .fer-ttl{font-size:.94rem;font-weight:700;letter-spacing:-.01em;margin-bottom:.4rem;color:var(--text)}
  .fer-txt{font-size:.79rem;line-height:1.6;color:var(--muted);margin-bottom:.7rem}
  .fer-seta{font-size:.72rem;font-weight:700;color:var(--roxo-txt)}
  @media(max-width:560px){.cot-item .cot-val{font-size:1.05rem}}
</style>

<script type="application/ld+json">
${JSON.stringify(schema, null, 1)}
</script>
</head>
<body>

<div data-mdf="header"></div>

<main>
  <div class="container">

    <div class="page-header">
      <span class="eyebrow">Moeda · ${esc(sym)}</span>
      <h1>O que é ${esc(nome)} <span class="par">(${esc(sym)})</span></h1>
      <p class="sub">Cotação ao vivo, explicação em português e as ferramentas para fazer conta com ${esc(sym)}.</p>
    </div>

    <div class="card">
      <div class="cotacao">
        <div class="cot-item"><div class="cot-lbl">Preço em dólar</div><div class="cot-val" id="c-usd">—</div></div>
        <div class="cot-item"><div class="cot-lbl">Preço em real</div><div class="cot-val" id="c-brl">—</div></div>
        <div class="cot-item"><div class="cot-lbl">Variação 24h</div><div class="cot-val" id="c-chg">—</div></div>
        <div class="cot-item"><div class="cot-lbl">Valor de mercado</div><div class="cot-val" id="c-mc">—</div></div>
      </div>
    </div>
    <p class="cot-nota">Cotação da CoinPaprika, atualizada ao abrir a página. Valores informativos.
      <a href="/token.html?id=${id}" style="color:var(--roxo-txt);font-weight:600">Ver gráfico e dados de mercado →</a></p>

    <div class="card seo-card">
      <h2>${esc(d.titulo || ('O que é ' + nome + '?'))}</h2>
${paragrafos}
${pontos}
    </div>

    <div class="page-header" style="margin-top:2.6rem">
      <h2>O que fazer com ${esc(sym)}</h2>
      <p class="sub">O MundoDeFi não vende ${esc(sym)} nem diz se você deve comprar. Ele faz as contas que a decisão exige.</p>
    </div>
    <div class="fer-grid">
${cards}
    </div>

    <div data-mdf="outras"></div>
    <div data-mdf="pro"></div>

    <p class="aviso">Conteúdo educacional, sem recomendação de compra ou venda. Criptomoedas envolvem
      risco alto e você pode perder o valor investido. O MundoDeFi não realiza intermediação de compra
      ou venda de ativos.</p>

  </div>
</main>

<div data-mdf="footer"></div>

<script src="/mundodefi-catalogo.js?v=${VERSAO}" defer></script>
<script src="/mundodefi-previas.js?v=${VERSAO}" defer></script>
<script src="/mundodefi-ferramentas.js?v=${VERSAO}" defer></script>
<script>
/* A cotação é enfeite: tudo que importa para busca e para IA já está no
   HTML acima. Se isto falhar, a página continua inteira. */
(function(){
  var fmt=function(v,moeda){
    if(v==null||isNaN(v))return '—';
    var casas=Math.abs(v)>=1?2:6;
    return (moeda==='BRL'?'R$ ':'US$ ')+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:casas,maximumFractionDigits:casas});
  };
  var grande=function(v){
    if(!v)return '—';
    var u=[[1e12,' T'],[1e9,' B'],[1e6,' M']];
    for(var i=0;i<u.length;i++) if(v>=u[i][0]) return 'US$ '+(v/u[i][0]).toFixed(2).replace('.',',')+u[i][1];
    return 'US$ '+Math.round(v).toLocaleString('pt-BR');
  };
  fetch('https://api.coinpaprika.com/v1/tickers/${ident.pk}?quotes=USD,BRL')
    .then(function(r){ if(!r.ok) throw 0; return r.json(); })
    .then(function(d){
      var u=(d.quotes&&d.quotes.USD)||{}, b=(d.quotes&&d.quotes.BRL)||{};
      document.getElementById('c-usd').textContent=fmt(u.price,'USD');
      document.getElementById('c-brl').textContent=fmt(b.price,'BRL');
      var ch=u.percent_change_24h;
      var el=document.getElementById('c-chg');
      if(ch!=null){ el.textContent=(ch>=0?'+':'')+Number(ch).toFixed(2).replace('.',',')+'%';
        el.style.color=ch>=0?'var(--verde,#14F195)':'var(--vermelho,#FF4D6A)'; }
      document.getElementById('c-mc').textContent=grande(u.market_cap);
    })
    .catch(function(){
      ['c-usd','c-brl','c-chg','c-mc'].forEach(function(i){
        document.getElementById(i).textContent='indisponível';
      });
    });
})();
</script>
</body>
</html>
`;
}

/* ── roda ──────────────────────────────────────────────────────────── */
const ids = Object.keys(descricoes).filter(k => k[0] !== '_');
const dir = path.join(RAIZ, 'moedas');
fs.mkdirSync(dir, { recursive: true });

let feitas = 0, puladas = [];
for (const id of ids) {
  const ident = await identidade(id);
  if (!ident) { puladas.push(id + ' (sem par na CoinPaprika)'); continue; }
  fs.writeFileSync(path.join(dir, id + '.html'), paginaHtml(id, descricoes[id], ident));
  console.log(`ok /moedas/${id}.html — ${ident.nome} (${ident.sym})`);
  feitas++;
  await new Promise(r => setTimeout(r, 220));   /* educado com a API */
}

console.log(`\n${feitas} paginas geradas.`);
if (puladas.length) console.log('Puladas:\n  ' + puladas.join('\n  '));
console.log('\nRode agora: node dev/gerar-sitemap.mjs');
