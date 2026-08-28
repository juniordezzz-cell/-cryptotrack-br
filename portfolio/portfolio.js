/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  MUNDODEFI · PORTFÓLIO — CAMADA DE INTERFACE (portfolio.js)           ║
   ║  As 4 páginas (index/hold/defi/trade) chamam este arquivo.            ║
   ║                                                                      ║
   ║  Este arquivo NÃO faz conta de dinheiro. Toda matemática mora em     ║
   ║  portfolio-core.js (puro, testado no Node) e toda persistência em    ║
   ║  portfolio-store.js. Aqui só tem tela.                               ║
   ║                                                                      ║
   ║  Regras de plano: veja MDF_PLANOS logo abaixo.                       ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
window.MDF_PLANOS = {
  gratis: {
    nome: 'Grátis',
    carteiras: 1,          // ÚNICA trava do grátis: 1 carteira
    historico: 999999,     // histórico completo (sem trava)
    graficosAvancados: true,
    exportar: false        // exportar CSV é exclusivo PRO
  },
  pro: {
    nome: 'PRO',           // R$ 19,90 — carro-chefe
    carteiras: 9999,
    historico: 999999,
    graficosAvancados: true,
    exportar: true
  },
  /* A mentoria (Premium, R$ 49,90) é um SERVIÇO, não um nível de software.
     Quem assina mentoria tem exatamente o acesso do PRO na plataforma.
     Este alias existe para que plano:"premium" vindo do Firestore continue
     funcionando. Não crie recursos exclusivos aqui. */
  premium: {
    nome: 'PRO',
    carteiras: 9999,
    historico: 999999,
    graficosAvancados: true,
    exportar: true
  }
};

(function () {
'use strict';
var P = window.P = {};
var C = window.PCore;
var Store = window.PStore;
var CG = 'https://api.coingecko.com/api/v3';

/* ═══════════ util ═══════════ */
P.uid = C.uid;
P.today = C.hoje;
P.esc = function (s) {
  return String(s == null ? '' : s).replace(/[<>&"']/g, function (c) {
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c];
  });
};
P.dBR = function (iso) { if (!iso) return '—'; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
function cget(k) { try { var o = JSON.parse(localStorage.getItem(k)); if (o && (Date.now() - o.t) < o.ttl) return o.d; } catch (e) {} return null; }
function cset(k, d, ttl) { try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), ttl: ttl, d: d })); } catch (e) {} }
function jfetch(url, tries) {
  tries = tries || 3;
  return new Promise(function (res, rej) {
    (function go(i) {
      fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(res)
        .catch(function (e) { if (i >= tries - 1) return rej(e); setTimeout(function () { go(i + 1); }, 1200 * Math.pow(2, i)); });
    })(0);
  });
}

/* ═══════════ estado ═══════════ */
P.st = null;
P.precos = {};
P.precosEm = null;
P.precosFalhou = false;

P.load = function () { P.st = Store.carregar(); };
P.save = function () { Store.salvar(); };
P.clearAll = function () {
  Store.limpar().then(function () { location.reload(); });
};

