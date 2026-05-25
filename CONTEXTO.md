# CONTEXTO DO PROJETO — Mundo DeFi / CryptoTrack BR

## Quem sou eu
Jefferson (juniordezzz) — founder solo. Construindo em público.
Ecossistema digital de cripto, DeFi, conteúdo e tecnologia voltado para o brasileiro comum.

---

## Os arquivos do repositório

| Arquivo | O que é |
|---|---|
| `index.html` | App principal — CryptoTrack BR (SaaS de rastreio de carteira cripto) |
| `planos.html` | Página de planos/preços do CryptoTrack |
| `mundo_defi_empire.html` | Landing page institucional do ecossistema Mundo DeFi |

---

## CryptoTrack BR — index.html (o principal)

### O que é
Dashboard SaaS single-page para rastrear carteiras cripto: HOLD, DeFi e TRADE.
Autenticação via Firebase. Dados salvos no Firestore.
Deploy no Netlify: `cryptotrack-br.netlify.app`

### Tecnologias
- HTML/CSS/JS puro — sem frameworks
- Firebase (Auth + Firestore) para login e persistência
- Chart.js 4.4.1 para gráficos
- CoinGecko API (free tier) para preços de tokens
- ExchangeRate API para cotações de moeda (USD/EUR/BRL)
- Google Fonts: Space Grotesk + JetBrains Mono

### Estrutura de páginas (goPage)
- `geral` — Dashboard consolidado (gráficos, metas, alocação)
- `hold` — Portfólio de longo prazo (compra/venda/transferência)
- `defi` — Pools de liquidez (abertura, fechamento, taxas)
- `trade` — Operações de curto prazo (banca, win rate, histórico)
- `calc` — Calculadora de Lucro Cripto (entrada/saída/taxas com autocomplete de tokens)
- `juros` — Calculadora de Juros Compostos (fundo estrelas animado, cotações em tempo real)
- `favoritos` — Moedas favoritas com preço live
- `alertas` — Alertas visuais de preço
- `noticias` — Feed CoinTelegraph + métricas de mercado
- `comparar` — Comparação de performance entre ativos
- `config` — Metas de alocação, dados da conta

### Variáveis CSS principais
```css
--gold: #f5a623       /* cor principal — botões, destaques */
--green: #15c784      /* lucro, positivo */
--red: #ea3943        /* perda, negativo */
--blue: #4b96ff       /* HOLD */
--defi: #00d2aa       /* DeFi */
--purple: #9d71ff     /* estratégia avançada */
--bg / --bg2 / --bg3 / --bg4 / --bg5  /* fundos escuros em camadas */
--text / --muted / --muted2           /* tipografia */
--border / --border2                  /* bordas */
--r: 8px   --rl: 14px   --rxl: 20px  /* border-radius */
--sidebar: 240px                      /* largura do menu lateral */
```

### Fontes
- `"Space Grotesk"` — fonte principal da UI
- `"JetBrains Mono"` — valores numéricos, moedas, código

### Convenções de classes CSS
- `.mc` — metric card (cards de métricas com `.mc-gold`, `.mc-green`, etc.)
- `.mv` — metric value (número grande dentro do card)
- `.btn`, `.btn-gold`, `.btn-green`, `.btn-red`, `.btn-ghost`, `.btn-sm` — botões
- `.card`, `.card-hdr`, `.card-title` — cards de conteúdo
- `.page` / `.page.active` — páginas da SPA
- `.sb-item` / `.sb-item.active` — itens da sidebar
- `.tb-tab` / `.tb-tab.active` — abas da topbar
- `.finput`, `.fselect`, `.fgrp`, `.frow` — campos de formulário
- `.juros-*` — todos os estilos da calculadora de juros compostos
- `.calc-*` — estilos da calculadora cripto (autocomplete, dropdown)
- `.cdd-*` — dropdown de tokens (cdd = calc dropdown)

