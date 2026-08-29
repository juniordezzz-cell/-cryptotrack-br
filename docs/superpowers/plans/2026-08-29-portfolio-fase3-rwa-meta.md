# Portfólio Fase 3 — RWA e Meta · Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar as duas abas que hoje dizem "breve": **RWA** (ações tokenizadas — NVDA, GOOGL via xStocks/Ondo/Backed) e **Meta** (alvo de patrimônio + quanto aportar por mês para chegar lá).

**Architecture:** RWA é o HOLD em aba separada — mesma matemática de preço médio ponderado. Em vez de copiar esse motor (o cálculo mais delicado do sistema, que o v1 errou), a fase **generaliza** `C.posicao`/`C.posicoes` para aceitarem quais tipos de movimento ler, e o RWA passa os seus. Meta é aritmética determinística sobre os aportes reais que a fase 2 passou a registrar (`deposito`/`saque`) — nunca projeção de mercado.

**Tech Stack:** JavaScript clássico (ES5+), sem build. `portfolio-core.js` é `require`-ável em Node (é assim que os testes rodam). Testes em `portfolio/testes/teste-core.js`, executados por `dev/testar.mjs`.

**Spec:** [docs/superpowers/specs/2026-08-29-portfolio-fase3-rwa-meta-design.md](../specs/2026-08-29-portfolio-fase3-rwa-meta-design.md)

## Global Constraints

- **JS clássico ES5+, sem build, sem módulos ES.** `portfolio-core.js` deve continuar funcionando no browser E via `require` em Node.
- **Nenhum tipo existente de `C.TIPOS` muda `sinal`/`grupo`/`externo`.** Reescreveria a história de todo portfólio salvo.
- **`externo: false` nos tipos novos de RWA.** Desde a fase 2, o fluxo externo do portfólio é só `deposito`/`saque`; marcar compra de RWA como externa repetiria o bug de XIRR que a fase 2 corrigiu.
- **Caixa nunca é gravado**; a trava de caixa da fase 2 vale para RWA (não se compra sem saldo), e ela mora nos pontos que abrem posição, não no `C.addMov` (que continua burro para o restore de backup funcionar).
- **Não duplicar o motor de preço médio.** RWA reusa `C.posicao` generalizada.
- **A Meta nunca projeta mercado.** Ela responde "quanto preciso aportar por mês", assumindo valor de mercado parado — e a tela é obrigada a dizer isso. Sem histórico suficiente, o ritmo é `null` e a tela escreve "ainda não dá para medir"; **nunca zero** (zero é uma afirmação, ausência de dado não é).
- **Toda página nova entra com `?v=` nas referências de CSS/JS** — `dev/versionar.mjs` só rastreia referências que já têm `?v=`; sem isso o arquivo nunca atualiza no navegador de ninguém.
- **Cada tarefa de lógica é TDD:** teste que falha primeiro, valor esperado **calculado à mão** no comentário.
- **Verificação de toda tarefa:** `node dev/testar.mjs` verde. Tarefas de UI acrescentam: browser com **console limpo**, nos estados **vazio E com dados**, desktop **e** mobile.
- **Deploy (merge na main) só com aprovação explícita do dono.**

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `portfolio/portfolio-core.js` | Tipos, `posicao` generalizada, RWA nos totais, matemática da Meta | Modificar |
| `portfolio/testes/teste-core.js` | Testes (formato `eq`/`eqv`/`sec`) | Modificar |
| `portfolio/portfolio.js` | Telas `vRWA`/`vMeta`, abas reais, 5º pilar | Modificar |
| `portfolio/portfolio.css` | Estilo do que faltar | Modificar |
| `portfolio/rwa.html`, `portfolio/meta.html` | Páginas novas | **Criar** |
| `portfolio/portfolio-store.js`, `portfolio-supervisor.js` | — | **Não tocar** |

---

## Task 1: RWA no núcleo

**Files:**
- Modify: `portfolio/portfolio-core.js`
- Test: `portfolio/testes/teste-core.js`