/* ═══════════ moeda ═══════════ */
P.rate = 1;
P.money = function (v, dec) {
  if (v == null || isNaN(v)) return '—';
  var brl = P.st.cfg.moeda === 'brl';
  var x = brl ? v * P.rate : v;
  if (dec == null) dec = Math.abs(x) >= 1000 ? 0 : 2;
  /* o sinal vem antes do símbolo: -$526, e não $-526 */
  return (x < 0 ? '-' : '') + (brl ? 'R$ ' : '$')
    + Math.abs(x).toLocaleString(brl ? 'pt-BR' : 'en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
};
/* O separador decimal acompanha a moeda escolhida. "R$ 3.742,11" ao lado de
   "-1.99%" é o tipo de detalhe que faz um número certo parecer errado. */
P.pct = function (v) {
  if (v == null || isNaN(v)) return '—';
  var t = (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
  return (P.st && P.st.cfg.moeda === 'brl') ? t.replace('.', ',') : t;
};
P.cls = function (v) { return v >= 0 ? 'up' : 'down'; };
P.quandoInformado = function (d) {
  if (d == null) return '';
  if (d <= 0) return ', informado hoje';
  if (d === 1) return ', informado ontem';
  return ', informado há ' + d + ' dias';
};
P.rt = function () { return P.st.cfg.moeda === 'brl' ? P.rate : 1; };
P.loadRate = function () {
  if (P.st.cfg.moeda !== 'brl') return Promise.resolve();
  var c = cget('mdf.brl'); if (c) { P.rate = c; return Promise.resolve(); }
  return jfetch(CG + '/simple/price?ids=tether&vs_currencies=brl', 2).then(function (d) {
    P.rate = (d.tether && d.tether.brl) || 5; cset('mdf.brl', P.rate, 10 * 60 * 1000);
  }).catch(function () { P.rate = 5; });
};

/* Preços ao vivo. Guardamos QUANDO chegaram: mostrar patrimônio calculado
   com preço velho sem avisar foi um dos problemas do v1. */
P.loadPrices = function () {
  var ids = [];
  P.st.ativos.forEach(function (a) { if (a.cg && ids.indexOf(a.cg) < 0) ids.push(a.cg); });
  /* Os tokens das pools também precisam de cotação: sem eles não dá para
     calcular impermanent loss. */
  P.st.pools.forEach(function (x) {
    if (!x.il) return;
    [x.il.a, x.il.b].forEach(function (t) {
      if (t && t.cg && ids.indexOf(t.cg) < 0) ids.push(t.cg);
    });
  });
  if (!ids.length) return Promise.resolve();
  var k = 'mdf.px.' + ids.slice().sort().join(',');
  var c = cget(k);
  if (c) { P.precos = c.px; P.precosEm = c.em; return Promise.resolve(); }
  return jfetch(CG + '/simple/price?ids=' + ids.join(',') + '&vs_currencies=usd', 2)
    .then(function (d) {
      var px = {};
      Object.keys(d).forEach(function (id) { if (d[id] && d[id].usd) px[id] = d[id].usd; });
      P.precos = px; P.precosEm = new Date().toISOString(); P.precosFalhou = false;
      cset(k, { px: px, em: P.precosEm }, 5 * 60 * 1000);
      /* espelha no ativo para servir de última cotação conhecida offline */
      P.st.ativos.forEach(function (a) { if (px[a.cg]) { a.last = px[a.cg]; a.lastAt = P.precosEm; } });
      /* idem para os tokens das pools: sem isso o IL some quando a API falha */
      P.st.pools.forEach(function (x) {
        if (!x.il) return;
        [x.il.a, x.il.b].forEach(function (t) { if (t && px[t.cg]) t.pxAtual = px[t.cg]; });
      });
      P.save();
    })
    .catch(function () { P.precosFalhou = true; });
};

/* ═══════════ atalhos de cálculo (delegam ao núcleo) ═══════════ */
P.cart = function () { return P.st.cfg.cart || 'all'; };
P.totais = function () { return C.totais(P.st, P.precos, P.cart()); };
P.posicoes = function () { return C.posicoes(P.st, P.precos, P.cart()); };
P.poolsFiltradas = function () {
  var c = P.cart();
  return P.st.pools.filter(function (p) { return c === 'all' || p.cart === c; });
};
P.lendFiltrado = function () {
  var c = P.cart();
  return P.st.lend.filter(function (l) { return c === 'all' || l.cart === c; });
};
P.tradeResumo = function () { return C.tradeResumo(P.st, P.cart()); };
P.xirr = function () { return C.xirr(C.fluxos(P.st, P.precos, P.cart())); };
P.nomeCart = function (id) {
  var c = P.st.carteiras.filter(function (x) { return x.id === id; })[0];
  return c ? c.nome : '—';
};

/* ═══════════ plano ═══════════ */
P.PLAN_LBL = { gratis: 'Grátis', pro: 'PRO', premium: 'PRO' };
P.planoAtual = 'gratis';
P.plan = function () { return window.MDF_PLANOS[P.planoAtual] || window.MDF_PLANOS.gratis; };
P.isFree = function () { return P.planoAtual === 'gratis'; };
P.limCart = function () { return P.plan().carteiras; };
P.histLim = function () { return P.plan().historico; };
P.canExport = function () { return !!P.plan().exportar; };

/* O Firestore manda. Enquanto o auth não responde, tratamos como Grátis —
   falhar para o lado restritivo é o comportamento seguro. */
P.syncPlano = function () {
  var A = window.NexusAuth;
  var plano = (A && A.ready && A.user && A.plano) ? A.plano : 'gratis';
  if (!window.MDF_PLANOS[plano]) plano = 'gratis';
  if (P.planoAtual === plano) return false;
  P.planoAtual = plano;
  return true;
};

P.upsell = function () {
  P.modal('Recurso do plano PRO',
    '<div class="up-hero"><div class="big">⚡</div>'
    + '<h3>Vire PRO e desbloqueie</h3>'
    + '<p>O plano PRO libera carteiras ilimitadas, gráficos avançados e exportação dos seus dados.</p></div>'
    + '<div class="up-list">'
    + '<div class="up-item"><span>✓</span>Carteiras ilimitadas</div>'
    + '<div class="up-item"><span>✓</span>Gráficos avançados</div>'
    + '<div class="up-item"><span>✓</span>Histórico completo + exportação (CSV)</div>'
    + '</div>',
    { footer: '<a href="/planos.html" class="btn btn-p">Ver planos</a>' });
};

/* ═══════════ modal ═══════════ */
P.modal = function (title, body, opts) {
  opts = opts || {};
  var bg = document.getElementById('mdlBg');
  document.getElementById('mdlTitle').innerHTML = title;
  document.getElementById('mdlBody').innerHTML = body;
  document.getElementById('mdlFoot').innerHTML = (opts.footer || '') + '<button class="btn btn-g" onclick="P.closeModal()">Fechar</button>';
  document.getElementById('mdlBox').className = 'mdl' + (opts.wide ? ' wide' : '');
  bg.classList.add('on');
  var f = document.querySelector('#mdlBody input,#mdlBody select,#mdlBody textarea');
  if (f) setTimeout(function () { f.focus(); }, 40);
};
P.closeModal = function () { document.getElementById('mdlBg').classList.remove('on'); };
P.val = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };
P.num = function (id) { var v = parseFloat(String(P.val(id)).replace(',', '.')); return isNaN(v) ? 0 : v; };

/* ═══════════ exportar CSV ═══════════ */
P.exportCSV = function (nome, linhas) {
  if (!P.canExport()) return P.upsell();
  var csv = linhas.map(function (r) {
    return r.map(function (c) { var s = String(c == null ? '' : c); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';');
  }).join('\n');
  var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome + '.csv'; a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
};
P.exportBtn = function (id) {
  return '<button class="btn btn-g btn-sm" data-exp="' + id + '">' + (P.canExport() ? '⬇ Exportar' : '🔒 Exportar') + '</button>';
};

/* ═══════════ gráficos ═══════════ */
var CHARTS = {};
P._drawn = {};
P.mkChart = function (id, cfg) {
  var el = document.getElementById(id); if (!el) return;
  if (CHARTS[id]) CHARTS[id].destroy();
  if (P._drawn[id]) { cfg.options = cfg.options || {}; cfg.options.animation = false; }
  CHARTS[id] = new Chart(el, cfg); P._drawn[id] = true;
};
P.gTicks = function () { return { color: '#5C6478', font: { family: 'Space Mono', size: 10 } }; };
P.gGrid = function () { return { color: 'rgba(255,255,255,.05)' }; };
P.moneyCb = function () {
  var brl = P.st.cfg.moeda === 'brl', pre = brl ? 'R$ ' : '$';
  return function (c) { return ' ' + pre + Math.round(c.raw).toLocaleString(brl ? 'pt-BR' : 'en-US'); };
};
P.grafCard = function (id, title, sm, extra) {
  return '<div class="card"><div class="card-hd"><div class="card-title">' + title + '</div>'
    + (extra ? '<div class="right">' + extra + '</div>' : '') + '</div>'
    + '<div class="card-bd"><div class="chart-box' + (sm ? ' sm' : '') + '"><canvas id="' + id + '"></canvas></div></div></div>';
};
P.countUps = function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('[data-cv]').forEach(function (el) {
    var v = parseFloat(el.dataset.cv); if (isNaN(v)) return;
    var t = el.dataset.t || 'm', fin = el.innerHTML, s = null, D = 600;
    function fmt(n) { return t === 'm' ? P.money(n) : t === 'p' ? P.pct(n) : Math.round(n).toString(); }
    function step(now) {
      if (!s) s = now; var k = Math.min(1, (now - s) / D); k = 1 - Math.pow(1 - k, 3);
      if (k < 1) { el.textContent = fmt(v * k); requestAnimationFrame(step); } else el.innerHTML = fin;
    }
    requestAnimationFrame(step);
  });
};

/* ═══════════ componentes reutilizados ═══════════ */
P.card = function (lbl, valor, cor, sub, cv, tipo) {
  return '<div class="mc"><div class="mc-accent" style="background:' + cor + '"></div>'
    + '<div class="mc-lbl">' + lbl + '</div>'
    + '<div class="mc-val ' + (cv != null && tipo !== 'n' ? P.cls(cv) : '') + '"'
    + (cv != null ? ' data-cv="' + cv + '"' + (tipo ? ' data-t="' + tipo + '"' : '') : '') + '>' + valor + '</div>'
    + (sub ? '<div class="mc-sub">' + sub + '</div>' : '') + '</div>';
};
P.cardNeutro = function (lbl, valor, cor, sub, cv, tipo) {
  return '<div class="mc"><div class="mc-accent" style="background:' + cor + '"></div>'
    + '<div class="mc-lbl">' + lbl + '</div>'
    + '<div class="mc-val"' + (cv != null ? ' data-cv="' + cv + '"' + (tipo ? ' data-t="' + tipo + '"' : '') : '') + '>' + valor + '</div>'
    + (sub ? '<div class="mc-sub">' + sub + '</div>' : '') + '</div>';
};

/* Estado vazio de verdade: explica o que fazer e oferece um caminho.
   O v1 no lugar disso injetava carteiras e ativos falsos que a pessoa
   confundia com os próprios. */
P.vazio = function (titulo, texto, botao) {
  return '<div class="zero"><div class="zero-ico">◎</div>'
    + '<h3>' + titulo + '</h3><p>' + texto + '</p>'
    + (botao || '') + '</div>';
};

/* Aviso quando o preço na tela é velho ou falhou. */
P.avisoPrecos = function () {
  if (P.precosFalhou) {
    return '<div class="warn">⚠ Não foi possível atualizar as cotações agora. Os valores abaixo usam a última cotação conhecida.</div>';
  }
  if (!P.precosEm) return '';
  var min = Math.round((Date.now() - Date.parse(P.precosEm)) / 60000);
  if (min < 10) return '';
  return '<div class="warn">Cotações de ' + min + ' minutos atrás.</div>';
};

/* Indicador de onde os dados estão salvos. */
P.statusSync = function () {
  var s = Store.status;
  if (s === 'nuvem') return '<span class="sync ok" title="Salvo na sua conta">☁ Salvo</span>';
  if (s === 'salvando') return '<span class="sync">⟳ Salvando…</span>';
  if (s === 'erro') return '<span class="sync err" title="' + P.esc(Store.ultimoErro || '') + '">⚠ Erro ao sincronizar</span>';
  return '<span class="sync warn-s" title="Entre na sua conta para salvar na nuvem">◍ Só neste navegador</span>';
};

/* ═══════════ SHELL ═══════════ */
P.shell = function (active) {
  var e = P.esc;
  var items = [['dash', '📊', 'Dashboard', '/portfolio/index.html'], ['hold', '💎', 'HOLD', '/portfolio/hold.html'],
               ['defi', '🌊', 'DeFi', '/portfolio/defi.html'], ['trade', '⚡', 'Trade', '/portfolio/trade.html']];
  var soon = [['rwa', '🏛', 'RWA'], ['meta', '🎯', 'Meta']];
  /* O plano é apenas EXIBIDO aqui. A fonte de verdade é o Firestore, lido
     por nexus-auth.js. Nunca torne isto editável pelo usuário. */
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

  document.getElementById('app').innerHTML = header + main;
  document.body.dataset.view = active;

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

P.atualizaSync = function () {
  var el = document.getElementById('sbSync');
  if (el) el.innerHTML = P.statusSync();
};

/* ═══════════ BOOT ═══════════ */
P.boot = function (active, renderFn) {
  P.load();
  P.render = renderFn;
  P.syncPlano();
  P.shell(active);
  Store.aoMudar(P.atualizaSync);

  P.loadRate().then(function () {
    renderFn();
    P.loadPrices().then(function () {
      renderFn();
      Store.snapshotDiario(C.totais(P.st, P.precos, 'all'));
    });
  });

  /* quando o Firebase responde: aplica plano e reconcilia os dados */
  document.addEventListener('nexus-auth-changed', function () {
    var mudouPlano = P.syncPlano();
    var A = window.NexusAuth;
    var uid = (A && A.user) ? A.user.uid : null;
    if (uid && Store.uid !== uid) {
      Store.entrar(uid).then(function (st) {
        P.st = st;
        P.shell(active); renderFn();
        P.loadPrices().then(function () {
          renderFn();
          Store.snapshotDiario(C.totais(P.st, P.precos, 'all'));
        });
      });
    } else if (!uid && Store.uid) {
      Store.sair(); P.shell(active); renderFn();
    } else if (mudouPlano) {
      P.shell(active); renderFn();
    }
  });
};

/* ═══════════ CTA de planos ═══════════ */
P.planosCTA = function () {
  if (!P.isFree()) return '';
  return '<div class="plans-cta">'
    + '<div class="pc-card"><div class="pc-tag">⚡ PRO</div><div class="pc-price">R$ 19,90 <small>/mês</small></div>'
    + '<p>Carteiras ilimitadas, gráficos avançados e exportação dos seus dados.</p>'
    + '<a href="/planos.html" class="btn btn-p" style="width:100%">Assinar PRO</a></div>'
    + '</div>';
};

/* ═══════════ carteiras ═══════════ */
P.formCarteira = function (depois) {
  P.modal('Nova carteira',
    '<div class="fg"><label>Nome da carteira</label><input id="fNome" placeholder="Ex: Phantom, Rabby, Ledger…"></div>'
    + '<div class="fhint">Carteiras servem para separar seu patrimônio por origem. Você pode filtrar tudo por elas depois.</div>',
    { footer: '<button class="btn btn-p" id="okCart">Salvar</button>' });
  document.getElementById('okCart').onclick = function () {
    var n = P.val('fNome'); if (!n) return;
    P.st.carteiras.push({ id: C.uid(), nome: n });
    P.save(); P.closeModal();
    if (depois) depois(); else { P.shell(document.body.dataset.view); P.render(); }
  };
};
P.precisaCarteira = function (depois) {
  if (P.st.carteiras.length) return false;
  P.formCarteira(function () { P.shell(document.body.dataset.view); P.render(); if (depois) depois(); });
  return true;
};
P.optCarteiras = function (sel) {
  return P.st.carteiras.map(function (c) {
    return '<option value="' + c.id + '"' + (sel === c.id ? ' selected' : '') + '>' + P.esc(c.nome) + '</option>';
  }).join('');
};

/* ══════════════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════════════ */
P.saud = function () { var h = new Date().getHours(); return h < 6 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
P.periodo = '30d';

P.vDash = function () {
  var e = P.esc, T = P.totais();
  document.getElementById('pgTitle').textContent = P.saud() + ' 👋';
  document.getElementById('pgSub').textContent = 'Visão consolidada de todo o seu patrimônio cripto';
  document.getElementById('btnAdd').onclick = function () {
    P.modal('Adicionar', '<div class="up-list" style="margin-top:0">'
      + '<a class="up-item" href="/portfolio/hold.html"><span>💎</span>Compra ou venda de um ativo</a>'
      + '<a class="up-item" href="/portfolio/defi.html"><span>🌊</span>Pool de liquidez ou lending</a>'
      + '<a class="up-item" href="/portfolio/trade.html"><span>⚡</span>Operação de trade</a></div>');
  };

  if (T.vazio) {
    document.getElementById('pg').innerHTML = P.vazio(
      'Seu portfólio começa aqui',
      'Registre sua primeira compra e o MundoDeFi passa a calcular patrimônio, preço médio, lucro realizado e não realizado — atualizados com a cotação do mercado.',
      '<div class="zero-acts">'
      + '<a class="btn btn-p" href="/portfolio/hold.html">Registrar uma compra</a>'
      + '<button class="btn btn-g" id="btnExemplo">Ver com dados de exemplo</button>'
      + '</div>'
      + '<div class="zero-note">Os dados de exemplo são identificados como tais e você pode apagá-los a qualquer momento.</div>'
    ) + P.planosCTA();
    var be = document.getElementById('btnExemplo');
    if (be) be.onclick = P.carregarExemplo;
    return;
  }

  var C = window.PCore;
  var conc = C.concentracao(P.st, P.precos, P.cart());
  var contrib = C.contribuicao(P.st, P.precos, P.cart());
  var xirr = P.xirr();
  var serie = C.serie(P.st, P.periodo);
  var html = P.avisoPrecos();

  /* ═══ HERÓI: patrimônio total, não realizado e realizado subordinado ═══
     O número que a pessoa veio ver primeiro, seguido do que está em
     aberto agora — o realizado fica subordinado porque já é passado. */
  html += '<div class="hero">'
    + '<div><div class="mc-lbl">Patrimônio total</div>'
    + '<div class="hero-big mono" data-cv="' + T.patrimonio + '" data-t="m">' + P.money(T.patrimonio) + '</div>'
    + '<div class="mc-sub">HOLD + DeFi + Trade</div></div>'
    + '<div style="text-align:right">'
    + '<div class="mc-lbl">Não realizado</div>'
    + '<div class="mc-val ' + P.cls(T.naoRealizado) + '" data-cv="' + T.naoRealizado + '" data-t="m">' + P.money(T.naoRealizado) + '</div>'
    + '<div class="mc-sub"><span class="' + P.cls(T.rentAberta) + '">' + P.pct(T.rentAberta) + '</span> sobre o investido'
    + ' · realizado: <b class="' + P.cls(T.realizado) + '">' + P.money(T.realizado) + '</b></div>'
    + '</div></div>';

  /* ═══ KPIS: os 4 pilares do patrimônio ═══ */
  html += '<div class="kpis">'
    + '<div class="kpi k-hold"><div class="mc-lbl">HOLD</div>'
    + '<div class="kpi-v" data-cv="' + T.hold.valor + '" data-t="m">' + P.money(T.hold.valor) + '</div>'
    + '<div class="mc-sub">investido: ' + P.money(T.hold.custo) + '</div></div>'
    + '<div class="kpi k-defi"><div class="mc-lbl">DeFi</div>'
    + '<div class="kpi-v" data-cv="' + T.defi.valor + '" data-t="m">' + P.money(T.defi.valor) + '</div>'
    + '<div class="mc-sub">taxas coletadas: ' + P.money(T.defi.taxas) + '</div></div>'
    + '<div class="kpi k-trade"><div class="mc-lbl">Trade</div>'
    + '<div class="kpi-v" data-cv="' + T.trade.valor + '" data-t="m">' + P.money(T.trade.valor) + '</div>'
    + '<div class="mc-sub">resultado: <span class="' + P.cls(T.trade.realizado) + '">' + P.money(T.trade.realizado) + '</span></div></div>'
    + '<div class="kpi k-ret"><div class="mc-lbl">Retorno</div>'
    + '<div class="kpi-v ' + P.cls(T.resultadoTotal) + '" data-cv="' + T.resultadoTotal + '" data-t="m">' + P.money(T.resultadoTotal) + '</div>'
    + '<div class="mc-sub">' + (xirr == null ? 'sem XIRR — precisa de mais histórico'
        : '<span class="' + P.cls(xirr) + '">' + P.pct(xirr) + '</span> ao ano (XIRR)') + '</div></div>'
    + '</div>';

  /* ═══ EVOLUÇÃO ═══ */
  var per = [['7d', '7D'], ['30d', '30D'], ['90d', '90D'], ['ytd', 'YTD'], ['1a', '1A'], ['tudo', 'Tudo']];
  var segs = '<div class="seg seg-sm">' + per.map(function (p) {
    return '<button data-per="' + p[0] + '" class="' + (P.periodo === p[0] ? 'on' : '') + '">' + p[1] + '</button>';
  }).join('') + '</div>';

  var varTxt = serie.suficiente
    ? '<span class="' + P.cls(serie.variacao) + '">' + P.money(serie.variacao) + ' (' + P.pct(serie.variacaoPct) + ')</span> no período'
    : '';
  html += '<div class="card"><div class="card-hd"><div><div class="card-title">Evolução do patrimônio</div>'
    + (varTxt ? '<div class="card-sub">' + varTxt + '</div>' : '')
    + '</div><div class="right">' + segs + '</div></div>'
    + '<div class="card-bd">' + (serie.suficiente
        ? '<div class="chart-box"><canvas id="chEvo"></canvas></div>'
        /* estado vazio discreto: não precisa de tela cheia pra dizer "volte amanhã" */
        : '<div class="empty">Ainda não há histórico — o gráfico se forma a partir de um registro por dia do seu patrimônio. Volte amanhã e o primeiro trecho da curva já aparece.</div>')
    + '</div></div>';

  /* ═══ carteiras: total + % do patrimônio, sem caixa/investido ═══ */
  var patTotal = T.patrimonio;
  var wcards = P.st.carteiras.map(function (c) {
    var t = C.totais(P.st, P.precos, c.id);
    var pctPat = patTotal > 0 ? (t.patrimonio / patTotal * 100) : 0;
    return '<div class="wcard"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px">'
      + '<span style="font-weight:600">👛 ' + e(c.nome) + '</span>'
      + '<span class="mono" style="font-weight:700">' + P.money(t.patrimonio) + '</span></div>'
      + '<div class="wcard-bar"><span style="width:' + pctPat.toFixed(1) + '%"></span></div>'
      + '<div class="mc-sub">' + pctPat.toFixed(1) + '% do patrimônio</div></div>';
  }).join('');

  html += '<div class="card"><div class="card-hd"><div class="card-title">Carteiras</div>'
    + '<div class="right"><button class="btn btn-g btn-sm" id="btnCart">+ Nova carteira</button></div></div>'
    + '<div class="card-bd"><div class="wcards">' + (wcards || '<div class="empty">Nenhuma carteira ainda</div>') + '</div></div></div>';

  /* ═══ ONDE ESTÁ MEU RISCO ═══
     Barra empilhada no lugar do donut: com 8 posições o donut vira um
     anel de fatias finas que ninguém compara. A barra mantém a leitura. */
  html += '<div class="grid2b">' + P.blocoConcentracao(conc) + P.blocoContribuicao(contrib) + '</div>';

  /* ═══ últimas movimentações ═══ */
  var ev = P.eventos(), lim = Math.min(P.histLim(), 8);
  var evH = ev.slice(0, lim).map(function (x) {
    return '<div class="tl-item"><span class="tl-date">' + P.dBR(x.dt) + '</span><span class="tl-txt">' + x.txt + '</span></div>';
  }).join('');

  html += '<div class="card"><div class="card-hd"><div class="card-title">Últimas movimentações</div>'
    + '<div class="right"><button class="btn btn-g btn-sm" id="btnExtrato">Ver extrato →</button></div></div>'
    + '<div class="card-bd" style="padding:.6rem 1.15rem"><div class="tl">' + (evH || '<div class="empty">Sem movimentações</div>') + '</div></div></div>';

  html += P.tabelaAtivos(P.posicoes(), true);
  html += P.planosCTA();
  document.getElementById('pg').innerHTML = html;

  document.getElementById('btnCart').onclick = function () {
    if (P.st.carteiras.length >= P.limCart()) return P.upsell();
    P.formCarteira();
  };
  document.getElementById('btnExtrato').onclick = P.verExtrato;
  document.querySelectorAll('[data-per]').forEach(function (b) {
    b.onclick = function () { P.periodo = b.dataset.per; P.render(); };
  });
  /* clique numa linha de ativo abre o detalhe */
  document.querySelectorAll('[data-ativo]').forEach(function (el) {
    el.onclick = function () { P.verAtivo(el.dataset.ativo); };
  });

  /* ═══ gráficos ═══ */
  var r = P.rt(), brl = P.st.cfg.moeda === 'brl', pre = brl ? 'R$ ' : '$';
  if (serie.suficiente) {
    P.mkChart('chEvo', {
      type: 'line',
      data: {
        labels: serie.pontos.map(function (s) { var p = s.dt.split('-'); return p[2] + '/' + p[1]; }),
        datasets: [{
          data: serie.pontos.map(function (s) { return Math.round(s.pat * r); }),
          borderColor: '#22D3EE', borderWidth: 2.2, pointRadius: 0, pointHoverRadius: 4,
          pointHoverBackgroundColor: '#22D3EE', tension: .35, fill: true,
          backgroundColor: function (c) {
            var ch = c.chart, g = ch.ctx.createLinearGradient(0, 0, 0, ch.height || 300);
            g.addColorStop(0, 'rgba(34,211,238,.30)'); g.addColorStop(1, 'rgba(34,211,238,0)'); return g;
          }
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: P.moneyCb() } } },
        scales: { x: { grid: { display: false }, ticks: P.gTicks() },
                  y: { grid: P.gGrid(), ticks: Object.assign(P.gTicks(), { callback: function (v) { return pre + (Math.abs(v) >= 1000 ? (v / 1000) + 'k' : v); } }) } }
      }
    });
  }

  /* Barra divergente: ganho para a direita, perda para a esquerda.
     Responde "o que está me dando dinheiro" numa olhada. */
  var top = contrib.linhas.slice(0, 8);
  if (top.length) {
    P.mkChart('chContrib', {
      type: 'bar',
      data: {
        labels: top.map(function (l) { return l.nome; }),
        datasets: [{
          data: top.map(function (l) { return Math.round(l.total * r); }),
          backgroundColor: top.map(function (l) { return l.total >= 0 ? 'rgba(20,241,149,.7)' : 'rgba(255,77,106,.7)'; }),
          borderRadius: 5, borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: P.moneyCb() } } },
        scales: { x: { grid: P.gGrid(), ticks: Object.assign(P.gTicks(), { callback: function (v) { return pre + v; } }) },
                  y: { grid: { display: false }, ticks: P.gTicks() } }
      }
    });
  }
  P.countUps();
};

/* ═══════════ BLOCO: onde está meu risco ═══════════ */
P.blocoConcentracao = function (c) {
  var e = P.esc;
  if (!c.n) return '<div class="card"><div class="card-hd"><div class="card-title">Onde está meu risco</div></div>'
    + '<div class="card-bd"><div class="empty">Sem posições abertas</div></div></div>';

  var CORES = ['#9945FF', '#00E5FF', '#14F195', '#F5B614', '#FF4D6A', '#4D9FFF', '#B388FF', '#5FD0FF'];
  var top = c.linhas.slice(0, 7);
  var resto = c.linhas.slice(7);
  var restoPct = resto.reduce(function (s, l) { return s + l.pct; }, 0);

  var barra = top.map(function (l, i) {
    return '<span class="cc-seg" style="width:' + l.pct.toFixed(2) + '%;background:' + CORES[i % CORES.length] + '" title="' + e(l.nome) + ': ' + l.pct.toFixed(1) + '%"></span>';
  }).join('') + (restoPct > 0 ? '<span class="cc-seg" style="width:' + restoPct.toFixed(2) + '%;background:var(--mut2,#5D6880)" title="Outros: ' + restoPct.toFixed(1) + '%"></span>' : '');

  var legenda = top.map(function (l, i) {
    return '<div class="cc-item"><span class="cc-dot" style="background:' + CORES[i % CORES.length] + '"></span>'
      + '<span class="cc-nome">' + e(l.nome) + (l.stable ? ' <small class="cc-tag">caixa</small>' : '') + '</span>'
      + '<span class="cc-pct">' + l.pct.toFixed(1) + '%</span>'
      + '<span class="cc-val">' + P.money(l.valor) + '</span></div>';
  }).join('') + (resto.length ? '<div class="cc-item"><span class="cc-dot" style="background:var(--mut2,#5D6880)"></span>'
      + '<span class="cc-nome mut">+ ' + resto.length + ' posição(ões)</span>'
      + '<span class="cc-pct">' + restoPct.toFixed(1) + '%</span><span class="cc-val"></span></div>' : '');

  /* O aviso vem do HHI, não de "quantos ativos você tem" — dez ativos com
     um valendo 80% é uma carteira concentrada. */
  var AVISO = {
    unica:   ['info',    'Você tem uma posição só', 'Seu resultado é o resultado dela. Não é errado — só significa que diversificação ainda não se aplica aqui.'],
    critica: ['alerta',  'Concentração crítica', c.maior.nome + ' é ' + c.maior.pct.toFixed(0) + '% de tudo. Uma queda de 50% nela derruba metade da sua carteira.'],
    alta:    ['atencao', 'Concentração alta', c.maior.nome + ' pesa ' + c.maior.pct.toFixed(0) + '% e o top 3 soma ' + c.top3Pct.toFixed(0) + '%. Se foi escolha, tudo bem; se foi acidente de valorização, vale rever.'],
    media:   ['info',    'Concentração moderada', 'O top 3 soma ' + c.top3Pct.toFixed(0) + '% do patrimônio.'],
    baixa:   ['ok',      'Bem distribuída', 'Nenhuma posição domina: a maior é ' + c.maior.pct.toFixed(0) + '%.']
  }[c.nivel];

  return '<div class="card"><div class="card-hd"><div><div class="card-title">Onde está meu risco</div>'
    + '<div class="card-sub">' + c.n + ' posições · caixa em stablecoin: ' + c.stablePct.toFixed(0) + '%</div></div>'
    + '<div class="right"><span class="hhi" title="Índice HHI: soma dos quadrados das participações. Mede concentração melhor que contar ativos — 10 ativos de 10% dão 1.000; 1 ativo de 100% dá 10.000.">HHI ' + Math.round(c.hhi) + '</span></div></div>'
    + '<div class="card-bd">'
    + '<div class="cc-bar">' + barra + '</div>'
    + '<div class="cc-lista">' + legenda + '</div>'
    + '<div class="cc-aviso nx-' + AVISO[0] + '"><b>' + AVISO[1] + '</b><p>' + AVISO[2] + '</p></div>'
    + '</div></div>';
};

/* ═══════════ BLOCO: o que está me dando dinheiro ═══════════ */
P.blocoContribuicao = function (c) {
  var e = P.esc;
  if (!c.linhas.length) return '<div class="card"><div class="card-hd"><div class="card-title">O que está me dando dinheiro</div></div>'
    + '<div class="card-bd"><div class="empty">Ainda sem resultado para atribuir</div></div></div>';

  var grupos = c.grupos.map(function (g) {
    return '<span class="cg-item"><span class="cg-nome">' + e(g.nome) + '</span>'
      + '<b class="' + P.cls(g.total) + '">' + P.money(g.total) + '</b></span>';
  }).join('');

  var nota = '';
  if (c.melhor && c.pior && c.melhor.nome !== c.pior.nome && c.pior.total < 0) {
    nota = '<div class="cc-aviso nx-info"><b>' + e(c.melhor.nome) + ' puxa, ' + e(c.pior.nome) + ' segura</b>'
      + '<p>' + e(c.melhor.nome) + ' contribuiu com ' + P.money(c.melhor.total)
      + ' e ' + e(c.pior.nome) + ' com ' + P.money(c.pior.total) + '. Vale checar se a tese do segundo ainda vale de pé.</p></div>';
  }

  return '<div class="card"><div class="card-hd"><div><div class="card-title">O que está me dando dinheiro</div>'
    + '<div class="card-sub">contribuição para o resultado, não peso na carteira</div></div></div>'
    + '<div class="card-bd">'
    + '<div class="cg-grupos">' + grupos + '</div>'
    + '<div class="chart-box sm"><canvas id="chContrib"></canvas></div>'
    + nota
    + '</div></div>';
};

/* ══════════════════════════════════════════════════════════════════
   DRILL-DOWN DE UM ATIVO
   O v1 mostrava uma linha de tabela e parava aí. Aqui dá para ver como
   a posição foi construída: cada transação, o custo médio evoluindo e
   o que já foi realizado em cada venda.
   ══════════════════════════════════════════════════════════════════ */
P.verAtivo = function (id) {
  var C = window.PCore, e = P.esc;
  var a = P.st.ativos.filter(function (x) { return x.id === id; })[0];
  if (!a) return;
  var p = C.posicao(P.st, id, P.precos[a.cg] != null ? P.precos[a.cg] : a.last);
  var movs = C.movsDe(P.st, { ref: id });

  var body = '<div class="mgrid mgrid-6" style="margin-bottom:1rem">'
    + '<div class="mc sm"><div class="mc-lbl">Quantidade</div><div class="mc-val">' + p.qtd.toLocaleString('pt-BR', { maximumFractionDigits: 8 }) + '</div></div>'
    + '<div class="mc sm"><div class="mc-lbl">Preço médio</div><div class="mc-val">' + P.money(p.custoMedio, 2) + '</div></div>'
    + '<div class="mc sm"><div class="mc-lbl">Preço atual</div><div class="mc-val">' + P.money(p.precoAtual, 2) + '</div></div>'
    + '<div class="mc sm"><div class="mc-lbl">Valor</div><div class="mc-val">' + P.money(p.valor) + '</div></div>'
    + '<div class="mc sm"><div class="mc-lbl">Não realizado</div><div class="mc-val ' + P.cls(p.naoRealizado) + '">' + P.money(p.naoRealizado)
    + '<small class="mc-pct">' + P.pct(p.naoRealizadoPct) + '</small></div></div>'
    + '<div class="mc sm"><div class="mc-lbl">Realizado</div><div class="mc-val ' + (p.realizado ? P.cls(p.realizado) : '') + '">' + P.money(p.realizado) + '</div></div>'
    + '</div>';

  if (p.alertas.length) {
    body += p.alertas.map(function (al) {
      return '<div class="warn">⚠ ' + P.dBR(al.dt) + ' — ' + e(al.txt) + '</div>';
    }).join('');
  }
  if (p.taxasPagas > 0) {
    body += '<div class="notice">Você já pagou ' + P.money(p.taxasPagas) + ' em taxas neste ativo. Elas entram no custo na compra e reduzem a receita na venda.</div>';
  }

  /* Reconstrói o custo médio transação a transação: é aqui que a pessoa
     entende POR QUE o preço médio dela é o que é. */
  var qtd = 0, custo = 0;
  var linhas = movs.map(function (m) {
    var antes = qtd > 0 ? custo / qtd : 0, desta = 0;
    if (m.tipo === 'compra') {
      qtd += m.qtd; custo += m.qtd * m.px + m.fee;
    } else {
      var q = Math.min(m.qtd, qtd);
      var baixa = antes * q;
      desta = (q * m.px - m.fee) - baixa;
      qtd -= q; custo -= baixa;
    }
    var medio = qtd > 0 ? custo / qtd : 0;
    return '<tr><td class="mono" style="color:var(--mut)">' + P.dBR(m.dt) + '</td>'
      + '<td><span class="badge ' + (m.tipo === 'compra' ? 'b-open' : 'b-closed') + '">' + (m.tipo === 'compra' ? 'Compra' : 'Venda') + '</span></td>'
      + '<td class="num mono">' + m.qtd + '</td>'
      + '<td class="num mono">' + P.money(m.px, 2) + '</td>'
      + '<td class="num mono">' + (m.fee ? P.money(m.fee, 2) : '—') + '</td>'
      + '<td class="num mono">' + qtd.toLocaleString('pt-BR', { maximumFractionDigits: 6 }) + '</td>'
      + '<td class="num mono">' + (medio ? P.money(medio, 2) : '—') + '</td>'
      + '<td class="num mono ' + (desta ? P.cls(desta) : 'mut') + '">' + (desta ? P.money(desta) : '—') + '</td></tr>';
  }).reverse().join('');

  body += '<div class="sb-sec" style="padding-left:0">Como esta posição foi construída</div>'
    + '<div class="tblw"><table style="min-width:720px"><thead><tr>'
    + '<th>Data</th><th>Tipo</th><th class="num">Qtd</th><th class="num">Preço</th><th class="num">Taxa</th>'
    + '<th class="num">Saldo</th><th class="num">Preço médio</th><th class="num">Realizado</th>'
    + '</tr></thead><tbody>' + (linhas || '<tr><td colspan="8"><div class="empty">Sem transações</div></td></tr>') + '</tbody></table></div>';

  P.modal(e(a.tk) + ' <span style="color:var(--mut2);font-weight:400;font-size:12px">' + e(P.nomeCart(a.cart)) + '</span>',
    body, { wide: true, footer: '<button class="btn btn-p" id="okAddTx">+ Transação</button>' });
  var b = document.getElementById('okAddTx');
  if (b) b.onclick = function () { P.closeModal(); P.formTx({ aid: id }); };
};

/* ══════════════════════════════════════════════════════════════════
   EXTRATO — todas as movimentações num lugar só
   Era o que faltava para o portfólio deixar de parecer planilha: um
   lugar onde a pessoa confere e corrige o que registrou.
   ══════════════════════════════════════════════════════════════════ */
P.extratoFiltro = 'todos';
P.verExtrato = function () {
  var C = window.PCore, e = P.esc;
  var grupos = [['todos', 'Tudo'], ['hold', 'HOLD'], ['defi', 'DeFi'], ['trade', 'Trade']];
  var filtro = P.extratoFiltro;
  var movs = C.movsDe(P.st, { cart: P.cart(), grupo: filtro === 'todos' ? null : filtro }).slice().reverse();

  var nome = {};
  P.st.ativos.forEach(function (a) { nome[a.id] = a.tk; });
  P.st.pools.forEach(function (x) { nome[x.id] = x.par; });
  P.st.lend.forEach(function (x) { nome[x.id] = x.plat; });

  var linhas = movs.slice(0, P.histLim()).map(function (m) {
    var t = C.TIPOS[m.tipo] || {};
    /* trade_res guarda o sinal em px porque usd é sempre positivo */
    var entra = m.tipo === 'trade_res' ? (m.px >= 0) : (t.sinal > 0 || t.sinal === 0);
    return '<tr><td class="mono" style="color:var(--mut)">' + P.dBR(m.dt) + '</td>'
      + '<td>' + e(t.lbl || m.tipo) + '</td>'
      + '<td><b>' + e(nome[m.ref] || m.nota || '—') + '</b></td>'
      + '<td class="num mono">' + (m.qtd != null ? m.qtd : '—') + '</td>'
      + '<td class="num mono ' + (entra ? 'up' : 'down') + '">' + (entra ? '+' : '−') + P.money(m.usd) + '</td>'
      + '<td class="num"><button class="btn-x" data-delmov="' + m.id + '" title="Excluir">×</button></td></tr>';
  }).join('');

  var abas = grupos.map(function (g) {
    return '<button class="tab' + (filtro === g[0] ? ' on' : '') + '" data-ex="' + g[0] + '">' + g[1] + '</button>';
  }).join('');

  P.modal('Extrato de movimentações',
    '<div class="tabs" style="margin-bottom:.9rem">' + abas
      + '<span style="margin-left:auto;font-size:12px;color:var(--mut2)">' + movs.length + ' movimentação(ões)</span></div>'
    + '<div class="tblw"><table style="min-width:640px"><thead><tr>'
    + '<th>Data</th><th>Tipo</th><th>Onde</th><th class="num">Qtd</th><th class="num">Valor</th><th></th>'
    + '</tr></thead><tbody>' + (linhas || '<tr><td colspan="6"><div class="empty">Nenhuma movimentação neste filtro</div></td></tr>')
    + '</tbody></table></div>',
    { wide: true, footer: P.exportBtn('extrato') });

  document.querySelectorAll('[data-ex]').forEach(function (b) {
    b.onclick = function () { P.extratoFiltro = b.dataset.ex; P.verExtrato(); };
  });
  document.querySelectorAll('[data-delmov]').forEach(function (b) {
    b.onclick = function () {
      if (!confirm('Excluir esta movimentação? O cálculo será refeito sem ela.')) return;
      P.st.mov = P.st.mov.filter(function (m) { return m.id !== b.dataset.delmov; });
      P.save(); P.render(); P.verExtrato();
    };
  });

  P.exporters = P.exporters || {};
  P.exporters.extrato = function () {
    var L = [['Data', 'Tipo', 'Onde', 'Quantidade', 'Preco USD', 'Valor USD', 'Taxa USD', 'Nota']];
    C.movsDe(P.st, { cart: P.cart() }).forEach(function (m) {
      var t = C.TIPOS[m.tipo] || {};
      L.push([m.dt, t.lbl || m.tipo, nome[m.ref] || '', m.qtd == null ? '' : m.qtd,
              m.px == null ? '' : m.px.toFixed(2), m.usd.toFixed(2), m.fee.toFixed(2), m.nota || '']);
    });
    P.exportCSV('mundodefi-extrato', L);
  };
};

/* Tabela de ativos compartilhada entre Dashboard e HOLD.
   Mostra realizado E não realizado — separados, sempre. */
P.tabelaAtivos = function (pos, compacta) {
  var e = P.esc;
  var abertas = pos.filter(function (p) { return p.qtd > 0; });
  var fechadas = pos.filter(function (p) { return p.qtd === 0; });

  var rows = abertas.map(function (p) {
    return '<tr class="tr-click" data-ativo="' + p.id + '"><td><div class="tk"><div class="tk-ic">' + e(p.tk.slice(0, 3)) + '</div><div><b>' + e(p.tk) + '</b><small>' + e(P.nomeCart(p.cart)) + '</small></div></div></td>'
      + '<td class="num mono">' + p.qtd.toLocaleString('pt-BR', { maximumFractionDigits: 8 }) + '</td>'
      + '<td class="num mono">' + P.money(p.custoMedio, 2) + '</td>'
      + '<td class="num mono">' + P.money(p.precoAtual, 2) + '</td>'
      + '<td class="num mono">' + P.money(p.valor) + '</td>'
      + '<td class="num mono ' + P.cls(p.naoRealizado) + '">' + P.money(p.naoRealizado) + ' <small style="color:var(--mut2)">(' + P.pct(p.naoRealizadoPct) + ')</small></td>'
      + (compacta ? '' : '<td class="num mono ' + (p.realizado ? P.cls(p.realizado) : 'mut') + '">' + (p.realizado ? P.money(p.realizado) : '—') + '</td>')
      + (compacta ? '' : '<td class="num"><button class="btn btn-g btn-sm" data-tx="' + p.id + '">+ Transação</button></td>')
      + '</tr>';
  }).join('');

  var head = '<tr><th>Ativo</th><th class="num">Qtd</th><th class="num">Preço médio</th><th class="num">Preço atual</th><th class="num">Valor</th><th class="num">Não realizado</th>'
    + (compacta ? '' : '<th class="num">Realizado</th><th></th>') + '</tr>';

  var html = '<div class="card"><div class="card-hd"><div class="card-title">' + (compacta ? 'Ativos em HOLD' : 'Posições abertas') + '</div>'
    + '<div class="right">' + (compacta ? '<a class="btn btn-g btn-sm" href="/portfolio/hold.html">Gerenciar →</a>' : P.exportBtn('hold')) + '</div></div>'
    + '<div class="tblw"><table class="dtable" style="min-width:' + (compacta ? 700 : 900) + 'px"><thead>' + head + '</thead><tbody>'
    + (rows || '<tr><td colspan="' + (compacta ? 6 : 8) + '"><div class="empty">Nenhuma posição aberta</div></td></tr>')
    + '</tbody></table></div></div>';

  /* Posições encerradas: o v1 escondia isto e junto sumia o lucro realizado. */
  if (!compacta && fechadas.length) {
    var fr = fechadas.map(function (p) {
      return '<tr><td><div class="tk"><div class="tk-ic dim">' + e(p.tk.slice(0, 3)) + '</div><div><b>' + e(p.tk) + '</b><small>' + e(P.nomeCart(p.cart)) + '</small></div></div></td>'
        + '<td class="num mono">' + p.nTx + '</td>'
        + '<td class="num mono ' + P.cls(p.realizado) + '">' + P.money(p.realizado) + '</td>'
        + '<td class="num"><button class="btn btn-g btn-sm" data-tx="' + p.id + '">+ Transação</button></td></tr>';
    }).join('');
    html += '<div class="card" style="margin-top:1rem"><div class="card-hd"><div class="card-title">Posições encerradas</div>'
      + '<div class="right"><span class="mut" style="font-size:12px">o lucro delas continua contando no seu resultado</span></div></div>'
      + '<div class="tblw"><table style="min-width:520px"><thead><tr><th>Ativo</th><th class="num">Transações</th><th class="num">Resultado realizado</th><th></th></tr></thead><tbody>'
      + fr + '</tbody></table></div></div>';
  }
  return html;
};

/* Linha do tempo unificada — sai direto do ledger. */
P.eventos = function () {
  var e = P.esc;
  var nomeAtivo = {}; P.st.ativos.forEach(function (a) { nomeAtivo[a.id] = a.tk; });
  var nomePool = {}; P.st.pools.forEach(function (p) { nomePool[p.id] = p.par; });
  var nomeLend = {}; P.st.lend.forEach(function (l) { nomeLend[l.id] = l.plat; });

  return C.movsDe(P.st, { cart: P.cart() }).slice().reverse().map(function (m) {
    var t = C.TIPOS[m.tipo], txt;
    switch (m.tipo) {
      case 'compra': txt = 'Compra de <b>' + m.qtd + ' ' + e(nomeAtivo[m.ref] || '') + '</b> a ' + P.money(m.px); break;
      case 'venda':  txt = 'Venda de <b>' + m.qtd + ' ' + e(nomeAtivo[m.ref] || '') + '</b> a ' + P.money(m.px); break;
      case 'pool_dep': txt = 'Depósito na pool <b>' + e(nomePool[m.ref] || '') + '</b>: ' + P.money(m.usd); break;
      case 'pool_ret': txt = 'Retirada da pool <b>' + e(nomePool[m.ref] || '') + '</b>: ' + P.money(m.usd); break;
      case 'pool_fee': txt = 'Taxas na pool <b>' + e(nomePool[m.ref] || '') + '</b>: ' + P.money(m.usd); break;
      case 'lend_sup': txt = 'Depósito em <b>' + e(nomeLend[m.ref] || '') + '</b>: ' + P.money(m.usd); break;
      case 'lend_ret': txt = 'Retirada de <b>' + e(nomeLend[m.ref] || '') + '</b>: ' + P.money(m.usd); break;
      case 'lend_juros': txt = 'Juros de <b>' + e(nomeLend[m.ref] || '') + '</b>: ' + P.money(m.usd); break;
      case 'trade_dep': txt = 'Aporte na banca: ' + P.money(m.usd); break;
      case 'trade_saq': txt = 'Saque da banca: ' + P.money(m.usd); break;
      case 'trade_res': var r = m.usd * (m.px < 0 ? -1 : 1);
        txt = 'Trade <b>' + e(m.nota || '') + '</b>: <span class="' + P.cls(r) + '">' + P.money(r) + '</span>'; break;
      default: txt = (t ? t.lbl : m.tipo) + ': ' + P.money(m.usd);
    }
    return { dt: m.dt, txt: txt };
  });
};

/* ══════════════════════════════════════════════════════════════════
   HOLD
   ══════════════════════════════════════════════════════════════════ */
P.formTx = function (pre) {
  if (P.precisaCarteira(function () { P.formTx(pre); })) return;
  var e = P.esc; pre = pre || {};
  var ops = P.st.ativos.map(function (a) { return '<option value="' + a.id + '"' + (pre.aid === a.id ? ' selected' : '') + '>' + e(a.tk) + '</option>'; }).join('');
  P.modal('Nova transação',
    '<div class="fg"><label>Ativo</label><select id="fAid"><option value="__novo">＋ Novo ativo…</option>' + ops + '</select></div>'
    + '<div id="novoWrap"><div class="frow"><div class="fg"><label>Ticker</label><input id="fTk" placeholder="Ex: BTC" style="text-transform:uppercase"></div>'
    + '<div class="fg"><label>ID CoinGecko <small>(preço automático)</small></label><input id="fCg" placeholder="ex: bitcoin"></div></div>'
    + '<div class="fg"><label>Carteira</label><select id="fCart">' + P.optCarteiras() + '</select></div></div>'
    + '<div class="frow3"><div class="fg"><label>Tipo</label><select id="fT"><option value="compra">Compra</option><option value="venda">Venda</option></select></div>'
    + '<div class="fg"><label>Quantidade</label><input id="fQ" type="number" step="any" inputmode="decimal"></div>'
    + '<div class="fg"><label>Preço unit. (US$)</label><input id="fPr" type="number" step="any" inputmode="decimal"></div></div>'
    + '<div class="frow"><div class="fg"><label>Taxa paga (US$)</label><input id="fFee" type="number" step="any" value="0" inputmode="decimal"></div>'
    + '<div class="fg"><label>Data</label><input id="fDt" type="date" value="' + C.hoje() + '" max="' + C.hoje() + '"></div></div>'
    + '<div class="fhint">A taxa entra no custo na compra e reduz o que você recebe na venda — é assim que o custo de aquisição realmente funciona.</div>',
    { footer: '<button class="btn btn-p" id="okTx">Salvar</button>' });

  var sel = document.getElementById('fAid');
  if (pre.aid) sel.value = pre.aid;
  function tog() { document.getElementById('novoWrap').style.display = sel.value === '__novo' ? 'block' : 'none'; }
  sel.onchange = tog; tog();

  document.getElementById('okTx').onclick = function () {
    var aid = sel.value, q = P.num('fQ'), pr = P.num('fPr'), fee = P.num('fFee');
    var dt = P.val('fDt') || C.hoje(), tipo = P.val('fT') || 'compra';
    if (!q || q <= 0) return alert('Informe a quantidade.');
    if (pr < 0) return alert('O preço não pode ser negativo.');
    var a;
    if (aid === '__novo') {
      var tk = P.val('fTk').toUpperCase();
      if (!tk) return alert('Informe o ticker do ativo.');
      a = { id: C.uid(), tk: tk, cg: P.val('fCg').toLowerCase(), cart: P.val('fCart') || P.st.carteiras[0].id, last: pr, lastAt: null };
      P.st.ativos.push(a);
    } else {
      a = P.st.ativos.filter(function (x) { return x.id === aid; })[0];
      if (!a) return;
    }
    C.addMov(P.st, { tipo: tipo, ref: a.id, cart: a.cart, qtd: q, px: pr, fee: fee, dt: dt });
    P.save(); P.closeModal(); P.render();
    P.loadPrices().then(P.render);
  };
};

P.vHold = function () {
  document.getElementById('pgTitle').textContent = 'HOLD';
  document.getElementById('pgSub').textContent = 'Seu patrimônio de longo prazo — preço médio, resultado realizado e não realizado';
  document.getElementById('btnAdd').onclick = function () { P.formTx(); };

  var pos = P.posicoes();
  if (!pos.length) {
    document.getElementById('pg').innerHTML = P.vazio(
      'Nenhum ativo registrado',
      'Registre sua primeira compra. A partir dela o MundoDeFi calcula preço médio ponderado, quanto você já realizou de lucro e quanto ainda está em aberto.',
      '<div class="zero-acts"><button class="btn btn-p" id="btnPrimeira">Registrar primeira compra</button></div>'
    ) + P.planosCTA();
    document.getElementById('btnPrimeira').onclick = function () { P.formTx(); };
    return;
  }

  var valor = 0, custo = 0, naoReal = 0, real = 0;
  var aL = [], aD = [], lL = [], lD = [];
  pos.forEach(function (p) {
    valor += p.valor; custo += p.custoTotal; naoReal += p.naoRealizado; real += p.realizado;
    if (p.qtd > 0) { aL.push(p.tk); aD.push(p.valor); }
    if (p.realizado || p.naoRealizado) { lL.push(p.tk); lD.push(p.realizado + p.naoRealizado); }
  });
  var rent = custo > 0 ? naoReal / custo * 100 : 0;

  var html = P.avisoPrecos();
  /* ═══ KPIS do módulo: mesmos componentes .kpi do Dashboard, com o
     acento roxo (k-hold) que identifica esta tela ═══ */
  html += '<div class="kpis">'
    + '<div class="kpi k-hold"><div class="mc-lbl">Valor em HOLD</div>'
    + '<div class="kpi-v" data-cv="' + valor + '" data-t="m">' + P.money(valor) + '</div></div>'
    + '<div class="kpi k-hold"><div class="mc-lbl">Investido</div>'
    + '<div class="kpi-v" data-cv="' + custo + '" data-t="m">' + P.money(custo) + '</div>'
    + '<div class="mc-sub">custo das posições abertas</div></div>'
    + '<div class="kpi k-hold"><div class="mc-lbl">Não realizado</div>'
    + '<div class="kpi-v ' + P.cls(naoReal) + '" data-cv="' + naoReal + '" data-t="m">' + P.money(naoReal) + '</div>'
    + '<div class="mc-sub"><span class="' + P.cls(rent) + '">' + P.pct(rent) + '</span></div></div>'
    + '<div class="kpi k-hold"><div class="mc-lbl">Realizado</div>'
    + '<div class="kpi-v ' + P.cls(real) + '" data-cv="' + real + '" data-t="m">' + P.money(real) + '</div>'
    + '<div class="mc-sub">de vendas já feitas</div></div>'
    + '</div>';

  html += '<div class="grid2b">' + P.grafCard('chHA', 'Alocação por ativo', true) + P.grafCard('chHL', 'Resultado por ativo', true) + '</div>';
  html += P.tabelaAtivos(pos, false);

  /* histórico de transações */
  var txs = C.movsDe(P.st, { cart: P.cart() }).filter(function (m) { return m.tipo === 'compra' || m.tipo === 'venda'; }).reverse();
  var nomeAtivo = {}; P.st.ativos.forEach(function (a) { nomeAtivo[a.id] = a.tk; });
  var lim = P.histLim();
  var hrows = txs.slice(0, lim).map(function (m) {
    return '<tr><td class="mono" style="color:var(--mut)">' + P.dBR(m.dt) + '</td>'
      + '<td><b>' + P.esc(nomeAtivo[m.ref] || '—') + '</b></td>'
      + '<td><span class="badge ' + (m.tipo === 'compra' ? 'b-open' : 'b-closed') + '">' + (m.tipo === 'compra' ? 'Compra' : 'Venda') + '</span></td>'
      + '<td class="num mono">' + m.qtd + '</td><td class="num mono">' + P.money(m.px, 2) + '</td>'
      + '<td class="num mono">' + (m.fee ? P.money(m.fee, 2) : '—') + '</td>'
      + '<td class="num mono">' + P.money(m.qtd * m.px) + '</td>'
      + '<td class="num"><button class="btn-x" data-del="' + m.id + '" title="Excluir">×</button></td></tr>';
  }).join('');
  html += '<div class="card" style="margin-top:1rem"><div class="card-hd"><div class="card-title">Histórico de transações</div></div>'
    + '<div class="tblw"><table style="min-width:700px"><thead><tr><th>Data</th><th>Ativo</th><th>Tipo</th><th class="num">Qtd</th><th class="num">Preço</th><th class="num">Taxa</th><th class="num">Total</th><th></th></tr></thead><tbody>'
    + (hrows || '<tr><td colspan="8"><div class="empty">Sem transações</div></td></tr>') + '</tbody></table></div></div>';

  html += P.planosCTA();
  document.getElementById('pg').innerHTML = html;

  document.querySelectorAll('[data-tx]').forEach(function (b) { b.onclick = function () { P.formTx({ aid: b.dataset.tx }); }; });
  document.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { P.excluirMov(b.dataset.del); }; });

  P.exporters = {
    hold: function () {
      var L = [['Ativo', 'Carteira', 'Quantidade', 'Preco medio USD', 'Preco atual USD', 'Valor USD', 'Nao realizado USD', 'Realizado USD']];
      P.posicoes().forEach(function (p) {
        L.push([p.tk, P.nomeCart(p.cart), p.qtd, p.custoMedio.toFixed(2), p.precoAtual.toFixed(2), p.valor.toFixed(2), p.naoRealizado.toFixed(2), p.realizado.toFixed(2)]);
      });
      P.exportCSV('mundodefi-hold', L);
    }
  };

  var r = P.rt();
  P.mkChart('chHA', {
    type: 'doughnut',
    data: { labels: aL, datasets: [{ data: aD.map(function (v) { return v * r; }), backgroundColor: ['#F5B614', '#9945FF', '#00E5FF', '#14F195', '#FF4D6A', '#9fd8ff'], borderColor: '#0B1322', borderWidth: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { color: '#8B93A7', font: { family: 'Space Mono', size: 11 }, boxWidth: 11, boxHeight: 11 } }, tooltip: { callbacks: { label: P.moneyCb() } } } }
  });
  P.mkChart('chHL', {
    type: 'bar',
    data: { labels: lL, datasets: [{ data: lD.map(function (v) { return Math.round(v * r); }), backgroundColor: lD.map(function (v) { return v >= 0 ? 'rgba(20,241,149,.65)' : 'rgba(255,77,106,.65)'; }), borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: P.moneyCb() } } }, scales: { x: { grid: { display: false }, ticks: P.gTicks() }, y: { grid: P.gGrid(), ticks: P.gTicks() } } }
  });
  P.countUps();
};

