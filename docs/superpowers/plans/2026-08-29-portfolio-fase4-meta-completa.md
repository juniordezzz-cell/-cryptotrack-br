# Portfólio Fase 4 — Meta completa · Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever a Meta: várias metas ao mesmo tempo, de patrimônio OU de um ativo (1 BTC, 50 SOL), em dólar ou em real, com layout em cards (tiles + "concluídas"), 3 grátis / ilimitadas no PRO, e o Nexus como vantagem paga.

**Architecture:** A Meta v1 (fase 3) já tem `C.metaCalc` e uma tela. Esta fase **amplia o modelo** (`tipo`, `medida`, `moeda`) e reescreve o cálculo e a tela em cima do que existe — sem tocar no livro-razão nem nos motores de preço. O alvo passa a guardar a moeda em que foi declarado: é a exceção deliberada à regra "tudo em USD", porque um alvo que muda sozinho com o câmbio não é mais o alvo da pessoa.

**Tech Stack:** JavaScript clássico (ES5+), sem build. `portfolio-core.js` é `require`-ável em Node (é assim que os testes rodam). Testes em `portfolio/testes/teste-core.js`, executados por `dev/testar.mjs`.

**Spec:** [docs/superpowers/specs/2026-08-29-portfolio-fase4-meta-completa-design.md](../specs/2026-08-29-portfolio-fase4-meta-completa-design.md)

## Global Constraints

- **JS clássico ES5+, sem build.** `portfolio-core.js` funciona no browser E via `require` em Node.
- **Nenhum tipo de `C.TIPOS` muda `sinal`/`grupo`/`externo`.** Esta fase não acrescenta tipo de movimento nenhum.
- **A Meta nunca prevê mercado.** Todo número sai de aritmética sobre aportes reais (`deposito`/`saque`) ou de posições registradas.
- **Três travas na `conclusaoEstimada`:** sem ritmo medível → `null` (a tela escreve "—"); ritmo menor ou igual a zero → `null` com motivo "não chega no ritmo atual"; meta de ativo medida em **quantidade** → `null`, porque converter aporte em dinheiro para quantidade exigiria prever preço.
- **`ritmoReal` continua `null` (nunca `0`) sem histórico** — zero é uma afirmação, ausência de dado não é.
- **Meta guarda `alvo` mais `moeda` como digitados.** Não converter no armazenamento. O progresso converte o patrimônio (USD) para a moeda da meta.
- **Meta em BRL exibe aviso de câmbio:** o progresso se move com o dólar mesmo sem a pessoa transacionar.
- **Metas da v1 continuam válidas** — sem `tipo`/`moeda` gravados, leem como `patrimonio`/`usd`. Não reescrever nada salvo.
- **3 metas no grátis, ilimitadas no PRO**, pelo `P.upsell()` que já existe. O Nexus já é travado por PRO — não criar portão novo.
- **Toda tarefa de lógica é TDD**, com valor esperado calculado à mão no comentário.
- **Verificação:** `node dev/testar.mjs` verde; tarefas de UI acrescentam browser com console limpo, nos estados **vazio E com dados**, desktop **e** mobile.
- **Deploy só com aprovação do dono.**

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `portfolio/portfolio-core.js` | Modelo da meta, `C.metaCalc` v2, conclusão estimada | Modificar |
| `portfolio/testes/teste-core.js` | Testes | Modificar |
| `portfolio/portfolio.js` | Limite, câmbio, formulário e tela em cards | Modificar |
| `portfolio/portfolio.css` | Estilo dos cards/tiles | Modificar |
| `portfolio/portfolio-store.js`, `portfolio-supervisor.js`, `meta.html` | — | **Não tocar** |

---

## Task 1: Modelo novo e `C.metaCalc` v2

**Files:** Modify `portfolio/portfolio-core.js`; Test `portfolio/testes/teste-core.js`

