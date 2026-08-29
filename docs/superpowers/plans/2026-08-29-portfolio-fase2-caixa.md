# Portfólio Fase 2 — Caixa e Coerência · Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar caixa a cada carteira — derivado do livro de movimentos que já existe — com depósito, saque, transferência e swap, a trava "sem caixa não abre posição", e um supervisor que confere as contas entre si.

**Architecture:** O portfólio já tem um livro-razão (`st.mov`) onde cada tipo declara seu efeito no dinheiro (`C.TIPOS[t].sinal`: −1 saiu capital, +1 voltou). A fase 2 **estende esse livro** com quatro tipos novos e passa a **derivar** o caixa dele (`caixa = Σ sinal × usd` por carteira). Nada de saldo gravado, nada de segundo livro. A trava de saldo vive na camada de dados; o supervisor confere e não recalcula.

**Tech Stack:** JavaScript clássico (ES5+), sem build. `portfolio/portfolio-core.js` é `require`-ável em Node (é assim que os testes rodam). Testes em `portfolio/testes/teste-core.js`, executados por `dev/testar.mjs`.

**Spec:** [docs/superpowers/specs/2026-08-29-portfolio-fase2-caixa-design.md](../specs/2026-08-29-portfolio-fase2-caixa-design.md)

## Global Constraints

- **JS clássico ES5+, sem build, sem módulos ES.** Peças compartilhadas são idempotentes (`if (window.X) return;`). `portfolio-core.js` deve continuar funcionando tanto no browser quanto via `require` em Node.
- **Caixa NUNCA é variável gravada.** Não existe `setCaixa` nem campo `saldo` no estado. É sempre a soma do livro, recalculada na leitura. Um saldo gravado pode divergir do extrato que o produziu — é exatamente o defeito que esta fase existe para eliminar.
- **Não criar um segundo livro-razão.** `st.mov` é a fonte da verdade do dinheiro. Nenhuma estrutura paralela de movimentações.
- **O supervisor confere, não calcula.** Ele conserta UMA coisa: cache derivado, reescrito a partir da fonte. Divergência que não seja cópia velha ele **relata e não toca**. Sem fonte para comparar, devolve `null` ("não conferido"), nunca "tudo certo".
- **Nenhum tipo existente muda de `sinal`, `grupo` ou `externo`.** Mudar isso reescreveria a história de todo portfólio já salvo.
- **Arredondamento é da tela, nunca da camada de dados.**
- **Comercial:** caixa/depósito/saque/swap são do plano **grátis**. **Transferência entre carteiras é PRO** — e não ganha trava nova: ela só aparece com `st.carteiras.length >= 2`, e chegar a 2 já passa pelo `P.limCart()`/`P.upsell()` existente.
- **Cada tarefa de lógica é TDD:** teste que falha primeiro, com o valor esperado **calculado à mão** no comentário — nunca copiado do que o código devolveu.
- **Verificação de toda tarefa:** `node dev/testar.mjs` verde. Tarefas de UI adicionam: browser com **console limpo**, nos estados **vazio E com dados**, em desktop **e** mobile. (A fase 1 falhou por não checar estado vazio e larguras intermediárias.)
- **Deploy (merge na main) só com aprovação explícita do dono.**

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `portfolio/portfolio-core.js` | Tipos, ledger, caixa derivado, trava, migração | Modificar |
| `portfolio/portfolio-supervisor.js` | Confere coerência entre as contas | **Criar** |
| `portfolio/testes/teste-core.js` | Testes da matemática (formato `eq`/`eqv`/`sec`) | Modificar |
| `portfolio/portfolio.js` | Telas: carteiras, extrato, ações de caixa | Modificar |
| `portfolio/portfolio.css` | Estilo das peças novas | Modificar |
| `portfolio/*.html` | Incluir o supervisor | Modificar (Task 5) |
| `portfolio/portfolio-store.js` | Persistência | **Não tocar** |

---

## Task 1: Tipos de caixa + caixa derivado

**Files:**
- Modify: `portfolio/portfolio-core.js` (`C.TIPOS`, e nova `C.caixaDe`)
- Test: `portfolio/testes/teste-core.js`