P.excluirMov = function (id) {
  if (!confirm('Excluir esta movimentação? O cálculo será refeito sem ela.')) return;
  P.st.mov = P.st.mov.filter(function (m) { return m.id !== id; });
  P.save(); P.render();
};

/* ══════════════════════════════════════════════════════════════════
   DEFI
   ══════════════════════════════════════════════════════════════════ */
P.dTab = 'pools';
P.dPool = function (id) { return P.st.pools.filter(function (p) { return p.id === id; })[0]; };
P.dLend = function (id) { return P.st.lend.filter(function (l) { return l.id === id; })[0]; };

/* Tickers comuns → id do CoinGecko. Poupa o usuário de descobrir que MATIC
   virou "matic-network" e que USDC é "usd-coin". Quem não estiver na lista
   digita o id à mão. */
P.CG_POR_TICKER = {
  BTC: 'bitcoin', WBTC: 'wrapped-bitcoin', ETH: 'ethereum', WETH: 'weth', STETH: 'staked-ether',
  SOL: 'solana', JITOSOL: 'jito-staked-sol', BNB: 'binancecoin', ADA: 'cardano', XRP: 'ripple',
  AVAX: 'avalanche-2', DOT: 'polkadot', LINK: 'chainlink', MATIC: 'polygon-ecosystem-token', POL: 'polygon-ecosystem-token',
  ATOM: 'cosmos', NEAR: 'near', SUI: 'sui', APT: 'aptos', ARB: 'arbitrum', OP: 'optimism',
  TIA: 'celestia', SEI: 'sei-network', INJ: 'injective-protocol', JUP: 'jupiter-exchange-solana',
  ORCA: 'orca', RAY: 'raydium', UNI: 'uniswap', AAVE: 'aave', CRV: 'curve-dao-token',
  LDO: 'lido-dao', MKR: 'maker', DOGE: 'dogecoin', PEPE: 'pepe', SHIB: 'shiba-inu',
  LTC: 'litecoin', BCH: 'bitcoin-cash', TRX: 'tron', TON: 'the-open-network', HYPE: 'hyperliquid',
  USDT: 'tether', USDC: 'usd-coin', DAI: 'dai', FDUSD: 'first-digital-usd',
  TUSD: 'true-usd', PYUSD: 'paypal-usd', USDE: 'ethena-usde'
};
P.cgDoTicker = function (tk) { return P.CG_POR_TICKER[String(tk || '').toUpperCase()] || ''; };

