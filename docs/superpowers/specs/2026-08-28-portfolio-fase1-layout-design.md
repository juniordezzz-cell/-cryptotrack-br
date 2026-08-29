# Portfólio · Fase 1 — Layout e navegação (design)

> Sub-projeto de um **rework em fases** do portfólio do MundoDeFi, pegando
> ideias do Atlas (produto premium separado) **sem copiar**. Esta é a
> **fase 1 de 3**:
>
> - **Fase 1 (este spec) — layout + navegação.** Migrar da barra lateral
>   para navegação no topo e restilizar o portfólio inteiro.
> - Fase 2 — carteiras inteligentes: caixa por carteira, depósito/saque/
>   transferência/swap e supervisor de coerência matemática.
> - Fase 3 — áreas novas: RWA (ativos do mundo real) e Meta (valor-alvo em
>   um prazo).

## Objetivo

O portfólio funciona e tem boa fundação (orientado a eventos: preço médio,
lucro realizado, patrimônio e retorno são **derivados**, nunca digitados).
O problema é de **apresentação e coerência com o resto do site**:

1. O portfólio é a **única** parte do MundoDeFi com barra lateral. Home e
   ferramentas montam um `<header>` no topo (via `mundodefi-ferramentas.js`).
   A lateral faz o portfólio parecer um app à parte, não parte do produto.
2. O dashboard tem **densidade baixa** (muito preto morto), **sem número
   herói** (4 KPIs + 3 sub-métricas com peso igual, o olho não sabe onde
   pousar) e **estado vazio** ocupando uma tela inteira no lugar do gráfico.
3. Os cartões de carteira são rasos (nome + total) e visualmente não
   conversam com o patrimônio do topo.

Meta da fase 1: **mesma lógica, cara nova.** Navegação no topo, um número
herói, KPIs como pilares, gráfico vivo, e a mesma linguagem visual aplicada
dentro de HOLD, DeFi e Trade.

## Decisões travadas com o dono

- **Navegação no topo** (não lateral). Alinha com o resto do site; devolve
  a largura inteira ao conteúdo; comporta 6 áreas numa linha.
- **Restyle aprovado** a partir do mockup de direção visual
  (Artifact `ddd07cd6`): número herói, KPIs por área com acento de cor,
  gráfico de área vivo, cartões de carteira mais ricos.
- **Escopo completo:** shell + dashboard **+ o miolo** de HOLD/DeFi/Trade.
- **RWA e Meta** aparecem como abas **desativadas com selo "breve"**.
- **Deploy só com aprovação do dono** (merge na main = publicar no ar,
  GitHub Pages). Não fazer por conta própria.

## Fora de escopo (fase 1 NÃO toca)

- `portfolio/portfolio-core.js` e `portfolio/portfolio-store.js` — lógica de
  cálculo, store, XIRR, snapshots, sincronização Firestore. **Intactos.**
- **Caixa, transferência entre carteiras, swap e supervisor** — são fase 2.
- **RWA e Meta reais** (telas, dados) — fase 3. Aqui só entram as abas
  "breve".
- **Barra Investido/Caixa nos cartões de carteira.** Depende do caixa, que
  só existe na fase 2. Na fase 1 o cartão mostra apenas o que é derivável
  hoje (total + participação no patrimônio). Não renderizar caixa inventado
  — "todo número tem origem".

## Arquitetura atual relevante

Tudo em `portfolio/`, JavaScript clássico sem build, um objeto global `P`.

| Peça | Papel |
|---|---|
| `P.shell(active)` | Monta o shell: `.sb` (lateral) + `.mob-top` + `.main`. **É o ponto único a reescrever para o topo.** |
| `P.boot(active, renderFn)` | Chama `P.shell` e depois a view. |
| `P.vDash` | Render do dashboard. |
| `P.vHold` / `P.vDefi` / `P.vTrade` | Render de cada módulo (~400–600 linhas cada). |
| `P.pageDash/Hold/Defi/Trade` | Pontos de entrada chamados no HTML. |
| `portfolio/portfolio.css` | Folha única de estilo do app. |
| `mundodefi-tokens.css` | Sistema de design do site (cores, tipografia, espaçamento). Fonte da verdade visual. |

Páginas HTML: `portfolio/index.html` (dash), `hold.html`, `trade.html`,
`defi.html`. Todas carregam os mesmos scripts e diferem só na chamada final
(`P.pageX()`).

## O que muda

### 1. Shell — de lateral para topo (`P.shell`)

Reescrever `P.shell` para emitir um **header no topo**, não uma `<aside>`:

- **Esquerda:** logo MundoDeFi (link para `/`).
- **Centro:** abas de navegação — Dashboard · HOLD · DeFi · Trade, e
  **RWA · Meta** desativadas com selo "breve". A aba ativa tem sublinhado
  em gradiente (roxo→ciano).