**Interfaces:**
- Consumes: `C.totais`, `C.posicoes`, `C.posicoesRWA`, `C.movsDe`, `C.TIPOS`, `C.hoje`, `C.somaMeses`, e os helpers internos `dias()` e `num()`.
- Produces: `C.metaCalc(st, precos, meta, rate)` devolvendo `{ atual, alvo, moeda, medida, tipoLido, falta, pct, diasRest, mesesRestantes, aporteNecessario, ritmoReal, situacao, encerrada, bateu, avisoCambio }`.
  - `rate` = cotação USD para BRL (número). Usado só quando `meta.moeda === 'brl'`. Ausente, não inventar: manter em USD e ainda assim marcar `avisoCambio`.

**Modelo da meta** (campos novos, todos opcionais para trás):
`{ id, nome, tipo, ativoTk, medida, alvo, moeda, prazo, escopo, criadaEm }`
onde `tipo` é `'patrimonio'` ou `'ativo'`, `medida` é `'valor'` ou `'qtd'`, `moeda` é `'usd'` ou `'brl'`.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao fim de `portfolio/testes/teste-core.js`:

```js
sec('Meta v2: tipos, medida e moeda');

var stq = C.novoEstado();
stq.carteiras.push({ id: 'w1', nome: 'W' });
stq.ativos.push({ id: 'ab', tk: 'BTC', cg: 'bitcoin', cart: 'w1', last: 50000 });
C.addMov(stq, { tipo: 'deposito', cart: 'w1', usd: 30000, dt: '2026-01-01' });
/* compra 0,4 BTC a 50.000 = 20.000; sobra 10.000 de caixa */
C.addMov(stq, { tipo: 'compra', ref: 'ab', cart: 'w1', qtd: 0.4, px: 50000, dt: '2026-01-02' });
var pxq = { bitcoin: 50000 };

/* META DE ATIVO POR QUANTIDADE: quer 1 BTC, tem 0,4 -> 40%, faltam 0,6 */
var q1 = C.metaCalc(stq, pxq, { id:'q1', nome:'1 BTC', tipo:'ativo', ativoTk:'BTC',
                                medida:'qtd', alvo:1, prazo:C.somaMeses(C.hoje(),12) });
eq('meta ativo qtd: atual', q1.atual, 0.4);
eq('meta ativo qtd: pct', q1.pct, 40);
eq('meta ativo qtd: falta', q1.falta, 0.6);
eqv('meta ativo qtd: medida', q1.medida, 'qtd');

/* META DE ATIVO POR VALOR: quer 30.000 em BTC, tem 0,4 x 50.000 = 20.000 */
var q2 = C.metaCalc(stq, pxq, { id:'q2', nome:'BTC em dolar', tipo:'ativo', ativoTk:'BTC',
                                medida:'valor', alvo:30000, moeda:'usd', prazo:C.somaMeses(C.hoje(),12) });
eq('meta ativo valor: atual', q2.atual, 20000);
eq('meta ativo valor: falta', q2.falta, 10000);

/* META DE PATRIMONIO EM BRL: patrimonio = caixa 10.000 + BTC 20.000 = 30.000 USD;
   com dolar a 5,00 -> 150.000 BRL; alvo 300.000 BRL -> 50% */
var b1 = C.metaCalc(stq, pxq, { id:'b1', nome:'R$300 mil', tipo:'patrimonio',
                                alvo:300000, moeda:'brl', escopo:'total',
                                prazo:C.somaMeses(C.hoje(),12) }, 5);
eq('meta BRL: atual convertido', b1.atual, 150000);
eq('meta BRL: pct', b1.pct, 50);
eqv('meta BRL: avisa do cambio', b1.avisoCambio, true);
eqv('meta USD nao avisa do cambio', q2.avisoCambio, false);

/* MIGRACAO v1: meta sem tipo/moeda le como patrimonio em USD */
var v1m = C.metaCalc(stq, pxq, { id:'v1', nome:'Antiga', alvo:60000,
                                 escopo:'total', prazo:C.somaMeses(C.hoje(),12) });
eqv('v1 vira patrimonio', v1m.tipoLido, 'patrimonio');
eqv('v1 vira usd', v1m.moeda, 'usd');
eq('v1 atual em USD', v1m.atual, 30000);
eq('v1 pct', v1m.pct, 50);
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node portfolio/testes/teste-core.js` — Expected: FALHA nos casos novos.