/* "SOL/USDC" → ['SOL','USDC']. Aceita barra, hífen ou espaço. */
P.partesDoPar = function (par) {
  var p = String(par || '').toUpperCase().split(/[\/\-\s]+/).filter(Boolean);
  return [p[0] || '', p[1] || ''];
};

P.optPesos = function (sel) {
  return ['0.5|50 / 50', '0.8|80 / 20', '0.7|70 / 30', '0.6|60 / 40'].map(function (o) {
    var v = o.split('|');
    return '<option value="' + v[0] + '"' + (String(sel || 0.5) === v[0] ? ' selected' : '') + '>' + v[1] + '</option>';
  }).join('');
};

/* Bloco de IL reaproveitado pelo formulário de criação e pelo de edição. */
P.ilCampos = function (simA, simB, il) {
  il = il || {}; var a = il.a || {}, b = il.b || {};
  var nomeA = simA || 'Token A', nomeB = simB || 'Token B';
  return '<div class="frow"><div class="fg"><label id="lbA">' + P.esc(nomeA) + ' — id CoinGecko</label>'
      + '<input id="fCgA" placeholder="solana" value="' + P.esc(a.cg || P.cgDoTicker(simA)) + '"></div>'
    + '<div class="fg"><label id="lbAp">Preço de ' + P.esc(nomeA) + ' na abertura (US$)</label>'
      + '<input id="fPxA" type="number" step="any" inputmode="decimal" value="' + (a.px0 || '') + '"></div></div>'
    + '<div class="frow"><div class="fg"><label id="lbB">' + P.esc(nomeB) + ' — id CoinGecko</label>'
      + '<input id="fCgB" placeholder="usd-coin" value="' + P.esc(b.cg || P.cgDoTicker(simB)) + '"></div>'
    + '<div class="fg"><label id="lbBp">Preço de ' + P.esc(nomeB) + ' na abertura (US$)</label>'
      + '<input id="fPxB" type="number" step="any" inputmode="decimal" value="'
      + (b.px0 || (C.ehStable(simB) ? 1 : '')) + '"></div></div>'
    + '<div class="frow"><div class="fg"><label>Proporção da pool</label><select id="fW">' + P.optPesos(il.w) + '</select></div>'
    + '<div class="fg"><label>&nbsp;</label><button type="button" class="btn btn-g" id="btnHoje" style="width:100%;padding:9px 12px;font-size:12.5px">Usar cotação de hoje</button></div></div>'
    + '<div class="fhint" id="ilAviso" style="margin-top:.2rem"></div>';
};

