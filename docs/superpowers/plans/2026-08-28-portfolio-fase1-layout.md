# Portfólio Fase 1 — Layout e Navegação · Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar o portfólio do MundoDeFi da barra lateral para navegação no topo e restilizar dashboard + HOLD/DeFi/Trade, sem tocar na lógica de dados.

**Architecture:** SPA em JavaScript clássico (objeto global `P`), sem build. O shell é montado por uma única função `P.shell(active)` que injeta HTML em `#app`; cada tela é `P.vDash/vHold/vDefi/vTrade`. Reescrevemos `P.shell` para um `<header>` no topo e re-skinamos as telas usando componentes compartilhados no `portfolio.css`, tudo em cima dos tokens de `mundodefi-tokens.css`. A camada de dados (`portfolio-core.js`, `portfolio-store.js`) fica intacta.

**Tech Stack:** HTML/CSS/JS puro (ES5+), Chart.js (já carregado), Firestore (via nexus-auth, não tocado), `mundodefi-tokens.css` como sistema de design.

**Spec:** [docs/superpowers/specs/2026-08-28-portfolio-fase1-layout-design.md](../specs/2026-08-28-portfolio-fase1-layout-design.md)

## Global Constraints

- **JS clássico ES5+, sem módulos ES, sem build.** A ordem das tags `<script>` é a árvore de dependências. Cada peça compartilhada é idempotente (`if (window.X) return;`).
- **Não tocar** `portfolio/portfolio-core.js` nem `portfolio/portfolio-store.js` (lógica, store, XIRR, snapshots, sync). Se um teste de `dev/testar.mjs` quebrar, o restyle vazou para onde não devia.
- **Reusar `mundodefi-tokens.css`.** Não inventar cor. Cor por função: roxo `#9945FF` = interação; dourado `#F5B614` = ênfase; verde `#14F195`/vermelho `#FF4D6A` = ganho/perda **e nada mais**; ciano `#00E5FF` = dado ao vivo.
- **Sem caixa, transferência, swap ou supervisor** (fase 2). **Sem RWA/Meta reais** (fase 3): aqui só as abas desativadas com selo "breve".
- **Nada de número inventado.** O cartão de carteira mostra só o que é derivável hoje (total + % do patrimônio). A barra Investido/Caixa é fase 2.
- **Nenhum controle pode sumir** na migração da lateral: status de sync, "Limpar e começar do zero", "Voltar ao site" e o bloco de plano migram para o menu do avatar.
- **Verificação de toda tarefa de UI:** `node dev/testar.mjs` verde **e** página aberta no browser com **console limpo** (`read_console_messages`).
- **Deploy (merge na main) só com aprovação explícita do dono.**

---

## Nota sobre "testes" nesta fase

Restyle de UI não tem teste unitário como a lógica tem. O ciclo de cada tarefa é:

1. **Invariante:** `node dev/testar.mjs` continua verde (a lógica não muda).
2. **Aceitação:** abrir a página no browser, **console sem erros**, e conferência visual (screenshot) contra o mockup aprovado.
3. **Commit.**

Onde o passo pede "teste", é este ciclo. O preview roda com `python -m http.server 8123` (config `mundodefi` em `.claude/launch.json`).

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `portfolio/portfolio.js` | Shell (`P.shell`) + telas (`vDash/vHold/vDefi/vTrade`) | Modificar |
| `portfolio/portfolio.css` | Folha única de estilo do app | Modificar |
| `portfolio/portfolio-core.js` | Lógica/derivações | **Não tocar** |
| `portfolio/portfolio-store.js` | Persistência | **Não tocar** |
| `portfolio/index.html` `hold.html` `defi.html` `trade.html` | Páginas (só chamam `P.pageX()`) | Não muda estrutura; só recarimbar cache no fim |

---

## Task 1: Shell no topo + menu do avatar + abas "breve" + mobile

Reescreve `P.shell` (hoje `portfolio/portfolio.js:310-357`) de `<aside class="sb">` lateral para um `<header class="tnav">` no topo, e adiciona o CSS do shell. Shell e seu CSS precisam entrar juntos para a página ficar testável — é uma tarefa só.

