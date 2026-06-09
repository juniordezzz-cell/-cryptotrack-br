/* ════════════════════════════════════════════════════════════════════
   MUNDODEFI · CORE COMPARTILHADO
   Estado, persistência (localStorage + Firebase), CoinGecko, cálculos.
   Todas as páginas (dashboard, hold, defi, trade) importam este arquivo.
   ════════════════════════════════════════════════════════════════════ */

/* ─── Firebase (compat SDK, carregado via <script> nas páginas) ─── */
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

  /* ─── ESTADO PADRÃO ─── */
  function defaultState() {
    return {
      v: 1,
      config: { meta: 50000, pHold: 40, pDefi: 30, pTrade: 20, pCaixa: 10, moeda: 'usd' },
      hold:  { ativos: [] },   // {id, coinId, ticker, name, qty, precoMedio, precoAtual, img}
      defi:  { posicoes: [] },  // {id, protocolo, tipo, capital, apr, lucroAcum, status}
      trade: { operacoes: [], bancaInicial: 0 } // {id, data, ativo, tipo, entrada, saida, resultado, obs}
    };
  }

  var st = defaultState();

  /* ════════════ PERSISTÊNCIA ════════════ */
  function loadLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        st = Object.assign(defaultState(), parsed);
        st.config = Object.assign(defaultState().config, parsed.config || {});
        st.hold   = Object.assign(defaultState().hold,   parsed.hold   || {});
        st.defi   = Object.assign(defaultState().defi,   parsed.defi   || {});
        st.trade  = Object.assign(defaultState().trade,  parsed.trade  || {});
      }
    } catch (e) { console.warn('loadLocal falhou', e); }
    return st;
  }

  function saveLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(st)); } catch (e) {}
  }

  function save() {
    saveLocal();
    if (currentUser && fbDB) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveFS, 800);
    }
  }

  function saveFS() {
    if (!currentUser || !fbDB) return;
    fbDB.collection('portfolios').doc(currentUser.uid)
      .set({ state: st, updatedAt: new Date().toISOString() })
      .catch(function (e) { console.warn('saveFS falhou', e); });
  }

  function loadFS(cb) {
    if (!currentUser || !fbDB) { if (cb) cb(); return; }
    fbDB.collection('portfolios').doc(currentUser.uid).get()
      .then(function (doc) {
        if (doc.exists && doc.data().state) {
          var remote = doc.data().state;
          st = Object.assign(defaultState(), remote);
          st.config = Object.assign(defaultState().config, remote.config || {});
          st.hold   = Object.assign(defaultState().hold,   remote.hold   || {});
          st.defi   = Object.assign(defaultState().defi,   remote.defi   || {});
          st.trade  = Object.assign(defaultState().trade,  remote.trade  || {});
          saveLocal();
        } else {
          saveFS(); // primeira vez: empurra estado local pra nuvem
        }
        if (cb) cb();
      })
      .catch(function (e) { console.warn('loadFS falhou', e); if (cb) cb(); });
  }

  /* ════════════ FIREBASE INIT + AUTH ════════════ */
  function initFirebase(onAuthChange) {
    if (typeof firebase === 'undefined') {
      console.warn('SDK Firebase não carregado — modo offline (só localStorage)');
      if (onAuthChange) onAuthChange(null);
      return;
    }
    try {
      fbApp = firebase.initializeApp(firebaseConfig);
      fbAuth = firebase.auth();
      fbDB = firebase.firestore();
      fbAuth.onAuthStateChanged(function (user) {
        currentUser = user;
        if (user) {
          loadFS(function () { if (onAuthChange) onAuthChange(user); });
        } else {
          if (onAuthChange) onAuthChange(null);
        }
      });
    } catch (e) {
      console.warn('initFirebase falhou', e);
      if (onAuthChange) onAuthChange(null);
    }
  }

  function login(email, pass) {
    return fbAuth.signInWithEmailAndPassword(email, pass);
  }
  function register(email, pass) {
    return fbAuth.createUserWithEmailAndPassword(email, pass);
  }
  function loginGoogle() {
    var p = new firebase.auth.GoogleAuthProvider();
    return fbAuth.signInWithPopup(p);
  }
  function logout() {
    return fbAuth.signOut();
  }
  function getUser() { return currentUser; }

  /* ════════════ COINGECKO (preços reais) ════════════ */
  var CG = 'https://api.coingecko.com/api/v3';
  var priceCache = {};

  function searchCoin(query) {
    return fetch(CG + '/search?query=' + encodeURIComponent(query))
      .then(function (r) { return r.json(); })
      .then(function (d) { return (d.coins || []).slice(0, 8); });
  }

  function fetchPrices(coinIds, vs) {
    vs = vs || st.config.moeda || 'usd';
    if (!coinIds.length) return Promise.resolve({});
    var ids = coinIds.join(',');
    return fetch(CG + '/simple/price?ids=' + encodeURIComponent(ids) +
                 '&vs_currencies=' + vs + '&include_24hr_change=true')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        Object.keys(d).forEach(function (id) {
          priceCache[id] = { price: d[id][vs], change24h: d[id][vs + '_24h_change'] || 0 };
        });
        return priceCache;
      })
      .catch(function (e) { console.warn('fetchPrices falhou', e); return {}; });
  }

  // Atualiza precoAtual de todos os ativos HOLD via CoinGecko
  function refreshHoldPrices(cb) {
    var ids = st.hold.ativos.map(function (a) { return a.coinId; }).filter(Boolean);
    if (!ids.length) { if (cb) cb(); return; }
    fetchPrices(ids).then(function (prices) {
      st.hold.ativos.forEach(function (a) {
        if (prices[a.coinId]) {
          a.precoAtual = prices[a.coinId].price;
          a.change24h = prices[a.coinId].change24h;
        }
      });
      save();
      if (cb) cb();
    });
  }

  /* ════════════ CÁLCULOS — HOLD ════════════ */
  function hValorAtivo(a)   { return (a.qty || 0) * (a.precoAtual || 0); }
  function hCustoAtivo(a)   { return (a.qty || 0) * (a.precoMedio || 0); }
  function hLucroAtivo(a)   { return hValorAtivo(a) - hCustoAtivo(a); }
  function hPatrimonio()    { return st.hold.ativos.reduce(function (s, a) { return s + hValorAtivo(a); }, 0); }
  function hCusto()         { return st.hold.ativos.reduce(function (s, a) { return s + hCustoAtivo(a); }, 0); }
  function hLucro()         { return hPatrimonio() - hCusto(); }
  function hRentabilidade() { var c = hCusto(); return c > 0 ? (hLucro() / c * 100) : 0; }

  /* ════════════ CÁLCULOS — DEFI ════════════ */
  function dPatrimonio() { return st.defi.posicoes.reduce(function (s, p) { return s + (p.capital || 0) + (p.lucroAcum || 0); }, 0); }
  function dCapital()    { return st.defi.posicoes.reduce(function (s, p) { return s + (p.capital || 0); }, 0); }
  function dLucro()      { return st.defi.posicoes.reduce(function (s, p) { return s + (p.lucroAcum || 0); }, 0); }
  function dAPRMedio() {
    var ativas = st.defi.posicoes.filter(function (p) { return p.status === 'ativa'; });
    if (!ativas.length) return 0;
    var totCap = ativas.reduce(function (s, p) { return s + (p.capital || 0); }, 0);
    if (totCap === 0) return 0;
    return ativas.reduce(function (s, p) { return s + (p.apr || 0) * (p.capital || 0); }, 0) / totCap;
  }
  function dRendaMensal() {
    // renda estimada = capital ativo * APR / 12
    return st.defi.posicoes
      .filter(function (p) { return p.status === 'ativa'; })
      .reduce(function (s, p) { return s + (p.capital || 0) * (p.apr || 0) / 100 / 12; }, 0);
  }

  /* ════════════ CÁLCULOS — TRADE ════════════ */
  function tLucro()      { return st.trade.operacoes.reduce(function (s, o) { return s + (o.resultado || 0); }, 0); }
  function tBancaAtual() { return (st.trade.bancaInicial || 0) + tLucro(); }
  function tTotalOps()   { return st.trade.operacoes.length; }
  function tWins()       { return st.trade.operacoes.filter(function (o) { return (o.resultado || 0) > 0; }).length; }
  function tLosses()     { return st.trade.operacoes.filter(function (o) { return (o.resultado || 0) < 0; }).length; }
  function tWinRate()    { var n = tTotalOps(); return n > 0 ? (tWins() / n * 100) : 0; }

  /* ════════════ CÁLCULOS — CONSOLIDADO (dashboard) ════════════ */
  function patrimonioTotal() { return hPatrimonio() + dPatrimonio() + tBancaAtual(); }
  function lucroTotal()      { return hLucro() + dLucro() + tLucro(); }
  function capitalInvestido() { return hCusto() + dCapital() + (st.trade.bancaInicial || 0); }
  function rendaPassivaMensal() { return dRendaMensal(); }
  function rentabilidadeTotal() {
    var inv = capitalInvestido();
    return inv > 0 ? (lucroTotal() / inv * 100) : 0;
  }

  // Melhor / pior ativo (HOLD), melhor estratégia (DeFi), maior lucro/perda
  function insights() {
    var melhorAtivo = null, piorAtivo = null;
    st.hold.ativos.forEach(function (a) {
      var rent = hCustoAtivo(a) > 0 ? hLucroAtivo(a) / hCustoAtivo(a) * 100 : 0;
      if (!melhorAtivo || rent > melhorAtivo.rent) melhorAtivo = { nome: a.ticker, rent: rent, lucro: hLucroAtivo(a) };
      if (!piorAtivo || rent < piorAtivo.rent) piorAtivo = { nome: a.ticker, rent: rent, lucro: hLucroAtivo(a) };
    });
    var melhorEstrategia = null;
    st.defi.posicoes.forEach(function (p) {
      if (!melhorEstrategia || (p.apr || 0) > melhorEstrategia.apr)
        melhorEstrategia = { nome: p.protocolo, tipo: p.tipo, apr: p.apr || 0 };
    });
    // maior lucro/perda individual entre todos os módulos
    var todos = [];
    st.hold.ativos.forEach(function (a) { todos.push({ nome: a.ticker + ' (HOLD)', v: hLucroAtivo(a) }); });
    st.defi.posicoes.forEach(function (p) { todos.push({ nome: p.protocolo + ' (DeFi)', v: p.lucroAcum || 0 }); });
    st.trade.operacoes.forEach(function (o) { todos.push({ nome: o.ativo + ' (Trade)', v: o.resultado || 0 }); });
    var maiorLucro = null, maiorPerda = null;
    todos.forEach(function (t) {
      if (!maiorLucro || t.v > maiorLucro.v) maiorLucro = t;
      if (!maiorPerda || t.v < maiorPerda.v) maiorPerda = t;
    });
    return { melhorAtivo: melhorAtivo, piorAtivo: piorAtivo, melhorEstrategia: melhorEstrategia,
             maiorLucro: maiorLucro, maiorPerda: maiorPerda };
  }

  /* ════════════ FORMATAÇÃO ════════════ */
  function moedaSimbolo() { return st.config.moeda === 'brl' ? 'R$' : '$'; }
  function fmt(v) {
    v = v || 0;
    return moedaSimbolo() + ' ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtS(v) {
    v = v || 0;
    return (v >= 0 ? '+' : '−') + ' ' + moedaSimbolo() + ' ' +
           Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtPct(v) { v = v || 0; return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ════════════ MENU SUPERIOR (injetado em todas as páginas) ════════════ */
  function renderNav(active) {
    var items = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊', href: 'dashboard.html' },
      { id: 'hold',      label: 'HOLD',      icon: '💎', href: 'hold.html' },
      { id: 'defi',      label: 'DeFi',      icon: '🌊', href: 'defi.html' },
      { id: 'trade',     label: 'Trade',     icon: '⚡', href: 'trade.html' }
    ];
    var nav = items.map(function (it) {
      return '<a href="' + it.href + '" class="nav-item' + (it.id === active ? ' active' : '') + '">' +
             '<span class="nav-ico">' + it.icon + '</span>' + it.label + '</a>';
    }).join('');

    return '<header class="topbar">' +
      '<a href="dashboard.html" class="brand"><span class="brand-mundo">Mundo</span><span class="brand-defi">DeFi</span></a>' +
      '<nav class="topnav">' + nav + '</nav>' +
      '<div class="topbar-right">' +
        '<span class="tb-total" id="nav-total">' + fmt(patrimonioTotal()) + '</span>' +
        '<button class="tb-btn" id="nav-auth" onclick="MDFI.openAuthFromNav()">Entrar</button>' +
      '</div>' +
    '</header>';
  }

  function mountNav(active) {
    var mount = document.getElementById('nav-mount');
    if (mount) mount.innerHTML = renderNav(active);
  }

  function updateNavTotal() {
    var el = document.getElementById('nav-total');
    if (el) el.textContent = fmt(patrimonioTotal());
  }

  function updateNavAuth(user) {
    var btn = document.getElementById('nav-auth');
    if (!btn) return;
    if (user) {
      var name = user.displayName || user.email || 'U';
      btn.textContent = name.slice(0, 12);
      btn.classList.add('logged');
      btn.onclick = function () { if (confirm('Sair da conta?')) logout(); };
    } else {
      btn.textContent = 'Entrar';
      btn.classList.remove('logged');
      btn.onclick = function () { MDFI.openAuthFromNav(); };
    }
  }

  // hook que cada página pode sobrescrever para abrir seu modal de login
  function openAuthFromNav() {
    if (typeof window.openAuthModal === 'function') window.openAuthModal();
    else alert('Faça login pela página principal.');
  }

  /* ════════════ API PÚBLICA ════════════ */
  return {
    st: function () { return st; },
    defaultState: defaultState,
    loadLocal: loadLocal, save: save, saveLocal: saveLocal,
    initFirebase: initFirebase, loadFS: loadFS,
    login: login, register: register, loginGoogle: loginGoogle, logout: logout, getUser: getUser,
    searchCoin: searchCoin, fetchPrices: fetchPrices, refreshHoldPrices: refreshHoldPrices,
    // HOLD
    hValorAtivo: hValorAtivo, hCustoAtivo: hCustoAtivo, hLucroAtivo: hLucroAtivo,
    hPatrimonio: hPatrimonio, hCusto: hCusto, hLucro: hLucro, hRentabilidade: hRentabilidade,
    // DEFI
    dPatrimonio: dPatrimonio, dCapital: dCapital, dLucro: dLucro, dAPRMedio: dAPRMedio, dRendaMensal: dRendaMensal,
    // TRADE
    tLucro: tLucro, tBancaAtual: tBancaAtual, tTotalOps: tTotalOps, tWins: tWins, tLosses: tLosses, tWinRate: tWinRate,
    // CONSOLIDADO
    patrimonioTotal: patrimonioTotal, lucroTotal: lucroTotal, capitalInvestido: capitalInvestido,
    rendaPassivaMensal: rendaPassivaMensal, rentabilidadeTotal: rentabilidadeTotal, insights: insights,
    // FORMAT
    fmt: fmt, fmtS: fmtS, fmtPct: fmtPct, uid: uid, moedaSimbolo: moedaSimbolo,
    // NAV
    mountNav: mountNav, updateNavTotal: updateNavTotal, updateNavAuth: updateNavAuth, openAuthFromNav: openAuthFromNav
  };
})();