/* Liga o botão "usar cotação de hoje" e, quando `elPar` existe, faz o campo
   do par preencher sozinho os ids e os rótulos. */
P.ilLigar = function (elPar, dataAbertura) {
  function aviso(t) { var el = document.getElementById('ilAviso'); if (el) el.textContent = t; }

  if (elPar) {
    ['fCgA', 'fCgB'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', function () { this.dataset.tocado = '1'; });
    });
    elPar.addEventListener('input', function () {
      var pp = P.partesDoPar(elPar.value);
      [['A', pp[0]], ['B', pp[1]]].forEach(function (x) {
        if (!x[1]) return;
        document.getElementById('lb' + x[0]).textContent = x[1] + ' — id CoinGecko';
        document.getElementById('lb' + x[0] + 'p').textContent = 'Preço de ' + x[1] + ' na abertura (US$)';
        var cg = document.getElementById('fCg' + x[0]);
        if (!cg.dataset.tocado) cg.value = P.cgDoTicker(x[1]);
      });
      var pxB = document.getElementById('fPxB');
      if (!pxB.value && C.ehStable(pp[1])) pxB.value = '1';
    });
  }

  document.getElementById('btnHoje').onclick = function () {
    var a = P.val('fCgA'), b = P.val('fCgB');
    if (!a && !b) return aviso('Preencha os ids do CoinGecko primeiro.');
    aviso('Buscando cotação…');
    jfetch(CG + '/simple/price?ids=' + encodeURIComponent([a, b].filter(Boolean).join(',')) + '&vs_currencies=usd', 2)
      .then(function (d) {
        var achou = 0;
        if (a && d[a] && d[a].usd) { document.getElementById('fPxA').value = d[a].usd; achou++; }
        if (b && d[b] && d[b].usd) { document.getElementById('fPxB').value = d[b].usd; achou++; }
        if (!achou) return aviso('O CoinGecko não conhece esses ids. Confira na página do token, no fim da URL.');
        aviso('Cotação de hoje preenchida. Se a pool foi aberta em ' + P.dBR(dataAbertura) + ', ajuste para o preço daquele dia — senão o IL sai errado.');
      })
      .catch(function () { aviso('Não consegui buscar a cotação agora. Preencha à mão.'); });
  };
};

/* Lê os 4 campos. Devolve null se estiverem incompletos: meio preenchido
   geraria número errado, que é pior que número nenhum. */
P.ilLer = function (simA, simB) {
  var cgA = P.val('fCgA'), cgB = P.val('fCgB'), pxA = P.num('fPxA'), pxB = P.num('fPxB');
  if (!cgA || !cgB || !(pxA > 0) || !(pxB > 0)) return null;
  return { a: { cg: cgA, sym: simA || cgA.toUpperCase(), px0: pxA },
           b: { cg: cgB, sym: simB || cgB.toUpperCase(), px0: pxB },
           w: parseFloat(P.val('fW')) || 0.5 };
};

P.formPool = function () {
  if (P.precisaCarteira(P.formPool)) return;
  P.modal('Nova pool de liquidez',
    '<div class="frow3"><div class="fg"><label>Par</label><input id="fPar" placeholder="Ex: SOL/USDC" style="text-transform:uppercase"></div>'
    + '<div class="fg"><label>Plataforma</label><input id="fProto" placeholder="Ex: Orca"></div>'
    + '<div class="fg"><label>Blockchain</label><input id="fChain" placeholder="Ex: Solana"></div></div>'
    + '<div class="frow3"><div class="fg"><label>Carteira</label><select id="fCart">' + P.optCarteiras() + '</select></div>'
    + '<div class="fg"><label>Depósito inicial (US$)</label><input id="fDep" type="number" step="any" inputmode="decimal"></div>'
    + '<div class="fg"><label>Data de abertura</label><input id="fDt" type="date" value="' + C.hoje() + '" max="' + C.hoje() + '"></div></div>'
    + '<div class="fg"><label>Tokens depositados</label><input id="fTok" placeholder="Ex: 20 SOL + 1.400 USDC"></div>'
    + '<div class="sb-sec" style="padding-left:0">💧 Impermanent loss <small style="text-transform:none;letter-spacing:0">(opcional)</small></div>'
    + '<div class="fhint">Com o preço dos dois tokens no dia da abertura, o MundoDeFi calcula quanto a pool rendeu a menos do que simplesmente ter segurado os tokens — e se as taxas coletadas cobriram essa diferença. Dá para preencher depois.</div>'
    + P.ilCampos('', '', null)
    + '<div class="sb-sec" style="padding-left:0">📓 Diário estratégico <small style="text-transform:none;letter-spacing:0">(opcional)</small></div>'
    + '<div class="fg"><label>Objetivo</label><input id="dObj"></div>'
    + '<div class="fg"><label>Motivo da entrada</label><input id="dMot"></div>'
    + '<div class="frow"><div class="fg"><label>Plano A</label><input id="dPa"></div><div class="fg"><label>Plano B</label><input id="dPb"></div></div>'
    + '<div class="fg"><label>Critério de saída</label><input id="dSai"></div>',
    { wide: true, footer: '<button class="btn btn-p" id="okPool">Criar pool</button>' });

  P.ilLigar(document.getElementById('fPar'), P.val('fDt'));

  document.getElementById('okPool').onclick = function () {
    var par = P.val('fPar').toUpperCase(); if (!par) return alert('Informe o par da pool.');
    var dep = P.num('fDep'), dt = P.val('fDt') || C.hoje();
    var cart = P.val('fCart') || P.st.carteiras[0].id;
    var pp = P.partesDoPar(par);
    var p = {
      id: C.uid(), par: par, proto: P.val('fProto') || '—', chain: P.val('fChain') || '—',
      cart: cart, st: 'a', ab: dt, en: null,
      cur: { usd: dep, tok: P.val('fTok'), at: dt },
      di: { obj: P.val('dObj'), mot: P.val('dMot'), pa: P.val('dPa'), pb: P.val('dPb'), sai: P.val('dSai') },
      notas: [], reb: []
    };
    var il = P.ilLer(pp[0], pp[1]);
    if (il) p.il = il;
    P.st.pools.push(p);
    if (dep) C.addMov(P.st, { tipo: 'pool_dep', ref: p.id, cart: cart, usd: dep, dt: dt, nota: P.val('fTok') });
    P.save(); P.closeModal(); P.render();
    if (il) P.loadPrices().then(P.render);
  };
};

/* Pools criadas antes deste campo não têm o bloco de IL. Este formulário
   existe para preenchê-lo sem ter que recriar a pool. */
P.formPoolIL = function (p) {
  var pp = P.partesDoPar(p.par);
  P.modal('Impermanent loss — ' + P.esc(p.par),
    '<div class="fhint" style="margin-top:0">Informe o preço dos dois tokens <b>no dia em que você abriu a pool</b> (' + P.dBR(p.ab) + '). '
    + 'É a partir daí que dá para comparar a pool com a alternativa de ter só segurado os tokens.</div>'
    + P.ilCampos(pp[0], pp[1], p.il),
    { footer: '<button class="btn btn-p" id="okIL">Salvar</button>' });

  P.ilLigar(null, p.ab);

  document.getElementById('okIL').onclick = function () {
    var il = P.ilLer(pp[0], pp[1]);
    if (!il) { document.getElementById('ilAviso').textContent = 'Preencha os quatro campos — sem os dois preços de abertura o cálculo sairia errado.'; return; }
    p.il = il;
    P.save(); P.closeModal(); P.render();
    P.loadPrices().then(function () { P.render(); P.poolDetalhe(p.id); });
  };
};