**Files:**
- Modify: `portfolio/portfolio.js:310-357` (função `P.shell`)
- Modify: `portfolio/portfolio.css` (seção LAYOUT / barra lateral → top-nav)

**Interfaces:**
- Consumes: `P.esc`, `P.statusSync()`, `P.st.carteiras`, `P.st.cfg`, `P.isFree()`, `P.planoAtual`, `P.PLAN_LBL`, `P.save`, `P.render`, `P.loadRate`, `P.clearAll`, `P.closeModal` (todos já existem).
- Produces: mesma assinatura `P.shell(active)` com `active ∈ {dash,hold,defi,trade}`. Mantém os IDs que o resto do código já espera: `#pgTitle`, `#pgSub`, `#pg`, `#mdlBg`, `#mdlBox`, `#mdlTitle`, `#mdlBody`, `#mdlFoot`, `#cartSel`, `#mUsd`, `#mBrl`, `#btnAdd`, `#sbSync`, `#sbClear`. **Não renomear esses IDs** — outras funções (`P.atualizaSync` usa `#sbSync`; `vDash` usa `#pgTitle`) dependem deles.

- [ ] **Step 1: Registrar o estado atual (baseline visual)**

Rodar o preview e fotografar as 4 páginas ANTES da mudança, para o antes/depois:
`http://localhost:8123/portfolio/index.html`, `/hold.html`, `/defi.html`, `/trade.html`. Guardar screenshots.

- [ ] **Step 2: Montar as strings do header (builder)**

No topo de `P.shell`, montar o header no lugar da `<aside class="sb">`. As `items` continuam iguais; adiciona `soon` para RWA/Meta:

```js
P.shell = function (active) {
  var e = P.esc;
  var items = [['dash', '📊', 'Dashboard', '/portfolio/index.html'], ['hold', '💎', 'HOLD', '/portfolio/hold.html'],
               ['defi', '🌊', 'DeFi', '/portfolio/defi.html'], ['trade', '⚡', 'Trade', '/portfolio/trade.html']];
  var soon = [['rwa', '🏛', 'RWA'], ['meta', '🎯', 'Meta']];
  var planoLbl = P.PLAN_LBL[P.planoAtual] || 'Grátis';

  var tabs = items.map(function (it) {
    return '<a class="tnav-tab' + (active === it[0] ? ' active' : '') + '" href="' + it[3] + '" role="tab"'
      + (active === it[0] ? ' aria-selected="true"' : '') + '><span class="ico">' + it[1] + '</span>' + it[2] + '</a>';
  }).join('') + soon.map(function (it) {
    return '<span class="tnav-tab soon" role="tab" aria-disabled="true"><span class="ico">' + it[1] + '</span>'
      + it[2] + '<span class="tnav-badge">breve</span></span>';
  }).join('');

  var carts = '<select class="fsel" id="cartSel"><option value="all">Todas as carteiras</option>'
    + P.st.carteiras.map(function (c) { return '<option value="' + c.id + '"' + (P.st.cfg.cart === c.id ? ' selected' : '') + '>' + e(c.nome) + '</option>'; }).join('') + '</select>';

  var avMenu = '<div class="avmenu" id="avMenu" hidden>'
    + '<div class="avmenu-sync" id="sbSync">' + P.statusSync() + '</div>'
    + '<div class="avmenu-plan"><div><div class="avmenu-cap">Seu plano</div><div class="avmenu-val">' + e(planoLbl) + '</div></div>'
    + (P.isFree() ? '<a class="btn btn-p" href="/planos.html">Assinar</a>' : '<span class="avmenu-pro">⚡ PRO</span>') + '</div>'
    + '<a class="avmenu-link" href="#" id="sbClear">🗑 Limpar e começar do zero</a>'
    + '<a class="avmenu-link" href="/">← Voltar ao site</a>'
    + '</div>';

  var header = '<header class="tnav">'
    + '<a href="/" class="tnav-logo"><span class="tnav-mark">₿</span><span class="tnav-name">Mundo<em>DeFi</em></span></a>'
    + '<nav class="tnav-tabs" role="tablist">' + tabs + '</nav>'
    + '<div class="tnav-right">'
    + (P.st.carteiras.length ? carts : '')
    + '<div class="seg"><button id="mUsd" class="' + (P.st.cfg.moeda === 'usd' ? 'on' : '') + '">US$</button><button id="mBrl" class="' + (P.st.cfg.moeda === 'brl' ? 'on' : '') + '">R$</button></div>'
    + '<button class="btn btn-p" id="btnAdd">+ Adicionar</button>'
    + '<div class="avwrap"><button class="avatar" id="avBtn" aria-haspopup="true" aria-expanded="false" title="Conta">MD</button>' + avMenu + '</div>'
    + '</div></header>';

  var main = '<main class="main"><div class="top"><div class="pg-titulo" id="pgTitle"></div><div class="top-sub" id="pgSub"></div></div><div id="pg"></div></main>'
    + '<div class="mdl-bg" id="mdlBg"><div class="mdl" id="mdlBox"><div class="mdl-hd"><div class="mdl-title" id="mdlTitle"></div><button class="mdl-x" onclick="P.closeModal()">×</button></div><div class="mdl-bd" id="mdlBody"></div><div class="mdl-ft" id="mdlFoot"></div></div></div>';
```