**Interfaces:**
- Consumes: `C.TIPOS`, `C.addMov`, `C.movsDe`, `C.novoEstado` (já existem).
- Produces: `C.caixaDe(st, cartId)` → Number (USD). `C.TIPOS.deposito|saque|transf|swap`.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao fim de `portfolio/testes/teste-core.js`:

```js
/* ══════════════════════════════════════════════════════════════
   CAIXA: consequência dos eventos, nunca um campo gravado
   ══════════════════════════════════════════════════════════════ */
sec('Caixa da carteira');

var stx = C.novoEstado();
stx.carteiras.push({ id: 'w1', nome: 'Phantom' });
stx.ativos.push({ id: 'ax', tk: 'SOL', cg: 'solana', cart: 'w1', last: 200 });

/* À mão:  +1000 depósito  −200 saque  = 800
   depois compra 3 @ 100 (=300, fee 5) → 800 − 305 = 495          */
C.addMov(stx, { tipo: 'deposito', cart: 'w1', usd: 1000, dt: '2026-01-01' });
C.addMov(stx, { tipo: 'saque',    cart: 'w1', usd: 200,  dt: '2026-01-02' });
eq('caixa apos deposito e saque', C.caixaDe(stx, 'w1'), 800);

C.addMov(stx, { tipo: 'compra', ref: 'ax', cart: 'w1', qtd: 3, px: 100, fee: 5, dt: '2026-01-03' });
eq('caixa apos compra 3x100 + fee 5', C.caixaDe(stx, 'w1'), 495);

/* venda de 1 @ 150 devolve 150 ao caixa: 495 + 150 = 645 */
C.addMov(stx, { tipo: 'venda', ref: 'ax', cart: 'w1', qtd: 1, px: 150, dt: '2026-01-04' });
eq('caixa apos venda 1x150', C.caixaDe(stx, 'w1'), 645);

/* carteira sem nenhum evento tem caixa zero, nao NaN */
eq('caixa de carteira inexistente', C.caixaDe(stx, 'w-nao-existe'), 0);

/* swap nao mexe no caixa: troca de ativo dentro da carteira */
C.addMov(stx, { tipo: 'swap', cart: 'w1', usd: 300, dt: '2026-01-05' });
eq('caixa apos swap (neutro)', C.caixaDe(stx, 'w1'), 645);

/* os tipos novos existem e declaram o efeito certo */
eqv('deposito e externo (entra no XIRR)', C.TIPOS.deposito.externo, true);
eqv('saque e externo', C.TIPOS.saque.externo, true);
eqv('transf NAO e externo', C.TIPOS.transf.externo, false);
eqv('swap NAO e externo', C.TIPOS.swap.externo, false);
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node portfolio/testes/teste-core.js`
Expected: FALHA — `C.caixaDe is not a function` (ou tipo desconhecido em `addMov`).

- [ ] **Step 3: Implementar**

Em `portfolio/portfolio-core.js`, adicionar ao objeto `C.TIPOS` (depois de `trade_res`, mantendo os existentes intactos):

```js
    deposito:    { grupo:'caixa', sinal:+1, externo:true,  lbl:'Depósito' },
    saque:       { grupo:'caixa', sinal:-1, externo:true,  lbl:'Saque' },
    transf:      { grupo:'caixa', sinal: 0, externo:false, lbl:'Transferência' },
    swap:        { grupo:'caixa', sinal: 0, externo:false, lbl:'Troca de ativo' }
```

E, logo depois de `C.movsDe`, a derivação:

```js
  /* CAIXA = soma do livro daquela carteira. Nunca um campo gravado: um
     saldo guardado pode divergir do extrato que o produziu, e é justamente
     essa divergência que esta fase existe para tornar impossível.
     O `sinal` de C.TIPOS já é o efeito no caixa: −1 saiu capital para a
     posição, +1 voltou. Fee sai do caixa junto com a compra. */
  C.caixaDe = function (st, cartId) {
    var total = 0;
    (st.mov || []).forEach(function (m) {
      if (m.cart !== cartId) return;
      var t = C.TIPOS[m.tipo];
      if (!t) return;
      total += t.sinal * num(m.usd);
      /* a taxa sempre sai do bolso, em qualquer direção da operação */
      if (m.tipo === 'compra') total -= num(m.fee);
      else if (m.tipo === 'venda') total -= num(m.fee);
    });
    return total;
  };
```