**Interfaces:**
- Consumes: `C.TIPOS`, `C.addMov`, `C.movsDe`, `C.posicao`, `C.posicoes`, `C.totais`, `C.caixaDe`.
- Produces: `C.TIPOS.rwa_compra|rwa_venda`; `C.posicoesRWA(st, precos, cart)` com a mesma forma de `C.posicoes`; `C.totais(...).rwa` = `{valor, custo, naoRealizado, realizado}`; `patrimonio` passa a incluir o RWA.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao fim de `portfolio/testes/teste-core.js`:

```js
/* ══════════════════════════════════════════════════════════════
   RWA — ações tokenizadas. Mesmo motor do HOLD, aba separada.
   ══════════════════════════════════════════════════════════════ */
sec('RWA: acoes tokenizadas');

var stR = C.novoEstado();
stR.carteiras.push({ id: 'w1', nome: 'Phantom' });
stR.rwa.push({ id: 'r1', tk: 'NVDAx', nome: 'Nvidia', plataforma: 'xStocks',
               cg: 'nvidia-x', cart: 'w1', last: 120 });
C.addMov(stR, { tipo: 'deposito', cart: 'w1', usd: 5000, dt: '2026-01-01' });

/* À mão: compra 10 @ 100 = 1000, fee 5 -> custo 1005, preco medio 100,50
   caixa: 5000 − 1005 = 3995                                          */
C.addMov(stR, { tipo: 'rwa_compra', ref: 'r1', cart: 'w1', qtd: 10, px: 100, fee: 5, dt: '2026-01-02' });
var pR = C.posicoesRWA(stR, { 'nvidia-x': 120 }, 'all')[0];
eq('RWA preco medio (1005/10)', pR.pm, 100.5);
eq('RWA valor a 120 (10x120)', pR.valor, 1200);
eq('RWA nao realizado (1200-1005)', pR.naoRealizado, 195);
eq('caixa apos compra de RWA', C.caixaDe(stR, 'w1'), 3995);

/* venda de 4 @ 150 = 600; baixa de custo 4 x 100,50 = 402
   realizado = 600 − 402 = 198;  caixa 3995 + 600 = 4595              */
C.addMov(stR, { tipo: 'rwa_venda', ref: 'r1', cart: 'w1', qtd: 4, px: 150, dt: '2026-01-03' });
var pR2 = C.posicoesRWA(stR, { 'nvidia-x': 120 }, 'all')[0];
eq('RWA realizado (600-402)', pR2.realizado, 198);
eq('RWA qtd restante', pR2.qtd, 6);
eq('caixa apos venda de RWA', C.caixaDe(stR, 'w1'), 4595);

/* o RWA entra no patrimonio total e no seu proprio bloco */
var TR = C.totais(stR, { 'nvidia-x': 120 }, 'all');
eq('totais.rwa.valor (6 x 120)', TR.rwa.valor, 720);
eq('totais.rwa.realizado', TR.rwa.realizado, 198);
/* patrimonio = caixa 4595 + rwa 720 = 5315 */
eq('patrimonio inclui RWA', TR.patrimonio, 5315);

/* os tipos novos NAO sao fluxo externo (senao repetem o bug de XIRR) */
eqv('rwa_compra nao e externo', C.TIPOS.rwa_compra.externo, false);
eqv('rwa_venda nao e externo', C.TIPOS.rwa_venda.externo, false);
eqv('rwa_compra tira do caixa', C.TIPOS.rwa_compra.sinal, -1);
eqv('rwa_venda devolve ao caixa', C.TIPOS.rwa_venda.sinal, 1);

/* HOLD e RWA nao se misturam */
eqv('posicoes() do HOLD ignora RWA', C.posicoes(stR, {}, 'all').length, 0);
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node portfolio/testes/teste-core.js`
Expected: FALHA — `st.rwa` indefinido / `C.posicoesRWA is not a function`.

- [ ] **Step 3: Implementar**

**(a)** Em `C.novoEstado`, acrescentar `rwa: []` (e, já que a Task 2 precisa, `metas: []`) ao objeto devolvido.

**(b)** Em `C.TIPOS`, acrescentar depois dos tipos de caixa:

