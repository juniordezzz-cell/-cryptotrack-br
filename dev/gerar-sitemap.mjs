/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  GERADOR DO SITEMAP                                                  ║
   ║                                                                      ║
   ║  O sitemap escrito à mão já tinha anunciado ao Google uma página que ║
   ║  não existia (/ferramentas/liquidacao.html) e esquecido o Nexus. É o ║
   ║  mesmo problema das listas de ferramentas em triplicata: mantido à   ║
   ║  mão, ele diverge.                                                   ║
   ║                                                                      ║
   ║  Aqui as ferramentas saem de /mundodefi-catalogo.js, as páginas de   ║
   ║  token saem de /mundodefi-ids.json (que já vem ordenado por          ║
   ║  capitalização), e cada URL só entra se o arquivo existir no disco.  ║
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

/* Quantas páginas de token entram. Listar as ~350 que temos encheria o
   sitemap de páginas que ninguém procura; o valor está nas moedas que o
   brasileiro de fato digita no Google. */
const TOKENS_NO_SITEMAP = 40;

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

/* ── páginas de token ─────────────────────────────────────────────── */
const ids = Object.keys(JSON.parse(
  fs.readFileSync(path.join(RAIZ, 'mundodefi-ids.json'), 'utf8')).ids
).slice(0, TOKENS_NO_SITEMAP);
const modToken = modificadoEm('token.html');
for (const id of ids) {
  urls.push({
    loc: '/token.html?id=' + id,
    lastmod: modToken, changefreq: 'daily', priority: '0.6'
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

console.log(`\n${urls.length} URLs (${urls.length - ids.length} paginas + ${ids.length} tokens)`);
console.log('Gravado em sitemap.xml');
