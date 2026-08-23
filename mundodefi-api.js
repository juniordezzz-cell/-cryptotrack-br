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

  /* ╔═ PARA A CHAVE VALER NO SITE INTEIRO ═══════════════════╗
     Onze arquivos batem na CoinGecko com fetch() próprio — cada um com o
     seu cache, o seu retry e, em dois casos, AbortController. Reescrever
     os onze para MDF_API.get seria o certo em arquitetura, mas mexeria em
     código de produção que funciona, em ferramentas com estilos
     diferentes, sem nenhum ganho para quem usa o site.

     Então aqui a gente só carimba a saída: se a URL é da CoinGecko e
     existe chave, o cabeçalho vai junto. Nada mais muda — nem o cache de
     cada página, nem o retry, nem o sinal de aborto.

     SEM CHAVE CONFIGURADA ISTO NÃO FAZ NADA: o fetch original fica
     intacto. Por isso o arquivo pode ser carregado em todo lugar desde
     já, e o dia em que a chave entrar, o site inteiro passa a usá-la.

     Custo conhecido: um cabeçalho fora da lista segura do CORS obriga o
     navegador a mandar um OPTIONS antes de cada chamada. A CoinGecko
     aceita também a chave em query string (x_cg_demo_api_key), que evita
     esse ida-e-volta — em troca de deixar a chave em histórico e log de
     proxy. Ficou no cabeçalho, que é o padrão mais limpo.
     ╚═════════════════════════════════════════════════════════════════╝ */
  function carimbarChave() {
    if (!API.chave) return;
    if (typeof window.fetch !== 'function' || typeof Headers !== 'function') return;
    if (window.fetch.__mdfChave) return;          /* não empilha em recarga */

    var original = window.fetch.bind(window);

    var carimbado = function (entrada, init) {
      var url = typeof entrada === 'string' ? entrada
              : (entrada && entrada.url) ? entrada.url : '';
      if (url.indexOf('api.coingecko.com') < 0) return original(entrada, init);

      var opts = {};
      if (init) for (var k in init) {
        if (Object.prototype.hasOwnProperty.call(init, k)) opts[k] = init[k];
      }
      var h = new Headers((init && init.headers) || (entrada && entrada.headers) || {});
      if (!h.has('x-cg-demo-api-key')) h.set('x-cg-demo-api-key', API.chave);
      opts.headers = h;
      return original(entrada, opts);
    };
    carimbado.__mdfChave = true;
    window.fetch = carimbado;
  }
  carimbarChave();

  window.MDF_API = API;
})();