- [ ] **Step 3: Injetar e religar os eventos**

A injeção reusa **exatamente a via que o shell usa hoje** (`portfolio/portfolio.js:339`, `document.getElementById('app')`): trocar o conteúdo montado de `side + '<div…>' + top` para `header + main`. Depois, `document.body.dataset.view = active;` e o wiring — igual ao atual, mais o toggle do menu do avatar e o "fechar ao clicar fora":

```js
  var cs = document.getElementById('cartSel');
  if (cs) cs.addEventListener('change', function () { P.st.cfg.cart = this.value; P.save(); if (P.render) P.render(); });
  document.getElementById('mUsd').addEventListener('click', function () { P.st.cfg.moeda = 'usd'; P.save(); P.loadRate().then(function () { P.render(); }); });
  document.getElementById('mBrl').addEventListener('click', function () { P.st.cfg.moeda = 'brl'; P.save(); P.loadRate().then(function () { P.render(); }); });
  document.getElementById('sbClear').addEventListener('click', function (ev) {
    ev.preventDefault();
    if (confirm('Isso apaga TODAS as suas movimentações, aqui e na sua conta. Não dá para desfazer.\n\nTem certeza?')) P.clearAll();
  });

  var avBtn = document.getElementById('avBtn'), avEl = document.getElementById('avMenu');
  avBtn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (avEl.hasAttribute('hidden')) { avEl.removeAttribute('hidden'); avBtn.setAttribute('aria-expanded', 'true'); }
    else { avEl.setAttribute('hidden', ''); avBtn.setAttribute('aria-expanded', 'false'); }
  });

  document.getElementById('mdlBg').addEventListener('click', function (ev) { if (ev.target === this) P.closeModal(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') P.closeModal(); });
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest('.avwrap') && !avEl.hasAttribute('hidden')) { avEl.setAttribute('hidden', ''); avBtn.setAttribute('aria-expanded', 'false'); }
    if (ev.target.closest('.lockbtn') || ev.target.closest('.lockrow')) { P.upsell(); return; }
    var ex = ev.target.closest('[data-exp]');
    if (ex && P.exporters && P.exporters[ex.dataset.exp]) P.exporters[ex.dataset.exp]();
  });
};
```

Notas: o `#btnAdd` continua sem handler no shell (quem liga é cada tela, como hoje). O menu do avatar absorve sync/limpar/voltar/plano — nenhum controle some. As abas RWA/Meta são `<span>` desativados, sem `href`.

- [ ] **Step 4: Trocar o CSS do layout — de lateral para topo**

Em `portfolio/portfolio.css`, na seção LAYOUT: mudar `.app` de flex-linha para coluna e substituir as regras de `.sb*`/`.mob-top` pelas do top-nav. Adicionar:

