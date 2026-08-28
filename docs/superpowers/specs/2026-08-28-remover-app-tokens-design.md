# Remover o app de tokens (mantendo as páginas /moedas/)

**Data:** 2026-08-28
**Sub-projeto 1 de 3** do pivô decidido pelo dono (Jeferson):
o site passa a focar **só em ferramentas e portfólio**. Os outros dois:
(2) reestruturação completa do portfólio, (3) melhoria de todas as
ferramentas. Cada um terá seu próprio ciclo spec → plano → execução.

## Contexto

O site tinha uma "aba tokens": a página interativa `token.html` (cotação
ao vivo, gráfico, métricas de qualquer ativo) mais toda a navegação de
mercado que levava a ela. O dono decidiu tirar isso do produto: os ícones
e descrições daquela página o incomodaram, e a aba disputa "busca de
ativos", terreno que ele conscientemente não quer disputar.

Decisão-chave já tomada com o dono: **tira o app, mantém as páginas.**

## O que SAI

- `token.html` — a página interativa (o app de token).
- Na home (`index.html`), tudo que só existia para levar ao `token.html`:
  - o dropdown "Mercado" do menu (BTC/ETH/SOL);
  - a busca de ativos (searchbox + sugestões);
  - o ticker de cotações;
  - a grade de mercado.
  - Resultado: a home fica **enxuta** — topo + ferramentas + portfólio +
    planos. Foi escolha explícita do dono não preencher esse espaço agora;
    a home será redesenhada de verdade no sub-projeto 2 (portfólio), e
    construir algo aqui seria construir o que sairia depois.
- O item "Mercado" no menu, onde ele aparecer (home, comparador, e a
  página de despesas do módulo entradas-saídas).
- A entrada de `token.html` no `sitemap.xml`.

## O que FICA, intocado

- As **43 páginas `/moedas/*.html`** — conteúdo curado em português, já
  indexado. É metade da pegada de SEO e o motivo de manter em vez de
  apagar tudo. O dono depende do Google para distribuir o site.
- **Todas as ferramentas** e o **motor de preços** (`mundodefi-api.js`).
  Conversor, câmbio e comparador buscam preço e continuam funcionando — o
  motor de preços não é a aba tokens.
- O **portfólio** inteiro.
- Os geradores em `dev/` que produzem as páginas `/moedas/`
  (`gerar-paginas-token.mjs`) e os artefatos de SEO — ajustados, não
  removidos, para nunca reintroduzir `token.html`.

## Ajuste obrigatório

42 das 43 páginas `/moedas/` têm um link **"Ver gráfico e dados de
mercado → /token.html?id=…"** que quebraria. Esse CTA é reapontado para o
**comparador de ativos** — a ferramenta cuja função (ver e comparar o
desempenho de ativos ao longo do tempo) é a mais próxima de "ver gráfico
e dados de mercado". Se o comparador não aceitar um ativo pré-selecionado
por URL sem esforço, o link vai para a ferramenta sem parâmetro (decisão
do plano, não do design). Assim a página de moeda:

1. continua sem link quebrado;
2. passa a mandar tráfego para as ferramentas — o produto que o site
   agora quer vender — em vez de para um app que deixou de existir.

## Consequências e riscos

- **SEO:** as `/moedas/` ficam, então a maior parte da pegada é
  preservada. `token.html` sai do sitemap; nenhuma `/moedas/` sai.
- **Links internos:** o risco real da remoção é deixar um link apontando
  para `token.html`. O plano trata cada referência levantada no
  inventário; a verificação final é um grep por `token.html` que só pode
  sobrar em histórico/spec, nunca em página servida.
- **Home mais vazia:** aceito de propósito. É estado de transição até o
  sub-projeto 2.

## Fora de escopo (não é este sub-projeto)

- Redesenhar a home de forma positiva (vem com o portfólio).
- Reestruturar o portfólio.
- Melhorar as ferramentas.
- Reapontar o CTA das `/moedas/` para uma ferramenta *nova*: por ora
  aponta para uma ferramenta que já existe.

## Verificação

- `node dev/testar.mjs` continua verde (444 testes; a remoção não deve
  tocar em núcleo testado).
- Nenhuma página servida referencia `token.html` (grep).
- As 43 `/moedas/` abrem, sem link quebrado, com o CTA reapontado.
- `sitemap.xml` não tem `token.html`; tem as 43 `/moedas/`.
- Home abre sem a seção de mercado e sem erro de console por script órfão
  (a busca/ticker/grade eram alimentados por JS que também sai).
