CONTEXTO DO PROJETO — Mundo DeFi
> Última atualização: 11/06/2026
Quem sou eu
Jefferson (juniordezzz) — founder solo. Construindo em público.
Ecossistema digital de cripto, DeFi, conteúdo e tecnologia voltado para o brasileiro comum.
Site: `mundodefi.com.br` (GitHub Pages, branch `main`, raiz) · Instagram: @mundodefi
---
⭐ A TESE DO SITE (constituição — toda decisão é testada contra isso)
Ferramentas DeFi gratuitas e completas trazem o usuário. Estudos abertos constroem
autoridade. A conversão para os planos pagos é natural, sem desespero — quem usa e
confia, assina.
O MundoDeFi NÃO compete com CoinGecko (cotação) nem CoinTelegraph (notícias).
Isso é commodity. Nosso diferencial: ferramentas e conhecimento DeFi em português.
Modelo: renda extra recorrente, crescimento orgânico (Google + Instagram).
Filosofia: "Estou criando um império, não tenho pressa, mas tenho rumo."
🔑 REGRA DE OURO
Cada plano só promete o que já existe e funciona hoje. Feature não construída
vai para o roadmap, nunca para a página de vendas.
---
💰 ARQUITETURA DE PLANOS (definida em 11/06/2026)
	GRÁTIS	PRO — R$ 9,90/mês	PREMIUM — R$ 29,90/mês