```css
.app{display:block;min-height:100vh}
.tnav{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:22px;
  padding:11px 22px;background:rgba(13,17,28,.9);backdrop-filter:blur(12px);
  border-bottom:1px solid var(--line2)}
.tnav-logo{display:flex;align-items:center;gap:9px;font-weight:700;font-size:16px}
.tnav-mark{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,var(--purple,#9945FF),#6d28d9);
  display:grid;place-items:center;color:#fff;box-shadow:0 0 18px rgba(153,69,255,.4)}
.tnav-name em{color:var(--purple-txt,#A96BFF);font-style:normal}
.tnav-tabs{display:flex;gap:2px;margin-left:4px;min-width:0;overflow-x:auto;scrollbar-width:none}
.tnav-tabs::-webkit-scrollbar{display:none}
.tnav-tab{display:flex;align-items:center;gap:7px;padding:9px 13px;border-radius:10px;
  color:var(--mut);font-weight:500;font-size:14px;position:relative;white-space:nowrap;transition:.15s}
.tnav-tab .ico{font-size:15px;opacity:.85}
.tnav-tab.active{color:var(--txt)}
.tnav-tab.active::after{content:"";position:absolute;left:12px;right:12px;bottom:-12px;height:2px;
  background:linear-gradient(90deg,var(--purple,#9945FF),var(--cyan,#00E5FF));border-radius:2px}
.tnav-tab.soon{color:var(--mut2);cursor:default}
.tnav-badge{font-size:9px;letter-spacing:.08em;text-transform:uppercase;border:1px solid var(--line2);
  border-radius:5px;padding:1px 5px;color:var(--mut2)}
.tnav-right{margin-left:auto;display:flex;align-items:center;gap:10px}
.avwrap{position:relative}
.avmenu{position:absolute;right:0;top:calc(100% + 8px);width:240px;background:var(--panel);
  border:1px solid var(--line2);border-radius:14px;box-shadow:var(--mdf-shadow-lg,0 12px 40px rgba(0,0,0,.45));
  padding:10px;display:flex;flex-direction:column;gap:8px;z-index:60}
.avmenu[hidden]{display:none}
.avmenu-plan{display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:10px;border:1px solid var(--line2);border-radius:10px;background:var(--panel2)}
.avmenu-cap{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut2)}
.avmenu-val{font-weight:600;margin-top:2px}
.avmenu-link{display:block;padding:8px 10px;border-radius:9px;color:var(--mut);font-size:13.5px}
.avmenu-link:hover{background:var(--panel3);color:var(--txt)}
.main{max-width:var(--mdf-wrap,1220px);margin:0 auto;padding:22px 24px 60px}
@media(max-width:768px){
  .tnav{gap:12px;padding:10px 14px;flex-wrap:wrap}
  .tnav-tabs{order:3;width:100%}
  .main{padding:18px 14px 60px}
}
```

Remover (ou deixar mortas e apagar na Task 6) as regras antigas `.sb`, `.sb-logo*`, `.sb-item`, `.sb-foot`, `.sb-plan*`, `.sb-link`, `.mob-top`, `.mob-burger`, `body.snav`. **Cuidado:** `.sb-sec` NÃO é da lateral — é rótulo de seção usado dentro dos módulos (`portfolio.js` linhas 738, 1136, 1287, 1328, 1457…). **Preservar `.sb-sec`.**

- [ ] **Step 5: Rodar a suíte de regressão**

Run: `node dev/testar.mjs`
Expected: todos verdes (a lógica não mudou).

- [ ] **Step 6: Testar no browser as 4 páginas**

Abrir cada uma em `http://localhost:8123/portfolio/{index,hold,defi,trade}.html`. Verificar: header no topo com as 4 abas + RWA/Meta "breve"; aba ativa correta por página; `read_console_messages` **sem erros**; clicar no avatar abre o menu com sync/plano/limpar/voltar; clicar fora fecha; toggle US$/R$ funciona; "+ Adicionar" abre o fluxo. Screenshot da home.

- [ ] **Step 7: Commit**

```bash
git add portfolio/portfolio.js portfolio/portfolio.css
git commit -m "Portfolio: shell no topo no lugar da barra lateral (fase 1)"
```

---

## Task 2: Dashboard restilizado (`P.vDash`)