Nota: `transf` tem `sinal 0` no tipo porque cada perna carrega o próprio
sinal — Task 3 trata disso.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node portfolio/testes/teste-core.js` — Expected: os casos novos em `ok`.
Depois: `node dev/testar.mjs` — Expected: tudo verde (nenhum teste antigo quebrou).

- [ ] **Step 5: Commit**

```bash
git add portfolio/portfolio-core.js portfolio/testes/teste-core.js
git commit -m "Portfolio: tipos de caixa e caixa derivado do livro (fase 2)"
```

---

## Task 2: Trava "sem caixa não abre posição"

**Files:**
- Modify: `portfolio/portfolio-core.js` (nova `C.podeGastar`)
- Test: `portfolio/testes/teste-core.js`

**Interfaces:**
- Consumes: `C.caixaDe` (Task 1).
- Produces: `C.podeGastar(st, cartId, usd)` → `{ ok: Boolean, caixa: Number, falta: Number }`.
  A tela usa `falta` para dizer **quanto** falta; a camada de dados usa `ok`.

- [ ] **Step 1: Escrever o teste que falha**

```js
sec('Trava de caixa');

var stt = C.novoEstado();
stt.carteiras.push({ id: 'w1', nome: 'Phantom' });
C.addMov(stt, { tipo: 'deposito', cart: 'w1', usd: 500, dt: '2026-01-01' });

var r1 = C.podeGastar(stt, 'w1', 300);
eqv('gasto dentro do caixa e permitido', r1.ok, true);
eq('falta zero quando cabe', r1.falta, 0);

var r2 = C.podeGastar(stt, 'w1', 800);
eqv('gasto acima do caixa e recusado', r2.ok, false);
eq('falta exatamente a diferenca', r2.falta, 300);
eq('informa o caixa disponivel', r2.caixa, 500);

/* gasto igual ao caixa cabe — a borda é inclusiva */
eqv('gasto igual ao caixa cabe', C.podeGastar(stt, 'w1', 500).ok, true);

/* carteira sem depósito nenhum não abre posição */
eqv('carteira zerada nao gasta', C.podeGastar(stt, 'w-nova', 1).ok, false);
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node portfolio/testes/teste-core.js` — Expected: `C.podeGastar is not a function`.

- [ ] **Step 3: Implementar**

Em `portfolio/portfolio-core.js`, logo após `C.caixaDe`:

```js
  /* A trava vive AQUI, na camada de dados, e não na tela: assim vale para
     importação, restauração de backup e qualquer tela futura. A tela também
     checa, mas só para poder dizer QUANTO falta. */
  C.podeGastar = function (st, cartId, usd) {
    var caixa = C.caixaDe(st, cartId);
    var v = Math.abs(num(usd));
    var falta = v - caixa;
    return { ok: falta <= 0, caixa: caixa, falta: falta > 0 ? falta : 0 };
  };
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node portfolio/testes/teste-core.js`, depois `node dev/testar.mjs` — ambos verdes.

- [ ] **Step 5: Commit**

```bash
git add portfolio/portfolio-core.js portfolio/testes/teste-core.js
git commit -m "Portfolio: trava de caixa na camada de dados (fase 2)"
```

---

## Task 3: Transferência de duas pernas + swap

**Files:**
- Modify: `portfolio/portfolio-core.js` (nova `C.transferir`)
- Test: `portfolio/testes/teste-core.js`

**Interfaces:**
- Consumes: `C.addMov`, `C.caixaDe`, `C.podeGastar`, `C.uid`.
- Produces: `C.transferir(st, {de, para, usd, dt, nota})` → `{ ok, ref, falta }`.
  As duas pernas compartilham o mesmo `ref` e são `tipo:'transf'`; a perna de
  origem grava `px:-1` e a de destino `px:+1` (o campo `px` já existe no
  ledger e é o que `trade_res` usa para carregar sinal).

- [ ] **Step 1: Escrever o teste que falha**

```js
sec('Transferencia entre carteiras');

