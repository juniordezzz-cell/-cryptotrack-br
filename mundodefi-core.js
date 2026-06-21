/* ════════════════════════════════════════════════════════════════════
   MUNDODEFI · CORE COMPARTILHADO  (v2 — múltiplas carteiras)
   ════════════════════════════════════════════════════════════════════ */

var firebaseConfig = {
  apiKey: "AIzaSyCvHDXyRfaozjHKL0S9zvs9C00NS6Bd8cs",
  authDomain: "cryptotrack-br.firebaseapp.com",
  projectId: "cryptotrack-br",
  storageBucket: "cryptotrack-br.firebasestorage.app",
  messagingSenderId: "641396446846",
  appId: "1:641396446846:web:279a8b79d2e94f3f30ea2f",
  measurementId: "G-998VR1EZZ0"
};

var MDFI = (function () {
  'use strict';

  var fbApp = null, fbAuth = null, fbDB = null, currentUser = null;
  var saveTimer = null;
  var STORAGE_KEY = 'mundodefi_state';

  var PLAN_LIMITS = { free: 1, pro: 3, premium: Infinity };
  var PLAN_LABELS = { free: 'Gratuito', pro: 'PRO', premium: 'Premium' };

  function emptyWallet(nome) {
    return {
      id: 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nome: nome || 'Carteira Principal',
      hold:  { ativos: [] },
      defi:  { posicoes: [] },
      trade: { operacoes: [], bancaInicial: 0 }
    };
  }

  function defaultState() {
    var w = emptyWallet('Carteira Principal');
    return {
      v: 2, plano: 'free', carteiraAtiva: w.id, carteiras: [w],
      config: { meta: 50000, pHold: 40, pDefi: 30, pTrade: 20, pCaixa: 10, moeda: 'usd' }
    };
  }

  var st = defaultState();

  function migrate(parsed) {
    if (parsed && !parsed.carteiras && (parsed.hold || parsed.defi || parsed.trade)) {
      var w = emptyWallet('Carteira Principal');
      w.hold = parsed.hold || w.hold;
      w.defi = parsed.defi || w.defi;
      w.trade = parsed.trade || w.trade;
      return { v: 2, plano: parsed.plano || 'free', carteiraAtiva: w.id, carteiras: [w],
               config: Object.assign(defaultState().config, parsed.config || {}) };
    }
    return null;
  }

  function normalize(parsed) {
    var mig = migrate(parsed);
    if (mig) return mig;
    var base = defaultState();
    var s = Object.assign(base, parsed || {});
    s.config = Object.assign(base.config, (parsed && parsed.config) || {});
    if (!s.carteiras || !s.carteiras.length) s.carteiras = [emptyWallet('Carteira Principal')];
    s.carteiras = s.carteiras.map(function (w) {
      w.hold = w.hold || { ativos: [] };
      w.defi = w.defi || { posicoes: [] };
      w.trade = w.trade || { operacoes: [], bancaInicial: 0 };
      if (!w.hold.ativos) w.hold.ativos = [];
      if (!w.defi.posicoes) w.defi.posicoes = [];
      if (!w.trade.operacoes) w.trade.operacoes = [];
      if (typeof w.trade.bancaInicial !== 'number') w.trade.bancaInicial = 0;
      return w;
    });
    if (!s.carteiras.find(function (w) { return w.id === s.carteiraAtiva; })) s.carteiraAtiva = s.carteiras[0].id;
    if (!s.plano) s.plano = 'free';
    return s;
  }

  function wallet() {
    var w = st.carteiras.find(function (x) { return x.id === st.carteiraAtiva; });
    if (!w) { w = st.carteiras[0]; st.carteiraAtiva = w.id; }
    return w;
  }

  /* PERSISTÊNCIA */
  function loadLocal() {
    try { var raw = localStorage.getItem(STORAGE_KEY); if (raw) st = normalize(JSON.parse(raw)); }
    catch (e) { console.warn('loadLocal', e); st = defaultState(); }
    return st;
  }
  function saveLocal() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(st)); } catch (e) {} }
  function save() { saveLocal(); if (currentUser && fbDB) { clearTimeout(saveTimer); saveTimer = setTimeout(saveFS, 800); } }
  function saveFS() {
    if (!currentUser || !fbDB) return;
    fbDB.collection('portfolios').doc(currentUser.uid)
      .set({ state: st, plano: st.plano, updatedAt: new Date().toISOString() }, { merge: true })
      .catch(function (e) { console.warn('saveFS', e); });
  }
  function loadFS(cb) {
    if (!currentUser || !fbDB) { if (cb) cb(); return; }
    fbDB.collection('portfolios').doc(currentUser.uid).get()
      .then(function (doc) {
        if (doc.exists) {
          var data = doc.data();
          if (data.state) st = normalize(data.state);
          if (data.plano) st.plano = data.plano;
          saveLocal();
        } else { saveFS(); }
        if (cb) cb();
      })
      .catch(function (e) { console.warn('loadFS', e); if (cb) cb(); });
  }

  /* FIREBASE + AUTH */
  function initFirebase(onAuthChange) {
    if (typeof firebase === 'undefined') { if (onAuthChange) onAuthChange(null); return; }
    try {
      fbApp = firebase.initializeApp(firebaseConfig);
      fbAuth = firebase.auth(); fbDB = firebase.firestore();
      fbAuth.onAuthStateChanged(function (user) {
        currentUser = user;
        if (user) loadFS(function () { if (onAuthChange) onAuthChange(user); });
        else { st.plano = 'free'; if (onAuthChange) onAuthChange(null); }
      });
    } catch (e) { console.warn('initFirebase', e); if (onAuthChange) onAuthChange(null); }
  }
  function login(e, p) { return fbAuth.signInWithEmailAndPassword(e, p); }
  function register(e, p) { return fbAuth.createUserWithEmailAndPassword(e, p); }
  function loginGoogle() { return fbAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
  function logout() { return fbAuth.signOut(); }
  function getUser() { return currentUser; }

  /* CARTEIRAS */
  function getPlano() { return st.plano || 'free'; }
  function planoLabel() { return PLAN_LABELS[getPlano()] || 'Gratuito'; }
  function limiteCarteiras() { return PLAN_LIMITS[getPlano()] != null ? PLAN_LIMITS[getPlano()] : 1; }
  function podeAddCarteira() { return st.carteiras.length < limiteCarteiras(); }
  function listarCarteiras() { return st.carteiras; }
  function carteiraAtivaId() { return st.carteiraAtiva; }
  function carteiraAtiva() { return wallet(); }
  function criarCarteira(nome) {
    if (!podeAddCarteira()) return { ok: false, motivo: 'limite', limite: limiteCarteiras(), plano: getPlano() };
    var w = emptyWallet(nome || ('Carteira ' + (st.carteiras.length + 1)));
    st.carteiras.push(w); st.carteiraAtiva = w.id; save();
    return { ok: true, carteira: w };
  }
  function trocarCarteira(id) { if (st.carteiras.find(function (w) { return w.id === id; })) { st.carteiraAtiva = id; save(); return true; } return false; }
  function renomearCarteira(id, nome) { var w = st.carteiras.find(function (x) { return x.id === id; }); if (w) { w.nome = nome; save(); return true; } return false; }
  function excluirCarteira(id) {
    if (st.carteiras.length <= 1) return { ok: false, motivo: 'ultima' };
    st.carteiras = st.carteiras.filter(function (w) { return w.id !== id; });
    if (st.carteiraAtiva === id) st.carteiraAtiva = st.carteiras[0].id;
    save(); return { ok: true };
  }

  /* COINGECKO */
  var CG = 'https://api.coingecko.com/api/v3';
  var priceCache = {};
  function searchCoin(q) { return fetch(CG + '/search?query=' + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (d) { return (d.coins || []).slice(0, 8); }); }
  function fetchPrices(ids, vs) {
    vs = vs || st.config.moeda || 'usd';
    if (!ids.length) return Promise.resolve({});
    return fetch(CG + '/simple/price?ids=' + encodeURIComponent(ids.join(',')) + '&vs_currencies=' + vs + '&include_24hr_change=true')
      .then(function (r) { return r.json(); })
      .then(function (d) { Object.keys(d).forEach(function (id) { priceCache[id] = { price: d[id][vs], change24h: d[id][vs + '_24h_change'] || 0 }; }); return priceCache; })
      .catch(function (e) { console.warn('fetchPrices', e); return {}; });
  }
  function refreshHoldPrices(cb) {
    var ativos = wallet().hold.ativos;
    var ids = ativos.map(function (a) { return a.coinId; }).filter(Boolean);
    if (!ids.length) { if (cb) cb(); return; }
    fetchPrices(ids).then(function (prices) {
      ativos.forEach(function (a) { if (prices[a.coinId]) { a.precoAtual = prices[a.coinId].price; a.change24h = prices[a.coinId].change24h; } });
      save(); if (cb) cb();
    });
  }

  /* HOLD */
  function hAtivos() { return wallet().hold.ativos; }
  function hValorAtivo(a) { return (a.qty || 0) * (a.precoAtual || 0); }
  function hCustoAtivo(a) { return (a.qty || 0) * (a.precoMedio || 0); }
  function hLucroAtivo(a) { return hValorAtivo(a) - hCustoAtivo(a); }
  function hPatrimonio() { return hAtivos().reduce(function (s, a) { return s + hValorAtivo(a); }, 0); }
  function hCusto() { return hAtivos().reduce(function (s, a) { return s + hCustoAtivo(a); }, 0); }
  function hLucro() { return hPatrimonio() - hCusto(); }
  function hRentabilidade() { var c = hCusto(); return c > 0 ? (hLucro() / c * 100) : 0; }

  /* DEFI */
  function dPosicoes() { return wallet().defi.posicoes; }
  function dPatrimonio() { return dPosicoes().reduce(function (s, p) { return s + (p.capital || 0) + (p.lucroAcum || 0); }, 0); }
  function dCapital() { return dPosicoes().reduce(function (s, p) { return s + (p.capital || 0); }, 0); }
  function dLucro() { return dPosicoes().reduce(function (s, p) { return s + (p.lucroAcum || 0); }, 0); }
  function dAPRMedio() {
    var a = dPosicoes().filter(function (p) { return p.status === 'ativa'; });
    var t = a.reduce(function (s, p) { return s + (p.capital || 0); }, 0);
    if (t === 0) return 0;
    return a.reduce(function (s, p) { return s + (p.apr || 0) * (p.capital || 0); }, 0) / t;
  }
  function dRendaMensal() { return dPosicoes().filter(function (p) { return p.status === 'ativa'; }).reduce(function (s, p) { return s + (p.capital || 0) * (p.apr || 0) / 100 / 12; }, 0); }

  /* TRADE */
  function tOps() { return wallet().trade.operacoes; }
  function tBancaIni() { return wallet().trade.bancaInicial || 0; }
  function tLucro() { return tOps().reduce(function (s, o) { return s + (o.resultado || 0); }, 0); }
  function tBancaAtual() { return tBancaIni() + tLucro(); }
  function tTotalOps() { return tOps().length; }
  function tWins() { return tOps().filter(function (o) { return (o.resultado || 0) > 0; }).length; }
  function tLosses() { return tOps().filter(function (o) { return (o.resultado || 0) < 0; }).length; }
  function tWinRate() { var n = tTotalOps(); return n > 0 ? (tWins() / n * 100) : 0; }

  /* CONSOLIDADO */
  function patrimonioTotal() { return hPatrimonio() + dPatrimonio() + tBancaAtual(); }
  function lucroTotal() { return hLucro() + dLucro() + tLucro(); }
  function capitalInvestido() { return hCusto() + dCapital() + tBancaIni(); }
  function rendaPassivaMensal() { return dRendaMensal(); }
  function rentabilidadeTotal() { var i = capitalInvestido(); return i > 0 ? (lucroTotal() / i * 100) : 0; }
  function insights() {
    var melhorAtivo = null, piorAtivo = null;
    hAtivos().forEach(function (a) {
      var r = hCustoAtivo(a) > 0 ? hLucroAtivo(a) / hCustoAtivo(a) * 100 : 0;
      if (!melhorAtivo || r > melhorAtivo.rent) melhorAtivo = { nome: a.ticker, rent: r, lucro: hLucroAtivo(a) };
      if (!piorAtivo || r < piorAtivo.rent) piorAtivo = { nome: a.ticker, rent: r, lucro: hLucroAtivo(a) };
    });
    var melhorEstrategia = null;
    dPosicoes().forEach(function (p) { if (!melhorEstrategia || (p.apr || 0) > melhorEstrategia.apr) melhorEstrategia = { nome: p.protocolo, tipo: p.tipo, apr: p.apr || 0 }; });
    var todos = [];
    hAtivos().forEach(function (a) { todos.push({ nome: a.ticker + ' (HOLD)', v: hLucroAtivo(a) }); });
    dPosicoes().forEach(function (p) { todos.push({ nome: p.protocolo + ' (DeFi)', v: p.lucroAcum || 0 }); });
    tOps().forEach(function (o) { todos.push({ nome: o.ativo + ' (Trade)', v: o.resultado || 0 }); });
    var maiorLucro = null, maiorPerda = null;
    todos.forEach(function (t) { if (!maiorLucro || t.v > maiorLucro.v) maiorLucro = t; if (!maiorPerda || t.v < maiorPerda.v) maiorPerda = t; });
    return { melhorAtivo: melhorAtivo, piorAtivo: piorAtivo, melhorEstrategia: melhorEstrategia, maiorLucro: maiorLucro, maiorPerda: maiorPerda };
  }

  /* FORMAT */
  function moedaSimbolo() { return st.config.moeda === 'brl' ? 'R$' : '$'; }
  function fmt(v) { v = v || 0; return moedaSimbolo() + ' ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtS(v) { v = v || 0; return (v >= 0 ? '+' : '−') + ' ' + moedaSimbolo() + ' ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtPct(v) { v = v || 0; return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* NAV */
  function renderNav(active) {
    var items = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/portfolio/dashboard.html' },
      { id: 'hold', label: 'HOLD', icon: '💎', href: '/portfolio/hold.html' },
      { id: 'defi', label: 'DeFi', icon: '🌊', href: '/portfolio/defi.html' },
      { id: 'trade', label: 'Trade', icon: '⚡', href: '/portfolio/trade.html' }
    ];
    var nav = items.map(function (it) {
      return '<a href="' + it.href + '" class="nav-item' + (it.id === active ? ' active' : '') + '"><span class="nav-ico">' + it.icon + '</span>' + it.label + '</a>';
    }).join('');
    return '<header class="topbar">' +
      '<a href="/index.html" class="brand" title="Voltar ao site"><span class="brand-back">‹</span> <span class="brand-mundo">Mundo</span><span class="brand-defi">DeFi</span></a>' +
      '<div class="wallet-selector" id="wallet-selector" onclick="MDFI.toggleWalletMenu(event)">' +
        '<span class="ws-ico">👛</span><span class="ws-name" id="ws-name">' + (wallet() ? wallet().nome : 'Carteira') + '</span><span class="ws-arrow">▾</span>' +
        '<div class="wallet-dropdown" id="wallet-dropdown"></div>' +
      '</div>' +
      '<nav class="topnav">' + nav + '</nav>' +
      '<div class="topbar-right"><span class="tb-total" id="nav-total">' + fmt(patrimonioTotal()) + '</span>' +
      '<button class="tb-btn" id="nav-auth" onclick="MDFI.openAuthFromNav()">Entrar</button></div>' +
    '</header>';
  }
  function mountNav(active) { var m = document.getElementById('nav-mount'); if (m) m.innerHTML = renderNav(active); renderWalletDropdown(); }
  function renderWalletDropdown() {
    var dd = document.getElementById('wallet-dropdown'); if (!dd) return;
    var lim = limiteCarteiras(); var limTxt = lim === Infinity ? '∞' : lim;
    var html = '<div class="wd-head">Suas carteiras <span class="wd-count">' + st.carteiras.length + '/' + limTxt + '</span></div>';
    html += st.carteiras.map(function (w) {
      var ativa = w.id === st.carteiraAtiva;
      return '<div class="wd-item' + (ativa ? ' active' : '') + '" onclick="MDFI.selecionarCarteira(\'' + w.id + '\',event)">' +
        '<span class="wd-dot"></span><span class="wd-name">' + w.nome + '</span>' + (ativa ? '<span class="wd-check">✓</span>' : '') +
        '<span class="wd-actions"><button class="wd-mini" title="Renomear" onclick="MDFI.promptRenomear(\'' + w.id + '\',event)">✏️</button>' +
        (st.carteiras.length > 1 ? '<button class="wd-mini del" title="Excluir" onclick="MDFI.promptExcluir(\'' + w.id + '\',event)">🗑</button>' : '') + '</span></div>';
    }).join('');
    if (podeAddCarteira()) html += '<div class="wd-add" onclick="MDFI.promptCriar(event)">＋ Nova carteira</div>';
    else html += '<div class="wd-upgrade" onclick="window.location.href=\'/planos.html\'">🔒 Limite do plano ' + planoLabel() + ' atingido<br><b>Fazer upgrade →</b></div>';
    html += '<div class="wd-plan">Plano atual: <b>' + planoLabel() + '</b></div>';
    dd.innerHTML = html;
  }
  function toggleWalletMenu(ev) { if (ev) ev.stopPropagation(); var dd = document.getElementById('wallet-dropdown'); if (dd) dd.classList.toggle('open'); }
  function closeWalletMenu() { var dd = document.getElementById('wallet-dropdown'); if (dd) dd.classList.remove('open'); }
  function selecionarCarteira(id, ev) {
    if (ev) ev.stopPropagation(); trocarCarteira(id); closeWalletMenu();
    var nm = document.getElementById('ws-name'); if (nm) nm.textContent = wallet().nome;
    if (typeof window.onWalletChange === 'function') window.onWalletChange();
  }
  function promptCriar(ev) {
    if (ev) ev.stopPropagation();
    var nome = prompt('Nome da nova carteira:', 'Carteira ' + (st.carteiras.length + 1));
    if (nome == null) return;
    var r = criarCarteira(nome.trim() || ('Carteira ' + (st.carteiras.length + 1)));
    if (!r.ok && r.motivo === 'limite') {
      if (confirm('Seu plano ' + planoLabel() + ' permite ' + r.limite + ' carteira(s).\nDeseja ver os planos PRO/Premium?')) window.location.href = '/planos.html';
      return;
    }
    renderWalletDropdown();
    var nm = document.getElementById('ws-name'); if (nm) nm.textContent = wallet().nome;
    if (typeof window.onWalletChange === 'function') window.onWalletChange();
  }
  function promptRenomear(id, ev) {
    if (ev) ev.stopPropagation();
    var w = st.carteiras.find(function (x) { return x.id === id; });
    var nome = prompt('Novo nome:', w ? w.nome : ''); if (nome == null || !nome.trim()) return;
    renomearCarteira(id, nome.trim()); renderWalletDropdown();
    var nm = document.getElementById('ws-name'); if (nm) nm.textContent = wallet().nome;
  }
  function promptExcluir(id, ev) {
    if (ev) ev.stopPropagation();
    var w = st.carteiras.find(function (x) { return x.id === id; });
    if (!confirm('Excluir a carteira "' + (w ? w.nome : '') + '"? Todos os dados dela serão perdidos.')) return;
    var r = excluirCarteira(id);
    if (!r.ok && r.motivo === 'ultima') { alert('Você precisa ter ao menos uma carteira.'); return; }
    renderWalletDropdown();
    var nm = document.getElementById('ws-name'); if (nm) nm.textContent = wallet().nome;
    if (typeof window.onWalletChange === 'function') window.onWalletChange();
  }
  function updateNavTotal() { var el = document.getElementById('nav-total'); if (el) el.textContent = fmt(patrimonioTotal()); }
  function updateNavAuth(user) {
    var btn = document.getElementById('nav-auth'); if (!btn) return;
    if (user) { var n = user.displayName || user.email || 'U'; btn.textContent = n.slice(0, 14); btn.classList.add('logged'); btn.onclick = function () { if (confirm('Sair da conta?')) logout(); }; }
    else { btn.textContent = 'Entrar'; btn.classList.remove('logged'); btn.onclick = function () { openAuthFromNav(); }; }
    renderWalletDropdown();
  }
  function openAuthFromNav() { if (typeof window.openAuthModal === 'function') window.openAuthModal(); else window.location.href = '/portfolio/dashboard.html'; }

  return {
    st: function () { return st; }, defaultState: defaultState,
    loadLocal: loadLocal, save: save, saveLocal: saveLocal,
    initFirebase: initFirebase, loadFS: loadFS,
    login: login, register: register, loginGoogle: loginGoogle, logout: logout, getUser: getUser,
    getPlano: getPlano, planoLabel: planoLabel, limiteCarteiras: limiteCarteiras, podeAddCarteira: podeAddCarteira,
    listarCarteiras: listarCarteiras, carteiraAtivaId: carteiraAtivaId, carteiraAtiva: carteiraAtiva,
    criarCarteira: criarCarteira, trocarCarteira: trocarCarteira, renomearCarteira: renomearCarteira, excluirCarteira: excluirCarteira,
    toggleWalletMenu: toggleWalletMenu, closeWalletMenu: closeWalletMenu, selecionarCarteira: selecionarCarteira,
    promptCriar: promptCriar, promptRenomear: promptRenomear, promptExcluir: promptExcluir, renderWalletDropdown: renderWalletDropdown,
    searchCoin: searchCoin, fetchPrices: fetchPrices, refreshHoldPrices: refreshHoldPrices,
    hAtivos: hAtivos, hValorAtivo: hValorAtivo, hCustoAtivo: hCustoAtivo, hLucroAtivo: hLucroAtivo,
    hPatrimonio: hPatrimonio, hCusto: hCusto, hLucro: hLucro, hRentabilidade: hRentabilidade,
    dPosicoes: dPosicoes, dPatrimonio: dPatrimonio, dCapital: dCapital, dLucro: dLucro, dAPRMedio: dAPRMedio, dRendaMensal: dRendaMensal,
    tOps: tOps, tBancaIni: tBancaIni, tLucro: tLucro, tBancaAtual: tBancaAtual, tTotalOps: tTotalOps, tWins: tWins, tLosses: tLosses, tWinRate: tWinRate,
    patrimonioTotal: patrimonioTotal, lucroTotal: lucroTotal, capitalInvestido: capitalInvestido,
    rendaPassivaMensal: rendaPassivaMensal, rentabilidadeTotal: rentabilidadeTotal, insights: insights,
    fmt: fmt, fmtS: fmtS, fmtPct: fmtPct, uid: uid, moedaSimbolo: moedaSimbolo,
    mountNav: mountNav, updateNavTotal: updateNavTotal, updateNavAuth: updateNavAuth, openAuthFromNav: openAuthFromNav
  };
})();

document.addEventListener('click', function (e) { if (!e.target.closest('#wallet-selector')) MDFI.closeWalletMenu(); });