```js
    rwa_compra:  { grupo:'rwa', sinal:-1, externo:false, lbl:'Compra de ação tokenizada' },
    rwa_venda:   { grupo:'rwa', sinal:+1, externo:false, lbl:'Venda de ação tokenizada' }
```

**(c)** Em `C.addMov`, a normalização de `usd` hoje só cobre `compra`/`venda`. Estender para os tipos de RWA — sem isso o fluxo de caixa de uma compra de RWA sai zerado:

```js
    if ((m.tipo === 'compra' || m.tipo === 'venda' ||
         m.tipo === 'rwa_compra' || m.tipo === 'rwa_venda') && !m.usd && m.qtd != null && m.px != null) {
      m.usd = Math.abs(m.qtd * m.px);
    }
```

**(d)** Generalizar `C.posicao` para aceitar quais tipos ler, mantendo o padrão atual (compatível com todas as chamadas existentes). Trocar a assinatura para `C.posicao = function (st, ativoId, precoAtual, tipos)` e, no topo do corpo:

```js
    /* Quais eventos são "entrada" e "saída" desta posição. O RWA usa o MESMO
       motor de preço médio — copiá-lo seria duplicar o cálculo mais delicado
       do sistema, justamente o que o v1 errou. */
    tipos = tipos || { compra: 'compra', venda: 'venda' };
```

e, dentro do `forEach`, trocar `m.tipo === 'compra'` por `m.tipo === tipos.compra` e `m.tipo === 'venda'` por `m.tipo === tipos.venda`.

**(e)** Acrescentar, logo depois de `C.posicoes`:

```js
  /* RWA = ação tokenizada. Mesma matemática do HOLD, lista própria — quem
     compra NVDA tokenizada não está fazendo a mesma coisa que quem compra
     SOL, e misturar as duas na mesma tabela esconde de que lado está o
     patrimônio. */
  C.posicoesRWA = function (st, precos, cart) {
    precos = precos || {};
    return (st.rwa || [])
      .filter(function (a) { return !cart || cart === 'all' || a.cart === cart; })
      .map(function (a) {
        var p = C.posicao(st, a.id, precos[a.cg] != null ? precos[a.cg] : a.last,
                          { compra: 'rwa_compra', venda: 'rwa_venda' });
        p.tk = a.tk; p.nome = a.nome; p.plataforma = a.plataforma;
        p.cg = a.cg; p.cart = a.cart; p.lastAt = a.lastAt || null;
        return p;
      })
      .filter(function (p) { return p.nTx > 0; });
  };
```

**(f)** Em `C.totais`, somar o RWA. Calcular `rwaValor/rwaCusto/rwaNaoReal/rwaReal` a partir de `C.posicoesRWA(st, precos, cart)` (mesmo laço que o HOLD já faz com `C.posicoes`), e então:
- `patrimonio` passa a incluir `rwaValor`
- `investido` passa a incluir `rwaCusto`
- `naoRealizado` passa a incluir `rwaNaoReal`
- `realizado` passa a incluir `rwaReal`
- acrescentar ao objeto devolvido: `rwa: { valor: rwaValor, custo: rwaCusto, naoRealizado: rwaNaoReal, realizado: rwaReal }`