P.poolAcao = function (p, tipo) {
  var cfg = {
    fee: ['Registrar taxas coletadas', 'Valor coletado (US$)', 'pool_fee'],
    dep: ['Registrar aporte', 'Valor do aporte (US$)', 'pool_dep'],
    ret: ['Registrar retirada', 'Valor retirado (US$)', 'pool_ret'],
    cur: ['Atualizar valor atual', 'Valor atual da posição (US$)', null],
    reb: ['Registrar rebalanceamento', null, null],
    nota: ['Adicionar nota', null, null]
  }[tipo];
  var body = '';
  if (cfg[1]) body += '<div class="fg"><label>' + cfg[1] + '</label><input id="aUsd" type="number" step="any" inputmode="decimal"'
    + (tipo === 'cur' ? ' value="' + (p.cur.usd || 0) + '"' : '') + '></div>';
  if (tipo === 'dep' || tipo === 'ret' || tipo === 'cur') body += '<div class="fg"><label>Tokens</label><input id="aTok" placeholder="opcional" value="' + (tipo === 'cur' ? P.esc(p.cur.tok || '') : '') + '"></div>';
  if (tipo === 'reb' || tipo === 'nota') body += '<div class="fg"><label>Descrição</label><textarea id="aTxt"></textarea></div>';
  body += '<div class="fg"><label>Data</label><input id="aDt" type="date" value="' + C.hoje() + '" max="' + C.hoje() + '"></div>';
  if (tipo === 'cur') body += '<div class="fhint">Este é o valor que a plataforma mostra hoje para a sua posição. Atualize de vez em quando: é ele que define seu resultado não realizado.</div>';

  P.modal(cfg[0] + ' — ' + P.esc(p.par), body, { footer: '<button class="btn btn-p" id="okA">Salvar</button>' });
  document.getElementById('okA').onclick = function () {
    var dt = P.val('aDt') || C.hoje(), usd = P.num('aUsd'), txt = P.val('aTxt'), tok = P.val('aTok');
    if (cfg[2]) {
      if (!usd) return alert('Informe o valor.');
      C.addMov(P.st, { tipo: cfg[2], ref: p.id, cart: p.cart, usd: usd, dt: dt, nota: tok });
      /* o valor atual acompanha aportes e retiradas */
      if (tipo === 'dep') p.cur.usd = (Number(p.cur.usd) || 0) + usd;
      if (tipo === 'ret') p.cur.usd = Math.max(0, (Number(p.cur.usd) || 0) - usd);
      p.cur.at = dt;
    } else if (tipo === 'cur') {
      p.cur.usd = usd; if (tok) p.cur.tok = tok; p.cur.at = dt;
    } else if (tipo === 'reb') {
      if (!txt) return; p.reb.push({ dt: dt, txt: txt });
    } else if (tipo === 'nota') {
      if (!txt) return; p.notas.push({ dt: dt, txt: txt });
    }
    P.save(); P.closeModal(); P.render(); P.poolDetalhe(p.id);
  };
};

P.poolEncerrar = function (p) {
  P.modal('Encerrar pool — ' + P.esc(p.par),
    '<div class="notice">O valor final entra como retirada e a pool vai para o histórico. Nada é apagado — o resultado dela continua contando no seu realizado.</div>'
    + '<div class="frow"><div class="fg"><label>Valor final retirado (US$)</label><input id="aUsd" type="number" step="any" value="' + (p.cur.usd || 0) + '"></div>'
    + '<div class="fg"><label>Data</label><input id="aDt" type="date" value="' + C.hoje() + '" max="' + C.hoje() + '"></div></div>'
    + '<div class="fg"><label>Nota de encerramento</label><textarea id="aTxt"></textarea></div>',
    { footer: '<button class="btn btn-red" id="okE">Encerrar pool</button>' });
  document.getElementById('okE').onclick = function () {
    var dt = P.val('aDt') || C.hoje(), usd = P.num('aUsd'), txt = P.val('aTxt');
    if (usd) C.addMov(P.st, { tipo: 'pool_ret', ref: p.id, cart: p.cart, usd: usd, dt: dt });
    if (txt) p.notas.push({ dt: dt, txt: 'Encerramento: ' + txt });
    p.st = 'e'; p.en = dt; p.cur.usd = 0;
    P.save(); P.closeModal(); P.render();
  };
};

P.poolDetalhe = function (id) {
  var e = P.esc, p = P.dPool(id); if (!p) return;
  var R = C.poolResultado(P.st, p);
  var tl = C.movsDe(P.st, { ref: p.id }).map(function (m) {
    var t = C.TIPOS[m.tipo];
    return { dt: m.dt, txt: '<b>' + (t ? t.lbl : m.tipo) + '</b> ' + P.money(m.usd) + (m.nota ? ' · <span class="tok-line">' + e(m.nota) + '</span>' : '') };
  });
  (p.reb || []).forEach(function (x) { tl.push({ dt: x.dt, txt: '<b>Rebalanceamento</b> — ' + e(x.txt) }); });
  (p.notas || []).forEach(function (x) { tl.push({ dt: x.dt, txt: '<b>Nota</b> — ' + e(x.txt) }); });
  tl.sort(function (a, b) { return String(b.dt || '').localeCompare(String(a.dt || '')); });

  var di = p.di || {};
  var diH = ['obj|🎯 Objetivo', 'mot|💡 Motivo', 'pa|🅰 Plano A', 'pb|🅱 Plano B', 'sai|🚪 Critério de saída'].map(function (x) {
    var k = x.split('|');
    return di[k[0]] ? '<div class="d-item"><b>' + k[1] + '</b><p>' + e(di[k[0]]) + '</p></div>' : '';
  }).join('');

  var body = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:1rem">'
    + '<span class="chain-tag" style="border:1px solid var(--line2)">' + e(p.proto) + '</span><span class="tag">' + e(p.chain) + '</span>'
    + '<span class="badge ' + (R.aberta ? 'b-open' : 'b-closed') + '">' + (R.aberta ? 'Pool aberta' : 'Pool encerrada') + '</span>'
    + '<span class="mono" style="font-size:11px;color:var(--mut2)">' + P.dBR(p.ab) + (p.en ? ' → ' + P.dBR(p.en) : ' → hoje') + ' · ' + R.dias + ' dias</span></div>';

  if (R.aberta && R.valorDesatualizado != null && R.valorDesatualizado > 14) {
    body += '<div class="warn">⚠ O valor atual desta pool foi informado há ' + R.valorDesatualizado + ' dias. Atualize para o resultado ficar correto.</div>';
  }

  body += '<div class="mgrid mgrid-6" style="margin-bottom:1rem">'
    + '<div class="mc sm"><div class="mc-lbl">Depositado</div><div class="mc-val">' + P.money(R.dep) + '</div></div>'
    + '<div class="mc sm"><div class="mc-lbl">Retirado</div><div class="mc-val">' + P.money(R.ret) + '</div></div>'
    + '<div class="mc sm"><div class="mc-lbl">Taxas</div><div class="mc-val" style="color:var(--cyan,#00E5FF)">' + P.money(R.fees) + '</div></div>'
    + '<div class="mc sm"><div class="mc-lbl">Valor atual</div><div class="mc-val">' + (R.aberta ? P.money(R.atual) : '—') + '</div></div>'
    + '<div class="mc sm"><div class="mc-lbl">Resultado</div><div class="mc-val ' + P.cls(R.resultado) + '">' + P.money(R.resultado) + '<small class="mc-pct">' + P.pct(R.resultadoPct) + '</small></div></div>'
    + '<div class="mc sm"><div class="mc-lbl">APR das taxas <i class="hint" title="Só as taxas coletadas, anualizadas sobre o capital depositado. Não inclui valorização do par.">?</i></div><div class="mc-val" style="color:var(--green,#14F195)">' + R.aprFees.toFixed(1) + '%</div></div>'
    + '</div>';

  /* ── A pool bateu o HOLD? ──────────────────────────────────────
     A pergunta que decide se a pool valeu a pena não é "quanto rendeu",
     é "rendeu mais do que se eu tivesse só segurado os dois tokens?".
     Sem os preços de abertura não dá para responder — e um IL inventado
     seria pior que nenhum, então a gente pede o dado. */
  /* Só para pool aberta: numa encerrada faltaria o preço do dia do
     encerramento, e o resultado dela já está realizado no extrato. */
  var IL = R.aberta ? C.poolIL(P.st, p, P.precos) : null;
  if (R.aberta) body += '<div class="sb-sec" style="padding-left:0">💧 A pool bateu o HOLD?</div>';
  if (R.aberta && !IL) {
    body += '<div class="notice">Faltam os preços dos dois tokens no dia da abertura ('
      + P.dBR(p.ab) + '). Com eles o MundoDeFi calcula o impermanent loss desta pool e diz se as taxas coletadas cobriram a perda. '
      + '<button class="btn btn-p btn-sm" data-a="il" style="margin-top:.6rem">Preencher agora</button></div>';
  } else if (IL) {
    var pares = e(IL.simbolos);
    body += '<div class="mgrid" style="margin-bottom:.7rem">'
      + '<div class="mc sm"><div class="mc-lbl">Se tivesse só segurado</div><div class="mc-val">' + P.money(IL.valorHold)
      + '<small class="mc-pct">' + pares + ' parados na carteira</small></div></div>'
      + '<div class="mc sm"><div class="mc-lbl">Sua pool hoje</div><div class="mc-val">' + P.money(IL.valorReal)
      + '<small class="mc-pct">valor informado + taxas</small></div></div>'
      + '<div class="mc sm"><div class="mc-lbl">Diferença</div><div class="mc-val ' + P.cls(IL.vsHold) + '">' + P.money(IL.vsHold)
      + '<small class="mc-pct">' + P.pct(IL.vsHoldPct) + '</small></div></div>'
      + '<div class="mc sm"><div class="mc-lbl">Impermanent loss <i class="hint" title="Custo estrutural de estar numa pool: o AMM rebalanceia sozinho e você acaba com mais do token que caiu. Só desaparece se o par voltar à proporção de preços da abertura.">?</i></div>'
      + '<div class="mc-val ' + (IL.pct < 0 ? 'down' : '') + '">' + P.pct(IL.pct)
      + '<small class="mc-pct">' + P.money(IL.perdaUsd) + ' do capital</small></div></div>'
      + '</div>';
    body += '<div class="' + (IL.bateuHold ? 'notice' : 'warn') + '">'
      + (IL.bateuHold
          ? '✅ <b>A pool está ' + P.money(IL.vsHold) + ' à frente do HOLD.</b> As taxas coletadas mais que compensaram o impermanent loss de ' + P.money(IL.perdaUsd) + '.'
          : '⚠ <b>A pool está ' + P.money(-IL.vsHold) + ' atrás do HOLD.</b> Até aqui teria sido melhor deixar ' + pares + ' parado na carteira.')
      + '</div>';
    body += '<div class="fhint" style="margin-top:-.4rem">'
      + 'O impermanent loss explica ' + P.money(IL.perdaUsd) + ' dessa conta — o resto vem do valor que você informou para a posição ('
      + P.money(IL.valorAtual) + P.quandoInformado(IL.valorDesatualizado) + '). '
      + pares + ' se moveram ' + P.pct(IL.variacaoPar) + ' um contra o outro desde a abertura; cálculo sobre o capital líquido de '
      + P.money(IL.capital) + ', proporção ' + Math.round(IL.w1 * 100) + '/' + Math.round((1 - IL.w1) * 100) + '.</div>';
  }

  if (R.aberta && p.cur.tok) body += '<div class="notice">Tokens atuais: <span class="tok-line">' + e(p.cur.tok) + '</span></div>';
  if (R.aberta) body += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1.2rem">'
    + '<button class="btn btn-green btn-sm" data-a="fee">+ Taxas</button>'
    + '<button class="btn btn-g btn-sm" data-a="dep">+ Aporte</button>'
    + '<button class="btn btn-g btn-sm" data-a="ret">− Retirada</button>'
    + '<button class="btn btn-g btn-sm" data-a="cur">✎ Atualizar valor</button>'
    + '<button class="btn btn-g btn-sm" data-a="reb">↔ Rebalanceamento</button>'
    + '<button class="btn btn-g btn-sm" data-a="nota">📝 Nota</button>'
    + (IL ? '<button class="btn btn-g btn-sm" data-a="il">💧 Editar IL</button>' : '')
    + '<button class="btn btn-red btn-sm" data-a="end" style="margin-left:auto">Encerrar pool</button></div>';

  body += '<div class="grid2b"><div><div class="sb-sec" style="padding-left:0">📓 Diário estratégico</div><div class="diario">' + (diH || '<div class="empty">Diário vazio</div>') + '</div></div>'
    + '<div><div class="sb-sec" style="padding-left:0">🕐 Linha do tempo</div><div class="tl">'
    + (tl.map(function (x) { return '<div class="tl-item"><span class="tl-date">' + P.dBR(x.dt) + '</span><span class="tl-txt">' + x.txt + '</span></div>'; }).join('') || '<div class="empty">Sem eventos</div>')
    + '</div></div></div>';

  P.modal(e(p.par) + ' <span style="color:var(--mut2);font-weight:400;font-size:12px">' + e(p.proto) + '</span>', body, { wide: true });
  document.querySelectorAll('[data-a]').forEach(function (b) {
    b.onclick = function () {
      var a = b.dataset.a;
      if (a === 'end') return P.poolEncerrar(p);
      if (a === 'il') { P.closeModal(); return P.formPoolIL(p); }
      P.poolAcao(p, a);
    };
  });
};

P.formLend = function () {
  if (P.precisaCarteira(P.formLend)) return;
  P.modal('Registrar lending',
    '<div class="frow3"><div class="fg"><label>Plataforma</label><input id="fPlat" placeholder="Kamino, Aave"></div>'
    + '<div class="fg"><label>Blockchain</label><input id="fChain"></div>'
    + '<div class="fg"><label>Tipo</label><select id="fTipo"><option value="s">Supply (emprestar)</option><option value="b">Borrow (tomar)</option></select></div></div>'
    + '<div class="frow3"><div class="fg"><label>Token</label><input id="fTk" style="text-transform:uppercase"></div>'
    + '<div class="fg"><label>Valor (US$)</label><input id="fUsd" type="number" step="any" inputmode="decimal"></div>'
    + '<div class="fg"><label>APY (%)</label><input id="fApy" type="number" step="any" inputmode="decimal"></div></div>'
    + '<div class="frow"><div class="fg"><label>Carteira</label><select id="fCart">' + P.optCarteiras() + '</select></div>'
    + '<div class="fg"><label>Data</label><input id="fDt" type="date" value="' + C.hoje() + '" max="' + C.hoje() + '"></div></div>'
    + '<div class="fhint">O APY é informativo. Os juros só entram no seu resultado quando você registrar o recebimento — nada de renda estimada virando lucro.</div>',
    { footer: '<button class="btn btn-p" id="okL">Salvar</button>' });
  document.getElementById('okL').onclick = function () {
    var tk = P.val('fTk').toUpperCase(); if (!tk) return alert('Informe o token.');
    var usd = P.num('fUsd'), dt = P.val('fDt') || C.hoje();
    var cart = P.val('fCart') || P.st.carteiras[0].id;
    var l = { id: C.uid(), plat: P.val('fPlat') || '—', chain: P.val('fChain') || '—', tipo: P.val('fTipo') || 's', tk: tk, cart: cart, apy: P.num('fApy'), st: 'a', ab: dt };
    P.st.lend.push(l);
    if (usd) C.addMov(P.st, { tipo: 'lend_sup', ref: l.id, cart: cart, usd: usd, dt: dt });
    P.save(); P.closeModal(); P.render();
  };
};