var str = C.novoEstado();
str.carteiras.push({ id: 'w1', nome: 'Corretora' });
str.carteiras.push({ id: 'w2', nome: 'Cold' });
C.addMov(str, { tipo: 'deposito', cart: 'w1', usd: 1000, dt: '2026-01-01' });

var t = C.transferir(str, { de: 'w1', para: 'w2', usd: 400, dt: '2026-01-02' });
eqv('transferencia aceita', t.ok, true);
eq('origem perde 400',  C.caixaDe(str, 'w1'), 600);
eq('destino ganha 400', C.caixaDe(str, 'w2'), 400);

/* a soma das duas carteiras não muda: transferência redistribui,
   não cria nem destrói patrimônio */
eq('soma preservada', C.caixaDe(str, 'w1') + C.caixaDe(str, 'w2'), 1000);

/* as duas pernas existem e compartilham o mesmo ref */
var pernas = str.mov.filter(function (m) { return m.tipo === 'transf' && m.ref === t.ref; });
eqv('gravou duas pernas', pernas.length, 2);

/* sem caixa não transfere, e diz quanto falta */
var t2 = C.transferir(str, { de: 'w2', para: 'w1', usd: 900, dt: '2026-01-03' });
eqv('transferencia sem caixa recusada', t2.ok, false);
eq('informa quanto falta', t2.falta, 500);
eq('nada mudou apos recusa', C.caixaDe(str, 'w2'), 400);

/* não dá para transferir para a mesma carteira */
eqv('mesma carteira e recusada', C.transferir(str, { de: 'w1', para: 'w1', usd: 10 }).ok, false);
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node portfolio/testes/teste-core.js` — Expected: `C.transferir is not a function`.

- [ ] **Step 3: Implementar**

```js
  /* Transferência é UM evento com DUAS pernas unidas pelo mesmo `ref`.
     Nunca duas movimentações soltas: se uma perna sumir, o supervisor
     acusa, e apagar a transferência apaga as duas. O sinal de cada perna
     vai em `px` (−1 origem, +1 destino), como `trade_res` já faz. */
  C.transferir = function (st, o) {
    o = o || {};
    var usd = Math.abs(num(o.usd));
    if (!o.de || !o.para || o.de === o.para || !usd) {
      return { ok: false, ref: null, falta: 0 };
    }
    var pode = C.podeGastar(st, o.de, usd);
    if (!pode.ok) return { ok: false, ref: null, falta: pode.falta };

    var ref = C.uid();
    var dt = o.dt || C.hoje();
    C.addMov(st, { tipo: 'transf', ref: ref, cart: o.de,   usd: usd, px: -1, dt: dt, nota: o.nota || '' });
    C.addMov(st, { tipo: 'transf', ref: ref, cart: o.para, usd: usd, px: +1, dt: dt, nota: o.nota || '' });
    return { ok: true, ref: ref, falta: 0 };
  };
```

E em `C.caixaDe` (Task 1), a transferência precisa usar o sinal da perna.
Substituir a linha `total += t.sinal * num(m.usd);` por:

```js
      /* transf carrega o sinal na perna (px), não no tipo */
      var s = (m.tipo === 'transf') ? (num(m.px) < 0 ? -1 : +1) : t.sinal;
      total += s * num(m.usd);
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node portfolio/testes/teste-core.js`, depois `node dev/testar.mjs` — verdes.
Os testes da Task 1 (caixa) precisam continuar passando: a mudança em `caixaDe` não pode alterar nenhum tipo que não seja `transf`.

- [ ] **Step 5: Commit**

```bash
git add portfolio/portfolio-core.js portfolio/testes/teste-core.js
git commit -m "Portfolio: transferencia de duas pernas entre carteiras (fase 2)"
```

---

## Task 4: Abertura de saldo para dados antigos

**Files:**
- Modify: `portfolio/portfolio-core.js` (nova `C.aberturaDeSaldo`)
- Test: `portfolio/testes/teste-core.js`

**Interfaces:**
- Consumes: `C.caixaDe`, `C.addMov`, `C.movsDe`.
- Produces: `C.aberturaDeSaldo(st)` → Number (quantas carteiras receberam abertura).

**Por quê:** portfólio criado antes desta fase tem posições sem nenhum evento de caixa que as explique. Sem isso, todo usuário atual abriria o app com caixa negativo e alertas falsos.

- [ ] **Step 1: Escrever o teste que falha**

```js
sec('Abertura de saldo (dados anteriores a fase 2)');