**(g)** Em `C.novoEstado` o campo `rwa` é novo, mas estados salvos ANTES desta fase não o têm. Todo acesso deve tolerar ausência (`(st.rwa || [])`), como já foi feito em (e).

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node portfolio/testes/teste-core.js` — casos novos em `ok`, e **todos os antigos continuam passando** (a generalização de `C.posicao` não pode mudar nada do HOLD).
Run: `node dev/testar.mjs` — tudo verde.

- [ ] **Step 5: Commit**

```bash
git add portfolio/portfolio-core.js portfolio/testes/teste-core.js
git commit -m "Portfolio: RWA no nucleo — acoes tokenizadas reusando o motor de preco medio (fase 3)"
```

---

## Task 2: Meta no núcleo

**Files:**
- Modify: `portfolio/portfolio-core.js`
- Test: `portfolio/testes/teste-core.js`

**Interfaces:**
- Consumes: `C.totais`, `C.movsDe`, `C.TIPOS`, `C.hoje`, `C.dias`.
- Produces: `C.metaCalc(st, precos, meta)` → `{ atual, alvo, falta, pct, mesesRestantes, aporteNecessario, ritmoReal, situacao, encerrada, bateu }`.
  - `ritmoReal` é **`null`** quando não há histórico suficiente (menos de 30 dias entre a primeira e a última movimentação) — nunca 0.
  - `situacao`: `'no-ritmo'` | `'abaixo'` | `'sem-medida'` (quando `ritmoReal` é null) | `'batida'`.

- [ ] **Step 1: Escrever o teste que falha**

```js
/* ══════════════════════════════════════════════════════════════
   META — aritmética sobre os aportes REAIS, nunca previsão
   ══════════════════════════════════════════════════════════════ */
sec('Meta: alvo e plano de aporte');

var stM = C.novoEstado();
stM.carteiras.push({ id: 'w1', nome: 'W' });
/* 4 meses de aportes reais: 1000/mes a partir de 01/01 */
C.addMov(stM, { tipo: 'deposito', cart: 'w1', usd: 1000, dt: '2026-01-01' });
C.addMov(stM, { tipo: 'deposito', cart: 'w1', usd: 1000, dt: '2026-02-01' });
C.addMov(stM, { tipo: 'deposito', cart: 'w1', usd: 1000, dt: '2026-03-01' });
C.addMov(stM, { tipo: 'deposito', cart: 'w1', usd: 1000, dt: '2026-04-01' });

/* patrimonio = caixa = 4000 (nada investido).
   alvo 10.000; faltam 6.000. Com 6 meses restantes -> 1.000/mes.  */
var m1 = C.metaCalc(stM, {}, { id:'m1', nome:'Reserva', alvo:10000,
                               prazo: C.somaMeses(C.hoje(), 6), escopo:'total' });
eq('meta: atual e o patrimonio', m1.atual, 4000);
eq('meta: falta', m1.falta, 6000);
eq('meta: meses restantes', m1.mesesRestantes, 6);
eq('meta: aporte necessario (6000/6)', m1.aporteNecessario, 1000);
eqv('meta: nao encerrada', m1.encerrada, false);

/* alvo ja batido: nao pede aporte nenhum e nao vira numero negativo */
var m2 = C.metaCalc(stM, {}, { id:'m2', nome:'Batida', alvo:3000,
                               prazo: C.somaMeses(C.hoje(), 6), escopo:'total' });
eqv('meta batida', m2.bateu, true);
eq('meta batida nao pede aporte', m2.aporteNecessario, 0);
eqv('situacao batida', m2.situacao, 'batida');

/* prazo vencido nao some nem vira erro: vira encerrada */
var m3 = C.metaCalc(stM, {}, { id:'m3', nome:'Vencida', alvo:99999,
                               prazo:'2020-01-01', escopo:'total' });
eqv('prazo vencido encerra', m3.encerrada, true);
eqv('prazo vencido nao bateu', m3.bateu, false);

/* SEM historico suficiente o ritmo e NULL, nunca zero:
   zero afirmaria "voce nao aportou nada", e o que existe e' ausencia de dado */
var stV = C.novoEstado();
stV.carteiras.push({ id:'w1', nome:'W' });
C.addMov(stV, { tipo:'deposito', cart:'w1', usd:500, dt: C.hoje() });
var m4 = C.metaCalc(stV, {}, { id:'m4', nome:'Nova', alvo:5000,
                               prazo: C.somaMeses(C.hoje(), 12), escopo:'total' });
eqv('ritmo sem historico e null', m4.ritmoReal, null);
eqv('situacao sem medida', m4.situacao, 'sem-medida');
```

**Nota para o implementador:** o teste usa `C.somaMeses(dataISO, n)`. Se ela não existir, crie-a junto (devolve a data ISO `n` meses à frente) — é utilitário puro e precisa de um teste próprio simples.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node portfolio/testes/teste-core.js` — Expected: `C.metaCalc is not a function`.

