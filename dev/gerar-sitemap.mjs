/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  GERADOR DO SITEMAP                                                  ║
   ║                                                                      ║
   ║  O sitemap escrito à mão já tinha anunciado ao Google uma página que ║
   ║  não existia (/ferramentas/liquidacao.html) e esquecido o Nexus. É o ║
   ║  mesmo problema das listas de ferramentas em triplicata: mantido à   ║
   ║  mão, ele diverge.                                                   ║
   ║                                                                      ║
   ║                                                                      ║
   ║  As ferramentas saem de /mundodefi-catalogo.js; as páginas de moeda  ║
   ║  saem de /moedas/, escritas por dev/gerar-paginas-token.mjs. Cada   ║
   ║  URL só entra se o arquivo existir no disco.                         ║
   ║                                                                      ║
   ║  ── COMO RODAR ──────────────────────────────────────────────────    ║
   ║      node dev/gerar-sitemap.mjs                                      ║
   ║                                                                      ║
   ║  Rode depois de criar página nova ou de mexer no catálogo.           ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://mundodefi.com.br';

/* Data da última alteração de verdade, do arquivo. Carimbar tudo com hoje
   é ruído: o Google aprende a ignorar lastmod de quem mente. */
function modificadoEm(rel) {
  try {
    return fs.statSync(path.join(RAIZ, rel)).mtime.toISOString().slice(0, 10);
  } catch { return null; }
}

function existe(rel) {
  return fs.existsSync(path.join(RAIZ, rel.replace(/^\//, '')));
}

/* O catálogo é um IIFE que grava em window. Emprestamos um window. */
function lerCatalogo() {
  const src = fs.readFileSync(path.join(RAIZ, 'mundodefi-catalogo.js'), 'utf8');
  const janela = {};
  new Function('window', src)(janela);
  return janela.MDF_CATALOGO;
}

const urls = [];
function add(loc, arquivo, changefreq, priority) {
  const rel = arquivo || loc;
  if (!existe(rel)) { console.log('  pulando (nao existe):', rel); return; }
  urls.push({ loc, lastmod: modificadoEm(rel.replace(/^\//, '')), changefreq, priority });
}

/* ── raiz e páginas fixas ─────────────────────────────────────────── */
add('/', 'index.html', 'daily', '1.0');
add('/ferramentas/ferramentas.html', null, 'weekly', '0.9');
add('/nexus/index.html', null, 'monthly', '0.7');
add('/planos.html', null, 'monthly', '0.7');
add('/cadastro.html', null, 'yearly', '0.5');
add('/politica-de-privacidade.html', null, 'yearly', '0.3');

/* ── ferramentas, do catálogo ─────────────────────────────────────── */
const cat = lerCatalogo();
for (const item of cat.itens) {
  if (item.slug === 'portfolio') continue;   /* casca de JS: ver robots.txt */
  const url = item.url;
  const arquivo = url.endsWith('/') ? url + 'index.html' : url;
  add(url, arquivo, 'monthly', item.destaque ? '0.9' : '0.8');
}

/* ── páginas de moeda ─────────────────────────────────────────
   Antes o sitemap listava /token.html?id=X, que serve tudo por JavaScript:
   um rastreador que não executa JS via 202 caracteres. As páginas em
   /moedas/ trazem o texto no HTML cru. Só entra quem foi gerado — ou seja,
   quem tem descrição escrita. Ver dev/gerar-paginas-token.mjs. */
const dirMoedas = path.join(RAIZ, 'moedas');
const moedas = fs.existsSync(dirMoedas)
  ? fs.readdirSync(dirMoedas).filter(f => f.endsWith('.html')).sort()
  : [];
for (const arq of moedas) {
  urls.push({
    loc: '/moedas/' + arq,
    lastmod: modificadoEm('moedas/' + arq),
    changefreq: 'weekly', priority: '0.7'
  });
}

/* ── escreve ──────────────────────────────────────────────────────── */
const linhas = urls.map(u =>
  '  <url><loc>' + SITE + u.loc.replace(/&/g, '&amp;') + '</loc>'
  + (u.lastmod ? '<lastmod>' + u.lastmod + '</lastmod>' : '')
  + '<changefreq>' + u.changefreq + '</changefreq>'
  + '<priority>' + u.priority + '</priority></url>'
);

fs.writeFileSync(path.join(RAIZ, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<!-- Gerado por dev/gerar-sitemap.mjs. Nao edite a mao: rode o script. -->\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + linhas.join('\n') + '\n</urlset>\n');

console.log(`\n${urls.length} URLs (${urls.length - moedas.length} paginas + ${moedas.length} moedas)`);
console.log('Gravado em sitemap.xml');
