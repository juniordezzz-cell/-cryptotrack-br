/* ╔════════════════════════════════════════════════════════════════════╗
   ║  MUNDODEFI · DADOS DE MERCADO — PONTO ÚNICO                            ║
   ║                                                                      ║
   ║  O SITE NÃO PRECISA DE CHAVE DE API. Nenhuma.                        ║
   ║                                                                      ║
   ║  ── POR QUÊ ISTO EXISTE ───────────────────────────────    ║
   ║  Doze arquivos batiam na CoinGecko anônima. O tier público dela não   ║
   ║  aguenta site com visita: em teste, ~50 chamadas de um mesmo IP em    ║
   ║  poucos minutos já voltaram 429. E o plano Demo, que precisa de        ║
   ║  cadastro, dá 10.000 chamadas por MÊS — na medição deste site, algo    ║
   ║  como 220 visitas por dia.                                           ║
   ║                                                                      ║
   ║  ── DE ONDE VEM CADA DADO HOJE ───────────────────────────    ║
   ║  DefiLlama    preço em dólar e histórico. Aceita `coingecko:<id>`,    ║
   ║               ou seja os mesmos ids que o site já guarda: nenhuma     ║
   ║               tradução de id, uma chamada para qualquer quantidade    ║
   ║               de tokens, e sem teto mensal.                          ║
   ║  CoinPaprika  tudo que precisa de outra moeda, capitalização,        ║
   ║               ranking, busca ou detalhe do ativo. Sem chave, sem      ║
   ║               cadastro, 20.000 chamadas/mês.                          ║
   ║  Binance      gráfico da página de token.                             ║
   ║  CoinGecko    RESERVA. Nada vai para lá em condição normal.          ║
   ║                                                                      ║
   ║  Toda resposta é traduzida para o formato da CoinGecko, então        ║
   ║  nenhuma página do site precisou saber disso. Se qualquer fonte      ║
   ║  falhar, a chamada cai na CoinGecko sozinha.                         ║
   ║                                                                      ║
   ║  ── SE UM DIA QUISER USAR A CHAVE ────────────────────────    ║
   ║  Cole em MDF_API.chave abaixo e ela passa a ir em toda chamada que   ║
   ║  chegue à CoinGecko — que hoje são só as de reserva. Para voltar     ║
   ║  tudo para ela, sem deploy:  MDF_API.fonte = 'coingecko'             ║
   ╚════════════════════════════════════════════════════════════════════╝ */