- [ ] **Step 3: Implementar**

Reescrever `C.metaCalc` mantendo tudo o que a v1 já acertou (`falta`, `bateu`, `encerrada`, `ritmoReal` nulo sem histórico, `situacao`) e acrescentando:

- Migração por leitura, sem gravar nada: `var tipoLido = meta.tipo || 'patrimonio';`, `var moeda = meta.moeda || 'usd';`, `var medida = meta.medida || 'valor';`
- **`tipo === 'ativo'`**: procurar a posição pelo ticker (comparação sem diferenciar maiúsculas) em `C.posicoes(st, precos, esc)` **e também** em `C.posicoesRWA(st, precos, esc)` — uma ação tokenizada também é um ativo que a pessoa pode ter como meta. Sem posição, `atual = 0`. `medida === 'qtd'` usa `p.qtd`; `medida === 'valor'` usa `p.valor`.
- **`tipo === 'patrimonio'`**: `C.totais(st, precos, esc).patrimonio`, como na v1.
- **`moeda === 'brl'`**: multiplicar o `atual` pela `rate` ANTES de comparar com o alvo, e marcar `avisoCambio = true`. Se `rate` não for um número utilizável, não inventar taxa: manter em USD e ainda assim marcar `avisoCambio` (a tela avisa que a conversão não pôde ser feita).
- **Meta em quantidade não tem moeda**: `avisoCambio` fica `false` e `moeda` não afeta o cálculo.
- Devolver também `tipoLido`, `medida` e `moeda`.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node portfolio/testes/teste-core.js` — casos novos passam **e todos os antigos continuam passando** (a v1 tem testes de `metaCalc` que devem seguir válidos exatamente pela migração por leitura). Depois `node dev/testar.mjs` — tudo verde.

- [ ] **Step 5: Commit**

```bash
git add portfolio/portfolio-core.js portfolio/testes/teste-core.js
git commit -m "Portfolio: Meta v2 no nucleo — meta de ativo, medida e moeda (fase 4)"
```

---

## Task 2: Conclusão estimada, com as três travas

**Files:** Modify `portfolio/portfolio-core.js`; Test `portfolio/testes/teste-core.js`

**Interfaces:** `C.metaCalc` passa a devolver também `conclusaoEstimada` (string `AAAA-MM` ou `null`) e `motivoSemPrevisao` (`null`, `'sem-ritmo'`, `'ritmo-parado'` ou `'qtd-nao-projetavel'`).

- [ ] **Step 1: Escrever o teste que falha**

```js
sec('Meta v2: conclusao estimada e suas travas');

var stc = C.novoEstado();
stc.carteiras.push({ id: 'w1', nome: 'W' });
/* 4 meses de aporte real de 1.000/mes */
['2026-01-01','2026-02-01','2026-03-01','2026-04-01'].forEach(function (d) {
  C.addMov(stc, { tipo: 'deposito', cart: 'w1', usd: 1000, dt: d });
});

var c1 = C.metaCalc(stc, {}, { id:'c1', nome:'X', tipo:'patrimonio', alvo:10000,
                               moeda:'usd', escopo:'total', prazo:C.somaMeses(C.hoje(),24) });
/* patrimonio 4.000; faltam 6.000; ha ritmo medido -> existe previsao */
eqv('tem previsao quando ha ritmo', c1.conclusaoEstimada != null, true);
eqv('sem motivo de bloqueio', c1.motivoSemPrevisao, null);