Re-skin do dashboard para a linguagem do mockup: número herói, KPIs como 4 pilares, gráfico de área, cartões de carteira (total + % do patrimônio, **sem caixa**), tabela de ativos.

**Files:**
- Modify: `portfolio/portfolio.js` (`P.vDash`, a partir da linha 442)
- Modify: `portfolio/portfolio.css` (componentes: `.hero`, `.kpi`, `.wcard`, `.dtable`)

**Interfaces:**
- Consumes: `P.totais()`, `P.st.carteiras`, `P.precos`, formatadores já existentes, `#pgTitle`, `#pg`, Chart.js (`window.Chart`).
- Produces: HTML dentro de `#pg`. Define as classes de componente (`.hero/.kpi/.wcard/.dtable`) reusadas em HOLD/DeFi/Trade (Tasks 3-5).

- [ ] **Step 1: Ler o `P.vDash` atual inteiro**

Ler de `portfolio/portfolio.js:442` até o fim de `vDash` (próximo `P.v...` ou `P.page...`). Mapear cada bloco que ele emite hoje (KPIs, resultado, gráfico, carteiras, ativos) — o restyle reorganiza esses blocos, não inventa dados novos.

- [ ] **Step 2: Adicionar os componentes compartilhados no CSS**

Em `portfolio/portfolio.css`, adicionar (derivados do mockup aprovado, usando tokens):

```css
.hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;
  padding:22px 24px;background:radial-gradient(120% 140% at 100% 0,var(--purple-soft),transparent 55%),var(--panel);
  border:1px solid var(--line2);border-radius:var(--rxl,16px);position:relative;overflow:hidden;margin-bottom:18px}
.hero::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;
  background:linear-gradient(180deg,var(--purple,#9945FF),var(--cyan,#00E5FF))}
.hero-big{font-size:44px;font-weight:700;line-height:1;letter-spacing:-.02em}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
.kpi{padding:15px 16px;background:var(--panel);border:1px solid var(--line2);border-radius:var(--rl,14px);border-top-width:2px}
.kpi.k-hold{border-top-color:var(--purple,#9945FF)} .kpi.k-defi{border-top-color:var(--cyan,#00E5FF)}
.kpi.k-trade{border-top-color:var(--gold,#F5B614)} .kpi.k-ret{border-top-color:var(--green,#14F195)}
.kpi-v{font-size:22px;font-weight:600;margin-top:8px}
.wcard{display:flex;flex-direction:column;gap:8px;padding:13px;border:1px solid var(--line);
  border-radius:12px;background:var(--panel2)}
.wcard-bar{height:7px;border-radius:999px;background:var(--panel3);overflow:hidden}
.wcard-bar span{display:block;height:100%;background:var(--purple,#9945FF)}
.dtable{width:100%;border-collapse:collapse}
.dtable th{text-align:left;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut2);font-weight:600;padding:0 12px 10px}
.dtable td{padding:12px;border-top:1px solid var(--line);font-size:13.5px}
.dtable .r{text-align:right}
@media(max-width:768px){.kpis{grid-template-columns:repeat(2,1fr)}}
```

- [ ] **Step 3: Reorganizar o HTML do `vDash`**

Reescrever o corpo de `vDash` para emitir, nesta ordem, reusando os valores que ele já calcula de `P.totais()`:
1. `.hero` com o patrimônio total (mono), o não realizado (valor + %) e o realizado subordinado.
2. `.kpis` com 4 tiles `.k-hold/.k-defi/.k-trade/.k-ret`.
3. O gráfico de evolução (mesma chamada Chart.js de hoje) dentro de um `.card`; estado vazio vira bloco discreto, não tela cheia.
4. Carteiras: cada uma como `.wcard` com nome, total e barra de **% do patrimônio** (`largura = valorCarteira / patrimônioTotal`). **Sem Investido/Caixa.**
5. Ativos: tabela `.dtable`.

Manter todos os handlers que `vDash` já religa depois de montar (períodos do gráfico, etc.).

- [ ] **Step 4: Regressão**

Run: `node dev/testar.mjs` — Expected: verdes.

- [ ] **Step 5: Browser**