Calculadoras + simuladores	✅ Todos, sem limite	✅	✅
Estudos iniciante/intermediário + glossário	✅ Abertos	✅	✅
Portfólio	Limitado: até 10 ativos, só HOLD	✅ Completo e livre (HOLD + DeFi + Trade)	✅
Tracking de pools + IL, histórico, export IR	—	✅	✅
Estudos avançados básicos	—	✅ Parcial	✅
DeFi Avançado (teses LP, estratégias)	—	🔒	✅
Trade Avançado (confluência, gestão)	—	🔒	✅
Relatórios + acesso ilimitado a todo o site	—	—	✅
Mentoria individual	—	—	✅ Vagas limitadas
Narrativa de venda
GRÁTIS = as ferramentas. Valor real, sem cadastro obrigatório. Gera confiança.
PRO = "seu portfólio organizado". Excelente, mas limitado nas estratégias avançadas.
PREMIUM = tudo + acompanhamento pessoal do founder.
O usuário PRO deve ver os cadeados PREMIUM (DeFi Avançado, Trade Avançado) —
o cadeado visível é o que vende o upgrade.
Escopo da mentoria PREMIUM (não prometer além disso)
1 encontro individual por mês (45–60 min, online), com plano adaptado ao nível da pessoa
Vagas limitadas: iniciar com 15–20 vagas, número explícito na página de vendas
Mentoria é individual "por enquanto" — alto contato na fase inicial = feedback + depoimentos
⚠️ Cláusula de revisão (compromisso comigo mesmo)
Ao atingir 20 assinantes PREMIUM (~R$ 600/mês ≈ 1 call por dia útil), reavaliar:
subir preço, fechar vagas ou migrar novos assinantes para modelo de call coletiva.
---
📁 Arquivos do repositório atual (mundodefi.com.br)
Arquivo	O que é	Plano
`index.html`	Portal/vitrine principal	—
`calculadoras.html`	Juros compostos, lucro cripto	GRÁTIS
`ferramentas.html`	Pool LP, yield, staking, liquidação, APR→APY	GRÁTIS
`estudos.html`	Centro de estudos (artigos com etiqueta GRÁTIS/PRO/PREMIUM)	Misto
`planos.html`	Página de vendas dos 3 planos	—
`token.html`	Página de detalhe de ativo (`?id=`)	GRÁTIS
`dashboard.html`	Dashboard consolidado do portfólio	GRÁTIS limitado / PRO
`hold.html`	Portfólio HOLD	GRÁTIS limitado / PRO
`defi.html`	Posições DeFi / pools	PRO
`trade.html`	Operações de trade, banca, win rate	PRO
`mundodefi-core.js`	JS compartilhado	—
`mundodefi.css`	CSS compartilhado	—
`CNAME`	Domínio customizado do GitHub Pages — não mexer	—
`robots.txt`	Bloqueia indexação de dashboard/hold/defi/trade	—
`sitemap.xml`	6 URLs públicas — adicionar bloco `<url>` a cada página nova	—
`googleb77a0e5a1b3bbc0a.html`	Verificação do Search Console — NUNCA deletar	—
---
🔍 SEO — Status (feito em 10–11/06/2026)
[x] robots.txt no ar
[x] sitemap.xml no ar e enviado no Search Console
[x] Propriedade verificada no Google Search Console (método: arquivo HTML)
[x] Indexação solicitada: home, calculadoras.html, ferramentas.html
[ ] Acompanhar `site:mundodefi.com.br` (previsão: 3–14 dias para indexar)
[ ] Open Graph tags em todas as páginas
[ ] Adicionar 2º método de verificação no Search Console (Tag HTML) como backup
---
🗺️ ROADMAP DE REORGANIZAÇÃO (uma sessão = um arquivo, incremental)
[x] CONTEXTO.md — tese + planos documentados (este arquivo)
[ ] `planos.html` — reescrever com os 3 planos da tabela acima (PRO está R$ 9,99 no site → corrigir para R$ 9,90)
[ ] `index.html` — menu enxuto (Ferramentas · Estudos · Portfólio · PRO), remover
links `#` e seções commodity (Narrativas, links externos DeFiLlama/Binance/CoinTelegraph
como destaque), hero novo focado em ferramentas DeFi grátis, corrigir preço PRO,
"© 2025" → ano atual, remover texto "SEO" vazado no hero
[ ] `estudos.html` — fluxo correto: menu → conteúdo → paywall dentro do artigo;
etiquetas de nível visíveis (GRÁTIS/PRO/PREMIUM)
[ ] Portfólio — implementar limite do plano GRÁTIS (10 ativos, só HOLD)
[ ] OG tags + detalhes finos (token.html, footer)
---
🛠️ Referência técnica
Stack
HTML/CSS/JS puro — sem frameworks
Firebase (Auth + Firestore) para login e persistência
Chart.js 4.4.1 para gráficos
CoinGecko API (free tier) para preços — tem rate limit, sempre cachear
DeFiLlama API para pools
Google Fonts: Space Grotesk (UI) + JetBrains Mono (números/moedas)
Deploy: GitHub Pages com domínio customizado (commits na `main` publicam em 1–5 min)
Identidade visual (Mundo DeFi)
```css
fundo: #0a0a0a (dark) · primária: #9945ff (roxo neon) · secundária: #14f195 (verde Solana)
```
Herança CryptoTrack (vale para dashboard/hold/defi/trade)
As páginas de portfólio vieram do CryptoTrack BR (cryptotrack-br.netlify.app) e mantêm
suas convenções:
Variáveis CSS: `--gold: #f5a623` (destaques) · `--green: #15c784` · `--red: #ea3943` ·
`--blue: #4b96ff` (HOLD) · `--defi: #00d2aa` · `--purple: #9d71ff` · fundos em camadas
`--bg`...`--bg5` · raios `--r: 8px / --rl: 14px / --rxl: 20px` · `--sidebar: 240px`
Classes: `.mc`/`.mv` (metric cards) · `.btn-gold/-green/-red/-ghost/-sm` ·
`.card`/`.card-hdr`/`.card-title` · `.page.active` (SPA) · `.sb-item` (sidebar) ·
`.tb-tab` (topbar) · `.finput`/`.fselect`/`.fgrp`/`.frow` (forms) · `.juros-*` ·
`.calc-*` · `.cdd-*` (dropdown de tokens)
Funções JS: `goPage(p, sbEl, tabKey)` · `renderAll()` · `save()` · `fmt(v)` ·
`jCalcular()` / `jInit()` · `calcAutoSearch(val)` / `_cddSelect(idx)` /
`_preloadTopPrices()` / `initCalc()` · `renderHold()` / `renderDefi()` /
`renderTrade()` / `renderGeral()`
Estado global:
```js
st = {
  hold:  { ativos: {}, txns: [], transfers: [] },
  defi:  { pools: [], fechadas: [] },
  trade: { bancas: {}, trades: [] },
  cfg:   { meta, holdPct, defiPct, tradePct }
}
```
Temas: dark (padrão) e light via `data-theme` no `<html>` — `toggleTheme()`
Modo demo: `DEMO_MODE = true` usa localStorage em vez do Firebase (testes sem login)
---
⚠️ Regras importantes ao editar
Nunca quebrar a autenticação Firebase — `auth`, `db`, `loadFS`, `save` são críticas
Manter modo demo funcional — sempre testar com `DEMO_MODE = true`
Não remover IDs de elementos usados por JS (ex: `j-r-total`, `calc-compra`, `j-grafico`)
Chart.js: sempre destruir instância anterior antes de criar nova (`if(chart){chart.destroy();}`)
CoinGecko free tier tem rate limit — sempre cachear preços (`_calcPrices`)
Nunca deletar `CNAME` nem `googleb77a0e5a1b3bbc0a.html`
Página nova no site = bloco novo no `sitemap.xml`
Preço PRO = R$ 9,90 · PREMIUM = R$ 29,90 — manter consistente em todas as páginas
Toda mudança passa pelo teste da TESE: isso traz usuário, constrói autoridade
ou converte? Se não faz nenhum dos três, não entra.
---
📦 Legado — CryptoTrack BR
O CryptoTrack BR (`cryptotrack-br.netlify.app`, repo separado no Netlify) foi o projeto
original e segue no ar como SPA independente. O sistema de portfólio do MundoDeFi nasceu
dele. A landing `mundo_defi_empire.html` (institucional, estilo luxury: Cormorant
Garamond + Syne + DM Sans, `--gold: #C9A84C`) foi removida do repositório atual —
recuperável no histórico do git se necessário.
---
Roadmap de produto (longo prazo)
[ ] Exportar relatório PDF
[ ] Notificações push de alerta
[ ] API própria de preços (reduzir dependência CoinGecko)
[ ] Relatório mensal PREMIUM (rotina: 1 relatório + calls de mentoria por mês)
[ ] Versão mobile nativa