P.lendAcao = function (l, tipo) {
  var cfg = { juros: ['Registrar juros recebidos', 'Valor (US$)', 'lend_juros'],
              ret: ['Registrar retirada', 'Valor retirado (US$)', 'lend_ret'] }[tipo];
  P.modal(cfg[0] + ' — ' + P.esc(l.plat),
    '<div class="fg"><label>' + cfg[1] + '</label><input id="aUsd" type="number" step="any" inputmode="decimal"></div>'
    + '<div class="fg"><label>Data</label><input id="aDt" type="date" value="' + C.hoje() + '" max="' + C.hoje() + '"></div>',
    { footer: '<button class="btn btn-p" id="okA">Salvar</button>' });
  document.getElementById('okA').onclick = function () {
    var usd = P.num('aUsd'); if (!usd) return alert('Informe o valor.');
    C.addMov(P.st, { tipo: cfg[2], ref: l.id, cart: l.cart, usd: usd, dt: P.val('aDt') || C.hoje() });
    P.save(); P.closeModal(); P.render();
  };
};
P.lendEncerrar = function (l) {
  var R = C.lendResultado(P.st, l);
  P.modal('Encerrar posição — ' + P.esc(l.plat),
    '<div class="notice">O principal volta como retirada e a posição vai para o histórico.</div>'
    + '<div class="frow"><div class="fg"><label>Valor recebido de volta (US$)</label><input id="aUsd" type="number" step="any" value="' + R.principal + '"></div>'
    + '<div class="fg"><label>Data</label><input id="aDt" type="date" value="' + C.hoje() + '" max="' + C.hoje() + '"></div></div>',
    { footer: '<button class="btn btn-red" id="okE">Encerrar</button>' });
  document.getElementById('okE').onclick = function () {
    var usd = P.num('aUsd'), dt = P.val('aDt') || C.hoje();
    if (usd) C.addMov(P.st, { tipo: 'lend_ret', ref: l.id, cart: l.cart, usd: usd, dt: dt });
    l.st = 'e'; l.en = dt;
    P.save(); P.closeModal(); P.render();
  };
};

P.poolCard = function (p) {
  var e = P.esc, R = C.poolResultado(P.st, p);
  var IL = R.aberta ? C.poolIL(P.st, p, P.precos) : null;
  var velho = R.valorDesatualizado != null && R.valorDesatualizado > 14;
  return '<div class="pool-card" data-p="' + p.id + '"><div class="pool-hd"><div><div class="pool-par">' + e(p.par) + '</div>'
    + '<div class="pool-proto">' + e(p.proto) + ' · ' + e(p.chain) + '</div></div>'
    + '<span class="badge ' + (R.aberta ? 'b-open' : 'b-closed') + '" style="margin-left:auto">' + (R.aberta ? 'Aberta' : 'Encerrada') + '</span></div>'
    + '<div class="pool-nums">'
    + '<div><span>Valor atual</span><b>' + (R.aberta ? P.money(R.atual) : '—') + '</b></div>'
    + '<div><span>APR taxas</span><b style="color:var(--green,#14F195)">' + R.aprFees.toFixed(1) + '%</b></div>'
    + '<div><span>Resultado</span><b class="' + P.cls(R.resultado) + '">' + P.money(R.resultado) + ' <small>' + P.pct(R.resultadoPct) + '</small></b></div>'
    + '</div>'
    + (velho ? '<div class="pool-stale">⚠ valor de ' + R.valorDesatualizado + ' dias atrás</div>' : '')
    + (IL ? '<div class="pool-il ' + (IL.bateuHold ? 'ok' : 'bad') + '">'
        + (IL.bateuHold ? '✅ à frente do HOLD' : '⚠ atrás do HOLD')
        + ' <b>' + P.pct(IL.vsHoldPct) + '</b></div>' : '')
    + (R.aberta && p.cur.tok ? '<div class="tok-line">' + e(p.cur.tok) + '</div>' : '') + '</div>';
};

P.vDefi = function () {
  var e = P.esc;
  document.getElementById('pgTitle').textContent = 'DeFi';
  document.getElementById('pgSub').textContent = 'Pools de liquidez e lending — capital, taxas coletadas e retorno real';
  document.getElementById('btnAdd').onclick = function () { if (P.dTab === 'lend') return P.formLend(); P.formPool(); };

  var pools = P.poolsFiltradas(), lends = P.lendFiltrado();
  if (!pools.length && !lends.length) {
    document.getElementById('pg').innerHTML = P.vazio(
      'Nenhuma posição DeFi',
      'Registre uma pool de liquidez ou uma posição de lending. O MundoDeFi acompanha capital, taxas coletadas e o APR que você está realmente obtendo — não o APR anunciado.',
      '<div class="zero-acts"><button class="btn btn-p" id="btnPool">Criar pool</button><button class="btn btn-g" id="btnLend">Registrar lending</button></div>'
    ) + P.planosCTA();
    document.getElementById('btnPool').onclick = P.formPool;
    document.getElementById('btnLend').onclick = P.formLend;
    return;
  }

  var abertas = pools.filter(function (p) { return p.st === 'a'; });
  var valor = 0, taxas = 0, resultado = 0, capital = 0;
  pools.forEach(function (p) {
    var R = C.poolResultado(P.st, p);
    taxas += R.fees; resultado += R.resultado;
    if (R.aberta) { valor += R.atual; capital += Math.max(0, R.dep - R.ret); }
  });
  var aprMedio = 0, somaDias = 0;
  abertas.forEach(function (p) { var R = C.poolResultado(P.st, p); aprMedio += R.aprFees * R.dep; somaDias += R.dep; });
  aprMedio = somaDias > 0 ? aprMedio / somaDias : 0;

  var html = '<div class="mgrid">'
    + P.cardNeutro('Valor em pools', P.money(valor), 'var(--green,#14F195)', capital ? 'capital aplicado: ' + P.money(capital) : null, valor)
    + P.cardNeutro('Taxas coletadas', P.money(taxas), 'var(--cyan,#00E5FF)', 'renda real em dólar', taxas)
    + P.card('Resultado DeFi', P.money(resultado), 'var(--purple,#9945FF)', 'pools abertas + encerradas', resultado)
    + P.cardNeutro('APR médio das taxas', aprMedio.toFixed(1) + '%', 'var(--gold,#F5B614)', abertas.length + ' pool(s) aberta(s)', aprMedio, 'n')
    + '</div>';

  html += '<div class="tabs"><button class="tab' + (P.dTab === 'pools' ? ' on' : '') + '" data-t="pools">🌊 Pools</button>'
    + '<button class="tab' + (P.dTab === 'lend' ? ' on' : '') + '" data-t="lend">🏦 Lending</button>'
    + '<span style="margin-left:auto">' + P.exportBtn('defi') + '</span></div>';

  if (P.dTab === 'pools') {
    html += '<div class="grid2b">' + P.grafCard('chDT', 'Taxas coletadas por mês', true) + P.grafCard('chDP', 'Capital por protocolo', true) + '</div>';
    html += '<div class="sb-sec" style="padding-left:0">Pools abertas</div>'
      + (abertas.length ? '<div class="pool-grid">' + abertas.map(P.poolCard).join('') + '</div>'
                        : '<div class="empty">Nenhuma pool aberta.</div>');
    var enc = pools.filter(function (p) { return p.st === 'e'; });
    if (enc.length) {
      var rows = enc.map(function (p) {
        var R = C.poolResultado(P.st, p);
        return '<tr style="cursor:pointer" data-p="' + p.id + '"><td><div class="pool-name">' + e(p.par) + '</div><div class="pool-proj">' + e(p.proto) + '</div></td>'
          + '<td><span class="tag">' + e(p.chain) + '</span></td>'
          + '<td class="mono" style="color:var(--mut)">' + P.dBR(p.ab) + ' → ' + P.dBR(p.en) + '<small class="blk">' + R.dias + ' dias</small></td>'
          + '<td class="num mono">' + P.money(R.dep) + '</td>'
          + '<td class="num mono" style="color:var(--cyan,#00E5FF)">' + P.money(R.fees) + '</td>'
          + '<td class="num"><span class="res-pill ' + (R.resultado >= 0 ? 'res-up' : 'res-dn') + '">' + P.money(R.resultado) + ' <small>' + P.pct(R.resultadoPct) + '</small></span></td></tr>';
      }).join('');
      html += '<div class="sb-sec" style="padding-left:0;margin-top:1rem">Histórico — pools encerradas</div>'
        + '<div class="card"><div class="tblw"><table style="min-width:760px"><thead><tr><th>Pool</th><th>Chain</th><th>Período</th><th class="num">Depositado</th><th class="num">Taxas</th><th class="num">Resultado</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    }
  }

  if (P.dTab === 'lend') {
    var rowsL = lends.map(function (l) {
      var R = C.lendResultado(P.st, l);
      return '<tr><td><b>' + e(l.plat) + '</b></td><td><span class="tag">' + e(l.chain) + '</span></td>'
        + '<td><span class="badge ' + (l.tipo === 's' ? 'b-open' : 'b-closed') + '">' + (l.tipo === 's' ? 'Supply' : 'Borrow') + '</span></td>'
        + '<td class="mono">' + e(l.tk) + '</td>'
        + '<td class="num mono">' + P.money(R.capital) + '</td>'
        + '<td class="num mono" style="color:var(--mut)">' + (l.apy ? l.apy.toFixed(1) + '%' : '—') + '</td>'
        + '<td class="num mono ' + P.cls(R.resultado) + '">' + (R.juros ? P.money(R.resultado) : '—') + '</td>'
        + '<td class="num">' + (R.aberta
            ? '<button class="btn btn-g btn-sm" data-lj="' + l.id + '">+ Juros</button> <button class="btn btn-g btn-sm" data-le="' + l.id + '">Encerrar</button>'
            : '<span class="badge b-closed">Encerrada</span>') + '</td></tr>';
    }).join('');
    html += '<div class="card"><div class="tblw"><table style="min-width:820px"><thead><tr><th>Plataforma</th><th>Chain</th><th>Tipo</th><th>Token</th><th class="num">Principal</th><th class="num">APY inf.</th><th class="num">Juros reais</th><th></th></tr></thead><tbody>'
      + (rowsL || '<tr><td colspan="8"><div class="empty">Nenhuma posição</div></td></tr>') + '</tbody></table></div></div>';
  }

  html += P.planosCTA();
  document.getElementById('pg').innerHTML = html;

  document.querySelectorAll('.tab').forEach(function (b) { b.onclick = function () { P.dTab = b.dataset.t; P.render(); }; });
  document.querySelectorAll('[data-p]').forEach(function (el) { el.onclick = function () { P.poolDetalhe(el.dataset.p); }; });
  document.querySelectorAll('[data-lj]').forEach(function (b) { b.onclick = function (ev) { ev.stopPropagation(); P.lendAcao(P.dLend(b.dataset.lj), 'juros'); }; });
  document.querySelectorAll('[data-le]').forEach(function (b) { b.onclick = function (ev) { ev.stopPropagation(); P.lendEncerrar(P.dLend(b.dataset.le)); }; });

  P.exporters = {
    defi: function () {
      var L = [['Par', 'Plataforma', 'Chain', 'Status', 'Abertura', 'Encerramento', 'Dias', 'Depositado USD', 'Retirado USD', 'Taxas USD', 'Resultado USD', 'Resultado %', 'APR taxas %']];
      P.poolsFiltradas().forEach(function (p) {
        var R = C.poolResultado(P.st, p);
        L.push([p.par, p.proto, p.chain, R.aberta ? 'Aberta' : 'Encerrada', p.ab, p.en || '', R.dias,
                R.dep.toFixed(2), R.ret.toFixed(2), R.fees.toFixed(2), R.resultado.toFixed(2), R.resultadoPct.toFixed(2), R.aprFees.toFixed(2)]);
      });
      P.exportCSV('mundodefi-defi', L);
    }
  };

  if (P.dTab === 'pools') {
    var r = P.rt(), mm = {}, labs = [];
    for (var i = 5; i >= 0; i--) { var d = new Date(); d.setMonth(d.getMonth() - i); var k = d.toISOString().slice(0, 7); mm[k] = 0; labs.push(k); }
    C.movsDe(P.st, { cart: P.cart(), tipo: 'pool_fee' }).forEach(function (m) {
      var k = String(m.dt || '').slice(0, 7); if (k in mm) mm[k] += m.usd;
    });
    P.mkChart('chDT', {
      type: 'bar',
      data: { labels: labs.map(function (k) { var p = k.split('-'); return p[1] + '/' + p[0].slice(2); }), datasets: [{ data: labs.map(function (k) { return Math.round(mm[k] * r); }), backgroundColor: 'rgba(0,229,255,.55)', borderColor: '#00E5FF', borderWidth: 1.5, borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: P.moneyCb() } } }, scales: { x: { grid: { display: false }, ticks: P.gTicks() }, y: { grid: P.gGrid(), ticks: P.gTicks() } } }
    });
    var pm = {};
    abertas.forEach(function (p) { var R = C.poolResultado(P.st, p); pm[p.proto] = (pm[p.proto] || 0) + Math.max(0, R.dep - R.ret); });
    var pl = Object.keys(pm);
    P.mkChart('chDP', {
      type: 'doughnut',
      data: { labels: pl, datasets: [{ data: pl.map(function (k) { return pm[k] * r; }), backgroundColor: ['#14F195', '#9945FF', '#F5B614', '#00E5FF', '#FF4D6A'], borderColor: '#0B1322', borderWidth: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { color: '#8B93A7', font: { family: 'Space Mono', size: 11 }, boxWidth: 11, boxHeight: 11 } }, tooltip: { callbacks: { label: P.moneyCb() } } } }
    });
  }
  P.countUps();
};

/* ══════════════════════════════════════════════════════════════════
   TRADE
   ══════════════════════════════════════════════════════════════════ */