- [ ] **Step 3: Implementar**

```js
  /* ═══════════════════ META ═══════════════════
     Aritmética sobre os aportes REAIS (deposito/saque, que a fase 2 passou a
     registrar), nunca previsão de mercado. O sistema não diz "você vai
     chegar lá": ele responde quanto falta aportar por mês assumindo valor de
     mercado PARADO — e quem exibe é obrigado a dizer isso. */
  C.somaMeses = function (iso, n) {
    var d = new Date(iso + 'T00:00:00Z');
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString().slice(0, 10);
  };

  C.metaCalc = function (st, precos, meta) {
    var esc = meta.escopo || 'total';
    var T = C.totais(st, precos, esc === 'total' ? 'all' : esc);
    var atual = T.patrimonio;
    var alvo = num(meta.alvo);
    var falta = alvo - atual;
    var bateu = falta <= 0;
    var hoje = C.hoje();
    var diasRest = dias(hoje, meta.prazo);
    var encerrada = diasRest < 0;
    var mesesRestantes = Math.max(0, Math.round(diasRest / 30.44));

    var aporteNecessario = 0;
    if (!bateu && !encerrada && mesesRestantes > 0) aporteNecessario = falta / mesesRestantes;

    /* ritmo real: aportes líquidos por mês, medidos do livro.
       Sem pelo menos 30 dias entre o primeiro e o último evento não há
       ritmo a medir — devolvemos null, e a tela escreve "ainda não dá para
       medir". Zero seria uma afirmação diferente. */
    var movs = C.movsDe(st, { cart: esc === 'total' ? 'all' : esc }).filter(function (m) {
      return m.tipo === 'deposito' || m.tipo === 'saque';
    });
    var ritmoReal = null;
    if (movs.length) {
      var span = dias(movs[0].dt, movs[movs.length - 1].dt);
      if (span >= 30) {
        var liquido = 0;
        movs.forEach(function (m) { liquido += C.TIPOS[m.tipo].sinal * num(m.usd); });
        ritmoReal = liquido / (span / 30.44);
      }
    }

    var situacao = bateu ? 'batida'
      : encerrada ? 'encerrada'
      : ritmoReal == null ? 'sem-medida'
      : (ritmoReal >= aporteNecessario ? 'no-ritmo' : 'abaixo');

    return {
      atual: atual, alvo: alvo, falta: bateu ? 0 : falta,
      pct: alvo > 0 ? Math.min(100, atual / alvo * 100) : 0,
      mesesRestantes: mesesRestantes, aporteNecessario: aporteNecessario,
      ritmoReal: ritmoReal, situacao: situacao,
      encerrada: encerrada, bateu: bateu
    };
  };
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node portfolio/testes/teste-core.js`, depois `node dev/testar.mjs` — verdes.

- [ ] **Step 5: Commit**

```bash
git add portfolio/portfolio-core.js portfolio/testes/teste-core.js
git commit -m "Portfolio: matematica da Meta — alvo, aporte necessario e ritmo real (fase 3)"
```

---

## Task 3: Tela do RWA

**Files:**
- Create: `portfolio/rwa.html`
- Modify: `portfolio/portfolio.js` (`P.vRWA`, `P.pageRWA`, formulários)
- Modify: `portfolio/portfolio.css` (só se faltar componente)

**Interfaces:**
- Consumes: `C.posicoesRWA`, `C.totais(...).rwa`, `C.podeGastar`, `C.addMov`, `P.travaCaixa`, `P.modal`, e os componentes `.kpi`/`.dtable`/`.card` das fases anteriores.
- Produces: `P.pageRWA()`, chamado por `rwa.html`.

- [ ] **Step 1: Criar `portfolio/rwa.html`** copiando a estrutura de `portfolio/hold.html` (mesmos scripts, mesma ordem, `?v=1` em cada referência nova), trocando título/descrição para RWA e a chamada final para `P.pageRWA()`. Ajustar o texto de SEO da `.pf-sobre` para ações tokenizadas.