var sta = C.novoEstado();
sta.carteiras.push({ id: 'w1', nome: 'Antiga' });
sta.ativos.push({ id: 'a9', tk: 'BTC', cg: 'bitcoin', cart: 'w1', last: 60000 });
/* posição antiga: compra sem nenhum depósito que a explique */
C.addMov(sta, { tipo: 'compra', ref: 'a9', cart: 'w1', qtd: 0.1, px: 50000, dt: '2026-02-10' });
eq('antes da abertura, caixa negativo', C.caixaDe(sta, 'w1'), -5000);

var n = C.aberturaDeSaldo(sta);
eqv('uma carteira recebeu abertura', n, 1);
eq('depois da abertura, caixa zerado', C.caixaDe(sta, 'w1'), 0);

/* a abertura é datada do primeiro evento da carteira, não de hoje */
var ab = sta.mov.filter(function (m) { return m.tipo === 'deposito' && m.nota.indexOf('Abertura') === 0; })[0];
eqv('abertura datada do primeiro evento', ab.dt, '2026-02-10');

/* roda de novo: não duplica, porque não há mais o que migrar */
eqv('idempotente — nao duplica', C.aberturaDeSaldo(sta), 0);
eq('caixa continua zerado', C.caixaDe(sta, 'w1'), 0);

/* carteira saudável (com depósito) não recebe abertura nenhuma */
var stb = C.novoEstado();
stb.carteiras.push({ id: 'w2', nome: 'Nova' });
C.addMov(stb, { tipo: 'deposito', cart: 'w2', usd: 100, dt: '2026-03-01' });
eqv('carteira saudavel nao migra', C.aberturaDeSaldo(stb), 0);
eq('caixa intacto', C.caixaDe(stb, 'w2'), 100);
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node portfolio/testes/teste-core.js` — Expected: `C.aberturaDeSaldo is not a function`.

- [ ] **Step 3: Implementar**

```js
  /* Portfólio anterior à fase 2 tem posições sem evento de caixa que as
     explique — o caixa daria negativo e o supervisor acusaria um erro que
     é da migração, não do usuário. A abertura de saldo é a resposta, e ela
     SOME SOZINHA quando não há o que migrar (carteira com caixa >= 0). */
  C.aberturaDeSaldo = function (st) {
    var n = 0;
    (st.carteiras || []).forEach(function (c) {
      var caixa = C.caixaDe(st, c.id);
      if (caixa >= 0) return;
      var movs = C.movsDe(st, { cart: c.id });
      var dt = movs.length ? movs[0].dt : C.hoje();
      C.addMov(st, {
        tipo: 'deposito', cart: c.id, usd: Math.abs(caixa), dt: dt,
        nota: 'Abertura de saldo — posições registradas antes do controle de caixa'
      });
      n++;
    });
    return n;
  };
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node portfolio/testes/teste-core.js`, depois `node dev/testar.mjs` — verdes.

- [ ] **Step 5: Commit**

```bash
git add portfolio/portfolio-core.js portfolio/testes/teste-core.js
git commit -m "Portfolio: abertura de saldo para portfolios anteriores ao caixa (fase 2)"
```

---

## Task 5: Supervisor de coerência

**Files:**
- Create: `portfolio/portfolio-supervisor.js`
- Modify: `portfolio/index.html`, `hold.html`, `defi.html`, `trade.html` (incluir o script com `?v=1`)
- Test: `portfolio/testes/teste-core.js`

**Interfaces:**
- Consumes: `C.caixaDe`, `C.transferir` (o `ref` das pernas), `C.TIPOS`, `st.carteiras`, `st.mov`.
- Produces: `PSuper.conferir(st)` → `{ ok: Boolean|null, achados: [ {chave, grave, txt} ] }`.
  `ok: null` = **não conferido** (sem fonte para comparar), nunca `true`.

**Regra:** confere, não calcula. Não conserta nada nesta tarefa — só relata.

- [ ] **Step 1: Escrever o teste que falha**

```js
sec('Supervisor: confere, nao calcula');

var S = require('../portfolio-supervisor.js');