/* TRAVA 1: sem historico suficiente -> sem previsao */
var stv = C.novoEstado(); stv.carteiras.push({ id:'w1', nome:'W' });
C.addMov(stv, { tipo:'deposito', cart:'w1', usd:500, dt:C.hoje() });
var c2 = C.metaCalc(stv, {}, { id:'c2', nome:'Y', tipo:'patrimonio', alvo:5000,
                               moeda:'usd', escopo:'total', prazo:C.somaMeses(C.hoje(),12) });
eqv('sem ritmo: previsao nula', c2.conclusaoEstimada, null);
eqv('sem ritmo: motivo', c2.motivoSemPrevisao, 'sem-ritmo');

/* TRAVA 2: ritmo menor ou igual a zero (sacou tudo que depositou) */
var stn = C.novoEstado(); stn.carteiras.push({ id:'w1', nome:'W' });
C.addMov(stn, { tipo:'deposito', cart:'w1', usd:5000, dt:'2026-01-01' });
C.addMov(stn, { tipo:'saque',    cart:'w1', usd:5000, dt:'2026-04-01' });
var c3 = C.metaCalc(stn, {}, { id:'c3', nome:'Z', tipo:'patrimonio', alvo:50000,
                               moeda:'usd', escopo:'total', prazo:C.somaMeses(C.hoje(),12) });
eqv('ritmo parado: previsao nula', c3.conclusaoEstimada, null);
eqv('ritmo parado: motivo', c3.motivoSemPrevisao, 'ritmo-parado');

/* TRAVA 3: meta de ativo em QUANTIDADE nao e' projetavel por aporte em dinheiro */
var c4 = C.metaCalc(stc, {}, { id:'c4', nome:'1 BTC', tipo:'ativo', ativoTk:'BTC',
                               medida:'qtd', alvo:1, prazo:C.somaMeses(C.hoje(),12) });
eqv('qtd: previsao nula', c4.conclusaoEstimada, null);
eqv('qtd: motivo', c4.motivoSemPrevisao, 'qtd-nao-projetavel');
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node portfolio/testes/teste-core.js`.

- [ ] **Step 3: Implementar**

Dentro de `C.metaCalc`, depois de calcular `ritmoReal`, nesta ordem de precedência:

1. Já batida (`bateu`) → `conclusaoEstimada = null`, `motivoSemPrevisao = null` (não há o que prever).
2. `medida === 'qtd'` → `null` e `'qtd-nao-projetavel'`. Aportar dinheiro não diz quantos tokens isso compra sem prever preço — e prever preço é exatamente o que este produto não faz.
3. `ritmoReal == null` → `null` e `'sem-ritmo'`.
4. `ritmoReal <= 0` → `null` e `'ritmo-parado'`.
5. Caso contrário → `var meses = falta / ritmoReal;` e `conclusaoEstimada = C.somaMeses(C.hoje(), Math.ceil(meses)).slice(0, 7)`.

Comentar no código que a estimativa assume **mercado parado e aporte constante** — é projeção do comportamento da pessoa, não do mercado.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node portfolio/testes/teste-core.js` e depois `node dev/testar.mjs` — tudo verde, incluindo os testes da Task 1 e os da fase 3.

- [ ] **Step 5: Commit**

```bash
git add portfolio/portfolio-core.js portfolio/testes/teste-core.js
git commit -m "Portfolio: conclusao estimada da meta, com as travas de honestidade (fase 4)"
```

---

## Task 3: Limite de 3 metas no grátis e câmbio para metas em BRL

**Files:** Modify `portfolio/portfolio.js`

**Interfaces:** Produz `P.limMetas()`, espelhando `P.limCart()`.

- [ ] **Step 1: Limite**