Abrir `http://localhost:8123/portfolio/index.html`, carregar "Ver com dados de exemplo". Verificar console limpo, herói grande, 4 KPIs coloridos, gráfico desenhando, cartões de carteira com barra de %, tabela de ativos com cores de ganho/perda. Screenshot antes/depois.

- [ ] **Step 6: Commit**

```bash
git add portfolio/portfolio.js portfolio/portfolio.css
git commit -m "Portfolio: dashboard restilizado — heroi, KPIs, grafico, carteiras (fase 1)"
```

---

## Task 3: HOLD restilizado (`P.vHold`)

**Files:**
- Modify: `portfolio/portfolio.js` (`P.vHold`, a partir da linha 933)
- Modify: `portfolio/portfolio.css` (só se faltar componente; reusar `.kpi/.dtable/.card` da Task 2)

**Interfaces:**
- Consumes: componentes CSS da Task 2, dados que `vHold` já calcula.
- Produces: HTML em `#pg` para a tela HOLD.

- [ ] **Step 1: Ler `P.vHold` inteiro** (933 até o próximo `P.v...`). Listar os blocos: KPIs do módulo, tabela/lista de posições, bloco "Como esta posição foi construída" (usa `.sb-sec` como rótulo — preservar).

- [ ] **Step 2: Aplicar os componentes** — trocar os contêineres de KPI do módulo pela classe `.kpi` (com o acento roxo, sotaque do HOLD), a lista de posições pela `.dtable`, e os cartões pela linguagem `.card`. **Não alterar** nenhum número, métrica ou texto de ajuda; é re-skin.

- [ ] **Step 3: Regressão** — `node dev/testar.mjs` verde.

- [ ] **Step 4: Browser** — `http://localhost:8123/portfolio/hold.html` com dados de exemplo: console limpo, KPIs e tabela no novo estilo, o detalhe de posição abre e fecha. Screenshot.

- [ ] **Step 5: Commit**

```bash
git add portfolio/portfolio.js portfolio/portfolio.css
git commit -m "Portfolio: HOLD restilizado (fase 1)"
```

---

## Task 4: DeFi restilizado (`P.vDefi`)

**Files:**
- Modify: `portfolio/portfolio.js` (`P.vDefi`, a partir da linha 1415)
- Modify: `portfolio/portfolio.css` (reusar componentes; adicionar só o que faltar)

**Interfaces:**
- Consumes: componentes CSS das Tasks 2-3.
- Produces: HTML em `#pg` para a tela DeFi, incluindo as abas internas (pools/lending) que já existem (`.tab` religado em `portfolio.js:1496`).

- [ ] **Step 1: Ler `P.vDefi` inteiro** (1415 até o próximo `P.v...`). Mapear: abas internas pools/lending, cartões de pool, comparativo "a pool bateu o HOLD?", painel de impermanent loss, histórico de pools encerradas. As abas internas usam `.tab` — **manter o seletor `.tab`** (o handler em 1496 depende dele) e só re-skinar.

- [ ] **Step 2: Aplicar os componentes** — pools como `.card`, KPIs como `.kpi` (sotaque ciano do DeFi), listas como `.dtable`. Preservar rótulos `.sb-sec`. Não mudar cálculos de IL, taxa ou PnL.

- [ ] **Step 3: Regressão** — `node dev/testar.mjs` verde (cobre a matemática do DeFi; qualquer vermelho = restyle vazou).

- [ ] **Step 4: Browser** — `http://localhost:8123/portfolio/defi.html` com dados de exemplo: console limpo, abas internas trocam, cartões de pool no novo estilo, painel de IL correto. Screenshot.

- [ ] **Step 5: Commit**

```bash
git add portfolio/portfolio.js portfolio/portfolio.css
git commit -m "Portfolio: DeFi restilizado (fase 1)"
```

---

## Task 5: Trade restilizado (`P.vTrade`)

**Files:**
- Modify: `portfolio/portfolio.js` (`P.vTrade`, a partir da linha 1578)
- Modify: `portfolio/portfolio.css` (reusar componentes)

**Interfaces:**
- Consumes: componentes CSS das Tasks 2-4.
- Produces: HTML em `#pg` para a tela Trade.