P.formOp = function () {
  if (P.precisaCarteira(P.formOp)) return;
  P.modal('Nova operação',
    '<div class="frow3"><div class="fg"><label>Ativo</label><input id="fAt" style="text-transform:uppercase" placeholder="BTC"></div>'
    + '<div class="fg"><label>Direção</label><select id="fDir"><option value="L">Long</option><option value="S">Short</option></select></div>'
    + '<div class="fg"><label>Alavancagem</label><input id="fAl" type="number" step="1" value="1" inputmode="numeric"></div></div>'
    + '<div class="frow3"><div class="fg"><label>Resultado (US$)</label><input id="fRes" type="number" step="any" inputmode="decimal" placeholder="− para perda"></div>'
    + '<div class="fg"><label>Carteira</label><select id="fCart">' + P.optCarteiras() + '</select></div>'
    + '<div class="fg"><label>Data</label><input id="fDt" type="date" value="' + C.hoje() + '" max="' + C.hoje() + '"></div></div>'
    + '<div class="fg"><label>Anotação</label><textarea id="fTxt" placeholder="O que você viu para entrar? O que deu certo ou errado?"></textarea></div>',
    { footer: '<button class="btn btn-p" id="okOp">Salvar</button>' });
  document.getElementById('okOp').onclick = function () {
    var at = P.val('fAt').toUpperCase(); if (!at) return alert('Informe o ativo.');
    var res = P.num('fRes');
    if (!res) return alert('Informe o resultado da operação.');
    var cart = P.val('fCart') || P.st.carteiras[0].id;
    P.st.trades.push({ id: C.uid(), dt: P.val('fDt') || C.hoje(), ativo: at, dir: P.val('fDir') || 'L', alav: P.num('fAl') || 1, res: res, txt: P.val('fTxt'), cart: cart });
    /* o ledger guarda o sinal em px porque usd é sempre positivo */
    C.addMov(P.st, { tipo: 'trade_res', cart: cart, usd: Math.abs(res), px: res >= 0 ? 1 : -1, dt: P.val('fDt') || C.hoje(), nota: at });
    P.save(); P.closeModal(); P.render();
  };
};

P.formBanca = function (tipo) {
  if (P.precisaCarteira(function () { P.formBanca(tipo); })) return;
  var dep = tipo === 'dep';
  P.modal(dep ? 'Aportar na banca' : 'Sacar da banca',
    '<div class="frow"><div class="fg"><label>Valor (US$)</label><input id="fV" type="number" step="any" inputmode="decimal"></div>'
    + '<div class="fg"><label>Data</label><input id="fDt" type="date" value="' + C.hoje() + '" max="' + C.hoje() + '"></div></div>'
    + '<div class="fg"><label>Carteira</label><select id="fCart">' + P.optCarteiras() + '</select></div>'
    + '<div class="fhint">Aporte e saque movem a banca mas <b>não são resultado</b>. Sua rentabilidade continua medindo só o que os trades produziram.</div>',
    { footer: '<button class="btn btn-p" id="okB">Salvar</button>' });
  document.getElementById('okB').onclick = function () {
    var v = P.num('fV'); if (!v || v <= 0) return alert('Informe um valor positivo.');
    C.addMov(P.st, { tipo: dep ? 'trade_dep' : 'trade_saq', cart: P.val('fCart') || P.st.carteiras[0].id, usd: v, dt: P.val('fDt') || C.hoje() });
    P.save(); P.closeModal(); P.render();
  };
};

P.vTrade = function () {
  var e = P.esc, S = P.tradeResumo();
  document.getElementById('pgTitle').textContent = 'Trade';
  document.getElementById('pgSub').textContent = 'Operações, gestão de banca e as métricas que realmente medem um sistema';
  document.getElementById('btnAdd').onclick = P.formOp;

  if (!S.n && !S.depositos) {
    document.getElementById('pg').innerHTML = P.vazio(
      'Nenhuma operação registrada',
      'Aporte na banca e registre suas operações. Você passa a ver win rate, profit factor, expectativa por operação e drawdown máximo — as métricas que dizem se o sistema é ganhador.',
      '<div class="zero-acts"><button class="btn btn-p" id="btnDep">Aportar na banca</button><button class="btn btn-g" id="btnOp">Registrar operação</button></div>'
    ) + P.planosCTA();
    document.getElementById('btnDep').onclick = function () { P.formBanca('dep'); };
    document.getElementById('btnOp').onclick = P.formOp;
    return;
  }

  var html = '<div class="mgrid">'
    + P.cardNeutro('Banca atual', P.money(S.banca), 'var(--purple,#9945FF)',
        'aportado: ' + P.money(S.depositos) + (S.saques ? ' · sacado: ' + P.money(S.saques) : ''), S.banca)
    + P.card('Resultado dos trades', P.money(S.resultado), 'var(--green,#14F195)',
        '<span class="' + P.cls(S.rentabilidade) + '">' + P.pct(S.rentabilidade) + '</span> sobre o aportado', S.resultado)
    + P.cardNeutro('Win rate', S.winRate.toFixed(0) + '%', 'var(--cyan,#00E5FF)',
        S.vitorias + ' ganhos · ' + S.derrotas + ' perdas', S.winRate, 'n')
    + P.card('Expectativa / operação', P.money(S.expectativa), 'var(--gold,#F5B614)',
        'quanto se espera ganhar por trade', S.expectativa)
    + '</div>';

  /* Métricas que separam sistema ganhador de sorte. */
  html += '<div class="resumo-bar resumo-4">'
    + '<div><span class="rb-lbl">Profit factor <i class="hint" title="Soma dos ganhos dividida pela soma das perdas. Acima de 1 o sistema ganha dinheiro; abaixo, perde.">?</i></span>'
    + '<b class="' + (S.profitFactor >= 1 ? 'up' : 'down') + '">' + (S.profitFactor === Infinity ? '∞' : S.profitFactor.toFixed(2)) + '</b><small>' + (S.profitFactor >= 1 ? 'sistema ganhador' : 'sistema perdedor') + '</small></div>'
    + '<div><span class="rb-lbl">Payoff <i class="hint" title="Ganho médio dividido pela perda média. Payoff alto compensa win rate baixo.">?</i></span>'
    + '<b>' + S.payoff.toFixed(2) + '</b><small>ganho médio ' + P.money(S.mediaGanho) + '</small></div>'
    + '<div><span class="rb-lbl">Drawdown máximo <i class="hint" title="A maior queda da banca a partir de um topo. Mede o pior momento que você atravessou.">?</i></span>'
    + '<b class="' + (S.drawdownMax > 30 ? 'down' : '') + '">' + S.drawdownMax.toFixed(1) + '%</b><small>maior perda ' + P.money(S.maiorPerda) + '</small></div>'
    + '<div><span class="rb-lbl">Gestão da banca</span>'
    + '<div class="rb-acts"><button class="btn btn-g btn-sm" id="btnDep">+ Aporte</button><button class="btn btn-g btn-sm" id="btnSaq">− Saque</button></div></div>'
    + '</div>';

  html += '<div class="grid2b">' + P.grafCard('chTC', 'Evolução da banca', true) + P.grafCard('chTO', 'Resultado por operação', true) + '</div>';

  var ops = P.st.trades.filter(function (o) { return P.cart() === 'all' || o.cart === P.cart(); })
    .slice().sort(function (a, c) { return String(c.dt || '').localeCompare(String(a.dt || '')); });
  var lim = P.histLim();
  var rows = ops.slice(0, lim).map(function (o) {
    return '<tr><td class="mono" style="color:var(--mut)">' + P.dBR(o.dt) + '</td><td><b>' + e(o.ativo) + '</b></td>'
      + '<td><span class="badge ' + (o.dir === 'L' ? 'b-open' : 'b-closed') + '">' + (o.dir === 'L' ? 'Long' : 'Short') + '</span></td>'
      + '<td class="num mono">' + (o.alav || 1) + 'x</td>'
      + '<td class="num"><span class="res-pill ' + (o.res >= 0 ? 'res-up' : 'res-dn') + '">' + P.money(o.res) + '</span></td>'
      + '<td style="color:var(--mut);font-size:12px;max-width:280px">' + e(o.txt || '—') + '</td></tr>';
  }).join('');
  html += '<div class="card"><div class="card-hd"><div class="card-title">Operações</div><div class="right">' + P.exportBtn('trade') + '</div></div>'
    + '<div class="tblw"><table style="min-width:720px"><thead><tr><th>Data</th><th>Ativo</th><th>Direção</th><th class="num">Alav.</th><th class="num">Resultado</th><th>Anotação</th></tr></thead><tbody>'
    + (rows || '<tr><td colspan="6"><div class="empty">Nenhuma operação ainda</div></td></tr>') + '</tbody></table></div></div>';

  html += P.planosCTA();
  document.getElementById('pg').innerHTML = html;

  document.getElementById('btnDep').onclick = function () { P.formBanca('dep'); };
  document.getElementById('btnSaq').onclick = function () { P.formBanca('saq'); };

  P.exporters = {
    trade: function () {
      var L = [['Data', 'Ativo', 'Direcao', 'Alavancagem', 'Resultado USD', 'Anotacao']];
      P.st.trades.forEach(function (o) { L.push([o.dt, o.ativo, o.dir === 'L' ? 'Long' : 'Short', o.alav || 1, (o.res || 0).toFixed(2), o.txt || '']); });
      P.exportCSV('mundodefi-trade', L);
    }
  };

  var r = P.rt();
  P.mkChart('chTC', {
    type: 'line',
    data: {
      labels: S.curva.map(function (c) { var p = String(c.dt).split('-'); return p[2] + '/' + p[1]; }),
      datasets: [{ data: S.curva.map(function (c) { return Math.round(c.v * r); }), borderColor: '#00E5FF', borderWidth: 2.2, pointRadius: 2, pointBackgroundColor: '#00E5FF', fill: true, backgroundColor: 'rgba(0,229,255,.08)', tension: .25 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: P.moneyCb() } } }, scales: { x: { grid: { display: false }, ticks: P.gTicks() }, y: { grid: P.gGrid(), ticks: P.gTicks() } } }
  });
  var asc = P.st.trades.slice().sort(function (a, c) { return String(a.dt || '').localeCompare(String(c.dt || '')); });
  P.mkChart('chTO', {
    type: 'bar',
    data: { labels: asc.map(function (o, i) { return '#' + (i + 1) + ' ' + o.ativo; }), datasets: [{ data: asc.map(function (o) { return Math.round((Number(o.res) || 0) * r); }), backgroundColor: asc.map(function (o) { return o.res >= 0 ? 'rgba(20,241,149,.65)' : 'rgba(255,77,106,.65)'; }), borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: P.moneyCb() } } }, scales: { x: { grid: { display: false }, ticks: P.gTicks() }, y: { grid: P.gGrid(), ticks: P.gTicks() } } }
  });
  P.countUps();
};

/* ══════════════════════════════════════════════════════════════════
   DADOS DE EXEMPLO — explícitos, nunca automáticos
   O v1 injetava isto no primeiro acesso e a pessoa achava que era dela.
   ══════════════════════════════════════════════════════════════════ */
P.carregarExemplo = function () {
  if (P.st.mov.length && !confirm('Isso adiciona dados de exemplo ao que você já tem. Continuar?')) return;
  function m(n) { var d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10); }
  var st = P.st;
  var c1 = { id: C.uid(), nome: 'Phantom (exemplo)' };
  var c2 = { id: C.uid(), nome: 'MetaMask (exemplo)' };
  st.carteiras.push(c1, c2);

  var btc = { id: C.uid(), tk: 'BTC', cg: 'bitcoin', cart: c2.id, last: 61000 };
  var eth = { id: C.uid(), tk: 'ETH', cg: 'ethereum', cart: c2.id, last: 1700 };
  var sol = { id: C.uid(), tk: 'SOL', cg: 'solana', cart: c1.id, last: 80 };
  st.ativos.push(btc, eth, sol);

  C.addMov(st, { tipo: 'compra', ref: btc.id, cart: c2.id, qtd: 0.08, px: 44500, fee: 12, dt: m(9) });
  C.addMov(st, { tipo: 'compra', ref: btc.id, cart: c2.id, qtd: 0.04, px: 56800, fee: 9, dt: m(3) });
  C.addMov(st, { tipo: 'compra', ref: eth.id, cart: c2.id, qtd: 1.5, px: 2350, fee: 7, dt: m(8) });
  C.addMov(st, { tipo: 'compra', ref: sol.id, cart: c1.id, qtd: 60, px: 68, fee: 5, dt: m(10) });
  C.addMov(st, { tipo: 'venda',  ref: sol.id, cart: c1.id, qtd: 15, px: 112, fee: 4, dt: m(2) });

  var p1 = { id: C.uid(), par: 'SOL/USDC', proto: 'Orca', chain: 'Solana', cart: c1.id, st: 'e', ab: m(10), en: m(7),
             cur: { usd: 0, tok: '', at: m(7) }, di: { obj: 'Renda em dólar com par líquido' }, notas: [], reb: [] };
  var p2 = { id: C.uid(), par: 'SOL/USDC', proto: 'Orca', chain: 'Solana', cart: c1.id, st: 'a', ab: m(2), en: null,
             cur: { usd: 3120, tok: '21,4 SOL + 1.310 USDC', at: C.hoje() }, di: { obj: 'Range médio' }, notas: [], reb: [],
             il: { a: { cg: 'solana', sym: 'SOL', px0: 112 }, b: { cg: 'usd-coin', sym: 'USDC', px0: 1 }, w: 0.5 } };
  st.pools.push(p1, p2);
  C.addMov(st, { tipo: 'pool_dep', ref: p1.id, cart: c1.id, usd: 2000, dt: m(10) });
  C.addMov(st, { tipo: 'pool_fee', ref: p1.id, cart: c1.id, usd: 133, dt: m(8) });
  C.addMov(st, { tipo: 'pool_ret', ref: p1.id, cart: c1.id, usd: 2245, dt: m(7) });
  C.addMov(st, { tipo: 'pool_dep', ref: p2.id, cart: c1.id, usd: 3000, dt: m(2) });
  C.addMov(st, { tipo: 'pool_fee', ref: p2.id, cart: c1.id, usd: 96, dt: m(1) });

  var l1 = { id: C.uid(), plat: 'Kamino', chain: 'Solana', tipo: 's', tk: 'USDC', cart: c1.id, apy: 8.4, st: 'a', ab: m(4) };
  st.lend.push(l1);
  C.addMov(st, { tipo: 'lend_sup', ref: l1.id, cart: c1.id, usd: 1500, dt: m(4) });
  C.addMov(st, { tipo: 'lend_juros', ref: l1.id, cart: c1.id, usd: 42, dt: m(1) });

  C.addMov(st, { tipo: 'trade_dep', cart: c1.id, usd: 1000, dt: m(3) });
  [['BTC', 'L', 5, 120, m(2)], ['SOL', 'S', 3, -45, m(2)], ['ETH', 'L', 5, 105, m(1)]].forEach(function (t) {
    st.trades.push({ id: C.uid(), dt: t[4], ativo: t[0], dir: t[1], alav: t[2], res: t[3], txt: 'Operação de exemplo', cart: c1.id });
    C.addMov(st, { tipo: 'trade_res', cart: c1.id, usd: Math.abs(t[3]), px: t[3] >= 0 ? 1 : -1, dt: t[4], nota: t[0] });
  });

  P.save();
  P.loadPrices().then(function () { P.render(); });
  P.render();
};

/* ══════════════════ PÁGINAS ══════════════════ */
P.pageDash  = function () { P.boot('dash',  P.vDash);  };
P.pageHold  = function () { P.boot('hold',  P.vHold);  };
P.pageDefi  = function () { P.boot('defi',  P.vDefi);  };
P.pageTrade = function () { P.boot('trade', P.vTrade); };

})();
