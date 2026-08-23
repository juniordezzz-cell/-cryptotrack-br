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

  /* ╔══════════════════════════════════════════════════════════════════╗
     ║  DE ONDE VEM CADA DADO                                            ║
     ║                                                                   ║
     ║  A cota anônima da CoinGecko não aguenta um site com visitas: em   ║
     ║  teste, ~50 chamadas de um mesmo IP em poucos minutos já voltaram  ║
     ║  429. E a Demo dá 10.000 chamadas por MÊS — na conta deste site,   ║
     ║  cerca de 220 visitas por dia.                                     ║
     ║                                                                   ║
     ║  A CoinPaprika serve os mesmos dados de mercado SEM CHAVE, com     ║
     ║  20.000 chamadas/mês e resposta mais rápida. Então as duas         ║
     ║  chamadas que todo visitante da home dispara — a lista de mercado  ║
     ║  e o resumo global — passam a sair de lá, traduzidas para o        ║
     ║  formato da CoinGecko. Nenhuma página precisa saber disso.         ║
     ║                                                                   ║
     ║  ── O QUE NÃO MIGROU, E POR QUÊ ─────────────────────────────      ║
     ║  /search       a Paprika não devolve id da CoinGecko, e o site     ║
     ║                inteiro fala nesse id. Fora do top 250 a busca      ║
     ║                voltaria vazia — pior do que a cota que salvaria.   ║
     ║  /coins/{id}   a página de token usa ATL e valuation diluída, que  ║
     ║                a Paprika não tem. É 1 chamada por visita: risco    ║
     ║                alto, economia baixa.                               ║
     ║  /market_chart idem.                                               ║
     ║  ...&ids=X     forma pontual do /coins/markets, 1 por interação.   ║
     ║                                                                   ║
     ║  Qualquer erro cai na CoinGecko sozinho. Para desligar tudo isto   ║
     ║  de uma vez, sem deploy:  MDF_API.fonte = 'coingecko'              ║
     ╚══════════════════════════════════════════════════════════════════╝ */
  API.fonte = 'paprika';

  var PAPRIKA = 'https://api.coinpaprika.com/v1';
  var LOGO = 'https://static.coinpaprika.com/coin/';

  /* Mapa de ids, gerado por dev/gerar-mapa-ids.mjs. Guardamos o sentido
     Paprika→CoinGecko, que é o da tradução de resposta. */
  var cgDePk = null, mapaEmVoo = null;
  function mapa() {
    if (cgDePk) return Promise.resolve(cgDePk);
    if (mapaEmVoo) return mapaEmVoo;
    mapaEmVoo = fetch('/mundodefi-ids.json')
      .then(function (r) { if (!r.ok) throw new Error('mapa ' + r.status); return r.json(); })
      .then(function (d) {
        var rev = {};
        Object.keys(d.ids || {}).forEach(function (cg) { rev[d.ids[cg]] = cg; });
        cgDePk = rev;
        return rev;
      });
    return mapaEmVoo;
  }

  function paprika(caminho) {
    return fetch(PAPRIKA + caminho).then(function (r) {
      if (!r.ok) throw new Error('paprika ' + r.status);
      return r.json();
    });
  }

  /* A home pede a lista de mercado e o resumo global quase ao mesmo tempo,
     e as duas traduções precisam da mesma lista de tickers. Guardamos por um
     minuto em memória para virar UMA chamada, não duas. */
  var tickersMemo = null;
  /* Limite em degraus: com valor livre, duas traduções da mesma página
     pediriam 250 e 260 e o memo nunca casaria. */
  function degrau(n) {
    var degraus = [250, 500, 750, 1000];
    for (var i = 0; i < degraus.length; i++) if (n <= degraus[i]) return degraus[i];
    return 1000;
  }
  function tickers(fiat, limite) {
    limite = degrau(limite);
    var chave = fiat + '|' + limite;
    if (tickersMemo && tickersMemo.chave === chave && (Date.now() - tickersMemo.em) < 60000) {
      return tickersMemo.p;
    }
    var p = paprika('/tickers?quotes=' + fiat + '&limit=' + limite);
    tickersMemo = { chave: chave, em: Date.now(), p: p };
    p.catch(function () { tickersMemo = null; });   /* erro não se guarda */
    return p;
  }

  /* /global — capitalização total, domínio do BTC, volume.

     As duas fontes discordam em ~5% aqui, e não é erro de ninguém: a
     Paprika soma os tokens embrulhados (stETH, WBTC, WETH) no total, a
     CoinGecko não. Contar WBTC junto com BTC é contar o mesmo bitcoin duas
     vezes — e o número que o resto do mercado mostra é o da CoinGecko.

     Como o mapa veio da lista curada da CoinGecko, o que ficou de fora
     dele é exatamente esse conjunto. Descontando, $2,734 T vira $2,622 T
     contra $2,609 T da CoinGecko: 0,5% de diferença, menos do que sites de
     mercado divergem entre si num dia normal.

     O desconto olha só os 250 maiores, e não por preguiça: os embrulhados
     são todos de capitalização alta, então estão todos aí. Ir até 1000
     melhoraria o erro de 1,1% para 0,6% e custaria 600 KB a mais na home —
     ruím troca para quem abre o site no 4G. E 250 é exatamente o que a
     esteira já pede, então as duas traduções dividem UMA chamada.

     Se a lista de tickers falhar, mostra o total da Paprika sem desconto:
     número levemente alto é melhor que espaço vazio. */
  function traduzirGlobal() {
    var semDesconto = function (g) {
      return {
        data: {
          total_market_cap: { usd: g.market_cap_usd },
          total_volume: { usd: g.volume_24h_usd },
          market_cap_percentage: { btc: g.bitcoin_dominance_percentage },
          market_cap_change_percentage_24h_usd: g.market_cap_change_24h,
          active_cryptocurrencies: g.cryptocurrencies_number
        }
      };
    };
    return paprika('/global').then(function (g) {
      return Promise.all([mapa(), tickers('USD', 250)])
        .then(function (a) {
          var rev = a[0], lista = a[1], embrulhados = 0;
          lista.forEach(function (c) {
            if (rev[c.id]) return;
            var q = (c.quotes && c.quotes.USD) || {};
            embrulhados += q.market_cap || 0;
          });
          var d = semDesconto(g);
          var total = g.market_cap_usd - embrulhados;
          if (total > 0) {
            d.data.total_market_cap.usd = total;
            /* o domínio também muda de base ao tirar os embrulhados */
            if (g.bitcoin_dominance_percentage && g.market_cap_usd) {
              d.data.market_cap_percentage.btc =
                g.bitcoin_dominance_percentage * (g.market_cap_usd / total);
            }
          }
          return d;
        })
        .catch(function () { return semDesconto(g); });
    });
  }

  /* /coins/markets — a lista que alimenta a esteira da home e o seletor
     de moedas do conversor.

     A CoinPaprika ranqueia por capitalização bruta e por isso inclui
     token embrulhado: WBTC, stETH, WETH aparecem no top 20. A CoinGecko
     tira esses do ranking de propósito, e ela tem razão — "WETH" ao lado
     de "ETH" com preço quase igual é ruído. Como o mapa foi gerado a
     partir da lista curada da CoinGecko, filtrar por ele reproduz essa
     mesma curadoria de graça. */
  function traduzirMarkets(p) {
    var fiat = String(p.get('vs_currency') || 'usd').toUpperCase();
    var porPagina = parseInt(p.get('per_page'), 10) || 100;
    var pagina = parseInt(p.get('page'), 10) || 1;
    /* pede com folga, porque uma parte da lista vai cair no filtro */
    var teto = Math.min(2000, porPagina * pagina + 150);

    return Promise.all([mapa(), tickers(fiat, teto)])
      .then(function (a) {
        var rev = a[0], lista = a[1], fora = [];
        lista.forEach(function (c) {
          var cg = rev[c.id];
          if (!cg) return;
          var q = (c.quotes && c.quotes[fiat]) || {};
          fora.push({
            id: cg,
            symbol: String(c.symbol || '').toLowerCase(),
            name: c.name,
            image: LOGO + c.id + '/logo.png',
            current_price: q.price,
            market_cap: q.market_cap,
            total_volume: q.volume_24h,
            /* recontado depois do filtro: a posição precisa ser densa */
            market_cap_rank: fora.length + 1,
            price_change_percentage_24h: q.percent_change_24h,
            price_change_percentage_24h_in_currency: q.percent_change_24h,
            circulating_supply: c.circulating_supply,
            total_supply: c.total_supply,
            max_supply: c.max_supply
          });
        });
        var ini = (pagina - 1) * porPagina;
        return fora.slice(ini, ini + porPagina);
      });
  }

  /* Devolve uma Promise com o JSON já no formato da CoinGecko, ou null
     quando este caminho não é traduzido (aí segue para a CoinGecko). */
  function traduzir(caminho) {
    if (API.fonte !== 'paprika') return null;
    var partes = String(caminho || '').split('?');
    var rota = partes[0].replace(/\/+$/, '');
    var p;
    try { p = new URLSearchParams(partes[1] || ''); } catch (e) { return null; }

    if (rota === '/global') return traduzirGlobal();
    if (rota === '/coins/markets') {
      if (p.get('ids')) return null;
      return traduzirMarkets(p);
    }
    return null;
  }

  /* Busca com cache. Só vai na rede se o cache expirou. */
  API.get = function (caminho, ttlMs, tentativas) {
    var k = 'mdf.api.' + caminho;
    var c = cacheLer(k);
    if (c) return Promise.resolve(c);
    /* Se houver fonte alternativa para este caminho, tenta ela primeiro e
       cai na CoinGecko se algo der errado. */
    var alt = traduzir(caminho);
    var p = alt
      ? alt.catch(function () { return buscar(caminho, tentativas); })
      : buscar(caminho, tentativas);
    return p.then(function (d) {
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
  function instalarInterceptador() {
    if (!API.chave && API.fonte !== 'paprika') return;   /* nada a fazer */
    if (typeof window.fetch !== 'function' || typeof Headers !== 'function') return;
    if (window.fetch.__mdf) return;                      /* não empilha em recarga */

    var original = window.fetch.bind(window);

    function json(d) {
      return new Response(JSON.stringify(d), {
        status: 200, headers: { 'content-type': 'application/json' }
      });
    }

    var interceptado = function (entrada, init) {
      var url = typeof entrada === 'string' ? entrada
              : (entrada && entrada.url) ? entrada.url : '';
      if (url.indexOf('api.coingecko.com') < 0) return original(entrada, init);

      var opts = {};
      if (init) for (var k in init) {
        if (Object.prototype.hasOwnProperty.call(init, k)) opts[k] = init[k];
      }
      if (API.chave) {
        var h = new Headers((init && init.headers) || (entrada && entrada.headers) || {});
        if (!h.has('x-cg-demo-api-key')) h.set('x-cg-demo-api-key', API.chave);
        opts.headers = h;
      }

      /* Quem chama a CoinGecko com fetch próprio também ganha a fonte
         alternativa, e recebe uma Response de verdade — os chamadores
         usam .ok e .json(), então precisa ser o objeto real. */
      var caminho = url.split('/api/v3')[1];
      var alt = caminho ? traduzir(caminho) : null;
      if (alt) {
        return alt.then(json).catch(function () { return original(entrada, opts); });
      }
      return original(entrada, opts);
    };
    interceptado.__mdf = true;
    window.fetch = interceptado;
  }
  instalarInterceptador();

  window.MDF_API = API;
})();
