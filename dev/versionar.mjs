/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  CARIMBO DE VERSÃO DOS ARQUIVOS (cache busting)                      ║
   ║                                                                      ║
   ║  ── O PROBLEMA QUE ISTO RESOLVE ─────────────────────────────────    ║
   ║  Todo <script src> e <link href> do site leva ?v=DATA. O navegador   ║
   ║  guarda o arquivo por essa URL: mesma URL, mesmo arquivo, para       ║
   ║  sempre. Enquanto a data era escrita à mão, bastava esquecer de      ║
   ║  trocá-la depois de editar um .js para que:                          ║
   ║                                                                      ║
   ║    - o site publicado tivesse o código novo,                         ║
   ║    - e o navegador de quem já visitou continuasse rodando o velho.   ║
   ║                                                                      ║
   ║  Aconteceu duas vezes. Na primeira, o IMD: nenhuma mudança de regra  ║
   ║  chegava a visitante nenhum. Na segunda, o câmbio quebrou no ar --   ║
   ║  a página pedia a versão nova e recebia um /ferramentas-core.js      ║
   ║  antigo, sem a função que ela acabara de passar a chamar. A tela     ║
   ║  dizia "Erro ao carregar" e o commit estava certo.                   ║
   ║                                                                      ║
   ║  ── COMO ISTO IMPEDE ────────────────────────────────────────────    ║
   ║  A versão deixa de ser uma data digitada e passa a ser o HASH do     ║
   ║  conteúdo dos arquivos versionados. Mudou qualquer um deles, o       ║
   ║  carimbo muda sozinho. Não mudou nada, o carimbo não muda e não há   ║
   ║  invalidação de cache à toa.                                         ║
   ║                                                                      ║
   ║  É um carimbo único para o site inteiro, e não um por arquivo: as    ║
   ║  páginas referenciam ?v= de forma global, e trocar isso exigiria     ║
   ║  reescrever cada referência. O custo é invalidar tudo quando um só   ║
   ║  arquivo muda -- irrelevante num site deste tamanho, e o lado seguro ║
   ║  do erro.                                                            ║
   ║                                                                      ║
   ║  ── COMO RODAR ──────────────────────────────────────────────────    ║
   ║      node dev/versionar.mjs           carimba                        ║
   ║      node dev/versionar.mjs --check   só confere, não escreve        ║
   ║                                                                      ║
   ║  O --check sai com código 1 se o carimbo estiver desatualizado, para ║
   ║  poder virar trava antes de publicar.                                ║
   ╚══════════════════════════════════════════════════════════════════════╝ */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SO_CONFERE = process.argv.includes('--check');

/* Pastas que não vão para o navegador ou que não interessam ao hash. */
const IGNORAR = new Set(['.git', '.claude', 'dev', 'og', 'node_modules', 'api']);

function varrer(dir, saida = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORAR.has(item.name)) continue;
    const completo = path.join(dir, item.name);
    if (item.isDirectory()) varrer(completo, saida);
    else saida.push(completo);
  }
  return saida;
}

const arquivos = varrer(RAIZ);
const textuais = arquivos.filter((f) => /\.(html|js|css|json|txt|svg|xml)$/i.test(f));

/* ── 1. quais arquivos são de fato referenciados com ?v= ───────────────
   Só o conteúdo deles entra no hash. Um HTML citando outro HTML não
   conta: HTML não é servido com ?v= e nunca fica preso em cache assim. */
const referenciados = new Set();
const RE_REF = /(?:src|href)\s*=\s*["']([^"']+?)\?v=[^"']*["']/g;

for (const f of textuais.filter((x) => /\.html$/i.test(x))) {
  const s = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = RE_REF.exec(s)) !== null) {
    const alvo = m[1];
    if (/^https?:/i.test(alvo)) continue;             /* externo não entra */
    const abs = alvo.startsWith('/')
      ? path.join(RAIZ, alvo.slice(1))
      : path.resolve(path.dirname(f), alvo);
    if (fs.existsSync(abs)) referenciados.add(abs);
  }
}

/* Os JSON que o próprio JS busca com ?v= (o motor do IMD, o do Nexus e a
   camada de API derivam a versão do <script src> e a repassam) não
   aparecem em HTML nenhum. Entram pelo diretório. */
for (const f of textuais) {
  if (/\.json$/i.test(f) && !/\/testes\//.test(f.replace(/\\/g, '/'))) referenciados.add(f);
}

if (!referenciados.size) {
  console.error('  nenhum arquivo versionado encontrado — algo está errado');
  process.exit(1);
}

/* ── 2. o carimbo é o hash do conteúdo, em ordem estável ───────────── */
const lista = [...referenciados].sort();
const h = crypto.createHash('sha256');
for (const f of lista) {
  h.update(path.relative(RAIZ, f).replace(/\\/g, '/'));
  h.update(fs.readFileSync(f));
}
const carimbo = h.digest('hex').slice(0, 10);

/* ── 3. aplica em toda referência ?v= ─────────────────────────────── */
const RE_TROCA = /(\?v=)[A-Za-z0-9._-]+/g;
let mexidos = 0;
let referenciasVelhas = 0;
const desatualizados = [];

for (const f of textuais) {
  const antes = fs.readFileSync(f, 'utf8');
  /* não reescreve o próprio código que MONTA a string '?v=' */
  const depois = antes.replace(RE_TROCA, (todo, p1) => {
    if (todo.slice(p1.length) === carimbo) return todo;
    referenciasVelhas++;
    return p1 + carimbo;
  });
  if (depois !== antes) {
    desatualizados.push(path.relative(RAIZ, f).replace(/\\/g, '/'));
    if (!SO_CONFERE) fs.writeFileSync(f, depois);
    mexidos++;
  }
}

console.log('');
console.log('  carimbo (hash do conteúdo):  ' + carimbo);
console.log('  arquivos versionados:        ' + lista.length);

if (SO_CONFERE) {
  if (mexidos) {
    console.log('  referências desatualizadas:  ' + referenciasVelhas + ' em ' + mexidos + ' arquivo(s)');
    console.log('');
    for (const d of desatualizados.slice(0, 12)) console.log('    ' + d);
    if (desatualizados.length > 12) console.log('    ... e mais ' + (desatualizados.length - 12));
    console.log('');
    console.log('  CARIMBO DESATUALIZADO. Rode: node dev/versionar.mjs');
    console.log('  Sem isso, quem já visitou o site continua com o código antigo.');
    process.exit(1);
  }
  console.log('  tudo carimbado corretamente.');
  process.exit(0);
}

console.log('  referências atualizadas:     ' + referenciasVelhas + ' em ' + mexidos + ' arquivo(s)');
console.log('');
