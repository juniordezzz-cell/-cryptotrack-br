/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  GERADOR DO /llms.txt                                                ║
   ║                                                                      ║
   ║  ── EXPECTATIVA CALIBRADA ───────────────────────────────────────    ║
   ║  llms.txt é proposta de comunidade, sem órgão de padronização por    ║
   ║  trás e sem compromisso público de nenhuma empresa grande de IA em   ║
   ║  lê-lo. Medições de 2026 acharam algo como 408 acessos ao arquivo    ║
   ║  em 500 milhões de visitas de bots. Ou seja: hoje, quase ninguém.    ║
   ║                                                                      ║
   ║  Está aqui porque custa um arquivo gerado e nenhum risco, e porque   ║
   ║  no dia em que passar a ser lido já vai estar certo. NÃO é o que faz ║
   ║  IA entender o site — isso é conteúdo no HTML e Schema.org.          ║
   ║                                                                      ║
   ║  ── COMO RODAR ──────────────────────────────────────────────────    ║
   ║      node dev/gerar-llms.mjs                                         ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://mundodefi.com.br';

function lerCatalogo() {
  const src = fs.readFileSync(path.join(RAIZ, 'mundodefi-catalogo.js'), 'utf8');
  const janela = {};
  new Function('window', src)(janela);
  return janela.MDF_CATALOGO;
}

const cat = lerCatalogo();
const L = [];

L.push('# MundoDeFi');
L.push('');
L.push('> Ferramentas gratuitas em português para quem investe em criptomoedas e DeFi no Brasil. '
     + 'Calculadoras de impermanent loss, staking, juros compostos e conversão, mais um portfólio '
     + 'que acompanha HOLD, DeFi e trade com preço médio, lucro realizado e retorno anualizado.');
L.push('');
L.push('O site não disputa busca de cotação: ele existe para fazer conta que o investidor '
     + 'brasileiro precisa fazer e normalmente faz errado, ou não faz.');
L.push('');
L.push('Idioma: português do Brasil. Moedas: real e dólar.');
L.push('');

/* Agrupado pela pergunta que a pessoa está fazendo, que é como o catálogo
   organiza — e é mais útil para uma máquina escolher do que uma lista
   alfabética de nomes de produto. */
for (const grupo of cat.agrupado()) {
  const c = grupo.categoria;
  L.push(`## ${c.nome} — "${c.pergunta}"`);
  L.push('');
  for (const it of grupo.itens) {
    const selo = it.plano === 'pro' ? ' (assinatura PRO)' : ' (grátis)';
    /* Aplicativo de uma pagina so: o HTML servido esta praticamente vazio e
       o robots.txt bloqueia o rastreio. Avisar poupa a maquina de buscar
       uma pagina que nao vai lhe dizer nada. */
    const app = /portfolio|entradas-saidas/.test(it.url)
      ? ' — aplicativo web, o conteúdo só existe depois do JavaScript'
      : '';
    L.push(`- [${it.nome}](${SITE}${it.url})${selo}: ${it.resumo}${app}`);
  }
  L.push('');
}

L.push('## Como o site calcula');
L.push('');
L.push('- **Impermanent loss**: `IL = r^w1 / (w1·r + w2) − 1`, onde `r` é o desempenho '
     + 'RELATIVO entre os dois tokens do par, não a variação de um deles. Num par SOL/ETH em que '
     + 'os dois dobram, r = 1 e não há impermanent loss nenhum.');
L.push('- **Preço médio**: custo médio ponderado, o método usado no Brasil. Venda não muda o '
     + 'preço médio: ela baixa o custo proporcional e materializa o ganho.');
L.push('- **Retorno anualizado**: XIRR, que considera a data de cada aporte. Quem comprou na '
     + 'baixa e quem comprou na alta não podem aparecer com o mesmo retorno.');
L.push('- **Concentração**: índice de Herfindahl-Hirschman sobre as posições, com stablecoin '
     + 'tratada como caixa.');
L.push('- **Liquidação em trade alavancado**: inclui margem de manutenção. Ignorá-la subestima '
     + 'o risco, que é o lado perigoso do erro.');
L.push('');
L.push('## Páginas');
L.push('');
L.push(`- [Todas as ferramentas](${SITE}/ferramentas/ferramentas.html)`);
L.push(`- [Planos e preços](${SITE}/planos.html): o portfólio completo é grátis com uma carteira; `
     + 'o PRO (R$ 19,90/mês) libera carteiras ilimitadas, o Nexus, Entradas e Saídas, Simulador '
     + 'de Trade e exportação em CSV.');
L.push(`- [Nexus](${SITE}/nexus/index.html): lê os números do portfólio e responde sobre `
     + 'concentração, resultado e pools. É um motor de regras determinístico em JSON, auditável — '
     + 'não é modelo de linguagem e não gera texto.');
L.push(`- [Política de privacidade](${SITE}/politica-de-privacidade.html)`);
L.push('');
L.push('## Observações');
L.push('');
L.push('- Conteúdo educacional. O site não faz recomendação de investimento nem intermedia '
     + 'compra e venda de ativos.');
L.push('- Cotações vêm da CoinPaprika e da CoinGecko, e da Binance nas páginas de token.');
L.push('- Rastreadores de IA são bem-vindos: veja /robots.txt. Se citar, use o link da '
     + 'ferramenta específica — é o que resolve a dúvida de quem perguntou.');
L.push('');

fs.writeFileSync(path.join(RAIZ, 'llms.txt'), L.join('\n'));
console.log(`llms.txt gravado — ${L.join('\n').length} caracteres, ${cat.total} ferramentas`);
