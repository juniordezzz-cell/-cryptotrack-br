/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  GERADOR DO MAPA DE IDS — CoinGecko ⇄ CoinPaprika                    ║
   ║                                                                      ║
   ║  O site inteiro fala em id da CoinGecko: /token.html?id=bitcoin, o   ║
   ║  campo `cg` de cada ativo do portfólio, o bloco de impermanent loss  ║
   ║  das pools. A CoinPaprika usa outro formato (btc-bitcoin), e não dá  ║
   ║  para converter por regra: jupiter na CoinGecko é                    ║
   ║  "jupiter-exchange-solana" e na Paprika é "jup-jupiter".             ║
   ║                                                                      ║
   ║  Então o mapa é gerado uma vez, das duas fontes reais, e vira um     ║
   ║  arquivo estático. Nada de adivinhar em tempo de execução: id errado ║
   ║  manda a pessoa para uma página de token que não existe.             ║
   ║                                                                      ║
   ║  ── COMO RODAR ──────────────────────────────────────────────────    ║
   ║      node dev/gerar-mapa-ids.mjs                                     ║
   ║                                                                      ║
   ║  Com a chave da CoinGecko configurada em mundodefi-api.js ele a      ║
   ║  reaproveita; sem ela, usa o acesso anônimo (e provavelmente toma    ║
   ║  429 — o tier anônimo não aguenta nem uma dúzia de chamadas).        ║
   ║                                                                      ║
   ║  Saída: /mundodefi-ids.json                                          ║
   ║  Rode de novo de vez em quando: moeda nova entra no ranking e a      ║
   ║  CoinGecko às vezes renomeia id (matic-network virou                 ║
   ║  polygon-ecosystem-token quando MATIC virou POL).                    ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUANTAS = 500;          /* o conversor oferece 500 moedas; o mapa
                                 precisa alcancar todas elas */
const POR_PAGINA = 250;       /* teto da CoinGecko por chamada */

/* A chave mora em mundodefi-api.js. Lemos de lá em vez de pedir de novo. */
function chaveDoProjeto() {
  try {
    const s = fs.readFileSync(path.join(RAIZ, 'mundodefi-api.js'), 'utf8');
    const m = s.match(/chave:\s*'([^']*)'/);
    return (m && m[1]) || '';
  } catch { return ''; }
}

const CHAVE = chaveDoProjeto();

async function pegar(url, tentativas = 4) {
  const opts = CHAVE && url.includes('coingecko')
    ? { headers: { 'x-cg-demo-api-key': CHAVE } }
    : {};
  for (let i = 0; i < tentativas; i++) {
    const r = await fetch(url, opts);
    if (r.ok) return r.json();
    if (r.status !== 429) throw new Error(`${r.status} em ${url}`);
    const espera = 8000 * (i + 1);
    console.log(`  429 — esperando ${espera / 1000}s`);
    await new Promise(res => setTimeout(res, espera));
  }
  throw new Error(`429 persistente em ${url}`);
}

const limpa = s => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

console.log(CHAVE ? 'Usando a chave da CoinGecko.' : 'Sem chave — pode tomar 429.');

/* ── 1. CoinGecko: top N ─────────────────────────────────────────── */
console.log('Buscando top', QUANTAS, 'da CoinGecko…');
const paginas = Math.ceil(QUANTAS / POR_PAGINA);
let cg = [];
for (let p = 1; p <= paginas; p++) {
  const lote = await pegar(
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd' +
    `&order=market_cap_desc&per_page=${POR_PAGINA}&page=${p}&sparkline=false`
  );
  cg = cg.concat(lote);
  console.log(`  pagina ${p}: ${lote.length}`);
}

/* ── 2. CoinPaprika: top N (pede mais, para achar os que a ordem separa) */
console.log('Buscando tickers da CoinPaprika…');
const pk = await pegar(`https://api.coinpaprika.com/v1/tickers?quotes=USD&limit=${QUANTAS * 3}`);

/* ── 3. Casamento ────────────────────────────────────────────────────
   Símbolo é quase único no topo do ranking, mas "quase" não serve: BTC
   tem clone, USDT tem ponte. Então casamos por símbolo E nome; quando só
   o símbolo bate, aceitamos apenas se houver um único candidato. */
const porSimbolo = new Map();
for (const p of pk) {
  const k = limpa(p.symbol);
  if (!porSimbolo.has(k)) porSimbolo.set(k, []);
  porSimbolo.get(k).push(p);
}

const mapa = {};
const duvidosos = [];
const semPar = [];

for (const c of cg) {
  const cands = porSimbolo.get(limpa(c.symbol)) || [];
  let escolhido = null;

  if (cands.length === 1) {
    escolhido = cands[0];
  } else if (cands.length > 1) {
    const porNome = cands.filter(p => limpa(p.name) === limpa(c.name));
    if (porNome.length === 1) escolhido = porNome[0];
    else {
      /* desempata pelo rank: o de maior capitalização é o legítimo */
      const ordenado = cands.slice().sort((a, b) => (a.rank || 9e9) - (b.rank || 9e9));
      if (ordenado[0] && limpa(ordenado[0].name) === limpa(c.name)) escolhido = ordenado[0];
      else duvidosos.push(`${c.id} (${c.symbol}) → ${cands.map(x => x.id).join(', ')}`);
    }
  }

  if (escolhido) mapa[c.id] = escolhido.id;
  else if (!cands.length) semPar.push(`${c.id} (${c.symbol})`);
}

/* ── 4. Grava ────────────────────────────────────────────────────────── */
const saida = {
  gerado: new Date().toISOString().slice(0, 10),
  fonte: 'coingecko /coins/markets top ' + QUANTAS + ' × coinpaprika /tickers',
  observacao: 'chave = id da CoinGecko, valor = id da CoinPaprika. Id ausente '
            + 'significa "não sei": quem consome deve cair na CoinGecko, nunca chutar.',
  ids: mapa
};
fs.writeFileSync(path.join(RAIZ, 'mundodefi-ids.json'), JSON.stringify(saida, null, 1) + '\n');

console.log(`\n${Object.keys(mapa).length} de ${cg.length} casados.`);
if (duvidosos.length) console.log(`\nAmbíguos (ficaram de fora de propósito):\n  ${duvidosos.join('\n  ')}`);
if (semPar.length)   console.log(`\nSem par na Paprika:\n  ${semPar.join('\n  ')}`);
console.log('\nGravado em mundodefi-ids.json');