/* carteira saudável: nada a acusar */
var sup1 = C.novoEstado();
sup1.carteiras.push({ id: 'w1', nome: 'Ok' });
C.addMov(sup1, { tipo: 'deposito', cart: 'w1', usd: 100, dt: '2026-01-01' });
eqv('carteira saudavel: sem achados', S.conferir(sup1).achados.length, 0);
eqv('carteira saudavel: ok true', S.conferir(sup1).ok, true);

/* estado vazio: NAO conferido (null), nunca "tudo certo" */
eqv('estado vazio devolve null', S.conferir(C.novoEstado()).ok, null);

/* caixa negativo: acusa, e é grave */
var sup2 = C.novoEstado();
sup2.carteiras.push({ id: 'w1', nome: 'Furada' });
sup2.ativos.push({ id: 'a1', tk: 'SOL', cg: 'solana', cart: 'w1', last: 100 });
C.addMov(sup2, { tipo: 'compra', ref: 'a1', cart: 'w1', qtd: 1, px: 100, dt: '2026-01-01' });
var r2 = S.conferir(sup2);
eqv('caixa negativo acusado', r2.achados.filter(function (a) { return a.chave === 'caixa-negativo'; }).length, 1);
eqv('caixa negativo e grave', r2.ok, false);

/* dinheiro em carteira apagada */
var sup3 = C.novoEstado();
sup3.carteiras.push({ id: 'w1', nome: 'Viva' });
C.addMov(sup3, { tipo: 'deposito', cart: 'w1', usd: 50, dt: '2026-01-01' });
C.addMov(sup3, { tipo: 'deposito', cart: 'w-apagada', usd: 70, dt: '2026-01-02' });
eqv('dinheiro em carteira apagada acusado',
  S.conferir(sup3).achados.filter(function (a) { return a.chave === 'carteira-fantasma'; }).length, 1);

/* transferência com uma perna só (corrompida) */
var sup4 = C.novoEstado();
sup4.carteiras.push({ id: 'w1', nome: 'A' });
sup4.carteiras.push({ id: 'w2', nome: 'B' });
C.addMov(sup4, { tipo: 'deposito', cart: 'w1', usd: 100, dt: '2026-01-01' });
C.addMov(sup4, { tipo: 'transf', ref: 'perdida', cart: 'w1', usd: 40, px: -1, dt: '2026-01-02' });
eqv('transferencia manca acusada',
  S.conferir(sup4).achados.filter(function (a) { return a.chave === 'transf-manca'; }).length, 1);
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node portfolio/testes/teste-core.js` — Expected: `Cannot find module '../portfolio-supervisor.js'`.

- [ ] **Step 3: Implementar**

Criar `portfolio/portfolio-supervisor.js`, seguindo o padrão dos outros
arquivos do projeto (IIFE, idempotente, `module.exports` no fim para o teste
em Node, como `portfolio-core.js` faz):

```js
/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  MUNDODEFI · PORTFÓLIO — SUPERVISOR (portfolio-supervisor.js)        ║
   ║                                                                      ║
   ║  Ele NÃO calcula nada. Cada parte do sistema sabe fazer a sua conta; ║
   ║  o supervisor pergunta e confere se as respostas fecham entre si.    ║
   ║  Recalcular aqui criaria uma segunda fonte da verdade — que é o      ║
   ║  defeito que ele existe para encontrar.                              ║
   ║                                                                      ║
   ║  E ele diz quando NÃO PÔDE conferir: sem fonte para comparar, `ok`   ║
   ║  vem null e a tela escreve "não conferido" — nunca "tudo certo".     ║
   ║  Um verificador que tranquiliza sobre o vazio é pior que nenhum.     ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