- [ ] **Step 2: `P.vRWA`** espelhando `P.vHold`: 4 KPIs (`.kpi` com o sotaque do módulo), tabela `.dtable` das posições com **token, ação representada, plataforma, qtd, preço médio, preço atual, valor, resultado**, e o estado vazio no padrão das outras telas (com a prévia deslogada, ver Task 5).

- [ ] **Step 3: Formulário de compra/venda de RWA** — mesmo desenho do `P.formTx` do HOLD, gravando `rwa_compra`/`rwa_venda`. **A trava de caixa vale:** checar `C.podeGastar` e RECUSAR (não perguntar) antes de escrever, como as outras aberturas de posição fazem desde a fase 2. O ativo novo só entra em `st.rwa` DEPOIS da trava passar (foi um bug real corrigido na fase 2 — não repita).

- [ ] **Step 4: Verificação** — `node dev/testar.mjs` verde; `node --check portfolio/portfolio.js`.

- [ ] **Step 5: Commit**

```bash
git add portfolio/rwa.html portfolio/portfolio.js portfolio/portfolio.css
git commit -m "Portfolio: tela de RWA — acoes tokenizadas (fase 3)"
```

---

## Task 4: Tela da Meta

**Files:**
- Create: `portfolio/meta.html`
- Modify: `portfolio/portfolio.js` (`P.vMeta`, `P.pageMeta`, formulário)
- Modify: `portfolio/portfolio.css`

**Interfaces:**
- Consumes: `C.metaCalc`, `C.somaMeses`, `P.modal`, `P.save`, `P.render`, componentes existentes.
- Produces: `P.pageMeta()`, chamado por `meta.html`.

- [ ] **Step 1: Criar `portfolio/meta.html`** no mesmo padrão (scripts na mesma ordem, `?v=1`), chamando `P.pageMeta()`.

- [ ] **Step 2: `P.vMeta`** — lista de metas; para cada uma: nome, alvo, barra de progresso (`pct`), quanto falta, **aporte necessário por mês**, o **ritmo real** e a situação.
  - `situacao: 'sem-medida'` → escrever **"ainda não dá para medir seu ritmo"**, nunca "R$ 0/mês".
  - `situacao: 'encerrada'` → mostrar "prazo encerrado" e se bateu ou quanto faltou; a meta **não some**.
  - Toda tela com `aporteNecessario` mostra a frase obrigatória: **a conta assume o valor de mercado parado**.

- [ ] **Step 3: Criar/editar/excluir meta** via `P.modal`: nome, alvo, prazo (data) e escopo (total ou uma carteira). Gravar em `st.metas`, `P.save()`, `P.render()`.

- [ ] **Step 4: Verificação** — `node dev/testar.mjs` verde; `node --check portfolio/portfolio.js`.

- [ ] **Step 5: Commit**

```bash
git add portfolio/meta.html portfolio/portfolio.js portfolio/portfolio.css
git commit -m "Portfolio: tela de Meta — alvo, progresso e plano de aporte (fase 3)"
```

---

## Task 5: Abas reais, 5º pilar e prévia deslogada

**Files:**
- Modify: `portfolio/portfolio.js` (`P.shell`, `P.vDash`, prévias)

- [ ] **Step 1: Abas reais** — em `P.shell`, mover `rwa` e `meta` do array `soon` para o array `items`, com os destinos `/portfolio/rwa.html` e `/portfolio/meta.html`. O selo "breve" sai. Conferir que a aba ativa marca certo nas duas páginas novas.

- [ ] **Step 2: 5º pilar no dashboard** — acrescentar o KPI de RWA em `P.vDash` ao lado de HOLD/DeFi/Trade, usando `T.rwa.valor`. Conferir que o herói de patrimônio já reflete o RWA (vem da Task 1, que o somou em `C.totais`).

- [ ] **Step 3: Prévia deslogada das telas novas** — RWA e Meta ganham prévia com números de exemplo + os banners, como as outras quatro telas já têm (`P.modoDemo()`, `P.demoNote()`, `MDFBanner.duo()`, `P.duoWire()`). Sem isso, quem chega deslogado vê tela crua justamente nas abas novas.

