# Prévia do portfólio: o exemplo vira dado (design)

> Decidido com o dono em 30/08/2026. **Não implementado** — spec pronto
> para virar plano quando houver orçamento.

## O problema

O exemplo do portfólio existe **duas vezes**:

1. Escrito à mão no HTML, em seis funções de prévia (`vDashTeaser`,
   `vHoldTeaser`, `vDefiTeaser`, `vTradeTeaser`, `vRWATeaser`,
   `vMetaTeaser`) — ~150 linhas de números digitados.
2. Montado pelo motor, em `P.carregarExemplo()`, hoje escondido atrás de
   um botão do estado vazio.

A primeira apodrece. Em 30/08/2026 três auditorias independentes acharam
14 contradições nela, entre elas:

- o mesmo trade valendo **+$140** no dashboard e **+$260** na aba Trade;
- "maior perda $54,00" com perda média implícita de $72,80 — um máximo
  abaixo da própria média;
- carteiras somando $18.740 sob o rótulo "% do patrimônio" de $20.520 —
  faltava exatamente o RWA, pilar que entrou na fase 3;
- APR médio de 18,4% entre linhas de 19,1% e 8,4%.

Nenhuma nasceu errada. Cada uma foi verdade no dia em que foi digitada e
foi ficando falsa enquanto o resto da tela andava. Ver
[[exemplo-deslogado-sai-do-motor]].

## A decisão

**Matar a primeira, promover a segunda.** Um exemplo só, montado pelo
motor, renderizado pelas telas de verdade.

### Decisões do dono

1. **O exemplo cabe no plano grátis:** 1 carteira e 1 meta. HOLD, DeFi,
   Trade e RWA seguem cheios — não têm limite. Sem isso, quem registrasse
   nasceria estourando o limite de carteira e com a cota de metas cheia,
   sem conseguir criar a sua.
2. **Deslogado vê o mesmo exemplo, nas telas reais.** As seis funções de
   prévia são apagadas.
3. **Faixa fixa até limpar**, para quem registrou. Nomear "(exemplo)" não
   basta: quem entra direto no HOLD pode não reparar e somar por cima.

## Arquitetura

### `portfolio/portfolio-exemplo.js` (novo)

O construtor sai da camada de tela e vira módulo `require`-ável, no
padrão de `portfolio-core.js`. **É isso que destrava o resto:** com ele
fora do navegador, o teste em Node monta o exemplo e cobra coerência.
Número errado no exemplo passa a ser teste vermelho, não texto velho.

Exporta `Exemplo.montar()` → estado completo (carteira, ativos, `mov`,
pools, lending, trades, RWA, 1 meta). Não salva, não toca em `P`.

### Dois consumidores

| Quem | Origem do estado | Salva? |
|---|---|---|
| Deslogado | `Exemplo.montar()` em memória | **Nunca** |
| Registrado, primeira vez | `Exemplo.montar()` semeado | Sim, sincroniza |

Depois disso, **todas as telas rodam sem saber de nada** — some o
`if (P.modoDemo()) { ...Teaser(); return; }` de seis lugares.

### Duas marcas no estado, não uma

- **`semeado`** — "já ofereci o exemplo uma vez". **Sobrevive ao limpar.**
- **`exemplo`** — "tem exemplo carregado agora". Some ao limpar; acende a faixa.

Sem separar as duas, quem clicasse em "🗑 Limpar e começar do zero" seria
semeado de novo no carregamento seguinte, e o botão viraria enfeite.
`Store.limpar()` precisa preservar `semeado`.

### Deslogado é somente leitura

Hoje as prévias são estáticas e ninguém interage. Com as telas reais, o
deslogado passa a poder clicar em "+ Adicionar". Toda ação de escrita em
modo demo abre o convite de login em vez de salvar — ele explora à
vontade, mas não digita dados que sumiriam no F5.

### A meta do exemplo

**Patrimônio em dólar**, não por ativo. Meta em quantidade cai em
`sem-medida` no veredito de ritmo (o núcleo se recusa a comparar dinheiro
com bitcoin, e está certo), então mostraria um card mais pobre justo na
vitrine.

## O que já existe e não precisa ser feito

- `🗑 Limpar e começar do zero` — pronto, `portfolio.js:391` → `Store.limpar()`
- `P.carregarExemplo()` — o construtor a extrair, `portfolio.js:2320`
- `P.demoNote()` e `P.duoBanners()` — nota e banners, independentes de número
- A nota "os dados de exemplo são identificados como tais"

## Verificação

- **Teste novo** em `portfolio/testes/teste-core.js` cobrando a coerência
  do exemplo montado: patrimônio = soma dos pilares; carteiras somando
  100%; cada KPI = soma da sua coluna; a meta fechando como na fase 4.
  É a trava posta na prévia da Meta, agora sobre o exemplo inteiro.
- `node dev/testar.mjs` verde.
- Navegador: as seis telas, **deslogado e logado**, celular e desktop,
  console limpo. Estado vazio é obrigatório — foi o que falhou na fase 1.
- `node dev/versionar.mjs` ao fim. **O arquivo novo precisa entrar com
  `?v=1` nas seis páginas**, senão nunca cacheia-busta.

## Fora de escopo

- Mudar limites de plano.
- Mexer nas telas logadas além do necessário para elas aceitarem o exemplo.
- Refazer a barra "Onde está seu risco" com fatia de banca de trade —
  muda layout, é decisão de produto.

## Deploy

Merge na `main` publica no GitHub Pages — **só com o "vai" do dono.**