- [ ] **Step 1: Ler `P.vTrade` inteiro** (1578 até `P.pageDash` em 1718). Mapear: KPIs de banca (win rate, profit factor, expectativa, drawdown), aviso de amostra pequena, diário e linha do tempo.

- [ ] **Step 2: Aplicar os componentes** — KPIs de banca como `.kpi` (sotaque dourado do Trade), operações como `.dtable`, diário/linha do tempo com a linguagem `.card`. **Manter o aviso honesto de amostra pequena** e todas as métricas.

- [ ] **Step 3: Regressão** — `node dev/testar.mjs` verde.

- [ ] **Step 4: Browser** — `http://localhost:8123/portfolio/trade.html` com dados de exemplo: console limpo, KPIs de banca no novo estilo, diário e timeline legíveis. Screenshot.

- [ ] **Step 5: Commit**

```bash
git add portfolio/portfolio.js portfolio/portfolio.css
git commit -m "Portfolio: Trade restilizado (fase 1)"
```

---

## Task 6: Limpeza, cache e verificação final

**Files:**
- Modify: `portfolio/portfolio.css` (remover CSS morto da lateral, se ainda houver)
- Modify: `portfolio/*.html` e demais (recarimbar via script)

- [ ] **Step 1: Varredura de CSS morto** — grep por `\.sb\b`, `sb-logo`, `sb-item`, `sb-foot`, `sb-plan`, `sb-link`, `mob-top`, `mob-burger`, `snav` em `portfolio/portfolio.css` e `portfolio.js`. Remover o que sobrou da lateral. **Confirmar que `.sb-sec` permanece** (é rótulo de seção dos módulos).

- [ ] **Step 2: Regressão final** — `node dev/testar.mjs` verde.

- [ ] **Step 3: Recarimbar caches** — `node dev/versionar.mjs` (atualiza os `?v=` de CSS/JS nas páginas).

- [ ] **Step 4: Passada final no browser** — as 4 páginas, desktop e mobile (`resize_window` 375px): header no topo, abas em scroll no mobile, console limpo em todas, avatar/menu funcionando. Screenshots antes/depois das 4 para o dono.

- [ ] **Step 5: Commit**

```bash
git add -A portfolio/ docs/ *.html
git commit -m "Portfolio: limpeza de CSS da lateral + recarimba caches (fase 1)"
```

- [ ] **Step 6: Parar e pedir o "vai" do dono para o deploy** — NÃO fazer merge na main sozinho. Apresentar os antes/depois e perguntar se pode publicar.

---

## Self-Review

**Cobertura do spec:**
- Shell topo + menu avatar + mobile → Task 1 ✅
- Dashboard restilizado (herói, KPIs, gráfico, carteiras sem caixa) → Task 2 ✅
- HOLD/DeFi/Trade restilizados → Tasks 3, 4, 5 ✅
- RWA/Meta como "breve" → Task 1 (abas desativadas) ✅
- Fora de escopo (store/cálculo intactos; sem caixa) → Global Constraints + passos de regressão em toda tarefa ✅
- Risco `.sb-sec` → citado nas Tasks 1, 3, 4, 6 ✅
- Verificação (testar.mjs + console + versionar) → toda tarefa + Task 6 ✅
- Deploy gated → Task 6 Step 6 ✅

**Placeholders:** nenhum "TBD/TODO". As Tasks 3-5 pedem "ler a tela inteira" antes de aplicar porque o código exato de cada `v*` (400-600 linhas) é lido em contexto na hora — os anchors (linhas, classes, seletores a preservar) estão dados. Não há código inventado para tela não lida.

**Consistência de tipos/nomes:** `P.shell(active)` mantém assinatura e todos os IDs (`#pgTitle`, `#pg`, `#cartSel`, `#mUsd/mBrl`, `#sbSync`, `#sbClear`, `#mdl*`). Classes de componente (`.hero/.kpi/.wcard/.dtable`) definidas na Task 2 e reusadas nas 3-5 com os mesmos nomes. Seletores que outros handlers dependem (`.tab` do DeFi, `.sb-sec`) preservados.