(function () {
  'use strict';

  var API = {
    /* Opcional. O site funciona sem, e por padrão nada chega à CoinGecko. */
    chave: '',

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

  /* A versão sai do próprio <script src="...?v=">: assim o JSON acompanha
     o cache busting do JS que o carrega, sem ter que lembrar de bumpar dois
     lugares. Sem isto, editar o arquivo não chegava em quem já tinha
     visitado o site — e o dado ficava congelado no navegador dele. */
  var VERSAO = (function () {
    try {
      var s = document.currentScript && document.currentScript.src;
      var m = s && s.match(/[?&]v=([^&#]+)/);
      return m ? m[1] : '';
    } catch (e) { return ''; }
  })();
  function versionado(caminho) { return VERSAO ? caminho + '?v=' + VERSAO : caminho; }

  var PAPRIKA = 'https://api.coinpaprika.com/v1';
  var LLAMA = 'https://coins.llama.fi';
  var LOGO = 'https://static.coinpaprika.com/coin/';

  /* Mapa de ids, gerado por dev/gerar-mapa-ids.mjs. Guardamos o sentido
     Paprika→CoinGecko, que é o da tradução de resposta. */
  var cgDePk = null, mapaEmVoo = null;
  function mapa() {
    if (cgDePk) return Promise.resolve(cgDePk);
    if (mapaEmVoo) return mapaEmVoo;
    mapaEmVoo = fetch(versionado('/mundodefi-ids.json'))
      .then(function (r) { if (!r.ok) throw new Error('mapa ' + r.status); return r.json(); })
      .then(function (d) {
        var rev = {};
        Object.keys(d.ids || {}).forEach(function (cg) { rev[d.ids[cg]] = cg; });
        cgDePk = rev;
        return rev;
      });
    return mapaEmVoo;
  }

  /* O mapa ja e' lido no sentido Paprika->CoinGecko para traduzir
     resposta. Aqui precisamos do contrario: dado o id que o site usa,
     achar o da Paprika. */
  var pkDeCgCache = null;
  function mapaDireto() {
    if (pkDeCgCache) return Promise.resolve(pkDeCgCache);
    return fetch(versionado('/mundodefi-ids.json'))
      .then(function (r) { if (!r.ok) throw new Error('mapa ' + r.status); return r.json(); })
      .then(function (d) { pkDeCgCache = d.ids || {}; return pkDeCgCache; });
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

  /* /simple/price — o endpoint mais usado do site, em 10 ferramentas mais
     o portfólio. Duas fontes, escolhidas pelo que a chamada pede:

       só dólar          DefiLlama. Aceita `coingecko:<id>`, ou seja os
                         MESMOS ids que o site já guarda, sem mapa nenhum.
                         Uma chamada serve qualquer quantidade de tokens e
                         não existe teto mensal.

       outra moeda,      CoinPaprika. Ela cota em BRL, EUR e GBP direto,
       ou market cap     com preço de mercado cripto de verdade — importa
                         para o câmbio, que existe justamente para mostrar
                         a taxa do mercado cripto e não a oficial. Custa
                         uma chamada por token e depende do mapa de ids.

     Se algum id não estiver no mapa, ou se qualquer coisa falhar, cai na
     CoinGecko como estava. */
  function precoLlama(ids, querVariacao) {
    var chave = ids.map(function (i) { return 'coingecko:' + i; }).join(',');
    var pedidos = [fetch(LLAMA + '/prices/current/' + chave).then(function (r) {
      if (!r.ok) throw new Error('llama ' + r.status); return r.json();
    })];
    if (querVariacao) {
      pedidos.push(fetch(LLAMA + '/percentage/' + chave + '?period=24h')
        .then(function (r) { return r.ok ? r.json() : { coins: {} }; })
        .catch(function () { return { coins: {} }; }));
    }
    return Promise.all(pedidos).then(function (a) {
      var precos = (a[0] && a[0].coins) || {};
      var variacoes = (a[1] && a[1].coins) || {};
      var fora = {}, achou = 0;
      ids.forEach(function (id) {
        var p = precos['coingecko:' + id];
        if (!p || !(p.price > 0)) return;
        achou++;
        fora[id] = { usd: p.price };
        var v = variacoes['coingecko:' + id];
        if (v != null) fora[id].usd_24h_change = v;
      });
      if (!achou) throw new Error('llama sem dados');
      return fora;
    });
  }

  function precoPaprika(ids, moedas, querVariacao, querCap) {
    return mapaDireto().then(function (pkDeCg) {
      var faltando = ids.filter(function (i) { return !pkDeCg[i]; });
      if (faltando.length) throw new Error('sem mapa: ' + faltando.join(','));
      var qs = moedas.map(function (m) { return m.toUpperCase(); }).join(',');
      return Promise.all(ids.map(function (id) {
        return paprika('/tickers/' + pkDeCg[id] + '?quotes=' + qs)
          .then(function (d) { return { id: id, d: d }; });
      })).then(function (lista) {
        var fora = {};
        lista.forEach(function (x) {
          var o = {};
          moedas.forEach(function (m) {
            var q = (x.d.quotes || {})[m.toUpperCase()];
            if (!q) return;
            o[m] = q.price;
            if (querVariacao) o[m + '_24h_change'] = q.percent_change_24h;
            if (querCap) o[m + '_market_cap'] = q.market_cap;
          });
          fora[x.id] = o;
        });
        return fora;
      });
    });
  }

  function traduzirSimplePrice(p) {
    var ids = String(p.get('ids') || '').split(',')
      .map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    if (!ids.length) return null;
    var moedas = String(p.get('vs_currencies') || 'usd').split(',')
      .map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    var querVariacao = p.get('include_24hr_change') === 'true';
    var querCap = p.get('include_market_cap') === 'true';

    var soDolar = moedas.length === 1 && moedas[0] === 'usd';
    if (soDolar && !querCap) return precoLlama(ids, querVariacao);
    return precoPaprika(ids, moedas, querVariacao, querCap);
  }

  /* /coins/markets?ids=X — a forma pontual, usada pelo conversor quando o
     usuário escolhe uma moeda. Antes ficava de fora por ser barata; agora
     entra também, porque o objetivo passou a ser não depender de chave. */
  function traduzirMarketsPorId(p, ids) {
    var fiat = String(p.get('vs_currency') || 'usd').toUpperCase();
    return mapaDireto().then(function (pkDeCg) {
      var faltando = ids.filter(function (i) { return !pkDeCg[i]; });
      if (faltando.length) throw new Error('sem mapa: ' + faltando.join(','));
      return Promise.all(ids.map(function (id) {
        return Promise.all([
          paprika('/tickers/' + pkDeCg[id] + '?quotes=USD,' + fiat),
          /* maxima e minima de 24h nao vem no ticker; o OHLCV tem, e em
             dolar. Se falhar, seguimos sem elas em vez de derrubar tudo. */
          paprika('/coins/' + pkDeCg[id] + '/ohlcv/latest')
            .then(function (o) { return (o && o[0]) || {}; })
            .catch(function () { return {}; })
        ]).then(function (par) {
            var c = par[0], ohlc = par[1];
            var q = (c.quotes || {})[fiat] || {};
            /* o OHLCV vem em dolar: converte pela razao do proprio preco */
            var usd = (c.quotes || {}).USD || {};
            var fator = (fiat === 'USD' || !usd.price || !q.price) ? 1 : (q.price / usd.price);
            return {
              low_24h: ohlc.low != null ? ohlc.low * fator : null,
              high_24h: ohlc.high != null ? ohlc.high * fator : null,
              id: id,
              symbol: String(c.symbol || '').toLowerCase(),
              name: c.name,
              image: LOGO + pkDeCg[id] + '/logo.png',
              current_price: q.price,
              market_cap: q.market_cap,
              total_volume: q.volume_24h,
              market_cap_rank: c.rank,
              price_change_percentage_24h: q.percent_change_24h,
              price_change_percentage_24h_in_currency: q.percent_change_24h,
              circulating_supply: c.circulating_supply,
              total_supply: c.total_supply,
              max_supply: c.max_supply
            };
          });
      }));
    });
  }

  /* /coins/{id}/market_chart — o gráfico. A DefiLlama serve o histórico
     aceitando o mesmo `coingecko:<id>`, então aqui também não precisa de
     mapa. Ela devolve só preço; volume e capitalização, que a CoinGecko
     manda junto, ficam como listas vazias — nenhum consumidor do site usa
     esses dois. */
  function traduzirChart(id, p) {
    var dias = parseInt(p.get('days'), 10) || 30;
    var pontos = Math.min(dias, 365);
    var fiat = String(p.get('vs_currency') || 'usd').toUpperCase();

    /* A DefiLlama cota só em dólar. Sem converter, o gráfico do conversor
       em reais mostrava o preço em dólar com o símbolo R$ na frente — número
       errado com cara de certo, que é o pior tipo de erro. A razão vem da
       própria Paprika, que cota o mesmo ativo nas duas moedas. */
    var razao = fiat === 'USD'
      ? Promise.resolve(1)
      : mapaDireto().then(function (pkDeCg) {
          if (!pkDeCg[id]) throw new Error('sem mapa para converter o grafico');
          return paprika('/tickers/' + pkDeCg[id] + '?quotes=USD,' + fiat);
        }).then(function (c) {
          var q = c.quotes || {};
          if (!q.USD || !q.USD.price || !q[fiat] || !q[fiat].price) {
            throw new Error('sem cotacao para converter o grafico');
          }
          return q[fiat].price / q.USD.price;
        });

    var serie = fetch(LLAMA + '/chart/coingecko:' + encodeURIComponent(id)
                      + '?span=' + pontos + '&period=1d')
      .then(function (r) { if (!r.ok) throw new Error('llama chart ' + r.status); return r.json(); })
      .then(function (d) {
        var lista = ((d.coins || {})['coingecko:' + id] || {}).prices || [];
        if (!lista.length) throw new Error('llama chart vazio');
        return lista;
      });

    return Promise.all([serie, razao]).then(function (a) {
      var lista = a[0], k = a[1];
      return {
        prices: lista.map(function (x) { return [x.timestamp * 1000, x.price * k]; }),
        /* nenhum consumidor do site usa estes dois */
        market_caps: [],
        total_volumes: []
      };
    });
  }

  /* /coins/{id} — o detalhe usado pela página de token. Duas chamadas à
     Paprika: o ticker traz preço, capitalização, máxima histórica e as
     variações; o /coins traz nome, logo e links.

     Um campo não existe na Paprika: a MÍNIMA histórica (atl). Vai como
     null, e a página já sabe lidar com isso — ela monta um objeto com
     atl:null quando só tem dados da Binance. Perder esse campo é o preço
     de o site inteiro deixar de precisar de chave, e pareceu barato.

     A valuation diluída também não vem pronta: calculamos preço vezes
     oferta máxima, que é a definição dela. Sem oferta máxima definida,
     fica null em vez de um número inventado. */
  function traduzirDetalhe(id) {
    return mapaDireto().then(function (pkDeCg) {
      var pk = pkDeCg[id];
      if (!pk) throw new Error('sem mapa: ' + id);
      return Promise.all([
        paprika('/tickers/' + pk + '?quotes=USD'),
        paprika('/coins/' + pk).catch(function () { return {}; })
      ]);
    }).then(function (a) {
      var t = a[0], c = a[1] || {};
      var q = (t.quotes || {}).USD || {};
      var maxima = t.max_supply || 0;
      var logo = c.logo || (LOGO + (t.id || '') + '/logo.png');
      var links = c.links || {};

      function primeiro(v) { return (Array.isArray(v) && v.length) ? v[0] : null; }

      return {
        id: id,
        symbol: String(t.symbol || '').toLowerCase(),
        name: t.name || c.name || id,
        image: { large: logo, small: logo, thumb: logo },
        market_cap_rank: t.rank || null,
        genesis_date: (c.started_at || '').slice(0, 10) || null,
        description: { en: c.description || '' },
        categories: (c.tags || []).map(function (x) { return x.name; }).filter(Boolean),
        links: {
          homepage: [primeiro(links.website) || ''],
          blockchain_site: [primeiro(links.explorer) || ''],
          repos_url: { github: links.source_code || [] },
          subreddit_url: primeiro(links.reddit) || '',
          twitter_screen_name: '',
          telegram_channel_identifier: ''
        },
        market_data: {
          current_price: { usd: q.price },
          market_cap: { usd: q.market_cap },
          total_volume: { usd: q.volume_24h },
          fully_diluted_valuation: { usd: (maxima > 0 && q.price) ? maxima * q.price : null },
          circulating_supply: t.circulating_supply || null,
          total_supply: t.total_supply || null,
          max_supply: maxima || null,
          ath: { usd: q.ath_price != null ? q.ath_price : null },
          ath_date: { usd: q.ath_date || null },
          ath_change_percentage: { usd: q.percent_from_price_ath != null ? q.percent_from_price_ath : null },
          /* a Paprika não publica mínima histórica */
          atl: { usd: null },
          atl_date: { usd: null },
          atl_change_percentage: { usd: null },
          price_change_percentage_24h: q.percent_change_24h,
          price_change_percentage_7d: q.percent_change_7d,
          /* A Paprika publica 30d e 1y SEMPRE zerados no tier gratuito --
             conferido em BTC, ETH, SOL, BNB, XRP e ADA no mesmo instante em
             que o 7d marcava de 15% a 50%. Zero ali nao e' "nao variou", e'
             "nao preenchi". Repassar isso pintaria "+0,00%" na tela com
             cara de dado real. Vira null; quem precisa do numero de verdade
             calcula do preco. */
          price_change_percentage_30d: q.percent_change_30d || null,
          price_change_percentage_1y: q.percent_change_1y || null,
          price_change_percentage_1h_in_currency: { usd: q.percent_change_1h },
          price_change_percentage_24h_in_currency: { usd: q.percent_change_24h }
        }
      };
    });
  }

  /* /search — a busca de token do cabeçalho. A Paprika devolve id dela, e
     o site inteiro fala em id da CoinGecko, então só entra o que está no
     mapa. Isso limita a busca às maiores por capitalização, que é onde
     está toda a procura real; o que ficar de fora cai na CoinGecko. */
  function traduzirBusca(p) {
    var q = String(p.get('query') || '').trim();
    if (q.length < 2) return null;
    return Promise.all([
      mapa(),
      paprika('/search?q=' + encodeURIComponent(q) + '&c=currencies&limit=20')
    ]).then(function (a) {
      var cgDePk = a[0], achados = (a[1] && a[1].currencies) || [];
      var fora = [];
      achados.forEach(function (c) {
        var cg = cgDePk[c.id];
        if (!cg) return;
        fora.push({
          id: cg,
          name: c.name,
          symbol: String(c.symbol || '').toUpperCase(),
          market_cap_rank: c.rank,
          thumb: LOGO + c.id + '/logo.png',
          large: LOGO + c.id + '/logo.png'
        });
      });
      if (!fora.length) throw new Error('busca sem resultado mapeado');
      fora.sort(function (x, y) { return (x.market_cap_rank || 9e9) - (y.market_cap_rank || 9e9); });
      return { coins: fora.slice(0, 10), exchanges: [], categories: [] };
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

    if (rota === '/simple/price') return traduzirSimplePrice(p);
    if (rota === '/global') return traduzirGlobal();
    if (rota === '/search') return traduzirBusca(p);
    if (rota === '/coins/markets') {
      var porId = p.get('ids');
      if (porId) return traduzirMarketsPorId(p, porId.split(',').map(function (x) {
        return x.trim().toLowerCase();
      }).filter(Boolean));
      return traduzirMarkets(p);
    }
    var mDet = rota.match(/^\/coins\/([^\/]+)$/);
    if (mDet) return traduzirDetalhe(decodeURIComponent(mDet[1]).toLowerCase());
    var mChart = rota.match(/^\/coins\/([^\/]+)\/market_chart$/);
    if (mChart) return traduzirChart(decodeURIComponent(mChart[1]).toLowerCase(), p);
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