- [ ] **Step 4: Verificação** — `node dev/testar.mjs` verde; `node --check portfolio/portfolio.js`.

- [ ] **Step 5: Commit**

```bash
git add portfolio/portfolio.js portfolio/portfolio.css
git commit -m "Portfolio: abas RWA e Meta ativas, RWA como 5o pilar do dashboard (fase 3)"
```

---

## Task 6: Cache, dados de exemplo e verificação final

**Files:**
- Modify: `portfolio/portfolio.js` (dados de exemplo), `portfolio/*.html` (recarimbar via script)

- [ ] **Step 1: Dados de exemplo** — acrescentar a `P.carregarExemplo` uma posição de RWA (ex.: NVDAx pela xStocks) e uma meta, para que as telas novas tenham o que mostrar na demo. **Financiadas por depósito**, para o caixa não ficar negativo (a demo já quebrou assim uma vez na fase 2).

- [ ] **Step 2: Regressão** — `node dev/testar.mjs` verde.

- [ ] **Step 3: Recarimbar cache** — `node dev/versionar.mjs`. **Confirmar que o número de "arquivos versionados" subiu**, provando que `rwa.html`/`meta.html` entraram no rastreamento.

- [ ] **Step 4: Passada final no browser** — as **6** telas, **vazio e com dados**, desktop e mobile (375px), console limpo. Conferir a trava de caixa no RWA e as três situações da Meta (no ritmo, abaixo, sem medida).

- [ ] **Step 5: Commit**

```bash
git add -A portfolio/ docs/ *.html
git commit -m "Portfolio: exemplo com RWA e Meta + recarimba cache (fase 3)"
```

- [ ] **Step 6: Parar e pedir o "vai" do dono para o deploy** — NÃO fazer merge na main sozinho.

---

## Self-Review

**Cobertura do spec:**
- RWA = ação tokenizada, mesmo motor do HOLD, aba separada → Task 1 (núcleo) + Task 3 (tela) ✅
- Campos tk/nome/plataforma/preço/carteira → Task 1 (e), Task 3 Step 2 ✅
- Tipos `rwa_compra`/`rwa_venda` com `externo:false` → Task 1 (b) + teste ✅
- Trava de caixa vale para RWA → Task 1 (teste de caixa) + Task 3 Step 3 ✅
- RWA soma no patrimônio e vira 5º pilar → Task 1 (f) + Task 5 Step 2 ✅
- Meta = alvo + aporte necessário + ritmo real, nunca previsão → Task 2 ✅
- `ritmoReal` null (nunca zero) sem histórico → Task 2 (teste + implementação) ✅
- Prazo vencido vira "encerrada", não some → Task 2 ✅
- Frase obrigatória "assume mercado parado" → Task 4 Step 2 ✅
- Abas deixam de ser "breve" → Task 5 Step 1 ✅
- Páginas novas entram no versionamento → Task 3/4 Step 1 (`?v=1`) + Task 6 Step 3 ✅
- Verificação com estado vazio + mobile → Task 6 Step 4 ✅
- Deploy gated → Task 6 Step 6 ✅

**Placeholders:** nenhum "TBD". Tasks 1 e 2 trazem código e testes completos com valores calculados à mão. Tasks 3-5 são de UI e descrevem os componentes a reusar com os anchors — o HTML exato depende do código lido em contexto, e inventá-lo aqui seria pior que descrevê-lo.

**Consistência de nomes/tipos:** `C.posicoesRWA` (Task 1) consumida na Task 3 e 5. `C.totais(...).rwa` (Task 1) consumida nas Tasks 4 e 5. `C.metaCalc` → `{atual, alvo, falta, pct, mesesRestantes, aporteNecessario, ritmoReal, situacao, encerrada, bateu}` (Task 2) consumida na Task 4. `C.somaMeses` definida na Task 2 e usada no seu próprio teste e na Task 4. A Task 1 generaliza `C.posicao` acrescentando um 4º parâmetro opcional — todas as chamadas existentes continuam válidas, e o Step 4 exige que os testes antigos do HOLD passem sem alteração.