Em `window.MDF_PLANOS`, acrescentar `metas: 3` no `gratis` e `metas: 9999` no `pro` **e também no `premium`** — o premium é alias do PRO, e esquecê-lo daria menos acesso a quem paga mais.

Criar `P.limMetas = function () { return P.plan().metas; };` junto de `P.limCart`.

No ponto que cria meta (o handler do formulário), antes de gravar: se `(P.st.metas || []).length >= P.limMetas()` então `return P.upsell();` — exatamente o padrão da 2ª carteira. **Não criar portão novo.** A checagem vale só na criação; editar uma meta existente nunca é bloqueada.

- [ ] **Step 2: Câmbio**

`P.loadRate` hoje só busca a cotação quando `P.st.cfg.moeda === 'brl'`. Passa a buscar **também** quando existir alguma meta com `moeda === 'brl'`, mesmo com a tela em dólar — senão o progresso dessas metas seria calculado com a taxa de emergência (5) sem a pessoa saber.

Quem chamar `C.metaCalc` deve passar `P.rate` como 4º argumento.

- [ ] **Step 3: Verificação**

Run: `node dev/testar.mjs` — verde. Run: `node --check portfolio/portfolio.js`.

- [ ] **Step 4: Commit**

```bash
git add portfolio/portfolio.js
git commit -m "Portfolio: limite de 3 metas no gratis e cambio para metas em real (fase 4)"
```

---

## Task 4: Formulário da meta

**Files:** Modify `portfolio/portfolio.js`, `portfolio/portfolio.css`

- [ ] **Step 1: Ler o que existe**

Ler o formulário de meta criado na fase 3 (procurar por `fMNome`) e `P.optCarteiras`, para seguir o mesmo padrão de modal e validação.

- [ ] **Step 2: Campos**

- **Nome** (texto).
- **Tipo**: Patrimônio | Ativo.
- Se **Ativo**: **qual ativo** — oferecer os tickers que a pessoa já tem (de `P.st.ativos` e `(P.st.rwa || [])`) e permitir digitar um que ainda não tem (a meta pode ser comprar algo que ainda não possui); e **medida**: Quantidade | Valor.
- **Alvo** (número) e, quando a medida for valor, a **moeda**: US$ | R$.
- **Prazo** (input de data).
- **Escopo** (total ou uma carteira) — só quando o tipo for Patrimônio.

Campos que não se aplicam ao tipo escolhido ficam **ocultos**, não desabilitados, e o formulário reage à troca de tipo/medida sem fechar o modal.

- [ ] **Step 3: Validação**

Nome obrigatório; alvo maior que zero; prazo obrigatório; se tipo for ativo, o ativo é obrigatório. Entrada inválida **não cria meta** e diz o que faltou.

- [ ] **Step 4: Verificação**

Run: `node dev/testar.mjs`; `node --check portfolio/portfolio.js`.

- [ ] **Step 5: Commit**

```bash
git add portfolio/portfolio.js portfolio/portfolio.css
git commit -m "Portfolio: formulario de meta com tipo, ativo, medida e moeda (fase 4)"
```

---

## Task 5: Layout em cards, como a referência

**Files:** Modify `portfolio/portfolio.js`, `portfolio/portfolio.css`

- [ ] **Step 1: Estrutura da página**

Seção **"Metas em andamento"** com o botão **"Criar nova meta"** no topo; seção **"Metas concluídas"** abaixo, exibindo **"Não há metas concluídas"** quando vazia. Meta batida sai da lista ativa e aparece na de concluídas — **não some**.

- [ ] **Step 2: O card**

Ícone, título, menu `⋮` com editar e excluir, o **percentual grande**, a barra de progresso, e uma linha de **tiles**:
`Atual` · `Aporte mensal` · `Faltam` · `Conclusão estimada` · `Objetivo`, com o Objetivo destacado, como na referência.

Reusar `.card`, `.kpi` e `.wcard-bar` e os tokens de cor existentes. Inventar cor nenhuma.

