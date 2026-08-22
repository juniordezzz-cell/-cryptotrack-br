/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  MUNDODEFI · ACESSO À COINGECKO — PONTO ÚNICO                        ║
   ║                                                                      ║
   ║  12 arquivos batem na CoinGecko hoje, todos anônimos. O tier         ║
   ║  público é muito restrito: em tráfego real vira 429 e a home         ║
   ║  aparece vazia para quem chega.                                      ║
   ║                                                                      ║
   ║  ── PARA ATIVAR A CHAVE (2 minutos, gratuito) ───────────────────    ║
   ║  1. coingecko.com/en/api/pricing → plano Demo (grátis)               ║
   ║  2. copie a chave                                                    ║
   ║  3. cole em MDF_API.chave logo abaixo                                ║
   ║                                                                      ║
   ║  Só isso. Toda página que usar MDF_API passa a mandar a chave.       ║
   ║  A chave Demo é de leitura e pode ficar no cliente, mas restrinja    ║
   ║  por domínio no painel da CoinGecko.                                 ║
   ╚══════════════════════════════════════════════════════════════════════╝ */
(function () {
  'use strict';

  var API = {
    /* ↓↓↓ COLE SUA CHAVE AQUI ↓↓↓ */
    chave: '',
    /* ↑↑↑ deixe vazio para usar o tier público (sujeito a 429) ↑↑↑ */

    base: 'https://api.coingecko.com/api/v3'
  };

  /* Cabeçalho da chave Demo. Sem chave, vai sem cabeçalho nenhum. */
  function opcoes() {
    return API.chave ? { headers: { 'x-cg-demo-api-key': API.chave } } : {};
  }

  /* ── cache com TTL em localStorage ── */
  function cacheLer(k) {
    try {
      var o = JSON.parse(localStorage.getItem(k));
      if (o && (Date.now() - o.t) < o.ttl) return o.d;
    } catch (e) {}
    return null;
  }
  function cacheGravar(k, d, ttl) {
    try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), ttl: ttl, d: d })); } catch (e) {}
  }

  /* ── fetch com backoff ──
     429 recebe espera maior: insistir rápido em rate limit só piora. */
  function buscar(caminho, tentativas) {
    tentativas = tentativas || 3;
    var url = caminho.indexOf('http') === 0 ? caminho : API.base + caminho;
    return new Promise(function (resolve, reject) {
      (function tentar(i) {
        fetch(url, opcoes()).then(function (r) {
          if (r.status === 429) { var e = new Error('429'); e.rateLimit = true; throw e; }
          if (!r.ok) throw new Error(r.status);
          return r.json();
        }).then(resolve).catch(function (err) {
          if (i >= tentativas - 1) return reject(err);
          var espera = (err && err.rateLimit ? 5000 : 1200) * Math.pow(2, i);
          setTimeout(function () { tentar(i + 1); }, espera);
        });
      })(0);
    });
  }

  /* Busca com cache. Só vai na rede se o cache expirou. */
  API.get = function (caminho, ttlMs, tentativas) {
    var k = 'mdf.api.' + caminho;
    var c = cacheLer(k);
    if (c) return Promise.resolve(c);
    return buscar(caminho, tentativas).then(function (d) {
      cacheGravar(k, d, ttlMs || 5 * 60 * 1000);
      return d;
    });
  };

  /* Atualização periódica que respeita a aba.
     O padrão antigo da home era um setInterval fixo que apagava o cache e
     refazia a chamada mesmo com a aba escondida — gasto de cota à toa. */
  API.repetir = function (fn, intervaloMs) {
    var timer = null;
    function ligar() {
      if (timer) return;
      timer = setInterval(function () { if (!document.hidden) fn(); }, intervaloMs);
    }
    function desligar() { clearInterval(timer); timer = null; }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) desligar(); else { fn(); ligar(); }
    });
    ligar();
    return { parar: desligar };
  };

  /* Invalida uma entrada específica do cache (para forçar atualização). */
  API.invalidar = function (caminho) {
    try { localStorage.removeItem('mdf.api.' + caminho); } catch (e) {}
  };

  window.MDF_API = API;
})();
