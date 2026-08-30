# Portfólio · Fase 4 — Meta completa (design)

> Fases anteriores: 1 (layout) e 2 (caixa) **no ar**; 3 (RWA e Meta v1) pronta
> na branch `portfolio-fase3`. Esta fase **reescreve a Meta** — a v1 só sabia
> "patrimônio total até uma data", em USD, numa lista de texto corrido.

## O que o dono pediu

1. **Várias metas ao mesmo tempo** — uma de Bitcoin, uma de Solana, uma de
   "chegar a US$ 10 mil até o fim do ano".
2. **Meta em dólar OU em real.**
3. **Layout como o da referência** (print do Investidor10): cards com tiles
   (Atual · Aporte mensal · Faltam · Conclusão estimada · Objetivo), seção
   "Metas em andamento" e seção "Metas concluídas".
4. **Parcialmente grátis:** 3 metas no grátis, ilimitadas no PRO; e o **Nexus
   ajudando a organizar as metas é PRO**.

## Os dois tipos de meta

A v1 só tinha patrimônio. Agora:

| Tipo | Exemplo | O que é "atual" |
|---|---|---|
| `patrimonio` | "chegar a US$ 10 mil" / "R$ 50 mil" | O patrimônio do escopo (total ou uma carteira) |
| `ativo` | "ter 1 BTC" · "ter 50 SOL" · "ter R$ 20 mil em BTC" | A posição naquele token — **em quantidade ou em valor**, a pessoa escolhe |

A meta de ativo com medida em **quantidade** é a que o dono citou primeiro
("meta de bitcoin"), e é a mais honesta das duas: 1 BTC é 1 BTC, não muda
porque o mercado mudou. A medida em **valor** existe para quem pensa em
dinheiro ("R$ 20 mil em BTC") e carrega o aviso de que o preço mexe nela.

## Moeda: a meta guarda a moeda em que foi declarada

Regra do projeto: todo valor é **armazenado em USD**, e a moeda escolhida é
camada de apresentação. **A meta é a exceção deliberada** — e precisa ser:

> R$ 100.000 é R$ 100.000. Se guardássemos em USD e reconvertêssemos, o alvo
> da pessoa mudaria sozinho toda vez que o dólar mexesse. O alvo é uma
> decisão dela, não uma cotação.

Então a meta guarda `alvo` **mais** `moeda` (`'usd'` ou `'brl'`), exatamente
como foi digitado. O progresso converte o patrimônio (que é USD) para a moeda
da meta, usando a cotação ao vivo.

**A honestidade que isso exige:** uma meta em reais, com patrimônio em cripto,
**se mexe com o câmbio mesmo sem a pessoa comprar ou vender nada**. A tela é
obrigada a dizer isso na meta em BRL. Sem esse aviso, o progresso parece
mérito ou fracasso da pessoa quando às vezes é só o dólar.

Consequência técnica: `P.loadRate` hoje só busca a cotação quando a tela está
em R$. Passa a buscar também quando existir qualquer meta em BRL — senão o
progresso dessas metas seria calculado com uma taxa de emergência.

## As contas

Herdam a disciplina da v1 — **aritmética sobre aportes reais, nunca previsão
de mercado**:

```
atual              conforme o tipo (patrimônio do escopo, ou qtd/valor do ativo)
falta              alvo − atual                      (0 se já bateu)
pct                atual / alvo
aporteMensal       ritmo REAL: (depósitos − saques) ÷ meses medidos
                   — vem do livro da fase 2, é fato registrado
aporteNecessario   falta ÷ tempo restante            (o que precisaria aportar)
conclusaoEstimada  data em que `falta` acaba NO RITMO ATUAL
```

### Conclusão estimada — onde é fácil mentir

A referência mostra "Junho/2027". É um número útil e **só é honesto com três
travas**:

- **Ritmo desconhecido** (sem histórico suficiente) → **"—"**, nunca uma data.
- **Ritmo zero ou negativo** → **"não chega no ritmo atual"**, nunca uma data
  no infinito.
- **Assume mercado parado e aporte constante** — e a tela diz isso. É
  projeção do *comportamento da pessoa*, não do mercado.

A meta de ativo **em quantidade** não tem conclusão estimada por aporte em
dinheiro: aportar R$ 500/mês não diz quantos BTC isso compra sem prever o
preço. Nesses casos a tela mostra **"—"** e explica. Preferimos não responder
a inventar.

## Grátis e PRO

| | Grátis | PRO |
|---|---|---|
| Metas simultâneas | **3** | ilimitadas |
| Tipos (patrimônio, ativo, USD/BRL) | todos | todos |
| Progresso, aporte necessário, ritmo real, conclusão estimada | sim | sim |
| **Nexus organizando e priorizando as metas** | não | **sim** |

A 4ª meta cai no `P.upsell()` que já existe — mesmo caminho da 2ª carteira,
sem paywall novo. O Nexus **já é travado por PRO** (`nexus-core.js`), então a
ajuda dele nas metas herda esse portão sem máquina nova.

## Layout

Espelha a referência, na linguagem visual do MundoDeFi:

- **"Metas em andamento"** + botão **"Criar nova meta"** no topo.
- **Card por meta:** ícone, título, menu `⋮` (editar/excluir), o **percentual
  grande**, a barra de progresso, e uma linha de **tiles**:
  `Atual` · `Aporte mensal` · `Faltam` · `Conclusão estimada` · `Objetivo`
  (o Objetivo destacado, como na referência).
- **"Metas concluídas"** em seção própria abaixo, e **"Não há metas
  concluídas"** quando vazia — meta batida sai da lista ativa mas **não some**.
- Meta com prazo vencido e não batida continua visível como **"prazo
  encerrado"**, mostrando quanto faltou.

## Migração

Metas da v1 (`{id, nome, alvo, prazo, escopo}`) continuam válidas: ganham
`tipo:'patrimonio'` e `moeda:'usd'` por padrão na leitura, sem reescrever nada
gravado. Ninguém perde meta.

## Fora de escopo

- Previsão de valorização de mercado, em qualquer forma.
- Meta de renda passiva mensal (a segunda meta da referência) — o portfólio
  não tem proventos recorrentes; inventar essa métrica aqui seria número sem
  origem.
- Notificação/alerta de meta — fase futura.

## Verificação

- **Testes** com valores calculados à mão: meta por quantidade; meta por valor
  em ativo; meta em BRL (progresso convertido); `conclusaoEstimada` nula sem
  ritmo; "não chega" com ritmo ≤ 0; limite de 3 no grátis; migração da v1.
- `node dev/testar.mjs` verde.
- Browser: as 6 telas, **vazio e com dados**, desktop e mobile, console limpo.
- `node dev/versionar.mjs` ao fim.

## Deploy

Merge na `main` publica — **só com o "vai" do dono.**