- [ ] **Step 3: As frases obrigatórias**

- `conclusaoEstimada` nula → escrever **"—"** e, ao lado, o motivo em texto claro:
  - `sem-ritmo` → "sem histórico de aporte para estimar"
  - `ritmo-parado` → "não chega no ritmo atual"
  - `qtd-nao-projetavel` → "depende do preço, não dá para estimar"
- Onde aparecer `aporteNecessario` ou `conclusaoEstimada` → dizer que a conta **assume o valor de mercado parado**.
- `avisoCambio` verdadeiro → dizer que o progresso **se move com o dólar** mesmo sem a pessoa transacionar.
- `ritmoReal` nulo → **"ainda não dá para medir seu ritmo"**, nunca `0`.
- Prazo vencido e não batida → **"prazo encerrado"**, mostrando quanto faltou.

- [ ] **Step 4: Verificação**

Run: `node dev/testar.mjs`; `node --check portfolio/portfolio.js`.

- [ ] **Step 5: Commit**

```bash
git add portfolio/portfolio.js portfolio/portfolio.css
git commit -m "Portfolio: metas em cards com tiles e secao de concluidas (fase 4)"
```

---

## Task 6: Exemplo, cache e verificação final

**Files:** Modify `portfolio/portfolio.js`

- [ ] **Step 1: Dados de exemplo**

`P.carregarExemplo` passa a criar **três** metas que mostram os tipos: uma de patrimônio em USD, uma de ativo por quantidade (ex.: 1 BTC) e uma em BRL. Financiadas pelo que o exemplo já deposita; a chamada de `C.aberturaDeSaldo` continua sendo a última antes de salvar.

- [ ] **Step 2: Regressão** — `node dev/testar.mjs` verde.

- [ ] **Step 3: Cache** — `node dev/versionar.mjs`.

- [ ] **Step 4: Browser** — as 6 telas, **estado vazio e com dados**, desktop e mobile (375px), console limpo. Conferir os três tipos de meta, as três travas da conclusão estimada, e o limite de 3 metas no grátis.

- [ ] **Step 5: Commit**

```bash
git add -A portfolio/ docs/ *.html
git commit -m "Portfolio: exemplo com os tres tipos de meta + recarimba cache (fase 4)"
```

- [ ] **Step 6: Parar e pedir o "vai" do dono para o deploy** — NÃO fazer merge na main sozinho.

---

## Self-Review

**Cobertura do spec:** várias metas ✅ (T1) · meta de ativo por quantidade e por valor ✅ (T1) · USD/BRL guardando a moeda declarada ✅ (T1) · aviso de câmbio ✅ (T1 e T5) · conclusão estimada com as três travas ✅ (T2) · 3 grátis e ilimitadas no PRO ✅ (T3) · Nexus já travado por PRO, sem portão novo ✅ (spec) · câmbio buscado quando houver meta em BRL ✅ (T3) · formulário com todos os campos ✅ (T4) · layout em cards com tiles e seção de concluídas ✅ (T5) · migração da v1 ✅ (T1) · dados de exemplo ✅ (T6) · verificação com estado vazio e mobile ✅ (T6) · deploy travado ✅ (T6).

**Placeholders:** nenhum "TBD". As Tasks 1 e 2 trazem os testes completos com valores calculados à mão. As Tasks 3 a 5 descrevem os pontos exatos a mexer; o HTML exato depende do código lido em contexto, e inventá-lo aqui seria pior que descrevê-lo.

**Consistência de nomes:** `C.metaCalc(st, precos, meta, rate)` é definida na Task 1, estendida na Task 2 (mesmo objeto de retorno, com dois campos a mais) e consumida nas Tasks 4 e 5. `P.limMetas()` é definida na Task 3 e usada na Task 4. Os valores de `motivoSemPrevisao` são fixos na Task 2 e a Task 5 mapeia cada um para uma frase.