(function (raiz) {
  'use strict';
  var C = raiz.PCore || (typeof require === 'function' ? require('./portfolio-core.js') : null);
  var S = {};

  S.conferir = function (st) {
    var achados = [];
    if (!st || !st.mov || !st.mov.length) return { ok: null, achados: achados };

    var vivas = {};
    (st.carteiras || []).forEach(function (c) { vivas[c.id] = true; });

    /* caixa negativo: dinheiro que saiu sem ter entrado */
    (st.carteiras || []).forEach(function (c) {
      var caixa = C.caixaDe(st, c.id);
      if (caixa < -0.005) {
        achados.push({ chave: 'caixa-negativo', grave: true,
          txt: 'A carteira "' + c.nome + '" gastou mais do que entrou nela (' + caixa.toFixed(2) + ').' });
      }
    });

    /* dinheiro preso em carteira que não existe mais */
    var fantasmas = {};
    st.mov.forEach(function (m) { if (m.cart && !vivas[m.cart]) fantasmas[m.cart] = true; });
    Object.keys(fantasmas).forEach(function (id) {
      achados.push({ chave: 'carteira-fantasma', grave: true,
        txt: 'Há movimentações numa carteira que não existe mais.' });
    });

    /* transferência precisa das duas pernas */
    var pernas = {};
    st.mov.forEach(function (m) {
      if (m.tipo !== 'transf' || !m.ref) return;
      pernas[m.ref] = (pernas[m.ref] || 0) + 1;
    });
    Object.keys(pernas).forEach(function (ref) {
      if (pernas[ref] !== 2) {
        achados.push({ chave: 'transf-manca', grave: true,
          txt: 'Uma transferência está incompleta — falta a outra ponta.' });
      }
    });

    return { ok: achados.length === 0, achados: achados };
  };

  raiz.PSuper = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
```

Incluir nas 4 páginas, **antes** de `portfolio.js` e **depois** de
`portfolio-core.js`, com `?v=1` (o `dev/versionar.mjs` só rastreia
referências que já têm `?v=` — sem isso o arquivo nunca atualiza no
navegador de ninguém):

```html
<script src="/portfolio/portfolio-supervisor.js?v=1"></script>
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node portfolio/testes/teste-core.js` — casos do supervisor em `ok`.
Run: `node dev/versionar.mjs` — confirmar que o número de "arquivos versionados" subiu em 1.
Run: `node dev/testar.mjs` — verde.

- [ ] **Step 5: Commit**

```bash
git add portfolio/portfolio-supervisor.js portfolio/testes/teste-core.js portfolio/*.html
git commit -m "Portfolio: supervisor que confere a coerencia das contas (fase 2)"
```

---

## Task 6: Telas — caixa, extrato e ações

**Files:**
- Modify: `portfolio/portfolio.js`
- Modify: `portfolio/portfolio.css`

**Interfaces:**
- Consumes: `C.caixaDe`, `C.podeGastar`, `C.transferir`, `C.aberturaDeSaldo`, `PSuper.conferir`.
- Componentes já existentes a reusar: `.wcard`/`.wcard-bar` (fase 1), `.card`, `.dtable`, `P.modal`, `P.limCart()`, `P.upsell()`.

- [ ] **Step 1: Ler o que já existe**

Ler em `portfolio/portfolio.js`: o bloco de carteiras do `vDash` (procurar `class="wcard"`), `P.formCarteira`, `P.modal`, `P.limCart`, `P.upsell`, e os pontos onde `C.addMov` cria posição (linhas ~1111, 1357, 1406, 1557, 1762, 1778) — são eles que ganham a checagem de caixa na tela.

- [ ] **Step 2: Cartão de carteira com Investido / Caixa**

Trocar o conteúdo do `.wcard` (hoje: total + % do patrimônio) por total + a barra dividida **Investido | Caixa**, que é o que a fase 1 desenhou e não pôde preencher. Usar `C.caixaDe(P.st, c.id)` e o investido que o `vDash` já calcula por carteira. Adicionar um botão "Extrato" no cartão.

- [ ] **Step 3: Ações de caixa**

Adicionar ao cartão de carteira: **Depositar**, **Sacar**, **Transferir**, **Swap** — cada um abrindo `P.modal` com o formulário, gravando via `C.addMov`/`C.transferir` e chamando `P.save()` + `P.render()`.

**Transferir** só aparece quando `P.st.carteiras.length >= 2`. Não criar trava nova: criar a 2ª carteira já passa por `P.limCart()`/`P.upsell()`.

Saque e as aberturas de posição usam `C.podeGastar` para **dizer quanto falta** antes de gravar (a trava dura já está na camada de dados, Task 2).

- [ ] **Step 4: Extrato da carteira**

Modal com o livro daquela carteira em ordem (`C.movsDe(st, {cart})`), mostrando data, rótulo do tipo (`C.TIPOS[t].lbl`), valor com sinal e **saldo corrente** — a prova visual de que o caixa é consequência dos eventos.

- [ ] **Step 5: Chamar a abertura de saldo no boot**

Em `P.boot`, depois de `P.load()` e antes do primeiro render: se `C.aberturaDeSaldo(P.st) > 0`, chamar `P.save()`. É idempotente (Task 4), então roda em toda abertura sem duplicar.

- [ ] **Step 6: Verificação**

Run: `node dev/testar.mjs` — verde.
Run: `node --check portfolio/portfolio.js`.
Browser (`python -m http.server 8123`), as 4 páginas, **estado vazio E com dados**, desktop **e** mobile (375px): console limpo; depositar/sacar/transferir/swap funcionam; o extrato bate com o caixa; a barra Investido/Caixa aparece.

- [ ] **Step 7: Commit**

```bash
git add portfolio/portfolio.js portfolio/portfolio.css
git commit -m "Portfolio: caixa, extrato e acoes de dinheiro nas telas (fase 2)"
```

---

## Task 7: Painel de supervisão, cache e verificação final

**Files:**
- Modify: `portfolio/portfolio.js` (painel + sino)
- Modify: `portfolio/*.html` (recarimbar via script)

- [ ] **Step 1: Painel de supervisão**

No menu do avatar (fase 1), adicionar "Supervisão das contas" abrindo um modal com o resultado de `PSuper.conferir(P.st)`. Quando `ok === null`, a tela escreve **"não conferido"** — nunca "tudo certo". Quando há achados graves, um ponto discreto no avatar.

- [ ] **Step 2: Regressão final**

Run: `node dev/testar.mjs` — verde (444 antigos + os novos da fase 2).

- [ ] **Step 3: Recarimbar cache**

Run: `node dev/versionar.mjs`.

- [ ] **Step 4: Passada final no browser**

As 4 páginas, **vazio e com dados**, desktop e mobile, console limpo. Screenshots antes/depois para o dono.

- [ ] **Step 5: Commit**

```bash
git add -A portfolio/ docs/ *.html
git commit -m "Portfolio: painel de supervisao + recarimba cache (fase 2)"
```

- [ ] **Step 6: Parar e pedir o "vai" do dono para o deploy** — NÃO fazer merge na main sozinho.

---

## Self-Review

**Cobertura do spec:**
- Tipos novos (deposito/saque/transf/swap) → Task 1 ✅
- Caixa derivado, nunca gravado → Task 1 ✅
- Trava "sem caixa não abre posição" na camada de dados → Task 2 ✅
- Transferência de duas pernas com mesmo `ref` → Task 3 ✅
- Abertura de saldo para dados antigos, idempotente → Task 4 ✅
- Supervisor que confere e devolve `null` quando não pôde → Task 5 ✅
- Telas: Investido/Caixa, extrato, ações → Task 6 ✅
- Painel de supervisão → Task 7 ✅
- Comercial (transferência é PRO, sem trava nova) → Task 6 Step 3 ✅
- Verificação com estado vazio + mobile → Tasks 6 e 7 ✅
- Deploy gated → Task 7 Step 6 ✅

**Placeholders:** nenhum "TBD". As Tasks 1–5 trazem o código e os testes completos (valores calculados à mão nos comentários). A Task 6 é de UI e descreve os componentes a reusar com os anchors de linha — o HTML exato depende do código lido em contexto, e inventá-lo aqui seria pior que descrevê-lo.

**Consistência de nomes/tipos:** `C.caixaDe(st, cartId)` definida na Task 1 e consumida nas 2, 3, 4, 5, 6. `C.podeGastar` → `{ok, caixa, falta}` (Task 2) consumida na 3 e 6. `C.transferir` → `{ok, ref, falta}` (Task 3) consumida na 6. `PSuper.conferir` → `{ok, achados}` (Task 5) consumida na 7. A Task 3 altera uma linha de `C.caixaDe` criada na Task 1 — está dito explicitamente no Step 3 da Task 3, e o Step 4 exige que os testes da Task 1 continuem passando.