- **Direita:** seletor de moeda (US$/R$) · botão **＋ Adicionar** · avatar.
- **Menu do avatar** (clique abre): absorve o que hoje mora no rodapé da
  lateral — status de sync (`P.statusSync()`), "Limpar e começar do zero"
  (`sbClear`), "Voltar ao site", e o bloco de plano (Grátis + "Assinar" /
  PRO). Nenhum controle some; todos migram.
- **Mobile (< 768px):** as abas viram uma faixa com **scroll horizontal**,
  mantendo a aba ativa visível. Substitui o `.mob-top` + `☰` atuais.

O título de página (`#pgTitle` / `.pg-titulo`) e a saudação continuam, agora
no topo do conteúdo.

**Risco a tratar:** `.sb-sec` é usado como rótulo de seção **dentro** dos
módulos (não só na lateral). Ao remover as classes de lateral, esse
componente de rótulo deve ser **preservado/renomeado** para não quebrar os
títulos internos de HOLD/DeFi/Trade.

### 2. Dashboard (`P.vDash`)

- **Herói do patrimônio:** valor grande em mono, com ganho não realizado
  (valor + %) e realizado logo abaixo, subordinados.
- **KPIs como 4 pilares:** HOLD · DeFi · Trade · Retorno anualizado, cada
  um com acento de cor próprio (roxo/ciano/dourado/verde).
- **Gráfico vivo:** a "Evolução do patrimônio" (Chart.js, já presente) ganha
  a linguagem de área preenchida. O estado vazio deixa de ocupar uma tela
  inteira — vira um bloco discreto quando ainda não há snapshots.
- **Cartões de carteira:** nome + total + participação no patrimônio (barra).
  Sem caixa nesta fase (ver "Fora de escopo").
- **Ativos em HOLD:** tabela limpa (ativo, preço médio, atual, resultado com
  cor de ganho/perda), tabular-nums.

### 3. Módulos (`P.vHold`, `P.vDefi`, `P.vTrade`)

Aplicar a mesma linguagem visual ao miolo de cada um, **preservando todas as
métricas e o comportamento**:

- **HOLD:** KPIs do módulo como pilares, tabela/cards de posições, o bloco
  "Como esta posição foi construída".
- **DeFi:** abas internas (pools/lending), cartões de pool, o comparativo
  "a pool bateu o HOLD?" e o painel de impermanent loss.
- **Trade:** KPIs de banca (win rate, profit factor, expectativa, drawdown),
  diário e linha do tempo, com o aviso honesto de amostra pequena.

Nada de novo cálculo; é reorganização e re-skin dos componentes existentes.

### 4. RWA + Meta (abas "breve")

Duas abas desativadas no shell, com selo "breve" e `aria-disabled`. Sem rota,
sem página — apenas sinalizam para onde o produto vai.

## Linguagem visual

Reusar `mundodefi-tokens.css` — **não** inventar paleta. Regras de cor por
**função**, não decoração:

- **roxo** `#9945FF` — interação (foco, seleção, ação primária, aba ativa)
- **dourado** `#F5B614` — ênfase (o número que a pessoa veio ver)
- **verde** `#14F195` / **vermelho** `#FF4D6A` — ganho / perda, **e nada mais**
- **ciano** `#00E5FF` — informação neutra, dado ao vivo
- Superfícies near-black com viés azul (`--mdf-bg/surface/2/3`)
- Tipografia: Space Grotesk (texto) + Space Mono (números, `tabular-nums`)

Componentes reutilizáveis a consolidar no CSS: `top-nav` + menu de avatar,
herói de patrimônio, tile de KPI, cartão de stat, cartão de carteira, tabela
de dados. Um só de cada, para os módulos não recriarem cinco aparências.

## Responsividade e acessibilidade

- Breakpoints do sistema: 560 / 768 / 960 / 1220px.
- Abas com `role="tablist"`/`aria-selected`; abas "breve" com
  `aria-disabled="true"`.
- Foco visível (o token de foco já existe). Contraste AA garantido pelos
  níveis de texto dos tokens.
- Respeitar `prefers-reduced-motion` (o gráfico e transições).

## Verificação

- `node dev/testar.mjs` **verde** (a lógica não muda; se algum teste quebrar,
  o restyle vazou para onde não devia).
- Abrir `index.html`, `hold.html`, `defi.html`, `trade.html` no browser:
  **console limpo** em todas, e screenshots **antes/depois** para o dono.
- Conferir o menu do avatar (sync, limpar, voltar, plano) e o estado vazio
  do dashboard.
- `node dev/versionar.mjs` para recarimbar os caches após as mudanças de CSS/JS.

## Deploy

Merge na `main` (GitHub Pages) publica no ar — **só com o "vai" do dono**.
Consistente com a regra do projeto: publicar = versionar + testar + merge.