### Funções JS principais
- `goPage(p, sbEl, tabKey)` — navega entre páginas
- `renderAll()` — re-renderiza tudo após mudança de dados
- `save()` — salva no Firestore (ou localStorage no modo demo)
- `fmt(v)` — formata valor em dólar
- `jCalcular()` — executa cálculo de juros compostos e desenha gráfico
- `jInit()` — inicializa página de juros (canvas estrelas + cotações)
- `calcAutoSearch(val)` — autocomplete de tokens na calc cripto
- `_cddSelect(idx)` — seleciona token e preenche preço automaticamente
- `_preloadTopPrices()` — pré-carrega preços dos top tokens ao abrir calc cripto
- `initCalc()` — inicializa calculadora cripto
- `renderHold()`, `renderDefi()`, `renderTrade()`, `renderGeral()` — renders das abas

### Estado global
```js
st = {
  hold: { ativos: {}, txns: [], transfers: [] },
  defi: { pools: [], fechadas: [] },
  trade: { bancas: {}, trades: [] },
  cfg: { meta, holdPct, defiPct, tradePct }
}
```

### Temas
- Dark (padrão) e Light — alternados via `data-theme` no `<html>`
- `toggleTheme()` — função de alternância

### Modo demo
- `DEMO_MODE = true/false` — quando true, usa localStorage em vez do Firebase
- Útil para testes sem autenticação

---

## mundo_defi_empire.html — Landing institucional

### O que é
Landing page de apresentação do ecossistema Mundo DeFi para investidores, parceiros e imprensa.
Design editorial premium, estilo "luxury brand".

### Tecnologias
- HTML/CSS/JS puro
- Google Fonts: Cormorant Garamond (display serif) + Syne (headings) + DM Sans (body)
- IntersectionObserver para animações `.reveal`

### Variáveis CSS principais
```css
--black: #080A0C
--gold: #C9A84C       /* diferente do CryptoTrack! */
--gold-light: #E8CB7A
--green: #1D9E75
--text: #E8E4DC
--text-muted: #8A8680
--ff-display: 'Cormorant Garamond'
--ff-head: 'Syne'
--ff-body: 'DM Sans'
```

### Seções
1. **Hero** — "Mundo DeFi / Construindo um Império"
2. **Manifesto** — Proposta de valor, missão
3. **Projetos** — 4 frentes: Pobre em Dólar, CryptoTrack, Jefferson Founder, Mundo DeFi Inst.
4. **Estrutura** — 4 pilares: Conteúdo, Produto, Comunidade, Monetização
5. **Roadmap** — 4 fases: Fundação → Produto → Monetização → Escala
6. **Investimento** — Alocação de capital e rota de captação
7. **Cooperadores** — Parceiros e aliados estratégicos
8. **Visão** — Metas finais: $1M ARR, 10M impressões/mês, expansão LATAM

---

## Regras importantes ao editar

1. **Nunca quebrar a autenticação Firebase** — as funções `auth`, `db`, `loadFS`, `save` são críticas
2. **Manter modo demo funcional** — sempre testar com `DEMO_MODE = true`
3. **Não remover IDs de elementos** usados por JS (ex: `j-r-total`, `calc-compra`, `j-grafico`)
4. **CSS do CryptoTrack e do mundo_defi são separados** — variáveis `--gold` têm valores diferentes
5. **Chart.js**: sempre destruir instância anterior antes de criar nova (`if(chart){chart.destroy();}`)
6. **Topbar tem só 4 abas**: Geral, HOLD, DEFI, TRADE — calculadoras ficam só na sidebar
7. **Sidebar item de Juros** se chama "Calculadora de Juros Compostos"
8. **CoinGecko free tier** tem rate limit — sempre cachear preços em `_calcPrices`

---

## Roadmap atual do produto (Fase 1)
- [x] Dashboard consolidado
- [x] HOLD com compra/venda/transferência
- [x] DeFi com pools e histórico
- [x] TRADE com banca e win rate
- [x] Calculadora de Lucro Cripto (com autocomplete de tokens)
- [x] Calculadora de Juros Compostos (com cotações em tempo real)
- [x] Favoritos com preço live
- [x] Alertas de preço
- [x] Notícias (CoinTelegraph)
- [x] Comparar ativos
- [x] Plano PRO (página planos.html)
- [ ] Exportar relatório PDF
- [ ] Notificações push de alerta
- [ ] API própria de preços (reduzir dependência CoinGecko)
- [ ] Versão mobile nativa
